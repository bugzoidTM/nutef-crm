"use client";
/**
 * Peças compartilhadas das telas de cobrança (cliente e superadmin).
 * Vocabulário do produto (PRD §4): fala-se "assinatura", "plano", "fatura",
 * "crédito de IA" — nunca "dunning", "tick", "subscription".
 */
import { Badge } from "@/components/ui/badge";
import { formatCentsBRL } from "@/lib/money";
import type { Assinatura, EstagioDaRegua, Fatura, StatusDeAssinatura, StatusDeFatura } from "../types";

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

export function BadgeDeStatus({ status }: { status: StatusDeAssinatura }) {
  const variant =
    status === "active" ? "success" : status === "trialing" ? "info" : status === "past_due" ? "warning" : status === "suspended" ? "error" : "neutral";
  return <Badge variant={variant}>{ROTULO_STATUS[status]}</Badge>;
}

export function BadgeDeFatura({ status }: { status: StatusDeFatura }) {
  const variant = status === "paid" ? "success" : status === "open" ? "warning" : status === "uncollectible" ? "error" : "neutral";
  return <Badge variant={variant}>{ROTULO_FATURA[status]}</Badge>;
}

export const dinheiro = (cents: number) => formatCentsBRL(cents);

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

export function LinhaDeFatura({ f, acao }: { f: Fatura; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{dinheiro(f.amount_cents)}</span>
          <BadgeDeFatura status={f.status} />
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {f.description ?? (f.kind === "ai_credit" ? "Crédito extra de IA" : "Assinatura")} · vence {dataCurta(f.due_date)}
          {f.paid_at ? ` · paga em ${dataCurta(f.paid_at)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {f.payment_url && f.status === "open" ? (
          <a className="text-sm underline" href={f.payment_url} target="_blank" rel="noreferrer">
            Pagar
          </a>
        ) : null}
        {acao}
      </div>
    </div>
  );
}
