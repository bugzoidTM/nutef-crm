# PRD — Plataforma SaaS de CRM, WhatsApp e Agentes de IA

**Versão:** 1.0
**Data:** 18 de setembro de 2026
**Base tecnológica:** Fork do DeskcommCRM
**Repositório base:** `bugzoidTM/DeskcommCRM` (código agora em `bugzoidTM/nutef-crm`, privado — ver `nutef/identidade.md`)
**Status:** Planejamento do MVP comercial

---

# 1. VISÃO DO PRODUTO

O produto será uma plataforma SaaS voltada para empresas que realizam atendimento, vendas e relacionamento com clientes principalmente pelo WhatsApp.

A solução utilizará o DeskcommCRM como núcleo tecnológico, aproveitando seus recursos já existentes de CRM, atendimento omnichannel, funis comerciais, inteligência artificial, automações, integração com WhatsApp, gestão de contatos, multi-tenancy, LGPD, controle de usuários e agentes de IA.

O produto não será apresentado ao mercado como apenas mais um CRM.

A proposta central será oferecer uma plataforma capaz de unir:

* atendimento;
* CRM;
* automação comercial;
* WhatsApp;
* agentes de inteligência artificial;
* acompanhamento automático de leads;
* gestão do processo comercial;
* métricas;
* recuperação de oportunidades;
* integração com campanhas;
* automação de tarefas repetitivas.

O cliente deverá perceber a solução como uma **equipe comercial digital operando 24 horas**, e não como uma ferramenta técnica que precisa ser configurada por especialistas.

---

# 2. PROBLEMA

Pequenas e médias empresas recebem grande parte de seus contatos comerciais pelo WhatsApp, porém normalmente trabalham de forma desorganizada.

Entre os problemas mais frequentes estão:

* leads esquecidos;
* clientes sem resposta;
* vendedores utilizando WhatsApp pessoal;
* falta de histórico centralizado;
* ausência de acompanhamento após o primeiro contato;
* dificuldade de saber quais anúncios geraram vendas;
* pouca utilização do CRM;
* processos comerciais dependentes da memória da equipe;
* vendedores deixando oportunidades sem acompanhamento;
* atendimento fora do horário comercial inexistente;
* ausência de métricas;
* dificuldade de treinar novos atendentes;
* retrabalho;
* demora na qualificação dos leads.

Grande parte das soluções existentes exige que o usuário adapte sua operação ao software.

O produto proposto seguirá a lógica inversa:

> o sistema deverá chegar ao cliente praticamente pronto para operar.

---

# 3. PROPOSTA DE VALOR

A proposta principal será:

> **Transformar o WhatsApp da empresa em uma operação comercial organizada e automatizada por inteligência artificial.**

A plataforma deverá permitir que uma empresa conecte seu WhatsApp e tenha rapidamente:

* atendimento multiusuário;
* CRM;
* funil comercial;
* agentes de IA;
* qualificação automática;
* distribuição de leads;
* follow-up automático;
* automações;
* histórico completo;
* métricas;
* recuperação de oportunidades;
* integração com campanhas de anúncios.

---

# 4. PRINCÍPIO DE PRODUTO

O produto deverá esconder complexidade tecnológica.

Termos como:

* RAG;
* embeddings;
* MCP;
* LLM;
* vector database;
* webhook;
* event sourcing;

não deverão ser apresentados como protagonistas da experiência.

O usuário deverá interagir com conceitos compreensíveis.

Exemplos:

**Em vez de:**

> Criar agente RAG.

Utilizar:

> Criar funcionário de IA.

**Em vez de:**

> Configurar system prompt.

Utilizar:

> Como esse funcionário deve atender?

**Em vez de:**

> Definir trigger.

Utilizar:

> Quando isso acontecer...

---

# 5. POSICIONAMENTO

O produto será posicionado como:

> **Plataforma de vendas e atendimento pelo WhatsApp com funcionários de inteligência artificial.**

Não será comercializado prioritariamente como chatbot.

Também não será comercializado apenas como CRM.

O produto ocupará a interseção entre:

**WhatsApp + CRM + automação + agentes de IA.**

