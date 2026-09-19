/** POST /api/v1/admin/billing/:orgId/trial — estende trial/período em N dias (fork Nutef CRM). */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { abrirRotaAdmin, ehResposta } from "@/nutef/billing/rota-admin";
import { estenderPrazo } from "@/nutef/billing/admin";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ dias: z.number().int().min(1).max(90), reason: z.string().min(5).max(500) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  // Explícito aqui (e não só dentro do helper): tests/unit/suporte-cobertura-de-efeitos
  // varre cada handler mutante procurando esta chamada.
  const supportDenied = await requireSupportWrite(orgId);
  if (supportDenied) return supportDenied;
  const ctx = await abrirRotaAdmin(req, { body: bodySchema });
  if (ehResposta(ctx)) return ctx;
  try {
    const r = await estenderPrazo(createAdminClient(), orgId, ctx.body.dias);
    void audit({
      action: "billing.plan_changed", organizationId: orgId, requestId: ctx.requestId, bypassedRls: true,
      metadata: { kind: "trial_extended", dias: ctx.body.dias, novo_fim: r.novo_fim, reason: ctx.body.reason, by: ctx.admin.user.id },
    });
    return ok(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "extend failed";
    if (msg.endsWith("_not_found")) return fail("not_found", msg, 404, { requestId: ctx.requestId });
    return fail("internal_error", msg, 500, { requestId: ctx.requestId });
  }
}
