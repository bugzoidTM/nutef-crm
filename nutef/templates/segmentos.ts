/**
 * Templates por segmento (PRD §9, §10, §50 — Fase 4): imobiliária, clínica e
 * serviços, mais o genérico. Um template NÃO é um funil paralelo: o funil vem
 * dos pacotes do upstream (lib/onboarding/pacotes-de-funil.ts, o mesmo que o
 * onboarding sugere). O que o template acrescenta, em cima do motor:
 *
 *   - roteiro de qualificação → entra no "como ele deve atender" da Ana (SDR) e
 *     nos dois outros funcionários como contexto do segmento;
 *   - campos do funil (`crm_pipelines.settings.fields`, o schema do upstream) —
 *     o que a Ana registra com crm_update_lead / crm_propose_contact_field;
 *   - fluxo de retomada em rascunho (3 toques, por silêncio) que o dono revisa
 *     e publica na tela de follow-ups do motor; é o fluxo que o Carlos usa;
 *   - perguntas frequentes que o dono precisa responder no Acervo — a lista,
 *     não respostas inventadas: FAQ com resposta falsa é pior que sem FAQ.
 */
import type { CustomFieldDef } from "@/lib/schemas/settings";
import type { FlowGraph } from "@/lib/followup/graph-schema";
import type { TriggerConfig } from "@/lib/followup/api-schemas";

export type SegmentoId = "clinica" | "imobiliaria" | "servicos" | "generico";

export interface TemplateDeSegmento {
  id: SegmentoId;
  nome: string;
  /** id do pacote de funil do upstream (lib/onboarding/pacotes-de-funil.ts) */
  pacoteDeFunil: "clinica" | "imobiliaria" | "servicos" | "generico";
  /** Como a Ana qualifica — vira parte do prompt. Uma pergunta por vez, na ordem. */
  roteiroDeQualificacao: readonly string[];
  /** O que registrar no CRM (mapeia 1:1 com os campos abaixo, pelo `key`). */
  camposDoFunil: readonly CustomFieldDef[];
  /** Quando passar para o vendedor — em linguagem do negócio. */
  sinalDeOportunidade: string;
  /** Perguntas que os clientes deste segmento fazem — o dono responde no Acervo. */
  perguntasFrequentes: readonly string[];
  /** Fluxo de retomada: nome + gatilho + grafo em rascunho. */
  retomada: { nome: string; trigger: TriggerConfig; grafo: FlowGraph };
}

const campo = (key: string, label: string, type: CustomFieldDef["type"], options?: string[]): CustomFieldDef => ({
  key,
  label,
  type,
  ...(options ? { options: options.map((o) => ({ value: o.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label: o })) } : {}),
});

const HORA = 3_600_000;
/** Trigger → espera → mensagem da IA → espera → mensagem → espera → mensagem → fim. Cancela na 1ª resposta. */
function retomadaEmTresToques(nome: string, dicas: readonly [string, string, string]): TemplateDeSegmento["retomada"] {
  const no = (id: string, type: FlowGraph["nodes"][number]["type"], label: string, y: number, config: unknown) =>
    ({ id, type, label, position: { x: 0, y }, config }) as FlowGraph["nodes"][number];
  const nodes: FlowGraph["nodes"] = [
    no("t", "trigger", "Cliente parou de responder", 0, {}),
    no("w1", "wait", "Espera 1 dia", 100, { mode: "fixed", duration_ms: 24 * HORA }),
    no("a1", "action", "1º toque", 200, { mode: "ai_message", prompt_hint: dicas[0] }),
    no("w2", "wait", "Espera 3 dias", 300, { mode: "fixed", duration_ms: 72 * HORA }),
    no("a2", "action", "2º toque", 400, { mode: "ai_message", prompt_hint: dicas[1] }),
    no("w3", "wait", "Espera 7 dias", 500, { mode: "fixed", duration_ms: 168 * HORA }),
    no("a3", "action", "3º toque (último)", 600, { mode: "ai_message", prompt_hint: dicas[2] }),
    no("e", "end", "Encerra a retomada", 700, { outcome: "exhausted" }),
  ];
  const seq = ["t", "w1", "a1", "w2", "a2", "w3", "a3", "e"];
  const edges = seq.slice(1).map((to, i) => ({ id: `e${i}`, source: seq[i]!, target: to, condition: { type: "always" } })) as FlowGraph["edges"];
  return {
    nome,
    trigger: { kind: "silence", params: { threshold_minutes: 24 * 60 }, cancel_on_reply: true },
    grafo: { nodes, edges } as FlowGraph,
  };
}

