/**
 * Traduz um modelo de funcionário no pré-preenchimento do formulário de
 * criação do motor. Server-only: lê o "o que vocês fazem" do onboarding e o
 * catálogo de capacidades com handler.
 */
import { catalogoComHandler } from "@/lib/ai/agents/capacidades-padrao";
import { ligarPacote } from "@/lib/mcp/tools/selecao-por-pacote";
import { loadOnboardingState } from "@/app/actions/onboarding/_shared";
import { modeloDeFuncionario } from "./modelos";

export interface PreenchimentoDoFuncionario {
  name: string;
  description: string;
  priority: number;
  system_prompt: string;
  tool_ids: string[];
  handoff_keywords: string[];
}

export async function preenchimentoDoModelo(
  modeloId: string | undefined,
  orgId: string,
  orgName: string,
): Promise<PreenchimentoDoFuncionario | null> {
  const modelo = modeloDeFuncionario(modeloId);
  if (!modelo) return null;
  let oQueFaz: string | null = null;
  try {
    const { state } = await loadOnboardingState(orgId);
    oQueFaz = state.welcome?.o_que_faz ?? null;
  } catch {
    oQueFaz = null;
  }
  const catalogo = catalogoComHandler();
  const tool_ids = modelo.pacotes.reduce<string[]>((acc, p) => ligarPacote(acc, catalogo, p), []);
  return {
    name: modelo.nome,
    description: `${modelo.funcao} — ${modelo.objetivo}`,
    priority: modelo.priority,
    system_prompt: modelo.prompt({ empresa: orgName, oQueFaz }),
    tool_ids,
    handoff_keywords: ["falar com humano", "atendente", "pessoa real", ...modelo.handoff_keywords],
  };
}
