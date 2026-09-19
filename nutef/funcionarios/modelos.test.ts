import { describe, expect, it } from "vitest";
import { TOOL_CATALOG } from "@/lib/mcp/tools/catalog";
import { TETO_TOOLS_POR_AGENTE } from "@/lib/mcp/tools/selecao-por-pacote";
import { MODELOS_DE_FUNCIONARIO } from "./modelos";

describe("modelos de funcionário", () => {
  const nomes = new Set(TOOL_CATALOG.map((c) => c.name));
  it.each(MODELOS_DE_FUNCIONARIO.map((m) => [m.id, m] as const))("%s: capacidades existem no catálogo e cabem no teto", (_, m) => {
    const desconhecidas = m.capacidades.filter((n) => !nomes.has(n));
    expect(desconhecidas, "capacidade fora do catálogo").toEqual([]);
    expect(new Set(m.capacidades).size).toBeLessThanOrEqual(TETO_TOOLS_POR_AGENTE);
    expect(m.capacidades).toContain("crm_request_human_handoff"); // todo funcionário sabe chamar uma pessoa
  });
  it("o prompt fala do negócio e nunca inventa preço", () => {
    for (const m of MODELOS_DE_FUNCIONARIO) {
      const p = m.prompt({ empresa: "Acme", oQueFaz: "clínica" });
      expect(p).toContain("Acme");
      expect(p).toMatch(/Nunca invente preço/);
    }
  });
});
