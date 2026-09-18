"use client";
/**
 * Componentes compartilhados das telas de cobrança (cliente e superadmin).
 * As funções e rótulos puros moram em ./texto.ts — módulo SEM "use client",
 * porque um server component (PaginaCobranca) também os chama, e chamar
 * função de módulo cliente a partir do servidor é erro de runtime no Next
 * (medido no staging: "Attempted to call fraseDoPeriodo() from the server").
 */
import { Badge } from "@/components/ui/badge";
import type { Fatura, StatusDeAssinatura, StatusDeFatura } from "../types";
import { ROTULO_FATURA, ROTULO_STATUS, dataCurta, dinheiro } from "./texto";

export function BadgeDeStatus({ status }: { status: StatusDeAssinatura }) {
  const variant =
    status === "active" ? "success" : status === "trialing" ? "info" : status === "past_due" ? "warning" : status === "suspended" ? "error" : "neutral";
  return <Badge variant={variant}>{ROTULO_STATUS[status]}</Badge>;
}

export function BadgeDeFatura({ status }: { status: StatusDeFatura }) {
  const variant = status === "paid" ? "success" : status === "open" ? "warning" : status === "uncollectible" ? "error" : "neutral";
  return <Badge variant={variant}>{ROTULO_FATURA[status]}</Badge>;
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
