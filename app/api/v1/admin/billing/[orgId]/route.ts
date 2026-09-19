/** GET /api/v1/admin/billing/:orgId — resumo + faturas de uma organização (fork Nutef CRM). */
import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/wrappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { abrirRotaAdmin, ehResposta } from "@/nutef/billing/rota-admin";
import { resumoDeBilling } from "@/nutef/billing/db";
import { faturasDaOrganizacao, planosDisponiveis } from "@/nutef/billing/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const ctx = await abrirRotaAdmin(req, {});
  if (ehResposta(ctx)) return ctx;
  const { orgId } = await params;
  try {
    const admin = createAdminClient();
    const [resumo, faturas, planos] = await Promise.all([
      resumoDeBilling(admin, orgId), faturasDaOrganizacao(admin, orgId), planosDisponiveis(admin),
    ]);
    if (!resumo) return fail("not_found", "Organização sem assinatura", 404, { requestId: ctx.requestId });
    return ok({ ...resumo, invoices: faturas, planos });
  } catch (e) {
    return fail("internal_error", e instanceof Error ? e.message : "billing detail failed", 500, { requestId: ctx.requestId });
  }
}
