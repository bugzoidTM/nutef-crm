import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { traduzir } from "@/lib/i18n/dicionario";
// Fork Nutef CRM (nutef/registro-core.md): a vitrine mora em nutef/funcionarios/ui.
import { Vitrine } from "@/nutef/funcionarios/ui/Vitrine";
import { Equipe } from "@/nutef/funcionarios/ui/Equipe";
import { equipeDeIA } from "@/nutef/funcionarios/equipe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** "Funcionários de IA" — os modelos prontos (PRD §8, Fase 3). Criar continua sendo admin-only, como em /app/ai/agents/new. */
export default async function FuncionariosPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  if (ROLE_RANK[activeOrg.role] < ROLE_RANK.manager) redirect("/403");
  const idioma = user.idioma;
  const equipe = await equipeDeIA(await createClient(), activeOrg.orgId);
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{traduzir("Funcionários de IA", idioma)}</h1>
        <p className="text-sm text-muted-foreground">
          {traduzir("Escolha um modelo pronto; você revisa como ele fala e o que pode fazer antes de publicar.", idioma)}{" "}
          <Link className="underline" href="/app/ai/agents">{traduzir("Ver os que já trabalham aqui", idioma)}</Link>
        </p>
      </header>
      <Equipe equipe={equipe} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{traduzir("Contratar mais um", idioma)}</h2>
        <Vitrine />
      </section>
    </div>
  );
}
