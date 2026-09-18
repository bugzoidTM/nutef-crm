/** POST /api/v1/admin/billing/:orgId/cancelar — cancela a assinatura; não suspende a org (fork Nutef CRM). */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { abrirRotaAdmin, ehResposta } from "@/nutef/billing/rota-admin";
import { cancelarAssinatura } from "@/nutef/billing/admin";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ reason: z.string().min(10).max(500) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const ctx = await abrirRotaAdmin(req, { escrita: orgId, body: bodySchema });
  if (ehResposta(ctx)) return ctx;
  try {
    await cancelarAssinatura(createAdminClient(), orgId, ctx.body.reason);
    void audit({
      action: "billing.subscription_cancelled", organizationId: orgId, requestId: ctx.requestId, bypassedRls: true,
      metadata: { reason: ctx.body.reason, by: ctx.admin.user.id },
    });
    return ok({ cancelled: true });
  } catch (e) {
    return fail("internal_error", e instanceof Error ? e.message : "cancel failed", 500, { requestId: ctx.requestId });
  }
}
