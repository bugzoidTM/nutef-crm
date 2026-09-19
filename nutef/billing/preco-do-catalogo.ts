/**
 * Preço de modelo que a tabela fixa do motor não conhece (pricing.ts só tem a
 * família Claude): cai no catálogo `ai_models`, que o cron sync-model-catalog
 * mantém com `input_price_per_million_cents` / `output_price_per_million_cents`
 * para OpenAI, Google e OpenRouter.
 *
 * Por que isto é da CAMADA DO FORK e não um detalhe: sem preço o motor grava
 * `cost_cents = null` ("não sei", por doutrina), o gatilho de orçamento soma
 * zero, e o crédito de IA do plano (PRD §25) NUNCA é consumido — medido no
 * staging em 2026-09-18: 30 chamadas ao gpt-5.4-mini, 205 mil tokens, custo 0.
 *
 * Aproximações declaradas (o catálogo não tem colunas de cache):
 *   - leitura de cache = 10% do preço de entrada (a regra da família gpt-5;
 *     no gpt-4o é 50% — subfatura só quem usa 4o, e para MENOS custo);
 *   - gravação de cache = preço de entrada (a OpenAI não cobra a mais).
 * Modelo sem preço no catálogo continua `null`: "não sei" nunca vira "de graça".
 */
import type { TokenUsage } from "@/lib/agent-engine/edge/llm/pricing";

interface Consultavel {
  query<R extends Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

interface PrecoCents { input: number; output: number; lidoEm: number }
const cache = new Map<string, PrecoCents | null>();
const TTL_MS = 10 * 60_000;

async function precoDoCatalogo(db: Consultavel, model: string): Promise<PrecoCents | null> {
  const guardado = cache.get(model);
  if (guardado !== undefined && (guardado === null || Date.now() - guardado.lidoEm < TTL_MS)) return guardado;
  try {
    const { rows } = await db.query<{ i: string | number | null; o: string | number | null }>(
      `select input_price_per_million_cents as i, output_price_per_million_cents as o
         from public.ai_models where model_id = $1 and deprecated_at is null
        order by released_at desc nulls last limit 1`,
      [model],
    );
    const r = rows[0];
    const input = r ? Number(r.i ?? 0) : 0;
    const output = r ? Number(r.o ?? 0) : 0;
    const preco = r && (input > 0 || output > 0) ? { input, output, lidoEm: Date.now() } : null;
    cache.set(model, preco);
    return preco;
  } catch {
    return null;
  }
}

/** Custo em CENTAVOS (não arredondado, como costCents do motor) ou null quando o catálogo também não sabe. */
export async function custoPeloCatalogo(db: Consultavel, model: string, usage: TokenUsage): Promise<number | null> {
  const p = await precoDoCatalogo(db, model);
  if (!p) return null;
  const semCache = Math.max(0, usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens);
  return (
    (semCache * p.input + usage.cacheReadTokens * p.input * 0.1 + usage.cacheWriteTokens * p.input + usage.outputTokens * p.output) /
    1_000_000
  );
}

/** Só para testes: esquece o cache. */
export function _limparCacheDePreco(): void { cache.clear(); }
