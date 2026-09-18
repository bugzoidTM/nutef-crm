"use client";
/** /admin/cobranca — o painel SaaS do superadmin: MRR, trials, inadimplência e uma linha por cliente (PRD §27/§28). */
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePainelDeBilling } from "./hooks";
import { BadgeDeStatus } from "./blocos";
import { dataCurta, dinheiro } from "./texto";

function Indicador({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      {nota ? <p className="text-xs text-muted-foreground">{nota}</p> : null}
    </Card>
  );
}

export function PainelAdmin() {
  const { data, isLoading, isError } = usePainelDeBilling();
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }
  if (isError || !data) {
    return <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center text-sm text-destructive">Não foi possível carregar a cobrança.</div>;
  }
  const s = data.por_status;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cobrança</h1>
        <p className="mt-1 text-sm text-muted-foreground">Receita recorrente, testes em andamento e quem está em atraso.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Indicador titulo="MRR" valor={dinheiro(data.mrr_cents)} nota={`ARR ${dinheiro(data.mrr_cents * 12)}`} />
        <Indicador titulo="Clientes ativos" valor={String(s.active)} />
        <Indicador titulo="Em teste" valor={String(s.trialing)} />
        <Indicador titulo="Em atraso" valor={String(s.past_due + s.suspended)} nota={`${s.suspended} suspensos`} />
        <Indicador titulo="Faturas em aberto" valor={dinheiro(data.faturas_abertas.total_cents)} nota={`${data.faturas_abertas.quantidade} faturas · ${data.faturas_abertas.vencidas} vencidas`} />
      </div>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Mensalidade</TableHead>
              <TableHead className="text-right">Em aberto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.linhas.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma organização com assinatura ainda.</TableCell></TableRow>
            ) : data.linhas.map((l) => (
              <TableRow key={l.organization_id}>
                <TableCell>
                  <Link className="font-medium underline-offset-2 hover:underline" href={`/admin/tenants/${l.organization_id}/cobranca`}>{l.display_name}</Link>
                  <div className="text-xs text-muted-foreground">{l.slug}{l.org_status !== "active" ? ` · org ${l.org_status}` : ""}</div>
                </TableCell>
                <TableCell>{l.plan.name}{l.subscription.billing_cycle === "yearly" ? " (anual)" : ""}</TableCell>
                <TableCell><BadgeDeStatus status={l.subscription.status} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{dataCurta(l.subscription.current_period_start)} → {dataCurta(l.subscription.current_period_end)}</TableCell>
                <TableCell className="text-right tabular-nums">{dinheiro(l.plan.monthly_price_cents)}</TableCell>
                <TableCell className="text-right tabular-nums">{l.open_invoices_cents ? dinheiro(l.open_invoices_cents) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
