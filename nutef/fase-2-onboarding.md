# Fase 2 — Onboarding (PRD §11, §48)

Meta: do cadastro à primeira conversa automatizada em **menos de 15 minutos**.

## O que o motor já entrega (medido em 2026-09-18, pela tela, no staging)

O wizard do upstream (`app/onboarding/*`, passos em `lib/onboarding/passos.ts`) já cobre 7 dos
8 passos do PRD — e com vocabulário do produto, não técnico:

| PRD §11 | Upstream | Situação |
|---|---|---|
| 1 Criar empresa (nome, segmento, cidade, tamanho) | "Seu negócio": nome, *o que vocês fazem* (texto livre), onde atende (fuso), aceite | ✓ — o segmento é INFERIDO do texto (`lib/onboarding/sugerir-funil.ts`); "Clínica odontológica…" virou o quadro Clínica sozinho |
| 2 Conectar WhatsApp (oficial ou QR, recomendar oficial) | "O telefone dele": explica os tipos, "Conectei em outro lugar", pular | ✓ (só falta o número real — dono) |
| 3 Modelo de operação ("como sua empresa vende?") | — | ✗ ausente; hoje o texto livre faz o papel |
| 4 Criar funil automaticamente | "Onde ele organiza": quadro sugerido por segmento, modelos prontos (clínica, imobiliária, serviços, curso, loja, genérico), colunas editáveis | ✓ |
| 5 Criar funcionário de IA com modelos prontos | "Treinar": quem ele é, como fala, o que pode prometer + capacidades | ✓ parcial — modelos por segmento são a Fase 3/4 |
| 6 Adicionar conhecimento (site, PDF, CSV, texto, FAQ) | fora do wizard (IA › Acervo) | ✗ no wizard; existe no produto |
| 7 Simular atendimento | "Ver ele atender": ensaio sem enviar nada | ✓ |
| 8 Publicar | "Tudo pronto!" + o que mais existe | ✓ |

Percurso pulando tudo: 8 s de máquina, zero erros de console/4xx. Um humano, sem WhatsApp e
sem IA, leva 3–5 min. O relógio de 15 min só pode ser medido de verdade com um número pareado e
a IA funcionando — os dois dependem do dono (celular; chave da OpenAI).

## O que a Fase 2 muda (e por quê é pouco)

1. **"IA incluída no plano" — o cliente NUNCA cola chave.** A etapa "Treinar" do upstream diz "Ele
   ainda não tem cérebro… cole a sua chave" quando não há chave. Num SaaS a chave é da plataforma
   e o crédito vem no plano (PRD §25). O motor já trata a chave da instalação (`OPENAI_API_KEY`
   no `.env`) como último degrau da escada — a tela então mostra "O cérebro dele: … pronta para
   uso". Faltava a organização NASCER no provedor da plataforma (o trigger do upstream semeia
   `anthropic`). `N0002_ia_da_plataforma.sql`: tabela `nutef_platform_settings` (`llm` =
   provedor/modelo do SaaS, editável pelo superadmin) + trigger que roda depois do do upstream.
   Provado no Postgres descartável: org nova nasce `openai / gpt-5.4-mini`. **Chave da OpenAI no
   `.env` do staging desde 2026-09-18 (validada: 136 modelos, gpt-5.4-mini disponível)** — a etapa
   "Treinar" mostra "O cérebro dele: OpenAI (GPT)". Achado no caminho: a sonda de crédito do
   upstream manda `max_completion_tokens: 1` e a família gpt-5 responde 400 (corrigido para 16;
   candidato a PR upstream).
2. **Aviso do teste grátis no "Tudo pronto!"** (`nutef/billing/ui/AvisoDeTeste.tsx`): até quando,
   quanto custa depois, onde acompanhar — nada é cobrado sem o cliente ver. Some se a org não
   está em trial.
3. **Segmento explícito** ("Qual é o seu tipo de negócio?", PRD §9) fica para a Fase 4, junto dos
   templates — hoje a inferência pelo texto já acerta o funil, e uma pergunta a mais sem template
   atrás só alongaria o wizard.
4. **Conhecimento no wizard** (PRD §11 etapa 6) fica para a Fase 3, quando o "funcionário de IA"
   ganhar a experiência comercial — hoje o Acervo existe e funciona em IA › Acervo.

## Medição

**IA — feita em 2026-09-18:** "Contratar Ana" → criar → ensaio de 5 mensagens de cliente (clareamento,
agendamento, convênio, aparelho infantil, endereço): 5 respostas na persona, 6–10 s cada, uma
pergunta por vez, sem inventar preço; 1 tropeço de JSON no fechamento do turno (o motor re-tenta
na fila; no ensaio aparece como 422 — não é do fork). Custo total dos ensaios: ver `ai_agent_runs`.

**WhatsApp — a fazer com o dono (precisa do celular):**

Cronômetro por etapa, num cliente novo, com número pareado e chave no `.env`:
cadastro → WhatsApp pareado → funcionário criado → funil → 1ª mensagem respondida pela IA.
Registrar aqui: tempo total, onde travou, o que a pessoa perguntou.
