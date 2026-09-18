import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { createClient } from "@/lib/supabase/server";
import type { CredentialRow } from "@/hooks/ai/useCredentials";

import { lerAmbiente } from "@/lib/instalacao/ambiente";

import { AgentForm } from "../[id]/_components/AgentForm";
// Fork Nutef CRM (nutef/registro-core.md): `?modelo=` pré-preenche a tela com um funcionário pronto.
import { preenchimentoDoModelo } from "@/nutef/funcionarios/preenchimento";

export const dynamic = "force-dynamic";

const CREDENTIAL_COLUMNS =
  "id, organization_id, provider, label, api_key_last4, validated_at, validation_error, models_available, is_active, created_by, created_at, updated_at";

/**
 * Os provedores cuja chave veio na INSTALAÇÃO (`.env`), não da tela de
 * Credenciais.
 *
 * Sai de `lerAmbiente`, a mesma leitura que o retrato da instalação usa — uma
 * segunda lista de nomes de variável divergiria no dia em que um provedor novo
 * entrasse.
 */
function provedoresDaInstalacao(): string[] {
  const a = lerAmbiente();
  return Object.entries(a.chavesDeProvedor)
    .filter(([, tem]) => tem)
    .map(([id]) => id);
}

export default async function NewAgentPage({ searchParams }: { searchParams: Promise<{ modelo?: string }> }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  if (ROLE_RANK[activeOrg.role] < ROLE_RANK.admin) {
    redirect("/403");
  }

  const supabase = await createClient();
  const [credentialsRes, channelSessions] = await Promise.all([
    supabase
      .from("ai_provider_credentials_safe")
      .select(CREDENTIAL_COLUMNS)
      .eq("organization_id", activeOrg.orgId),
    listSelectableChannels(supabase, activeOrg.orgId),
  ]);

  const credentials = (credentialsRes.data ?? []) as unknown as CredentialRow[];
  const inicial = await preenchimentoDoModelo((await searchParams).modelo, activeOrg.orgId, activeOrg.name);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <AgentForm
        mode="create"
        credentials={credentials}
        provedoresDaInstalacao={provedoresDaInstalacao()}
        channelSessions={channelSessions}
        inicial={inicial ?? undefined}
      />
    </div>
  );
}
