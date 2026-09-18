/**
 * Tipos do billing (camada do fork Nutef CRM). Espelham nutef/db/migrations/
 * N0001_billing.sql à mão, de propósito: regenerar lib/database.types.ts a cada
 * mudança nossa criaria um diff gigante num arquivo que o upstream regenera —
 * conflito garantido em todo sync. O contrato é pequeno; manter à mão custa
 * menos que resolver merge.
 */

export const STATUS_DE_ASSINATURA = ["trialing", "active", "past_due", "suspended", "cancelled"] as const;
export type StatusDeAssinatura = (typeof STATUS_DE_ASSINATURA)[number];

export const PROVEDORES = ["manual", "asaas"] as const;
export type Provedor = (typeof PROVEDORES)[number];

export const STATUS_DE_FATURA = ["draft", "open", "paid", "void", "uncollectible"] as const;
export type StatusDeFatura = (typeof STATUS_DE_FATURA)[number];

/** PRD §24: 0 em dia · 1 aviso · 2 envios automáticos bloqueados · 3 conta suspensa */
export type EstagioDaRegua = 0 | 1 | 2 | 3;

export interface Plano {
  id: string;
  slug: string;
  name: string;
  monthly_price_cents: number;
  yearly_price_cents: number | null;
  max_users: number;
  max_whatsapp_numbers: number;
  /** CENTAVOS DE DÓLAR — a unidade do motor (N0003). */
  ai_credit_cents: number;
  max_contacts: number | null;
  features: Record<string, unknown>;
  is_public: boolean;
  sort_order: number;
}

export interface Assinatura {
  id: string;
  organization_id: string;
  plan_id: string;
  status: StatusDeAssinatura;
  billing_cycle: "monthly" | "yearly";
  started_at: string;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at: string | null;
  cancelled_at: string | null;
  payment_provider: Provedor;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  dunning_stage: EstagioDaRegua;
  dunning_stage_at: string | null;
  ai_extra_credit_cents: number;
}

export interface Fatura {
  id: string;
  organization_id: string;
  subscription_id: string;
  amount_cents: number;
  currency: string;
  status: StatusDeFatura;
  kind: "subscription" | "ai_credit" | "adjustment";
  credit_cents: number | null;
  description: string | null;
  due_date: string;
  paid_at: string | null;
  provider: Provedor;
  provider_invoice_id: string | null;
  payment_url: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export interface UsoDoMes {
  messages_in: number;
  messages_out: number;
  ai_tokens: number;
  ai_cost_cents: number;
  users: number;
  whatsapp_numbers: number;
  contacts: number;
}

/** O que fn_billing_resumo(org) devolve — a leitura única das telas. */
export interface ResumoDeBilling {
  subscription: Assinatura;
  plan: Plano;
  ai_budget: {
    monthly_limit_cents: number;
    consumed_cents: number;
    is_throttled: boolean;
    is_disabled: boolean;
  } | null;
  usage_month: UsoDoMes;
  open_invoices: Fatura[];
  /** Taxa USD→BRL da plataforma, só para exibir ≈ R$ (null = não mostrar). */
  usd_brl: number | null;
}

/** O que fn_billing_tick devolve. */
export interface ResultadoDoTick {
  past_due: number;
  stage2: number;
  stage3: number;
  invoices: number;
  usage_rows: number;
  ai_budgets_synced: number;
  changed: Array<{ organization_id: string; stage: EstagioDaRegua; from?: StatusDeAssinatura }>;
  effect: boolean;
}