---

# 6. PÚBLICO-ALVO

Inicialmente, o produto deverá atender empresas que:

* recebem leads pelo WhatsApp;
* investem em anúncios;
* possuem processo comercial;
* trabalham com tickets superiores a aproximadamente R$500;
* precisam realizar acompanhamento do cliente;
* possuem pelo menos uma pessoa dedicada a vendas ou atendimento.

Segmentos inicialmente interessantes:

* imobiliárias;
* energia solar;
* clínicas;
* estética;
* móveis planejados;
* escolas e cursos;
* empresas de serviços;
* agências;
* concessionárias;
* seguros;
* consórcios;
* infoprodutos;
* turismo;
* eventos;
* empresas B2B.

Não será necessário limitar tecnicamente o produto a esses nichos.

A verticalização ocorrerá principalmente através de templates.

---

# 7. PERSONAS

## 7.1 Proprietário

Deseja acompanhar:

* quantidade de leads;
* vendas;
* desempenho da equipe;
* origem dos clientes;
* oportunidades perdidas;
* custo dos anúncios;
* funcionamento da IA.

Não deseja configurar recursos técnicos.

---

## 7.2 Gestor comercial

Deseja:

* visualizar o funil;
* acompanhar vendedores;
* distribuir leads;
* identificar oportunidades esquecidas;
* criar automações;
* acompanhar metas;
* analisar conversões.

---

## 7.3 Vendedor

Deseja:

* receber leads;
* conversar pelo WhatsApp;
* visualizar informações do cliente;
* saber qual ação tomar;
* registrar movimentações rapidamente;
* ter ajuda da IA.

---

## 7.4 Agência ou revendedor

Deseja:

* oferecer a plataforma aos próprios clientes;
* utilizar marca própria;
* administrar várias empresas;
* acompanhar consumo;
* obter receita recorrente;
* configurar clientes rapidamente.

---

# 8. DIFERENCIAL CENTRAL — FUNCIONÁRIOS DE IA

A experiência atual de "agentes de IA" deverá evoluir comercialmente para o conceito de:

# Funcionários de IA

Cada funcionário deverá possuir:

* nome;
* avatar;
* função;
* objetivo;
* horário de atuação;
* personalidade;
* tom de comunicação;
* base de conhecimento;
* permissões;
* ferramentas autorizadas;
* canais;
* funis associados;
* regras de transferência;
* limite mensal de utilização;
* métricas.

Exemplos:

### Ana

**Função:** SDR de IA

Responsável por:

* atender novos leads;
* identificar interesse;
* fazer perguntas;
* qualificar;
* cadastrar informações;
* mover o lead;
* entregar oportunidades ao vendedor.

### Carlos

**Função:** Recuperação de Leads

Responsável por:

* localizar oportunidades paradas;
* iniciar follow-ups;
* tentar recuperar negociações;
* identificar desistências.

### Marina

**Função:** Pós-venda

Responsável por:

* confirmar satisfação;
* pedir avaliação;
* enviar orientações;
* identificar novas oportunidades.

---

# 9. TEMPLATE POR SEGMENTO

No onboarding, o cliente deverá selecionar:

> Qual é o seu tipo de negócio?

Exemplos:

* imobiliária;
* clínica;
* energia solar;
* agência;
* loja;
* curso;
* serviços;
* outro.

O sistema deverá carregar automaticamente configurações adequadas.

Cada template poderá incluir:

* funil;
* etapas;
* campos personalizados;
* tags;
* funcionários de IA;
* automações;
* mensagens;
* follow-ups;
* métricas;
* base inicial de conhecimento.

---

# 10. EXEMPLO — TEMPLATE IMOBILIÁRIA

Funil:

1. Lead recebido
2. Em qualificação
3. Imóveis selecionados
4. Visita agendada
5. Visita realizada
6. Proposta
7. Negociação
8. Vendido
9. Perdido

O funcionário de IA poderá perguntar:

* compra ou aluguel?
* cidade?
* bairro?
* quantidade de quartos?
* orçamento?
* possui entrada?
* precisa de financiamento?
* prazo para mudança?

Após coletar as informações:

