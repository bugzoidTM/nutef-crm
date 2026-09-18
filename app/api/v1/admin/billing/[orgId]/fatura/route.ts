/** POST /api/v1/admin/billing/:orgId/fatura — emite fatura do período ou de crédito de IA (fork Nutef CRM). */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { abrirRotaAdmin, ehResposta } from "@/nutef/billing/rota-admin";
import { emitirFatura } from "@/nutef/billing/admin";

export const dynamic = "force-dynamic";
const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("subscription") }),
  z.object({
    kind: z.literal("ai_credit"),
    amount_cents: z.number().int().min(100).max(100_000_00),
    credit_cents: z.number().int().min(100).max(100_000_00),
    description: z.string().max(200).optional(),
  }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  // Explícito aqui (e não só dentro do helper): tests/unit/suporte-cobertura-de-efeitos
  // varre cada handler mutante procurando esta chamada.
  const supportDenied = await requireSupportWrite(orgId);
  if (supportDenied) return supportDenied;
  const ctx = await abrirRotaAdmin(req, { body: bodySchema });
  if (ehResposta(ctx)) return ctx;
  try {
    const r = await emitirFatura(createAdminClient(), orgId, ctx.body);
    void audit({
      action: "billing.invoice_issued", organizationId: orgId, requestId: ctx.requestId, bypassedRls: true,
      metadata: { invoice_id: r.invoice_id, kind: ctx.body.kind, by: ctx.admin.user.id },
    });
    return ok(r, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invoice failed";
    if (msg.endsWith("_not_found")) return fail("not_found", msg, 404, { requestId: ctx.requestId });
    return fail("internal_error", msg, 500, { requestId: ctx.requestId });
  }
}
