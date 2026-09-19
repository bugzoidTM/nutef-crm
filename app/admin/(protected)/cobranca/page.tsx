import { PainelAdmin } from "@/nutef/billing/ui/PainelAdmin";

export const metadata = { title: "Cobrança — Admin Plataforma" };

/** Painel SaaS do superadmin (fork Nutef CRM, PRD §27). A tela mora em nutef/billing/ui. */
export default function AdminCobrancaPage() {
  return <PainelAdmin />;
}