* atualizar contato;
* criar oportunidade;
* mover para etapa;
* aplicar tags;
* selecionar vendedor;
* avisar equipe.

---

# 11. ONBOARDING

O onboarding será uma das partes mais importantes do produto.

Objetivo:

> fazer um cliente sair do cadastro para a primeira conversa automatizada em menos de 15 minutos.

Fluxo sugerido:

### Etapa 1

Criar empresa.

Informações:

* nome;
* segmento;
* cidade;
* tamanho da equipe.

### Etapa 2

Conectar WhatsApp.

Opções:

* WhatsApp oficial;
* conexão por QR Code.

O produto deverá recomendar o canal oficial.

### Etapa 3

Selecionar modelo de operação.

Exemplo:

> Como sua empresa vende?

* atendimento;
* orçamento;
* agendamento;
* consultoria;
* venda de produto;
* outro.

### Etapa 4

Criar funil automaticamente.

### Etapa 5

Criar funcionário de IA.

O sistema deverá oferecer modelos prontos.

### Etapa 6

Adicionar conhecimento.

Fontes:

* site;
* PDF;
* CSV;
* texto;
* perguntas frequentes.

### Etapa 7

Simular atendimento.

Usuário conversa com o funcionário antes de publicar.

### Etapa 8

Publicar.

---

# 12. DASHBOARD PRINCIPAL

O primeiro dashboard deverá responder rapidamente:

* quantos leads chegaram;
* quantos estão em atendimento;
* quantos estão sem resposta;
* quantos negócios foram ganhos;
* faturamento estimado;
* conversão;
* desempenho da IA;
* desempenho humano.

Cards principais:

**Novos leads**

**Em negociação**

**Sem resposta**

**Vendas**

**Valor vendido**

**Follow-ups programados**

**IA trabalhando agora**

---

# 13. CAIXA DE ENTRADA

A Inbox existente no Deskcomm deverá continuar sendo parte central do sistema.

Deverá apresentar:

* conversa;
* cliente;
* responsável;
* funcionário de IA;
* etapa do funil;
* tags;
* histórico;
* informações;
* ações rápidas.

Estados:

* IA atendendo;
* humano atendendo;
* aguardando cliente;
* aguardando equipe;
* encerrado.

---

# 14. CRM

O CRM deverá manter o modelo Kanban.

Funcionalidades:

* múltiplos funis;
* etapas configuráveis;
* arrastar e soltar;
* valores;
* responsáveis;
* filtros;
* tags;
* campos personalizados;
* automações.

A experiência deverá priorizar simplicidade.

---

# 15. FOLLOW-UP

Follow-up deverá ser um dos argumentos principais de venda.

O sistema deverá permitir:

> "Nunca mais esquecer um lead."

Exemplos:

* cliente não respondeu por 2 horas;
* cliente não respondeu por 1 dia;
* proposta enviada há 3 dias;
* visita realizada ontem;
* orçamento vence amanhã;
* cliente deveria renovar em 30 dias.

A IA poderá decidir se deve tentar novo contato.

---

# 16. RADAR DE OPORTUNIDADES

Criar ou aprimorar uma área denominada:

# Radar

Objetivo:

mostrar dinheiro potencialmente sendo perdido.

Categorias:

* leads sem resposta;
* negociação parada;
* proposta esquecida;
* vendedor atrasado;
* follow-up vencido;
* cliente com alta intenção;
* lead recuperável.

Exemplo:

> 17 oportunidades precisam de atenção.

---

# 17. AUTOMAÇÕES

Manter o motor atual QUANDO/SE/ENTÃO.

Porém simplificar a UX.

Exemplo:

### Quando

lead entrar pelo Facebook Ads

### Se

interesse for energia solar residencial

### Então

atribuir para equipe residencial

### E

iniciar funcionário Ana

### E

mover para "Qualificação"

---

# 18. ORIGEM DOS LEADS

O sistema deverá registrar:

* orgânico;
* Google Ads;
* Meta Ads;
* landing page;
* indicação;
* importação;
* API;
* outro.

Sempre que possível:

