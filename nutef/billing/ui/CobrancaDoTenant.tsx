"use client";
/** /admin/tenants/:id/cobranca — assinatura, faturas e as ações do superadmin sobre um cliente (PRD §28). */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BadgeDeStatus, EXPLICACAO_ESTAGIO, LinhaDeFatura, dinheiro, fraseDoPeriodo } from "./blocos";
import {
  useBillingDaOrganizacao, useCancelarAssinatura, useEmitirFatura, useEstenderPrazo, useMarcarPaga, useTrocarPlano,
} from "./hooks";

export function CobrancaDoTenant({ orgId }: { orgId: string }) {
  const { data, isLoading, isError } = useBillingDaOrganizacao(orgId);
  const trocar = useTrocarPlano(orgId);
  const estender = useEstenderPrazo(orgId);
  const emitir = useEmitirFatura(orgId);
  const cancelar = useCancelarAssinatura(orgId);
  const pagar = useMarcarPaga(orgId);

  const [planoEscolhido, setPlanoEscolhido] = useState<string>("");
  const [ciclo, setCiclo] = useState<"monthly" | "yearly">("monthly");
  const [dias, setDias] = useState("7");
  const [motivo, setMotivo] = useState("");
  const [creditoReais, setCreditoReais] = useState("50");
  const [motivoCancel, setMotivoCancel] = useState("");

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-28 rounded-lg" /><Skeleton className="h-48 rounded-lg" /></div>;
  if (isError || !data) {
    return <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center text-sm text-destructive">Esta organização não tem assinatura (ou a leitura falhou).</div>;
  }
  const { subscription: s, plan, ai_budget, usage_month, invoices, planos } = data;
  const abertas = invoices.filter((f) => f.status === "open");
  const ocupado = trocar.isPending || estender.isPending || emitir.isPending || cancelar.isPending || pagar.isPending;
  const creditoCents = Math.round((Number(creditoReais.replace(",", ".")) || 0) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <BadgeDeStatus status={s.status} />
              </div>
              <p className="text-sm text-muted-foreground">{fraseDoPeriodo(s)} · {dinheiro(plan.monthly_price_cents)}/mês{s.billing_cycle === "yearly" ? " (cobrada anualmente)" : ""}</p>
              {s.dunning_stage > 0 ? <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">{EXPLICACAO_ESTAGIO[s.dunning_stage]}</p> : null}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-muted-foreground">Crédito de IA</dt><dd className="font-medium">{ai_budget ? `${dinheiro(Math.round(Number(ai_budget.consumed_cents)))} de ${dinheiro(ai_budget.monthly_limit_cents)}` : "sem teto ainda"}</dd></div>
            <div><dt className="text-muted-foreground">Usuários</dt><dd className="font-medium">{usage_month.users} / {plan.max_users}</dd></div>
            <div><dt className="text-muted-foreground">Números</dt><dd className="font-medium">{usage_month.whatsapp_numbers} / {plan.max_whatsapp_numbers}</dd></div>
            <div><dt className="text-muted-foreground">Mensagens no mês</dt><dd className="font-medium">{usage_month.messages_in + usage_month.messages_out}</dd></div>
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Faturas</h3>
          <div className="mt-3 space-y-2">
            {invoices.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma fatura ainda — em teste grátis, a primeira sai quando o teste termina.</p> : null}
            {invoices.map((f) => (
              <LinhaDeFatura
                key={f.id}
                f={f}
                acao={f.status === "open" ? (
                  <Button size="sm" variant="outline" disabled={ocupado} onClick={() => pagar.mutate({ invoiceId: f.id })}>
                    Marcar como paga
                  </Button>
                ) : null}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">Trocar plano</h3>
          <Select value={planoEscolhido || plan.slug} onValueChange={setPlanoEscolhido}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {planos.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name} — {dinheiro(p.monthly_price_cents)}/mês</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ciclo} onValueChange={(v) => setCiclo(v as "monthly" | "yearly")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full" disabled={ocupado || (!planoEscolhido && ciclo === s.billing_cycle)} onClick={() => trocar.mutate({ plan_slug: planoEscolhido || plan.slug, billing_cycle: ciclo })}>
            Aplicar
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">Estender prazo</h3>
          <div className="grid gap-2">
            <Label htmlFor="dias">Dias</Label>
            <Input id="dias" type="number" min={1} max={90} value={dias} onChange={(e) => setDias(e.target.value)} />
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex.: cliente pediu mais tempo para avaliar" />
          </div>
          <Button className="w-full" variant="outline" disabled={ocupado || motivo.trim().length < 5} onClick={() => estender.mutate({ dias: Number(dias) || 7, reason: motivo.trim() })}>
            Dar mais {dias || 7} dias
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">Faturar</h3>
          <Button className="w-full" variant="outline" disabled={ocupado || abertas.length > 0} onClick={() => emitir.mutate({ kind: "subscription" })}>
            Emitir fatura do período
          </Button>
          <div className="grid gap-2">
            <Label htmlFor="credito">Crédito extra de IA (R$)</Label>
            <Input id="credito" inputMode="decimal" value={creditoReais} onChange={(e) => setCreditoReais(e.target.value)} />
          </div>
          <Button className="w-full" variant="outline" disabled={ocupado || creditoCents < 100} onClick={() => emitir.mutate({ kind: "ai_credit", amount_cents: creditoCents, credit_cents: creditoCents })}>
            Emitir fatura de crédito
          </Button>
          <p className="text-xs text-muted-foreground">O crédito entra quando a fatura for marcada como paga.</p>
        </Card>

        {s.status !== "cancelled" ? (
          <Card className="space-y-3 border-destructive/40 p-4">
            <h3 className="font-semibold text-destructive">Cancelar assinatura</h3>
            <Textarea rows={2} value={motivoCancel} onChange={(e) => setMotivoCancel(e.target.value)} placeholder="Motivo (mínimo 10 caracteres)" />
            <Button className="w-full" variant="destructive" disabled={ocupado || motivoCancel.trim().length < 10} onClick={() => cancelar.mutate({ reason: motivoCancel.trim() })}>
              Cancelar
            </Button>
            <p className="text-xs text-muted-foreground">Não suspende a organização nem apaga nada; só encerra a cobrança.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
