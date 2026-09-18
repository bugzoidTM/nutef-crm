/** POST /api/v1/admin/billing/invoices/:id/pagar — confirma pagamento manual (fork Nutef CRM). */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { abrirRotaAdmin, ehResposta } from "@/nutef/billing/rota-admin";
import { confirmarPagamento } from "@/nutef/billing/db";
import { organizacaoDaFatura } from "@/nutef/billing/admin";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ note: z.string().max(300).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  let orgId: string | null;
  try {
    orgId = await organizacaoDaFatura(admin, id);
  } catch (e) {
    return fail("internal_error", e instanceof Error ? e.message : "invoice lookup failed", 500);
  }
  if (!orgId) return fail("not_found", "Fatura não encontrada", 404);
  const ctx = await abrirRotaAdmin(req, { escrita: orgId, body: bodySchema });
  if (ehResposta(ctx)) return ctx;
  try {
    const r = await confirmarPagamento(admin, id, ctx.admin.user.id);
    if (r.applied_now) {
      void audit({
        action: "billing.invoice_paid", organizationId: orgId, requestId: ctx.requestId, bypassedRls: true,
        metadata: { invoice_id: id, kind: r.kind ?? null, note: ctx.body.note ?? null, by: ctx.admin.user.id, provider: "manual" },
      });
    }
    return ok(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "payment failed";
    if (msg.includes("billing_invoice_not_found")) return fail("not_found", "Fatura não encontrada", 404, { requestId: ctx.requestId });
    return fail("internal_error", msg, 500, { requestId: ctx.requestId });
  }
}
