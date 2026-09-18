/** GET /api/v1/admin/billing — painel do superadmin: MRR, status, faturas abertas, uma linha por org (fork Nutef CRM). */
import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/wrappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { abrirRotaAdmin, ehResposta } from "@/nutef/billing/rota-admin";
import { painelDeBilling, planosDisponiveis } from "@/nutef/billing/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await abrirRotaAdmin(req, {});
  if (ehResposta(ctx)) return ctx;
  try {
    const admin = createAdminClient();
    const [painel, planos] = await Promise.all([painelDeBilling(admin), planosDisponiveis(admin)]);
    return ok({ ...painel, planos });
  } catch (e) {
    return fail("internal_error", e instanceof Error ? e.message : "billing panel failed", 500, { requestId: ctx.requestId });
  }
}
