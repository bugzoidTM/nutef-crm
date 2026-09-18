/**
 * Rota do cron de billing (camada do fork Nutef CRM): autenticação pelo segredo
 * de cron, chamada única ao banco, e auditoria SÓ quando o tick teve efeito.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const executarTick = vi.fn<(...a: unknown[]) => Promise<unknown>>();
const audit = vi.fn<(entrada: { action: string; metadata: Record<string, unknown> }) => Promise<void>>(async () => undefined);
vi.mock("@/nutef/billing/db", () => ({ executarTick: (...a: unknown[]) => executarTick(...a) }));
vi.mock("@/lib/audit", () => ({ audit: (entrada: { action: string; metadata: Record<string, unknown> }) => audit(entrada) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/env", () => ({ env: { INTERNAL_CRON_SECRET: "segredo-de-teste", INTERNAL_SECRET: "" } }));

const { GET } = await import("@/app/api/v1/cron/billing-tick/route");
const req = (auth?: string) =>
  new NextRequest("http://localhost/api/v1/cron/billing-tick", auth ? { headers: { authorization: auth } } : {});
const semEfeito = { past_due: 0, stage2: 0, stage3: 0, invoices: 0, usage_rows: 2, ai_budgets_synced: 0, changed: [], effect: false };

describe("GET /api/v1/cron/billing-tick", () => {
  beforeEach(() => { executarTick.mockReset(); audit.mockClear(); });

  it("403 sem o segredo — e não toca no banco", async () => {
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(executarTick).not.toHaveBeenCalled();
  });

  it("rodada sem efeito responde 200 e NÃO audita (rodada vazia não é mutação)", async () => {
    executarTick.mockResolvedValue(semEfeito);
    const res = await GET(req("Bearer segredo-de-teste"));
    expect(res.status).toBe(200);
    expect(audit).not.toHaveBeenCalled();
  });

  it("rodada com efeito audita billing.tick_run com as contagens", async () => {
    executarTick.mockResolvedValue({ ...semEfeito, past_due: 1, invoices: 1, effect: true, changed: [{ organization_id: "o", stage: 1 }] });
    const res = await GET(req("Bearer segredo-de-teste"));
    expect(res.status).toBe(200);
    expect(audit).toHaveBeenCalledTimes(1);
    const chamada = audit.mock.calls[0]?.[0];
    expect(chamada?.action).toBe("billing.tick_run");
    expect(chamada?.metadata.past_due).toBe(1);
  });

  it("falha do banco vira 500 sem auditar", async () => {
    executarTick.mockRejectedValue(new Error("boom"));
    const res = await GET(req("Bearer segredo-de-teste"));
    expect(res.status).toBe(500);
    expect(audit).not.toHaveBeenCalled();
  });
});
