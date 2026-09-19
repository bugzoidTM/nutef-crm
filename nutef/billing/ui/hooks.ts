"use client";
/** Leituras e mutações do superadmin sobre o billing (react-query, como os hooks do upstream). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import type { PainelDeBilling } from "../admin";
import type { Fatura, Plano, ResumoDeBilling } from "../types";

export type PainelResposta = { data: PainelDeBilling & { planos: Plano[] } };
export type DetalheResposta = { data: ResumoDeBilling & { invoices: Fatura[]; planos: Plano[] } };

export function usePainelDeBilling() {
  return useQuery({
    queryKey: ["admin", "billing"],
    queryFn: () => apiClient.get<PainelResposta>("/api/v1/admin/billing").then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useBillingDaOrganizacao(orgId: string) {
  return useQuery({
    queryKey: ["admin", "billing", orgId],
    queryFn: () => apiClient.get<DetalheResposta>(`/api/v1/admin/billing/${orgId}`).then((r) => r.data),
    staleTime: 15_000,
    enabled: !!orgId,
  });
}

function useAcao<P>(orgId: string, mensagem: string, fn: (p: P) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "billing"] });
      void qc.invalidateQueries({ queryKey: ["admin", "tenant", orgId] });
      toast.success(mensagem);
    },
    onError: (err: Error) => toast.error("Não deu certo", { description: err.message }),
  });
}

export const useTrocarPlano = (orgId: string) =>
  useAcao(orgId, "Plano alterado", (p: { plan_slug: string; billing_cycle?: "monthly" | "yearly" }) =>
    apiClient.post(`/api/v1/admin/billing/${orgId}/plano`, p),
  );

export const useEstenderPrazo = (orgId: string) =>
  useAcao(orgId, "Prazo estendido", (p: { dias: number; reason: string }) =>
    apiClient.post(`/api/v1/admin/billing/${orgId}/trial`, p),
  );

export const useEmitirFatura = (orgId: string) =>
  useAcao(orgId, "Fatura emitida", (p: { kind: "subscription" } | { kind: "ai_credit"; amount_cents: number; credit_cents: number }) =>
    apiClient.post(`/api/v1/admin/billing/${orgId}/fatura`, p),
  );

export const useCancelarAssinatura = (orgId: string) =>
  useAcao(orgId, "Assinatura cancelada", (p: { reason: string }) =>
    apiClient.post(`/api/v1/admin/billing/${orgId}/cancelar`, p),
  );

export const useMarcarPaga = (orgId: string) =>
  useAcao(orgId, "Pagamento confirmado", (p: { invoiceId: string }) =>
    apiClient.post(`/api/v1/admin/billing/invoices/${p.invoiceId}/pagar`, {}),
  );
