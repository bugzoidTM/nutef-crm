/**
 * O aviso do teste grátis no fim do onboarding (Fase 2 do PRD): quando acaba,
 * quanto custa depois, e onde acompanhar. Server component; some sozinho se a
 * organização não estiver em trial (instalação sem billing, ou já paga).
 */
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { resumoDeBilling } from "../db";
import { dataCurta, dinheiro, dinheiroDeIA } from "./texto";

export async function AvisoDeTeste({ orgId }: { orgId: string }) {
  const resumo = await resumoDeBilling(createAdminClient(), orgId).catch(() => null);
  if (!resumo || resumo.subscription.status !== "trialing") return null;
  const { subscription: s, plan } = resumo;
  return (
    <section className="rounded-lg border border-accent/40 bg-accent-soft/40 p-5">
      <h3 className="text-sm font-medium">Seu teste grátis vai até {dataCurta(s.trial_ends_at)}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Até lá, tudo do plano {plan.name} está liberado, com {dinheiroDeIA(resumo.ai_budget?.monthly_limit_cents ?? 400, resumo.usd_brl)} de
        inteligência artificial para experimentar. Depois, {dinheiro(plan.monthly_price_cents)}/mês — sem surpresa: a
        primeira fatura aparece em{" "}
        <Link className="underline" href="/app/settings/billing">Configurações › Cobrança</Link>, e nada é cobrado sem você ver.
      </p>
    </section>
  );
}
