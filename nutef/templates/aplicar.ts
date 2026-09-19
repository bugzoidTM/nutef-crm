"use server";
/**
 * Aplicar um template de segmento à organização ativa (Fase 4). O que faz, e só:
 *   1. guarda o segmento escolhido em organizations.settings.nutef.segmento
 *      (é o que os funcionários novos leem para montar o roteiro);
 *   2. acrescenta os campos do funil ao funil padrão (settings.fields, schema
 *      do upstream) — MERGE por key, nunca apaga campo que o dono já criou;
 *   3. cria o fluxo de retomada em RASCUNHO, se ainda não existir com esse
 *      nome — o dono revisa e publica na tela de follow-ups do motor.
 * Não cria funil (isso é do onboarding), não cria FAQ com resposta inventada,
 * não publica nada sozinho. Admin da organização; auditado.
 */
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { customFieldSchema } from "@/lib/schemas/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEMPLATES, templateDoSegmento, type SegmentoId } from "./segmentos";

const entrada = z.object({ segmento: z.enum(["clinica", "imobiliaria", "servicos", "generico"]) });

export interface ResultadoDoTemplate {
  ok: boolean;
  erro?: string;
  segmento?: SegmentoId;
  camposAcrescentados?: number;
  funil?: string | null;
  fluxo?: "criado" | "ja_existia" | null;
}

export async function aplicarTemplate(formData: FormData): Promise<ResultadoDoTemplate> {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (!org || ROLE_RANK[org.role] < ROLE_RANK.admin) return { ok: false, erro: "Só o administrador da organização aplica um modelo." };
  const parsed = entrada.safeParse({ segmento: formData.get("segmento") });
  if (!parsed.success) return { ok: false, erro: "Segmento inválido." };
  const t = templateDoSegmento(parsed.data.segmento);
  const admin = createAdminClient();

  // 1) segmento na organização (merge no jsonb; só a chave nutef.segmento)
  const { data: orgRow, error: eOrg } = await admin.from("organizations").select("settings").eq("id", org.orgId).maybeSingle();
  if (eOrg || !orgRow) return { ok: false, erro: "Não consegui ler a organização." };
  const settings = (orgRow.settings as Record<string, unknown> | null) ?? {};
  const nutef = (settings.nutef as Record<string, unknown> | undefined) ?? {};
  const { error: eSet } = await admin
    .from("organizations")
    .update({ settings: { ...settings, nutef: { ...nutef, segmento: t.id } } })
    .eq("id", org.orgId);
  if (eSet) return { ok: false, erro: "Não consegui guardar o segmento." };

  // 2) campos do funil padrão (merge por key)
  let camposAcrescentados = 0;
  let funil: string | null = null;
  const { data: pipe } = await admin
    .from("crm_pipelines")
    .select("id, name, settings")
    .eq("organization_id", org.orgId)
    .eq("is_default", true)
    .eq("is_archived", false)
    .maybeSingle();
  if (pipe) {
    funil = pipe.name as string;
    const ps = (pipe.settings as Record<string, unknown> | null) ?? {};
    const atuais = z.array(customFieldSchema).safeParse(ps.fields).success ? (ps.fields as z.infer<typeof customFieldSchema>[]) : [];
    const keys = new Set(atuais.map((f) => f.key));
    const novos = t.camposDoFunil.filter((f) => !keys.has(f.key));
    if (novos.length > 0 && atuais.length + novos.length <= 50) {
      const { error: ePipe } = await admin
        .from("crm_pipelines")
        .update({ settings: { ...ps, fields: [...atuais, ...novos] } })
        .eq("id", pipe.id)
        .eq("organization_id", org.orgId);
      if (!ePipe) camposAcrescentados = novos.length;
    }
  }

  // 3) fluxo de retomada em rascunho, idempotente por nome
  let fluxo: ResultadoDoTemplate["fluxo"] = null;
  const { data: existente } = await admin
    .from("followup_flow_pointers")
    .select("id")
    .eq("organization_id", org.orgId)
    .eq("name", t.retomada.nome)
    .maybeSingle();
  if (existente) fluxo = "ja_existia";
  else {
    const { error: eFlow } = await admin.from("followup_flow_pointers").insert({
      organization_id: org.orgId,
      name: t.retomada.nome,
      status: "draft",
      draft_graph: t.retomada.grafo,
      trigger_config: t.retomada.trigger,
    });
    fluxo = eFlow ? null : "criado";
  }

  void audit({
    action: "pipeline.updated",
    organizationId: org.orgId,
    bypassedRls: true,
    metadata: { nutef_template: t.id, campos_acrescentados: camposAcrescentados, fluxo, funil },
  });
  return { ok: true, segmento: t.id, camposAcrescentados, funil, fluxo };
}

/** Para a tela: os segmentos oferecidos, em ordem. */
export async function listarSegmentos(): Promise<Array<{ id: SegmentoId; nome: string }>> {
  return TEMPLATES.map((t) => ({ id: t.id, nome: t.nome }));
}