export const TEMPLATES: readonly TemplateDeSegmento[] = [
  {
    id: "clinica",
    nome: "Clínica, consultório ou salão",
    pacoteDeFunil: "clinica",
    roteiroDeQualificacao: [
      "Qual procedimento ou especialidade a pessoa procura (consulta, avaliação, tratamento específico)?",
      "É a primeira vez ou já é paciente?",
      "Vai usar convênio ou particular? Qual convênio?",
      "Tem dor, urgência ou pode esperar? (dor forte, febre ou inchaço = passe para a equipe na hora)",
      "Preferência de dia e horário?",
    ],
    camposDoFunil: [
      campo("procedimento", "Procedimento / especialidade", "text"),
      campo("convenio", "Convênio", "select", ["Particular", "Unimed", "Bradesco Saúde", "SulAmérica", "Amil", "Outro"]),
      campo("urgencia", "Urgência", "select", ["Sem urgência", "Esta semana", "Hoje / dor"]),
      campo("preferencia_horario", "Preferência de horário", "text"),
      campo("primeira_vez", "Primeira vez", "boolean"),
    ],
    sinalDeOportunidade: "a pessoa quer marcar (data/horário definidos) ou pediu orçamento de tratamento",
    perguntasFrequentes: [
      "Quais convênios vocês aceitam?",
      "Quanto custa a consulta / avaliação?",
      "Quais são os horários de atendimento e o endereço?",
      "Tem estacionamento?",
      "Vocês parcelam? Em quantas vezes?",
      "Quais procedimentos vocês fazem?",
      "Como funciona a primeira consulta?",
      "Atendem crianças?",
    ],
    retomada: retomadaEmTresToques("Retomada — quem parou de responder (clínica)", [
      "Retome com gentileza: lembre o que a pessoa procurava e pergunte se ainda quer marcar; ofereça dois horários próximos se a agenda estiver disponível.",
      "Ofereça algo útil: uma orientação sobre o procedimento que ela perguntou ou a lembrança de que a avaliação pode ser rápida. Uma pergunta só.",
      "Último contato: diga que vai deixar a conversa disponível para quando ela quiser, sem pressão, e deseje uma boa semana.",
    ]),
  },
  {
    id: "imobiliaria",
    nome: "Imobiliária ou corretor",
    pacoteDeFunil: "imobiliaria",
    roteiroDeQualificacao: [
      "Compra ou aluguel?",
      "Em qual cidade e bairro (ou região)?",
      "Quantos quartos, e tem algum requisito (garagem, pet, mobiliado)?",
      "Qual o orçamento (valor do imóvel ou do aluguel mensal)?",
      "Para compra: tem entrada? Vai precisar de financiamento?",
      "Para quando é a mudança?",
    ],
    camposDoFunil: [
      campo("finalidade", "Finalidade", "select", ["Compra", "Aluguel"]),
      campo("cidade", "Cidade", "text"),
      campo("bairro", "Bairro / região", "text"),
      campo("quartos", "Quartos", "number"),
      campo("orcamento", "Orçamento (R$)", "number"),
      campo("entrada", "Tem entrada", "boolean"),
      campo("financiamento", "Precisa de financiamento", "boolean"),
      campo("prazo_mudanca", "Prazo para mudança", "text"),
    ],
    sinalDeOportunidade: "a pessoa definiu finalidade, região e orçamento, ou pediu para visitar um imóvel",
    perguntasFrequentes: [
      "Quais documentos preciso para alugar?",
      "Vocês trabalham com financiamento? Com quais bancos?",
      "Aceitam pet?",
      "Como funciona a visita? Precisa agendar?",
      "Qual o valor da taxa de administração / comissão?",
      "Vocês têm imóveis em quais bairros?",
      "Como funciona o fiador / seguro-fiança?",
    ],
    retomada: retomadaEmTresToques("Retomada — quem parou de responder (imobiliária)", [
      "Retome lembrando o que a pessoa procurava (região, quartos, orçamento) e pergunte se ainda está buscando; se houver novidade compatível, mencione.",
      "Ofereça agendar uma visita ou receber opções por aqui; uma pergunta só, sem pressão.",
      "Último contato: diga que fica à disposição quando ela retomar a busca e deseje sorte na procura.",
    ]),
  },
  {
    id: "servicos",
    nome: "Empresa de serviços ou agência",
    pacoteDeFunil: "servicos",
    roteiroDeQualificacao: [
      "Qual serviço a pessoa precisa?",
      "Para quando? Tem um prazo?",
      "Onde (cidade / endereço), se o serviço for presencial?",
      "Tem uma faixa de orçamento em mente?",
      "É pessoa física ou empresa? (empresa: qual o nome e o porte)",
    ],
    camposDoFunil: [
      campo("servico", "Serviço", "text"),
      campo("prazo", "Prazo desejado", "text"),
      campo("local", "Local do serviço", "text"),
      campo("orcamento", "Orçamento (R$)", "number"),
      campo("tipo_cliente", "Tipo de cliente", "select", ["Pessoa física", "Empresa"]),
    ],
    sinalDeOportunidade: "a pessoa descreveu o serviço, o prazo e pediu orçamento ou proposta",
    perguntasFrequentes: [
      "Quanto custa? Como é feito o orçamento?",
      "Qual o prazo de entrega / execução?",
      "Vocês atendem em quais cidades?",
      "Como funciona o pagamento? Parcelam?",
      "Vocês emitem nota fiscal?",
      "Tem garantia?",
    ],
    retomada: retomadaEmTresToques("Retomada — quem parou de responder (serviços)", [
      "Retome lembrando o serviço que a pessoa pediu e pergunte se ainda precisa; se faltava alguma informação para o orçamento, peça só ela.",
      "Ofereça um caminho fácil: uma ligação rápida da equipe ou o envio do orçamento por aqui. Uma pergunta só.",
      "Último contato: fique à disposição, sem pressão, e agradeça o interesse.",
    ]),
  },
  {
    id: "generico",
    nome: "Outro tipo de negócio",
    pacoteDeFunil: "generico",
    roteiroDeQualificacao: [
      "O que a pessoa procura?",
      "Para quando?",
      "Tem alguma preferência ou restrição importante?",
    ],
    camposDoFunil: [campo("interesse", "Interesse", "text"), campo("prazo", "Prazo", "text")],
    sinalDeOportunidade: "a pessoa disse o que quer e quando, e pediu preço, proposta ou horário",
    perguntasFrequentes: ["Quanto custa?", "Onde vocês ficam e qual o horário?", "Como funciona o pagamento?"],
    retomada: retomadaEmTresToques("Retomada — quem parou de responder", [
      "Retome lembrando o que a pessoa tinha pedido e pergunte se ainda tem interesse.",
      "Ofereça algo útil relacionado ao pedido dela. Uma pergunta só.",
      "Último contato: fique à disposição, sem pressão.",
    ]),
  },
];

export function templateDoSegmento(id: string | null | undefined): TemplateDeSegmento {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === "generico")!;
}

/** O trecho de prompt que um template acrescenta a um funcionário. */
export function roteiroParaPrompt(t: TemplateDeSegmento): string {
  const perguntas = t.roteiroDeQualificacao.map((q, i) => `${i + 1}. ${q}`).join("\n");
  const campos = t.camposDoFunil.map((c) => `${c.label} (${c.key})`).join(", ");
  return `
Segmento: ${t.nome}.
Roteiro de qualificação — uma pergunta por vez, na ordem, pulando o que a pessoa já disse:
${perguntas}
Passe para o vendedor quando ${t.sinalDeOportunidade}.
Quando souber um desses dados, anote no CRM (campos: ${campos}) — mas SEMPRE depois de responder ao cliente, nunca no lugar da resposta.`;
}
