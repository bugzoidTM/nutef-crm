import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
// Fork Nutef CRM (nutef/registro-core.md): o aviso do teste grátis no fim do onboarding.
import { AvisoDeTeste } from "@/nutef/billing/ui/AvisoDeTeste";
import { redirect } from "next/navigation";
import { loadOnboardingState } from "@/app/actions/onboarding/_shared";
import { resumoDoOnboarding } from "@/lib/onboarding/passos";
import { env } from "@/lib/env";
import { oQueMaisExiste } from "@/lib/onboarding/o-que-mais-existe";
import { DoneClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function DonePage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/login");

  const { state } = await loadOnboardingState(activeOrg.orgId);

  // O resumo sai da MESMA fonte que decidiu a ordem e desenhou o indicador.
  // Antes era uma terceira lista, fixa, e por isso ela listava "Loja Nuvemshop
  // (pulado)" em instalações que nunca ofereceram esse passo — o wizard
  // acusando a pessoa de não fazer o que ninguém lhe pediu.
  const itens = resumoDoOnboarding(state, { lojaLigada: env.NUVEMSHOP_ENABLED });

  return (
    <>
      <AvisoDeTeste orgId={activeOrg.orgId} />
      <DoneClient itens={itens} pecas={oQueMaisExiste()} />
    </>
  );
}
