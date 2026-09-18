/** POST /api/v1/admin/billing/:orgId/plano — troca o plano/ciclo (fork Nutef CRM). */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { abrirRotaAdmin, ehResposta } from "@/nutef/billing/rota-admin";
import { trocarPlano } from "@/nutef/billing/admin";

export const dynamic = "force-dynamic";
const bodySchema = z.object({
  plan_slug: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/),
  billing_cycle: z.enum(["monthly", "yearly"]).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  // Explícito aqui (e não só dentro do helper): tests/unit/suporte-cobertura-de-efeitos
  // varre cada handler mutante procurando esta chamada.
  const supportDenied = await requireSupportWrite(orgId);
  if (supportDenied) return supportDenied;
  const ctx = await abrirRotaAdmin(req, { body: bodySchema });
  if (ehResposta(ctx)) return ctx;
  try {
    const r = await trocarPlano(createAdminClient(), orgId, ctx.body.plan_slug, ctx.body.billing_cycle);
    void audit({
      action: "billing.plan_changed", organizationId: orgId, requestId: ctx.requestId, bypassedRls: true,
      metadata: { from: r.de, to: r.para, billing_cycle: ctx.body.billing_cycle ?? null, by: ctx.admin.user.id },
    });
    return ok(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "plan change failed";
    if (msg.endsWith("_not_found")) return fail("not_found", msg, 404, { requestId: ctx.requestId });
    return fail("internal_error", msg, 500, { requestId: ctx.requestId });
  }
}
