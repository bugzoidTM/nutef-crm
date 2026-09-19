/** Leituras do painel do superadmin (Fase 5) — service role, só números. */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface KpisDaPlataforma {
  mrr_cents: number; arr_cents: number;
  ativos: number; trials: number; inadimplentes: number; cancelados_30d: number; organizacoes: number;
  ia: { custo_mes_cents: number; chamadas_mes: number };
  whatsapp: { trabalhando: number; com_problema: number; total: number };
  erros: { abertos: number; graves: number };
  faturas: { abertas: number; abertas_cents: number; vencidas: number };
}

export interface SaudeDaOrganizacao {
  organization_id: string;
  usuarios: number; numeros_total: number; numeros_trabalhando: number;
  ia_custo_mes_cents: number; ia_teto_cents: number | null;
  ultima_atividade: string | null; incidentes_abertos: number; conversas_abertas: number;
}

export async function kpisDaPlataforma(admin: SupabaseClient): Promise<KpisDaPlataforma> {
  const { data, error } = await admin.rpc("fn_nutef_kpis_da_plataforma");
  if (error) throw new Error(`kpis: ${error.message}`);
  return data as KpisDaPlataforma;
}

export async function saudePorOrganizacao(admin: SupabaseClient): Promise<Map<string, SaudeDaOrganizacao>> {
  const { data, error } = await admin.rpc("fn_nutef_saude_por_organizacao");
  if (error) throw new Error(`saude: ${error.message}`);
  const rows = (data ?? []) as Array<SaudeDaOrganizacao & { ia_custo_mes_cents: string | number }>;
  return new Map(rows.map((r) => [r.organization_id, { ...r, ia_custo_mes_cents: Number(r.ia_custo_mes_cents) }]));
}