* campanha;
* conjunto;
* anúncio;
* identificadores de clique.

---

# 19. CLOSED LOOP MARKETING

Uma vantagem competitiva será mostrar quais campanhas efetivamente geram vendas.

Fluxo:

Anúncio
↓
Lead
↓
WhatsApp
↓
CRM
↓
Venda
↓
Google/Meta

Quando uma oportunidade for marcada como ganha, o sistema poderá enviar a conversão de volta para a plataforma de anúncios.

---

# 20. BILLING SAAS

Este será um desenvolvimento novo prioritário.

O billing atual do Deskcomm será substituído ou ampliado.

Entidades principais:

### plans

* id
* name
* monthly_price
* yearly_price
* max_users
* max_whatsapp_numbers
* ai_credit
* max_contacts
* max_organizations
* features

### subscriptions

* organization_id
* plan_id
* status
* started_at
* trial_ends_at
* current_period_start
* current_period_end
* payment_provider

### invoices

* subscription_id
* amount
* status
* due_date
* paid_at
* provider_invoice_id

### usage

* messages
* ai_tokens
* ai_cost
* storage
* whatsapp_numbers
* users

---

# 21. GATEWAY DE PAGAMENTO

A camada de cobrança deverá utilizar arquitetura de adapter.

Interface conceitual:

PaymentProvider

Implementações futuras:

* Asaas;
* Mercado Pago;
* Stripe;
* outros.

Inicialmente recomenda-se integração com:

# Asaas

Motivos:

* Pix;
* boleto;
* cartão;
* assinatura;
* recorrência;
* API adequada ao Brasil.

---

# 22. PLANOS INICIAIS

Estrutura preliminar:

## Start

**R$397/mês**

Inclui:

* 1 número;
* até 3 usuários;
* CRM;
* WhatsApp;
* 1 funcionário de IA;
* automações básicas;
* limite de IA.

---

## Pro

**R$697/mês**

Inclui:

* até 3 números;
* até 10 usuários;
* múltiplos funcionários de IA;
* automações;
* campanhas;
* integrações;
* métricas avançadas.

---

## Growth

**R$1.297/mês**

Inclui:

* múltiplos números;
* até 25 usuários;
* agentes avançados;
* API;
* webhooks;
* métricas;
* suporte prioritário.

---

## Dedicated

A partir de:

**R$1.997/mês**

Inclui:

* VPS exclusiva;
* banco exclusivo;
* domínio dedicado;
* configuração personalizada;
* monitoramento;
* suporte prioritário.

---

# 23. TRIAL

O produto deverá possuir trial.

Sugestão:

**7 dias.**

Durante o trial:

* acesso completo;
* limite de IA reduzido;
* 1 WhatsApp;
* até 3 usuários.

Estados:

trialing
active
past_due
suspended
cancelled

---

# 24. SUSPENSÃO

Quando a assinatura não for paga:

### Primeiro estágio

Aviso.

### Segundo estágio

Bloqueio de novos envios automáticos.

### Terceiro estágio

Conta em modo leitura.

Nunca apagar imediatamente os dados.

---

# 25. CONSUMO DE IA

A mensalidade não deverá oferecer IA ilimitada.

Cada plano terá crédito mensal.

Exemplo:

Start
R$50 de IA incluídos.

Pro
R$100.

Growth
R$250.

Ultrapassado o limite:

* bloquear IA;
* permitir compra de créditos;
* realizar cobrança adicional.

---

# 26. CONSUMO META

Custos cobrados pela Meta deverão ser separados da assinatura do software.

Dashboard:

Mensalidade
Consumo IA
Consumo WhatsApp
Extras

---

# 27. PAINEL SUPERADMIN

Criar painel administrativo global.

Acesso apenas à nossa operação.

Dashboard:

* MRR;
* ARR;
* clientes ativos;
* trials;
* cancelamentos;
* inadimplência;
* uso total de IA;
* infraestrutura;
* sessões WhatsApp;
* erros.

---

# 28. GESTÃO DE CLIENTES

Superadmin deverá visualizar:

* empresa;
* plano;
* status;
* número de usuários;
* números conectados;
* consumo IA;
* MRR;
* última atividade;
* saúde da instalação.

