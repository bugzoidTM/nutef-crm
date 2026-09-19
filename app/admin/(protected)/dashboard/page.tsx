import { DashboardClient } from "./_client";
// Fork Nutef CRM (nutef/registro-core.md): a faixa de negócio do SaaS (PRD §27) em cima do dashboard do motor.
import { KpisDeNegocio } from "@/nutef/superadmin/ui/KpisDeNegocio";

export const metadata = { title: "Dashboard — Admin Plataforma" };

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <KpisDeNegocio />
      <DashboardClient />
    </div>
  );
}
