import { beforeEach, describe, expect, it } from "vitest";
import { _limparCacheDePreco, custoPeloCatalogo } from "./preco-do-catalogo";

const db = (rows: Array<Record<string, unknown>>) => ({ query: async () => ({ rows }) }) as unknown as { query<R extends Record<string, unknown>>(t: string, p?: unknown[]): Promise<{ rows: R[] }> };
const uso = { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0 };

describe("custo pelo catálogo ai_models", () => {
  beforeEach(() => _limparCacheDePreco());
  it("gpt-5.4-mini: 1M de entrada a 75¢/M + 100k de saída a 450¢/M = 120¢", async () => {
    expect(await custoPeloCatalogo(db([{ i: "75", o: "450" }]), "gpt-5.4-mini", uso)).toBeCloseTo(120, 6);
  });
  it("leitura de cache custa 10% da entrada", async () => {
    const c = await custoPeloCatalogo(db([{ i: "100", o: "0" }]), "m", { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 });
    expect(c).toBeCloseTo(10, 6);
  });
  it("modelo sem preço no catálogo continua 'não sei' (null), nunca zero", async () => {
    expect(await custoPeloCatalogo(db([]), "desconhecido", uso)).toBeNull();
    expect(await custoPeloCatalogo(db([{ i: "0", o: "0" }]), "zerado", uso)).toBeNull();
  });
  it("erro de consulta não derruba a chamada de modelo", async () => {
    const quebrado = { query: async () => { throw new Error("boom"); } } as never;
    expect(await custoPeloCatalogo(quebrado, "m", uso)).toBeNull();
  });
});
