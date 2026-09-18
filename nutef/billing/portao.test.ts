import { describe, expect, it } from "vitest";
import { envioAutomaticoPermitidoPg, type Consultavel } from "./portao";

function db(resposta: () => Promise<{ rows: Array<Record<string, unknown>> }>): Consultavel {
  return { query: (() => resposta()) as Consultavel["query"] };
}

describe("portão do estágio 2 (envio automático permitido?)", () => {
  it("bloqueia só quando o banco diz false", async () => {
    expect(await envioAutomaticoPermitidoPg(db(async () => ({ rows: [{ permitido: false }] })), "org")).toBe(false);
  });

  it("true, null e linha ausente passam — a ausência de billing nunca bloqueia", async () => {
    expect(await envioAutomaticoPermitidoPg(db(async () => ({ rows: [{ permitido: true }] })), "org")).toBe(true);
    expect(await envioAutomaticoPermitidoPg(db(async () => ({ rows: [{ permitido: null }] })), "org")).toBe(true);
    expect(await envioAutomaticoPermitidoPg(db(async () => ({ rows: [] })), "org")).toBe(true);
  });

  it("erro de consulta é fail-open: o motor não deixa de enviar por defeito da cobrança", async () => {
    expect(
      await envioAutomaticoPermitidoPg(db(async () => { throw new Error("relation does not exist"); }), "org"),
    ).toBe(true);
  });

  it("a consulta pergunta ao catálogo antes de chamar a função — instalação sem o fork não quebra", async () => {
    let sqlVisto = "";
    const d: Consultavel = {
      query: (async (text: string) => { sqlVisto = text; return { rows: [{ permitido: true }] }; }) as Consultavel["query"],
    };
    await envioAutomaticoPermitidoPg(d, "org");
    expect(sqlVisto).toContain("to_regprocedure('public.fn_billing_envio_automatico_permitido(uuid)')");
  });
});
