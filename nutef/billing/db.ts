/**
 * Acesso ao billing pelo servidor (service role). Toda escrita passa pelas
 * funções SQL de nutef/db/migrations/N0001_billing.sql — a lógica mora no banco
 * e é uma transação por passo; aqui só há chamada + tipagem.
 *
 * Service role ignora RLS: quem chama estas funções JÁ resolveu a organização
 * de fonte confiável (sessão/rota admin), nunca do body — regra do CLAUDE.md.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Fatura, ResultadoDoTick, ResumoDeBilling } from "./types";

async function rpc<T>(admin: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export function executarTick(admin: SupabaseClient, agora?: Date): Promise<ResultadoDoTick> {
  return rpc<ResultadoDoTick>(admin, "fn_billing_tick", agora ? { p_now: agora.toISOString() } : {});
}

export function resumoDeBilling(admin: SupabaseClient, organizationId: string): Promise<ResumoDeBilling | null> {
  return rpc<ResumoDeBilling | null>(admin, "fn_billing_resumo", { p_org: organizationId });
}

export function envioAutomaticoPermitido(admin: SupabaseClient, organizationId: string): Promise<boolean> {
  return rpc<boolean>(admin, "fn_billing_envio_automatico_permitido", { p_org: organizationId });
}

export function confirmarPagamento(
  admin: SupabaseClient,
  faturaId: string,
  porUsuario: string | null,
  quando?: Date,
): Promise<{ applied_now: boolean; invoice_id: string; organization_id?: string; kind?: Fatura["kind"] }> {
  return rpc(admin, "fn_billing_confirmar_pagamento", {
    p_fatura: faturaId,
    p_por: porUsuario,
    ...(quando ? { p_quando: quando.toISOString() } : {}),
  });
}

export function sincronizarOrcamentoDeIA(admin: SupabaseClient): Promise<number> {
  return rpc<number>(admin, "fn_billing_sincronizar_orcamento_ia", {});
}
