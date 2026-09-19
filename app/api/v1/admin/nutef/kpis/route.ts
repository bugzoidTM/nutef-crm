/** GET /api/v1/admin/nutef/kpis — KPIs de negócio do SaaS (fork Nutef CRM, PRD §27). Platform admin. */
import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/wrappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { abrirRotaAdmin, ehResposta } from "@/nutef/billing/rota-admin";
import { kpisDaPlataforma } from "@/nutef/superadmin/kpis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await abrirRotaAdmin(req, {});
  if (ehResposta(ctx)) return ctx;
  try {
    return ok(await kpisDaPlataforma(createAdminClient()));
  } catch (e) {
    return fail("internal_error", e instanceof Error ? e.message : "kpis failed", 500, { requestId: ctx.requestId });
  }
}
