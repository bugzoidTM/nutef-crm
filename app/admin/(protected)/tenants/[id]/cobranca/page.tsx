import { CobrancaDoTenant } from "@/nutef/billing/ui/CobrancaDoTenant";

/** Aba Cobrança do tenant (fork Nutef CRM, PRD §28). A tela mora em nutef/billing/ui. */
export default async function TenantCobrancaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CobrancaDoTenant orgId={id} />;
}
