# Fase 3 — Funcionários de IA (PRD §8, §49)

Meta: a experiência COMERCIAL sobre o motor de agentes do upstream — "contratar um funcionário",
não "configurar um agente RAG". O motor não muda: um funcionário É um `ai_agents` +
`ai_agent_versions`, publicado pela mesma tela e passando pela mesma cadeia de segurança.

## O que o motor já entrega

Agente com nome, descrição, prompt, provedor/modelo, canal, ferramentas por pacote (atender /
vender / reter / escalar / organizar / evoluir), gatilhos, follow-ups, funis (escopo), acervo de
conhecimento, palavras de passagem para humano, versões (rascunho → publicada), teste em
rascunho, execuções com custo, evolução. Ou seja: 12 dos 14 atributos que o PRD §8 lista já
existem — faltam **avatar** e **horário de atuação** (o gatilho tem `business_hours`; a UI comercial
disso é a 3B), e o **limite mensal por funcionário** (hoje o teto é por organização — `ai_budgets`).

## 3A — feito em 2026-09-18

- `nutef/funcionarios/modelos.ts`: Ana (SDR), Carlos (recuperação de leads), Marina (pós-venda),
  Atendente geral — nome, função, objetivo, tarefas, pacotes do motor, palavras de passagem e o
  "como ele deve atender" com o nome da empresa e o que ela faz (lido do onboarding).
- `/app/ai/funcionarios`: **Sua equipe de IA** (cada funcionário com conversas no mês, passagens
  para pessoa, custo de IA, falhas — de `ai_agent_runs`) + **Contratar mais um** (a vitrine).
  Porta: botão "Contratar funcionário de IA" na lista de agentes + hub "Ver tudo em IA".
- "Contratar Ana" abre `/app/ai/agents/new?modelo=sdr` com tudo preenchido; o dono revisa,
  escolhe canal/funil/acervo e publica pela tela do motor (8 linhas de core: `inicial` no
  AgentForm).

## 3B — próximo

- Horário de atuação e avatar na tela do funcionário (vocabulário comercial sobre
  `trigger_config.business_hours`).
- Limite mensal por funcionário (PRD §8) sobre o teto por org — decidir se vale a complexidade
  antes dos 10 clientes (PRD §60: reduz trabalho? evita perder oportunidade? não claramente).
- Renomear "Agentes" → "Funcionários de IA" no sidebar (core: 1 label + dicionário) depois de
  medir com os primeiros clientes se o termo "agente" confunde.
- Follow-ups prontos por modelo (Carlos precisa de um fluxo de retomada de fábrica) — depende
  de os templates da Fase 4 trazerem os fluxos.
