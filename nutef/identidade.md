# Identidade — Nutef CRM

Decisões da Fase 0 (2026-09-18), tomadas pelo dono do produto.

| O quê | Valor | Onde vive |
|---|---|---|
| Nome do produto | **Nutef CRM** | `APP_NAME` no `.env` (semente) → `platform_branding` no banco (fonte) |
| Cor da marca | **`#1f7a3d`** — o `--acento` do site atendimento.nutef.com; o design system deriva 11 tons por tema com piso de contraste | `APP_ACCENT_HEX` (semente) → `/admin/marca` |
| Logo | ainda não há — o nome aparece como texto | upload PNG/JPG ≤ 512 KB em `/admin/marca` |
| Domínio de staging | `crm-staging.nutef.com` (app) · `supabase-crm-staging.nutef.com` (API do Supabase) | Cloudflare, CNAME → `vps.nutef.com`, nuvem cinza |
| Domínio de produção | a definir na Fase 1 | |
| E-mail de suporte | a definir (`SUPPORT_EMAIL` vazio = a tela não mostra nenhum, nunca cai no do upstream) | |
| Repositório | `bugzoidTM/nutef-crm` (privado). O fork público `bugzoidTM/DeskcommCRM` continua existindo: o GitHub não deixa tornar privado um fork público | |
| Posicionamento | "Plataforma de vendas e atendimento pelo WhatsApp com funcionários de inteligência artificial" (PRD §5) | |

## Vocabulário de produto (PRD §4)

O usuário nunca vê RAG, embedding, MCP, LLM, webhook, event sourcing.

| Em vez de | Diga |
|---|---|
| criar agente RAG | criar funcionário de IA |
| configurar system prompt | como esse funcionário deve atender? |
| definir trigger | quando isso acontecer… |
| handoff | passar para uma pessoa |

## O que a marca NÃO muda (e por quê)

Herdado do upstream (`docs/white-label.md`), vale aqui:

- o **PDF de LGPD** nomeia o controlador (a empresa cliente), nunca a Nutef — é documento jurídico;
- o cabeçalho `X-Deskcomm-Signature` dos webhooks de saída e o nome do cookie de sessão são
  contrato técnico; renomear quebraria integração de cliente em silêncio;
- a fonte (Atkinson Hyperlegible) e o par claro/escuro são do design system.

## Cuidado ao apresentar

Não vender como "100% conforme LGPD" (PRD §38). O texto certo: *ferramentas técnicas para apoiar
a conformidade*, e o argumento jurídico defensável é "hospedado no Brasil = sem transferência
internacional = sem exigência de cláusulas-padrão da Resolução CD/ANPD nº 19/2024".
