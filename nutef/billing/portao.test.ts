import { describe, expect, it } from "vitest";
import { envioAutomaticoPermitidoPg, type Consultavel } from "./portao";

/** Dublê: a 1ª consulta (existe a função?) devolve `ha`; a 2ª devolve `resposta`. */
function db(resposta: () => Promise<{ rows: Array<Record<string, unknown>> }>, ha = true): Consultavel {
  return {
    query: (async (text: string) => (/to_regprocedure/.test(text) ? { rows: [{ ha }] } : resposta())) as Consultavel["query"],
  };
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

  it("sem a função no banco (instalação sem o fork) passa SEM chamar a função — em consulta separada", async () => {
    const vistas: string[] = [];
    const d: Consultavel = {
      query: (async (text: string) => { vistas.push(text); return { rows: [{ ha: false }] }; }) as Consultavel["query"],
    };
    expect(await envioAutomaticoPermitidoPg(d, "org")).toBe(true);
    expect(vistas).toHaveLength(1);
    expect(vistas[0]).toContain("to_regprocedure(");
    expect(vistas[0]).not.toContain("fn_billing_envio_automatico_permitido($1");
  });
});