Ações:

* suspender;
* reativar;
* trocar plano;
* adicionar crédito;
* impersonar suporte;
* visualizar logs.

---

# 29. PROGRAMA DE REVENDEDORES

Criar posteriormente estrutura específica.

Entidades:

resellers
reseller_clients
reseller_plans
reseller_commissions

O revendedor poderá:

* criar clientes;
* personalizar marca;
* gerenciar organizações;
* acompanhar consumo.

---

# 30. WHITE-LABEL

Manter capacidades atuais e expandir.

Configurações:

* nome;
* logo;
* favicon;
* domínio;
* cor;
* e-mail;
* remetente;
* suporte.

Futuramente:

* CSS;
* domínio por revendedor;
* login personalizado.

---

# 31. MODELO DE DEPLOY

Existirão dois modos.

## Shared

Uma instalação atende múltiplas organizações.

Indicada para:

* Start;
* Pro;
* Growth.

## Dedicated

Uma instalação exclusiva.

Indicada para:

* grandes clientes;
* clientes de maior risco;
* operações com exigências específicas.

---

# 32. ARQUITETURA DO FORK

Regra fundamental:

> modificar o mínimo possível do core do Deskcomm.

Estrutura conceitual:

```text
DeskcommCRM upstream
        │
        ▼
Fork comercial
        │
        ├── branding
        ├── billing
        ├── onboarding
        ├── templates
        ├── employees-ai
        ├── superadmin
        ├── subscriptions
        ├── usage
        └── commercial integrations
```

---

# 33. ESTRATÉGIA DE ATUALIZAÇÃO DO UPSTREAM

Criar remote:

```bash
git remote add upstream https://github.com/melgarafael/DeskcommCRM.git
```

Fluxo:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

Preferencialmente:

não alterar profundamente componentes centrais.

Criar novas camadas.

---

# 34. WHATSAPP

Dois modos:

## Oficial

Meta Cloud API.

Deverá ser o modo recomendado.

## QR Code

WAHA.

Deverá permanecer como alternativa.

A interface deverá explicar claramente as diferenças.

---

# 35. SEGURANÇA — PRIORIDADES

Antes da escala comercial deverão ser revisados:

### Rate limiting

Aplicar proteção a:

* login;
* signup;
* recovery;
* convite;
* API;
* MCP;
* endpoints públicos.

### Service Role

Auditar endpoints que utilizam:

createAdminClient

Criar proteção automatizada.

### Secrets

Adicionar secret scanning.

### CI

Adicionar:

* gitleaks;
* dependabot;
* audit;
* security tests.

---

# 36. OBSERVABILIDADE

Precisamos saber que algo quebrou antes do cliente.

Implementar monitoramento de:

* app;
* banco;
* worker;
* scheduler;
* Redis;
* WhatsApp;
* IA.

Alertas:

* WhatsApp desconectado;
* worker parado;
* cron parado;
* fila acumulada;
* erro de IA;
* banco indisponível;
* armazenamento crítico.

---

# 37. BACKUP

Obrigatório.

Política inicial:

backup diário.

Retenção:

7 backups diários
4 semanais
3 mensais

Clientes Dedicated poderão possuir política superior.

---

# 38. LGPD

Manter recursos atuais.

Adicionalmente:

* registro de consentimento;
* políticas de retenção;
* exportação;
* anonimização;
* auditoria.

Não vender como:

> "100% conforme LGPD".

Comunicar:

> ferramentas técnicas para apoiar conformidade.

---

# 39. IMPORTAÇÃO DE CLIENTES

Uma barreira de venda é migração.

Criar importador CSV.

Campos:

* nome;
* telefone;
* e-mail;
* empresa;
* tags;
* etapa;
* responsável;
* observações.

Futuramente:

importadores específicos.

---

# 40. IMPORTAÇÃO DE CONCORRENTES

Futuro:

* Kommo;
* Pipedrive;
* RD Station;
* HubSpot;
* planilhas.

---

# 41. PIX E COBRANÇA PELO AGENTE

Feature estratégica.

Funcionário de IA poderá:

