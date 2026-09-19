/**
 * Cron diário do billing (camada do fork Nutef CRM — nutef/fase-1-billing.md).
 *
 * Toda a régua mora em `fn_billing_tick` (nutef/db/migrations/N0001_billing.sql):
 * trial/período vencido → past_due + fatura; 3 dias → envios automáticos
 * bloqueados; 10 dias → conta suspensa; uso do dia agregado; crédito de IA do
 * plano sincronizado com ai_budgets. Esta rota é autenticação + chamada +
 * auditoria — e audita SÓ quando houve efeito (CLAUDE.md, "Audit log";
 * tests/unit/cron-audita-so-quando-ha-efeito.test.ts varre o AST).
 *
 * Agendada em docker/scheduler/entrypoint.sh (de hora em hora, minuto 10). O teste
 * tests/unit/cron-routes-scheduled.test.ts cobra a linha lá.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/wrappers";
import { autorizaCron } from "@/lib/auth/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { executarTick } from "@/nutef/billing/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const startedAt = Date.now();

  if (!autorizaCron(req)) {
    return fail("forbidden", "Cron secret missing or invalid.", 403, { requestId });
  }

  let resultado;
  try {
    resultado = await executarTick(createAdminClient());
  } catch (e) {
    logger.error("billing-tick: falhou", { error: e instanceof Error ? e.message : String(e), requestId });
    return fail("internal_error", "billing tick failed", 500, { requestId });
  }

  const duration_ms = Date.now() - startedAt;
  if (resultado.effect) {
    void audit({
      action: "billing.tick_run",
      requestId,
      bypassedRls: true,
      metadata: {
        past_due: resultado.past_due,
        stage2: resultado.stage2,
        stage3: resultado.stage3,
        invoices: resultado.invoices,
        usage_rows: resultado.usage_rows,
        ai_budgets_synced: resultado.ai_budgets_synced,
        changed: resultado.changed,
        duration_ms,
      },
    });
  }
  return ok({ ...resultado, duration_ms });
}
