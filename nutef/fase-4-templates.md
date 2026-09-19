# Fase 4 — Templates por segmento (PRD §9, §10, §50)

Três verticais (clínica, imobiliária, serviços) + genérico, em `nutef/templates/segmentos.ts`.
Um template não é um funil paralelo: o funil continua vindo dos pacotes do upstream (o mesmo que
o onboarding sugere pelo texto). O que o template acrescenta, por cima do motor:

| Peça (PRD §9) | Como | Onde vive |
|---|---|---|
| Funil e etapas | pacote do upstream (`lib/onboarding/pacotes-de-funil.ts`) | onboarding "Onde ele organiza" |
| Funcionários de IA | roteiro de qualificação do segmento entra no prompt da Ana (as perguntas do §10: compra/aluguel, cidade, bairro, quartos, orçamento, entrada, financiamento, prazo); Carlos e Marina recebem o contexto | `nutef/funcionarios/preenchimento.ts` |
| Campos personalizados | `crm_pipelines.settings.fields` (schema do upstream), merge por key — a Ana registra com `crm_update_lead` | `aplicar.ts` |
| Follow-ups | fluxo "Retomada — quem parou de responder" em RASCUNHO: silêncio 24 h → 3 toques da IA (1 d, 3 d, 7 d), cancela na 1ª resposta; o dono revisa e publica | `aplicar.ts` → tela de follow-ups do motor |
| Base de conhecimento | a LISTA de perguntas que os clientes do segmento fazem, para o dono responder no Acervo — nunca respostas inventadas | seção "Seu segmento" |
| Tags / mensagens / automações / métricas | não neste corte: tags nascem no uso; automações do motor (QUANDO/SE/ENTÃO) ficam para quando um cliente pedir uma regra concreta | — |

Onde o cliente vê: `/app/ai/funcionarios` › **Seu segmento** (sugerido pelo texto do cadastro;
escolha explícita = PRD §9 "Qual é o seu tipo de negócio?") › **Aplicar modelo**. Só admin;
auditado (`pipeline.updated` com `nutef_template`).

Provas: `nutef/templates/segmentos.test.ts` valida cada template contra os schemas do motor
(campos, gatilho, grafo do fluxo) e a existência do pacote de funil.