* criar cobrança;
* enviar Pix;
* consultar pagamento;
* confirmar recebimento;
* mover oportunidade.

Exemplo:

Cliente:

> quero fechar.

IA:

> Perfeito. Posso gerar o Pix da entrada?

Sistema cria cobrança.

Pagamento confirmado.

Sistema:

* marca como pago;
* move negócio;
* avisa vendedor.

---

# 42. AGENDA

Feature futura importante.

Integrações:

* Google Calendar;
* agenda interna;
* Calendly.

IA poderá:

* consultar horários;
* oferecer horários;
* marcar;
* remarcar;
* cancelar.

---

# 43. APLICATIVO MOBILE

Não será prioridade inicial.

A aplicação web deverá funcionar bem como PWA.

Aplicativos nativos poderão ser considerados após validação comercial.

---

# 44. NÃO ESCOPO DO MVP

Não desenvolver inicialmente:

* ERP;
* estoque completo;
* contabilidade;
* financeiro empresarial;
* marketplace;
* telefonia;
* aplicativo mobile nativo;
* construtor de sites;
* e-commerce completo.

---

# 45. MVP COMERCIAL

O MVP será considerado pronto quando possuir:

* identidade própria;
* onboarding;
* WhatsApp;
* CRM;
* funcionário de IA;
* templates;
* automações;
* billing;
* trial;
* plano;
* suspensão;
* superadmin;
* monitoramento básico.

---

# 46. ROADMAP — FASE 0

## Fundação do fork

* renomear produto;
* definir identidade;
* configurar domínio;
* configurar upstream;
* preparar ambiente staging;
* preparar CI.

---

# 47. ROADMAP — FASE 1

## Comercialização

Implementar:

* planos;
* billing;
* subscriptions;
* invoices;
* trial;
* usage;
* suspensão.

---

# 48. ROADMAP — FASE 2

## Onboarding

Criar wizard completo.

Meta:

primeira automação funcionando em menos de 15 minutos.

---

# 49. ROADMAP — FASE 3

## Funcionários de IA

Criar UX comercial sobre o motor de agentes.

---

# 50. ROADMAP — FASE 4

## Templates

Criar inicialmente três.

Sugestão:

* imobiliária;
* serviços;
* clínica.

---

# 51. ROADMAP — FASE 5

## Superadmin

Criar console SaaS.

---

# 52. ROADMAP — FASE 6

## Primeiros clientes

Objetivo:

10 clientes pagantes.

Durante essa fase:

não priorizar escala.

Priorizar aprender.

Registrar:

* dificuldades;
* dúvidas;
* bugs;
* features pedidas;
* tempo de onboarding;
* motivos de cancelamento.

---

# 53. ROADMAP — FASE 7

## 100 CLIENTES

Após validação:

* onboarding self-service;
* billing automático;
* provisionamento automático;
* monitoramento;
* infraestrutura escalável;
* revendedores.

---

# 54. MÉTRICAS

Principais indicadores:

## Negócio

MRR
ARR
ARPU
CAC
LTV
Churn

## Produto

tempo até conectar WhatsApp
tempo até primeiro atendimento
tempo até primeira automação
usuários ativos
conversas processadas
automações executadas

## IA

conversas atendidas
handoffs
resoluções
custo por conversa
custo por cliente
taxa de intervenção humana

## Comercial

leads recebidos
leads qualificados
oportunidades
vendas
conversão
tempo médio de fechamento

---

# 55. NORTH STAR METRIC

A principal métrica do produto deverá ser:

> **Número de oportunidades comerciais movimentadas automaticamente com sucesso pela plataforma.**

Não medir apenas mensagens enviadas.

Mensagem não significa valor.

O objetivo é movimentar negócios.

---

# 56. CRITÉRIO DE SUCESSO DO MVP

O MVP será considerado comercialmente validado quando atingir:

10 clientes pagantes

e:

MRR ≥ R$5.000

com:

churn inicial inferior a 10% ao mês.

---

# 57. META DE CURTO PRAZO

### 10 clientes

Ticket médio:

R$697

MRR:

R$6.970

---

