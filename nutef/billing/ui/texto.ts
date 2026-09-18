/**
 * Rótulos e formatadores das telas de cobrança — sem "use client", para servir
 * tanto a server components quanto a client components. Vocabulário do
 * produto (PRD §4): "assinatura", "plano", "fatura", "crédito de IA".
 */
import { formatCentsBRL, formatCentsUSD } from "@/lib/money";
import type { Assinatura, EstagioDaRegua, StatusDeAssinatura, StatusDeFatura } from "../types";

export const ROTULO_STATUS: Record<StatusDeAssinatura, string> = {
  trialing: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento em atraso",
  suspended: "Suspensa por falta de pagamento",
  cancelled: "Cancelada",
};

export const ROTULO_FATURA: Record<StatusDeFatura, string> = {
  draft: "Rascunho",
  open: "Em aberto",
  paid: "Paga",
  void: "Cancelada",
  uncollectible: "Perdida",
};

export const EXPLICACAO_ESTAGIO: Record<EstagioDaRegua, string> = {
  0: "",
  1: "Há uma fatura em aberto. Regularize para evitar a pausa dos envios automáticos.",
  2: "Os envios automáticos (funcionários de IA e follow-ups) estão pausados até o pagamento. Sua equipe continua atendendo pela Caixa de Entrada.",
  3: "A conta está suspensa por falta de pagamento. Nenhum dado foi apagado — o pagamento reativa tudo.",
};

export const dinheiro = (cents: number) => formatCentsBRL(cents);

/**
 * Crédito/custo de IA: o motor mede em centavos de DÓLAR e o upstream não
 * converte câmbio (BudgetCard.tsx explica). Mostramos US$ e um "≈ R$" pela
 * taxa da plataforma (nutef_platform_settings.usd_brl), só para leitura.
 */
export function dinheiroDeIA(usdCents: number, usdBrl: number | null): string {
  const usd = formatCentsUSD(usdCents);
  if (!usdBrl || usdBrl <= 0) return usd;
  return `${usd} (≈ ${formatCentsBRL(Math.round(usdCents * usdBrl))})`;
}

export function dataCurta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** "até 25/09" para trial; "renova em 25/10" para ativa; "venceu em …" para atraso. */
export function fraseDoPeriodo(s: Assinatura): string {
  switch (s.status) {
    case "trialing":
      return `Teste grátis até ${dataCurta(s.trial_ends_at)}`;
    case "active":
      return `Próxima cobrança em ${dataCurta(s.current_period_end)}`;
    case "past_due":
      return `Período venceu em ${dataCurta(s.current_period_start)}`;
    case "suspended":
      return `Suspensa desde ${dataCurta(s.dunning_stage_at)}`;
    case "cancelled":
      return `Cancelada em ${dataCurta(s.cancelled_at)}`;
  }
}

