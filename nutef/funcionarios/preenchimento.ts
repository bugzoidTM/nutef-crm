/**
 * Traduz um modelo de funcionário no pré-preenchimento do formulário de
 * criação do motor. Server-only: lê o "o que vocês fazem" do onboarding e o
 * catálogo de capacidades com handler.
 */
import { catalogoComHandler } from "@/lib/ai/agents/capacidades-padrao";
import { TETO_TOOLS_POR_AGENTE } from "@/lib/mcp/tools/selecao-por-pacote";
import { loadOnboardingState } from "@/app/actions/onboarding/_shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { lerAmbiente } from "@/lib/instalacao/ambiente";
import { CHAVE_DA_INSTALACAO } from "@/app/app/ai/agents/[id]/_components/CredentialPicker";
import type { SupabaseClient } from "@supabase/supabase-js";
import { modeloDeFuncionario } from "./modelos";
import { escolherPacotePorTexto } from "@/lib/onboarding/sugerir-funil";
import { roteiroParaPrompt, templateDoSegmento } from "@/nutef/templates/segmentos";

export interface PreenchimentoDoFuncionario {
  name?: string;
  description?: string;
  priority?: number;
  system_prompt?: string;
  tool_ids?: string[];
  handoff_keywords?: string[];
  /** O provedor/modelo da ORGANIZAÇÃO (o da plataforma, semeado por N0002) — o default do motor é `anthropic`. */
  provider?: "anthropic" | "openai" | "google" | "openrouter";
  model?: string;
  /** `__instalacao__` = a chave da plataforma (CredentialPicker.CHAVE_DA_INSTALACAO) — sem isso o botão Criar fica travado até a pessoa escolher a chave. */
  credential_id?: string;
}

const PROVEDORES = new Set(["anthropic", "openai", "google", "openrouter"]);

/** Com que IA a organização pensa — o que o SaaS contratou, não o default do upstream. */
async function iaDaOrganizacao(admin: SupabaseClient, orgId: string): Promise<Pick<PreenchimentoDoFuncionario, "provider" | "model">> {
  const { data } = await admin.from("organizations").select("settings").eq("id", orgId).maybeSingle();
  const llm = (data?.settings as { llm?: { provider?: string; default_model?: string } } | null)?.llm;
  const provider = llm?.provider && PROVEDORES.has(llm.provider) ? (llm.provider as PreenchimentoDoFuncionario["provider"]) : undefined;
  // A chave da instalação só é oferecida quando existe para o provedor; senão o
  // picker do motor pede uma chave da organização, como antes.
  const temChaveDaInstalacao = provider ? lerAmbiente().chavesDeProvedor[provider] === true : false;
  return {
    ...(provider ? { provider } : {}),
    ...(llm?.default_model ? { model: llm.default_model } : {}),
    ...(temChaveDaInstalacao ? { credential_id: CHAVE_DA_INSTALACAO } : {}),
  };
}

export async function preenchimentoDoModelo(
  modeloId: string | undefined,
  orgId: string,
  orgName: string,
): Promise<PreenchimentoDoFuncionario | null> {
  const admin = createAdminClient();
  const ia = await iaDaOrganizacao(admin, orgId).catch(() => ({}));
  const modelo = modeloDeFuncionario(modeloId);
  if (!modelo) return Object.keys(ia).length ? ia : null;
  let oQueFaz: string | null = null;
  try {
    const { state } = await loadOnboardingState(orgId);
    oQueFaz = state.welcome?.o_que_faz ?? null;
  } catch {
    oQueFaz = null;
  }
  // Segmento: o que o dono escolheu (Aplicar modelo) ou, na falta, o que o
  // texto do onboarding sugere — a mesma inferência do funil do upstream.
  const { data: orgRow } = await admin.from("organizations").select("settings").eq("id", orgId).maybeSingle();
  const escolhido = (orgRow?.settings as { nutef?: { segmento?: string } } | null)?.nutef?.segmento;
  const segmento = templateDoSegmento(escolhido ?? (oQueFaz ? escolherPacotePorTexto(oQueFaz).id : "generico"));
  const roteiro = modelo.id === "sdr" ? roteiroParaPrompt(segmento) : `Segmento: ${segmento.nome}.`;
  // Só o que existe no catálogo COM handler (o motor descarta o resto) e nunca
  // acima do teto por agente.
  const comHandler = new Set(catalogoComHandler().map((c) => c.name));
  const tool_ids = [...new Set(modelo.capacidades)].filter((n) => comHandler.has(n)).slice(0, TETO_TOOLS_POR_AGENTE);
  return {
    ...ia,
    name: modelo.nome,
    description: `${modelo.funcao} — ${modelo.objetivo}`,
    priority: modelo.priority,
    system_prompt: modelo.prompt({ empresa: orgName, oQueFaz, roteiro }),
    tool_ids,
    handoff_keywords: ["falar com humano", "atendente", "pessoa real", ...modelo.handoff_keywords],
  };
}
