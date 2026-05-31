# Promo Design

**Sistema de Criação para Times de Arte** — plataforma completa para gestão de brindes promocionais, mockups, geração de imagens com IA e produção de vídeos publicitários.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)

## 📋 Índice

- [Relatórios de Auditoria](#-relatórios-de-auditoria)
- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Módulos](#módulos)
- [Stack Tecnológica](#stack-tecnológica)
- [Setup Local](#setup-local)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Banco de Dados](#banco-de-dados)
- [Segurança](#segurança)
- [Testes](#testes)
- [Deploy](#deploy)

---

## 🛡️ Documentação Técnica e Auditoria

Para manter a transparência e excelência técnica 10/10, o sistema dispõe de documentação enterprise:

- **[Guia de Arquitetura (Markdown)](ARCHITECTURE.md)**: Mapa do projeto, fluxos de dados, contratos de API e padrões de desenvolvimento.
- **[Enterprise Audit Report (Markdown)](docs/enterprise-audit-report.md)**: Inventário detalhado de funcionalidades, matriz de riscos e checklist operacional.
- **[Senior Front-End Audit (Markdown)](docs/senior-frontend-audit.md)**: Análise técnica de performance, acessibilidade e arquitetura front-end.
- **[Relatório de Auditoria (PDF)](docs/audit_report.pdf)**: Versão exportável do relatório (disponível no repositório).

Você também pode acessar a documentação diretamente na aplicação através da rota `/docs` no dashboard.

---
33: 
34: ## Visão Geral

Promo Design é uma aplicação SPA construída com React 18 e TypeScript, focada no fluxo de trabalho de personalização de brindes promocionais:

- **Ordens de Serviço** — Cadastro, acompanhamento por máquina de estados e exportação PDF
- **Mockup Studio** — Editor visual com posicionamento de artes sobre produtos
- **Magic Up** — Geração de imagens publicitárias com IA
- **Video Studio** — Criação de vídeos animados com moodboard e cinema mode
- **Catálogo** — Gestão de produtos e categorias

## Arquitetura

```
┌─────────────────────────────────────────┐
│              React SPA (Vite)           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐  │
│  │ OS   │ │Mock  │ │Magic │ │Video  │  │
│  │Module│ │Studio│ │ Up   │ │Studio │  │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬────┘  │
│     └────────┴────────┴────────┘       │
│           TanStack Query + Zustand      │
│              Supabase Client            │
└─────────────────┬───────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────┐
│          Lovable Cloud (Supabase)       │
│  ┌──────────┐ ┌───────┐ ┌───────────┐  │
│  │PostgreSQL│ │Storage│ │Edge Funcs  │  │
│  │  + RLS   │ │(arts) │ │(mockup-ai)│  │
│  └──────────┘ └───────┘ └───────────┘  │
└─────────────────────────────────────────┘
```

### Padrões Adotados

| Padrão | Descrição |
|--------|-----------|
| **Feature Folders** | Cada módulo em `src/features/<nome>/` com pages, hooks, components |
| **State Machine** | Status de OS com transições controladas (`STATUS_TRANSITIONS`) |
| **Server-Side Pagination** | Queries paginadas via `range()` com contagem `exact` |
| **Audit Trail** | Trigger automático registra mudanças de status em `status_audit_log` |
| **RLS** | Isolamento total de dados por `auth.uid() = user_id` |

## Módulos

### 📋 Ordens de Serviço
- CRUD completo com validação Zod
- Máquina de estados: `aberta` → `em_producao` → `concluida` / `cancelada`
- Exportação PDF com logo e dados completos
- Upload de artes via Storage privado (URLs assinadas)
- Dashboard com gráficos de status, técnicas e tendências
- Notificações automáticas via triggers
- Trilha de auditoria completa

### 🎨 Mockup Studio
- Editor visual com posicionamento de logos
- Rascunhos persistidos no banco
- Integração com catálogo de produtos

### ✨ Magic Up
- Geração de imagens via IA (Edge Function `mockup-ai`)
- Galeria de inspiração e templates de prompts
- Histórico com favoritos e picker de produtos

### 🎬 Video Studio
- Moodboard Creator (tom visual, paleta, cenários, imagens de referência)
- Cinema Mode com color grading
- Preview animado com Framer Motion

### 📦 Catálogo
- Produtos com SKU, material, cores e categorias
- Filtros, busca e paginação server-side

## Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **UI** | React 18, TypeScript 5, Tailwind CSS 3, shadcn/ui |
| **Estado** | TanStack Query (server state), Zustand (client state) |
| **Animações** | Framer Motion |
| **Gráficos** | Recharts |
| **Drag & Drop** | @dnd-kit |
| **PDF** | jsPDF |
| **Backend** | Lovable Cloud — PostgreSQL, Auth, Storage, Edge Functions |
| **Testes** | Vitest, React Testing Library, Playwright (E2E) |
| **Build** | Vite 5 |

## Setup Local

```bash
# 1. Clone e instale
git clone <repo-url> && cd promo-design
npm install

# 2. Variáveis de ambiente (auto-geradas pelo Lovable Cloud)
# .env já contém VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY

# 3. Desenvolvimento
npm run dev          # http://localhost:5173

# 4. Build de produção
npm run build
```

## Estrutura de Pastas

```
src/
├── components/          # Compartilhados (UI, layout, navigation)
│   └── ui/              # shadcn/ui primitives
├── features/            # Feature folders (domínio de negócio)
│   ├── catalog/         # Catálogo de produtos
│   ├── magic-up/        # Geração IA
│   ├── mockup/          # Mockup Studio
│   ├── service-orders/  # Ordens de Serviço
│   └── video/           # Video Studio
├── hooks/               # Hooks globais (auth, theme, shortcuts, toast)
├── integrations/        # Supabase client + types (auto-gerado)
├── lib/                 # Utilitários puros (utils, error-logger)
├── pages/               # Páginas de rota raiz
└── test/                # Suítes de teste

supabase/
├── config.toml          # Configuração do projeto
├── functions/           # Edge Functions (Deno)
│   └── mockup-ai/       # Geração de mockups via IA
└── migrations/          # Migrações SQL versionadas
```

## Banco de Dados

### Dicionário de Dados

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `service_orders` | Ordens de serviço | os_number, client_name, product_name, technique, status, quantity |
| `catalog_products` | Produtos do catálogo | name, sku, material, colors, category_id |
| `product_categories` | Categorias | name, description |
| `magicup_history` | Gerações IA | prompt, image_url, style, favorite |
| `mockup_drafts` | Rascunhos de mockups | name, product_name, editor_state |
| `notifications` | Notificações | os_number, event_type, old_status, new_status, read |
| `status_audit_log` | Trilha de auditoria | service_order_id, old_status, new_status, changed_at |

### Triggers

| Trigger | Tabela | Ação |
|---------|--------|------|
| `trg_log_status_change` | service_orders | Registra mudanças de status no audit log |
| `notify_os_created` | service_orders | Cria notificação ao criar OS |
| `notify_os_status_change` | service_orders | Cria notificação ao mudar status |
| `validate_service_order` | service_orders | Valida quantity ≥ 1 e limites de string |

### Índices Estratégicos

- `idx_so_user_status` — (user_id, status)
- `idx_so_user_created` — (user_id, created_at DESC)
- `UNIQUE(user_id, os_number)` — Unicidade de número da OS por usuário
- `idx_catalog_user`, `idx_magicup_user_created`, `idx_drafts_user`
- `idx_notifications_user` — (user_id, read)
- `idx_audit_log_*` — service_order_id, user_id, changed_at

## Segurança

| Controle | Status |
|----------|--------|
| RLS em todas as tabelas | ✅ |
| Policies restritas a `authenticated` | ✅ |
| Storage privado (URLs assinadas) | ✅ |
| CORS restrito em Edge Functions | ✅ |
| Validação server-side (triggers) | ✅ |
| State machine de status | ✅ |
| Audit trail automático | ✅ |
| HIBP (senhas vazadas) | ⚙️ Manual |

## Testes

```bash
npm test                    # Vitest (444+ testes)
npx playwright test         # E2E
npm test -- --coverage      # Cobertura
```

- Validação de tipos, domínio, canvas, PDF e barrel exports
- E2E: autenticação, navegação e fluxo de ordens de serviço

## Deploy

Deploy automático via **Lovable Cloud**:

1. Build otimizado com Vite (tree-shaking, code-splitting, lazy loading)
2. Assets via CDN global
3. Edge Functions deployadas automaticamente
4. Migrações aplicadas na pipeline

Para publicar: abra o projeto no Lovable → Share → Publish.

Para domínio customizado: Project → Settings → Domains → Connect Domain.

---

**Promo Design** © 2026 — Construído com ❤️ usando [Lovable](https://lovable.dev)
