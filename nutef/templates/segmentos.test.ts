import { describe, expect, it } from "vitest";
import { flowGraphSchema } from "@/lib/followup/graph-schema";
import { triggerConfigSchema } from "@/lib/followup/api-schemas";
import { customFieldSchema } from "@/lib/schemas/settings";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";
import { TEMPLATES, roteiroParaPrompt, templateDoSegmento } from "./segmentos";

describe("templates por segmento", () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))("%s: campos, gatilho e grafo passam nos schemas do motor", (_, t) => {
    for (const c of t.camposDoFunil) expect(customFieldSchema.safeParse(c).success, c.key).toBe(true);
    expect(new Set(t.camposDoFunil.map((c) => c.key)).size).toBe(t.camposDoFunil.length);
    expect(triggerConfigSchema.safeParse(t.retomada.trigger).success).toBe(true);
    const g = flowGraphSchema.safeParse(t.retomada.grafo);
    expect(g.success, JSON.stringify(g.success ? null : g.error.issues.slice(0, 2))).toBe(true);
    expect(PACOTES.some((p) => p.id === t.pacoteDeFunil), "pacote de funil do upstream existe").toBe(true);
  });
  it("o roteiro vira prompt com as perguntas numeradas e os campos", () => {
    const p = roteiroParaPrompt(templateDoSegmento("imobiliaria"));
    expect(p).toContain("1. Compra ou aluguel?");
    expect(p).toContain("(orcamento)");
  });
  it("segmento desconhecido cai no genérico", () => {
    expect(templateDoSegmento("padaria").id).toBe("generico");
  });
});