# 58. META INTERMEDIÁRIA

### 100 clientes

Ticket médio estimado:

R$600

MRR:

R$60.000

ARR:

R$720.000

---

# 59. META DE ESCALA

### 500 clientes

Ticket médio:

R$650

MRR:

R$325.000

ARR:

R$3.900.000

---

# 60. PRINCÍPIO FINAL

O diferencial competitivo não será possuir mais funcionalidades do que todos os concorrentes.

O objetivo será fazer o cliente perceber:

> "Eu conectei meu WhatsApp e agora tenho uma equipe organizada, com inteligência artificial trabalhando junto."

Toda nova funcionalidade deverá responder a pelo menos uma destas perguntas:

1. Isso ajuda o cliente a vender mais?
2. Isso reduz trabalho manual?
3. Isso evita perder oportunidades?
4. Isso melhora a experiência do cliente?
5. Isso torna a operação mais fácil de administrar?

Caso não responda positivamente a nenhuma delas, deverá ter baixa prioridade.

---

# 61. DIREÇÃO ESTRATÉGICA

O DeskcommCRM será tratado como **motor**, não como produto final.

Nosso valor comercial ficará principalmente em:

* experiência;
* onboarding;
* verticalização;
* billing;
* operação gerenciada;
* templates;
* suporte;
* infraestrutura;
* integração;
* distribuição;
* facilidade.

Essa separação deverá ser preservada para permitir evolução do produto sem criar dependência excessiva de modificações no core do projeto open source.

---

# 62. PRIMEIRO CICLO DE IMPLEMENTAÇÃO

A primeira sequência recomendada será:

**Passo 1 — Infraestrutura**

Subir fork em staging e validar:

* login;
* Supabase;
* worker;
* scheduler;
* Redis;
* WhatsApp;
* IA.

**Passo 2 — Branding**

Definir nossa marca.

**Passo 3 — Billing**

Criar estrutura de planos e assinaturas.

**Passo 4 — Superadmin**

Criar gestão dos clientes SaaS.

**Passo 5 — Onboarding**

Reduzir configuração manual.

**Passo 6 — Funcionários de IA**

Criar nova experiência sobre agentes.

**Passo 7 — Templates**

Criar primeiro vertical.

**Passo 8 — Clientes piloto**

Colocar empresas reais utilizando.

---

# 63. REGRA PARA DESENVOLVIMENTO POR IA

Qualquer agente de desenvolvimento que trabalhe no projeto deverá primeiro compreender:

* arquitetura atual;
* convenções do Deskcomm;
* multi-tenancy;
* RLS;
* migrations;
* baseline;
* CI;
* white-label;
* workers;
* event log.

Antes de alterar qualquer recurso central deverá procurar uma forma de extensão.

Prioridade:

```text
EXTENDER > SOBRESCREVER > MODIFICAR CORE
```

Sempre que houver necessidade de modificar core, deverá ser registrado:

* motivo;
* arquivos alterados;
* impacto;
* risco de conflito com upstream.

---

# 64. REGRA DE ACEITE

Nenhuma feature será considerada pronta apenas porque compila.

O ciclo obrigatório será:

```text
IMPLEMENTAR
↓
TESTAR
↓
USAR COMO CLIENTE
↓
IDENTIFICAR FALHAS
↓
CORRIGIR
↓
TESTAR NOVAMENTE
↓
DOCUMENTAR
```

O produto deverá ser validado pela experiência real de uso, e não apenas por testes automatizados.

---

# 65. VISÃO DE LONGO PRAZO

A plataforma deverá evoluir de:

> CRM com WhatsApp e IA

para:

> sistema operacional comercial no qual humanos e funcionários de inteligência artificial trabalham juntos.

Nesse cenário, a empresa poderá ter dentro da plataforma:

* SDR humano;
* SDR de IA;
* vendedor;
* recuperador de IA;
* pós-venda humano;
* pós-venda de IA.

Todos trabalhando sobre:

* o mesmo cliente;
* o mesmo histórico;
* o mesmo CRM;
* as mesmas regras;
* as mesmas métricas.

Esse deverá ser o destino estratégico do produto.
