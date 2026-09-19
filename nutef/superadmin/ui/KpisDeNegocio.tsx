"use client";
/** A faixa de NEGÓCIO do dashboard do superadmin (PRD §27): MRR/ARR, clientes, trials, inadimplência, IA, WhatsApp, erros. */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { formatCentsBRL, formatCentsUSD } from "@/lib/money";
import type { KpisDaPlataforma } from "../kpis";

function Tile({ titulo, valor, nota, href, alerta }: { titulo: string; valor: string; nota?: string; href?: string; alerta?: boolean }) {
  const corpo = (
    <Card className={`p-4 ${alerta ? "border-destructive/50" : ""}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${alerta ? "text-destructive" : ""}`}>{valor}</p>
      {nota ? <p className="text-xs text-muted-foreground">{nota}</p> : null}
    </Card>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{corpo}</Link> : corpo;
}

export function KpisDeNegocio() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "nutef", "kpis"],
    queryFn: () => apiClient.get<{ data: KpisDaPlataforma }>("/api/v1/admin/nutef/kpis").then((r) => r.data),
    staleTime: 60_000,
  });
  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>;
  if (isError || !data) return <p className="text-sm text-destructive">Não foi possível carregar os números do negócio.</p>;
  const k = data;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Negócio</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile titulo="MRR" valor={formatCentsBRL(k.mrr_cents)} nota={`ARR ${formatCentsBRL(k.arr_cents)}`} href="/admin/cobranca" />
        <Tile titulo="Clientes ativos" valor={String(k.ativos)} nota={`${k.organizacoes} organizações · ${k.trials} em teste`} href="/admin/cobranca" />
        <Tile titulo="Inadimplência" valor={String(k.inadimplentes)} nota={`${k.faturas.vencidas} fatura(s) vencida(s) · ${formatCentsBRL(k.faturas.abertas_cents)} em aberto`} href="/admin/cobranca" alerta={k.inadimplentes > 0} />
        <Tile titulo="Cancelamentos (30 d)" valor={String(k.cancelados_30d)} alerta={k.cancelados_30d > 0} />
        <Tile titulo="IA no mês" valor={formatCentsUSD(Math.round(k.ia.custo_mes_cents))} nota={`${k.ia.chamadas_mes} chamadas`} href="/admin/usage" />
        <Tile titulo="WhatsApp" valor={`${k.whatsapp.trabalhando}/${k.whatsapp.total}`} nota={k.whatsapp.com_problema ? `${k.whatsapp.com_problema} com problema` : "sessões trabalhando / total"} alerta={k.whatsapp.com_problema > 0} />
        <Tile titulo="Erros abertos" valor={String(k.erros.abertos)} nota={k.erros.graves ? `${k.erros.graves} graves` : "incidentes"} href="/admin/incidents" alerta={k.erros.graves > 0} />
        <Tile titulo="Infra" valor="health" nota="/api/v1/health: Supabase, Redis, WAHA" href="/api/v1/health" />
      </div>
    </section>
  );
}
