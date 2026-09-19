/**
 * A equipe de IA da organização com as métricas do PRD §8/§54 (conversas
 * atendidas, passagens para humano, custo), lidas de ai_agents + ai_agent_runs
 * do mês corrente. Consulta com o client da SESSÃO (RLS decide o escopo) —
 * nada de service role aqui.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface FuncionarioDaEquipe {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  publicado: boolean;
  conversas_mes: number;
  passagens_mes: number;
  custo_mes_cents: number;
  falhas_mes: number;
}

export async function equipeDeIA(supabase: SupabaseClient, orgId: string): Promise<FuncionarioDaEquipe[]> {
  const inicioDoMes = new Date();
  inicioDoMes.setUTCDate(1); inicioDoMes.setUTCHours(0, 0, 0, 0);
  const [{ data: agentes }, { data: runs }] = await Promise.all([
    supabase
      .from("ai_agents")
      .select("id, name, description, is_active, published_version_id, archived_at")
      .eq("organization_id", orgId)
      .is("archived_at", null)
      .order("priority")
      .order("created_at"),
    supabase
      .from("ai_agent_runs")
      .select("agent_id, conversation_id, status, cost_cents")
      .eq("organization_id", orgId)
      .eq("is_dry_run", false)
      .gte("created_at", inicioDoMes.toISOString())
      .limit(20000),
  ]);
  const porAgente = new Map<string, { conversas: Set<string>; passagens: number; custo: number; falhas: number }>();
  for (const r of runs ?? []) {
    const k = r.agent_id as string; if (!k) continue;
    const m = porAgente.get(k) ?? { conversas: new Set<string>(), passagens: 0, custo: 0, falhas: 0 };
    if (r.conversation_id) m.conversas.add(r.conversation_id as string);
    if (r.status === "handoff") m.passagens += 1;
    if (r.status === "failed") m.falhas += 1;
    m.custo += Number(r.cost_cents ?? 0);
    porAgente.set(k, m);
  }
  return (agentes ?? []).map((a) => {
    const m = porAgente.get(a.id as string);
    return {
      id: a.id as string,
      nome: a.name as string,
      descricao: (a.description as string | null) ?? null,
      ativo: Boolean(a.is_active),
      publicado: Boolean(a.published_version_id),
      conversas_mes: m?.conversas.size ?? 0,
      passagens_mes: m?.passagens ?? 0,
      custo_mes_cents: Math.round(m?.custo ?? 0),
      falhas_mes: m?.falhas ?? 0,
    };
  });
}
