/**
 * Traduz um modelo de funcionário no pré-preenchimento do formulário de
 * criação do motor. Server-only: lê o "o que vocês fazem" do onboarding e o
 * catálogo de capacidades com handler.
 */
import { catalogoComHandler } from "@/lib/ai/agents/capacidades-padrao";
import { ligarPacote } from "@/lib/mcp/tools/selecao-por-pacote";
import { loadOnboardingState } from "@/app/actions/onboarding/_shared";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { modeloDeFuncionario } from "./modelos";

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
}

const PROVEDORES = new Set(["anthropic", "openai", "google", "openrouter"]);

/** Com que IA a organização pensa — o que o SaaS contratou, não o default do upstream. */
async function iaDaOrganizacao(admin: SupabaseClient, orgId: string): Promise<Pick<PreenchimentoDoFuncionario, "provider" | "model">> {
  const { data } = await admin.from("organizations").select("settings").eq("id", orgId).maybeSingle();
  const llm = (data?.settings as { llm?: { provider?: string; default_model?: string } } | null)?.llm;
  const provider = llm?.provider && PROVEDORES.has(llm.provider) ? (llm.provider as PreenchimentoDoFuncionario["provider"]) : undefined;
  return { ...(provider ? { provider } : {}), ...(llm?.default_model ? { model: llm.default_model } : {}) };
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
  const catalogo = catalogoComHandler();
  const tool_ids = modelo.pacotes.reduce<string[]>((acc, p) => ligarPacote(acc, catalogo, p), []);
  return {
    ...ia,
    name: modelo.nome,
    description: `${modelo.funcao} — ${modelo.objetivo}`,
    priority: modelo.priority,
    system_prompt: modelo.prompt({ empresa: orgName, oQueFaz }),
    tool_ids,
    handoff_keywords: ["falar com humano", "atendente", "pessoa real", ...modelo.handoff_keywords],
  };
}
