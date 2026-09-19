/**
 * /app/settings/billing — o que o CLIENTE vê: plano, situação, crédito de IA do
 * mês, faturas e como pagar (PRD §20/§25/§26). Server component: a organização
 * vem da sessão (fonte confiável), a leitura é `fn_billing_resumo` com service
 * role — e a função só devolve a própria org quando há usuário na sessão.
 */
import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { resumoDeBilling } from "../db";
import { BadgeDeStatus, LinhaDeFatura } from "./blocos";
import { EXPLICACAO_ESTAGIO, dinheiro, dinheiroDeIA, fraseDoPeriodo } from "./texto";

function Barra({ usado, total }: { usado: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((usado / total) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-muted">
      <div className={`h-full ${pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-accent"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export async function PaginaCobranca({ orgId, suporte }: { orgId: string; suporte: string }) {
  const resumo = await resumoDeBilling(createAdminClient(), orgId).catch(() => null);

  if (!resumo) {
    return (
      <Card className="max-w-xl p-6">
        <h2 className="text-sm font-semibold">Sem assinatura cadastrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta organização ainda não tem um plano vinculado.{" "}
          {suporte ? <>Fale com <a className="underline" href={`mailto:${suporte}`}>{suporte}</a>.</> : <>Fale com quem administra este sistema.</>}
        </p>
      </Card>
    );
  }

  const { subscription: s, plan, ai_budget, usage_month, open_invoices, usd_brl } = resumo;
  const ia = (c: number) => dinheiroDeIA(c, usd_brl);
  const consumido = ai_budget ? Math.round(Number(ai_budget.consumed_cents)) : 0;
  const teto = ai_budget?.monthly_limit_cents ?? 0;

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Plano {plan.name}</h2>
            <BadgeDeStatus status={s.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {fraseDoPeriodo(s)} · {dinheiro(plan.monthly_price_cents)}/mês
          </p>
          {s.dunning_stage > 0 ? (
            <p className="mt-3 rounded-md border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {EXPLICACAO_ESTAGIO[s.dunning_stage]}
            </p>
          ) : null}
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Usuários</dt><dd className="font-medium">{usage_month.users} de {plan.max_users}</dd></div>
            <div><dt className="text-muted-foreground">Números de WhatsApp</dt><dd className="font-medium">{usage_month.whatsapp_numbers} de {plan.max_whatsapp_numbers}</dd></div>
            <div><dt className="text-muted-foreground">Mensagens no mês</dt><dd className="font-medium">{usage_month.messages_in + usage_month.messages_out}</dd></div>
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Inteligência artificial neste mês</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {teto > 0 ? (
              <>
                {ia(consumido)} usados de {ia(teto)}{" "}
                {s.status === "trialing" ? <>incluídos no período de teste (o plano {plan.name} dá {ia(plan.ai_credit_cents)}/mês)</> : <>incluídos no plano</>}
                {s.ai_extra_credit_cents ? ` (+ ${ia(s.ai_extra_credit_cents)} de crédito extra)` : ""}.
              </>
            ) : <>O crédito de IA é aplicado em até uma hora após a criação da conta.</>}
          </p>
          <div className="mt-3"><Barra usado={consumido} total={teto} /></div>
          <p className="mt-2 text-xs text-muted-foreground">
            Ao atingir o limite, os funcionários de IA pausam até o próximo mês — sua equipe continua atendendo normalmente. Para mais crédito, peça pelo suporte.
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Faturas em aberto</h3>
          <div className="mt-3 space-y-2">
            {open_invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura pendente.</p>
            ) : open_invoices.map((f) => <LinhaDeFatura key={f.id} f={f} />)}
          </div>
          {open_invoices.length > 0 && !open_invoices.some((f) => f.payment_url) ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Para pagar, {suporte ? <>fale com <a className="underline" href={`mailto:${suporte}`}>{suporte}</a></> : <>fale com quem administra este sistema</>} — o link de pagamento automático chega em breve.
            </p>
          ) : null}
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold">O que está incluído</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Até {plan.max_users} usuários</li>
            <li>Até {plan.max_whatsapp_numbers} {plan.max_whatsapp_numbers === 1 ? "número" : "números"} de WhatsApp</li>
            <li>{ia(plan.ai_credit_cents)}/mês em inteligência artificial</li>
            {plan.max_contacts ? <li>Até {plan.max_contacts.toLocaleString("pt-BR")} contatos</li> : <li>Contatos ilimitados</li>}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Quer mudar de plano?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {suporte ? <>Escreva para <a className="underline" href={`mailto:${suporte}?subject=Mudar%20de%20plano`}>{suporte}</a> e a troca vale no mesmo dia.</> : <>Fale com quem administra este sistema.</>}
          </p>
        </Card>
      </div>
    </div>
  );
}
