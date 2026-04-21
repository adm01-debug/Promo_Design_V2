

## Análise de Gaps — Promo Design vs. Sistema Enterprise de Classe Mundial

Comparativo entre o estado atual do Promo Design e o que plataformas enterprise de design/produção promocional (Adobe Workfront, Bynder, Frontify, Canva Enterprise, Printavo, InkSoft) entregam.

### O que o Promo Design já tem (base sólida)

OS com state machine + audit trail, Mockup Studio, Magic Up (IA), Video Studio, Catálogo, autenticação, RLS por usuário, notificações, PDF export, testes (444+), realtime, dashboard com widgets.

---

### Gaps Críticos (bloqueiam adoção enterprise)

**1. Multi-tenancy & Colaboração**
- Sem organizações/workspaces — tudo é por `user_id`, impossível compartilhar entre time
- Sem papéis (admin, designer, aprovador, cliente) — falta tabela `user_roles` + `has_role()`
- Sem convites por e-mail, sem permissões granulares por módulo
- Sem comentários/menções (@) em mockups e OS
- Sem presença em tempo real (quem está vendo/editando)

**2. Workflow de Aprovação (Proofing)**
- Hoje: status muda direto. Falta fluxo formal cliente → designer → cliente
- Sem link público de aprovação para cliente externo (sem login)
- Sem markup visual (anotações em cima do mockup) tipo Filestage/Ziflow
- Sem versionamento de artes (V1, V2, V3 com diff)
- Sem assinatura digital de aprovação

**3. DAM — Digital Asset Management**
- Sem biblioteca central de logos/artes do cliente
- Sem tags, metadados, busca por cor/conteúdo
- Sem controle de versão de assets
- Sem brand guidelines (paleta, fontes, do/don't) por cliente

**4. CRM & Cliente**
- `client_name` é texto livre na OS — sem entidade Cliente reutilizável
- Sem portal do cliente (acompanhar pedidos, aprovar, baixar)
- Sem histórico consolidado por cliente
- Sem contatos múltiplos por cliente

**5. Produção & Operações**
- Sem ordem de compra ao fornecedor
- Sem controle de estoque real (catálogo tem campo mas não movimenta)
- Sem fila de produção / kanban por máquina/técnica
- Sem agenda de entregas / capacity planning
- Sem código de barras / QR para rastreamento físico
- Sem checklist de qualidade pós-produção

**6. Financeiro**
- Sem orçamento/cotação (quote → order)
- Sem precificação por técnica/quantidade/área
- Sem faturamento, NF, integração fiscal
- Sem pagamentos online (Stripe/Pix)
- Sem comissões de vendedor
- Sem relatório de margem por OS

---

### Gaps Importantes (esperados em enterprise)

**7. Observabilidade & Compliance**
- Audit log existe só para status — falta para todas as entidades (quem editou o quê)
- Sem LGPD: exportação de dados, direito ao esquecimento, consentimento
- Sem SSO (SAML/OIDC) — exigido por contas grandes
- Sem 2FA/MFA
- Sem retenção/arquivamento configurável
- Sem rate limiting nas Edge Functions

**8. Integrações**
- Sem webhooks de saída (notificar ERP/CRM externo)
- Sem API pública documentada (REST/OpenAPI)
- Sem Zapier/Make
- Sem integração com ERPs (Bling, Omie, Tiny)
- Sem e-mail transacional branded (SendGrid/Resend)
- Sem WhatsApp Business para notificar cliente

**9. Inteligência & Analytics**
- Dashboard atual é operacional, não analítico
- Sem cohort, funil, lifetime value de cliente
- Sem previsão de demanda
- Sem detecção de anomalias (OS atrasada, cliente inativo)
- Sem export para BI (Metabase/Looker)

**10. IA Avançada**
- Magic Up gera imagens, mas falta:
  - Auto-tagging de assets
  - Busca semântica ("logo azul de banco")
  - Geração de copy/briefing
  - Score de qualidade de arte (DPI, contraste, sangria)
  - Mockup automático a partir de foto do produto real

**11. Internacionalização & Acessibilidade**
- App só em PT-BR — sem i18n (en, es)
- Sem multi-moeda
- Acessibilidade parcial (skip-link existe, mas falta auditoria WCAG AA completa)

**12. Mobile & Offline**
- Responsivo, mas sem PWA / app instalável
- Sem modo offline para chão de fábrica
- Sem app nativo para aprovação rápida do cliente

---

### Gaps de Plataforma (maturidade técnica)

**13. SRE & Confiabilidade**
- Sem feature flags
- Sem A/B testing
- Sem error tracking centralizado (Sentry)
- Sem APM (performance monitoring)
- Sem health checks / status page
- Sem backup automatizado verificável

**14. Governança de Dados**
- Sem soft delete generalizado (hoje delete é hard)
- Sem versionamento de schema visível ao usuário
- Sem data dictionary exposto
- Sem dry-run para operações destrutivas

---

### Top 10 Priorizados (impacto × esforço)

| # | Gap | Impacto | Esforço |
|---|-----|---------|---------|
| 1 | Multi-tenant + roles (organizações, convites, permissões) | Alto | Alto |
| 2 | Cliente como entidade + portal de aprovação público | Alto | Médio |
| 3 | Workflow de proofing com markup e versionamento | Alto | Alto |
| 4 | DAM com biblioteca de logos/brand guidelines | Alto | Médio |
| 5 | Orçamento → OS → Faturamento (módulo financeiro) | Alto | Alto |
| 6 | Audit log universal + LGPD básico | Médio | Médio |
| 7 | Webhooks + API pública documentada | Médio | Médio |
| 8 | Sentry + observabilidade | Médio | Baixo |
| 9 | i18n (en, es) | Médio | Médio |
| 10 | PWA + modo offline básico | Médio | Médio |

### Sugestão de Roadmap (3 ondas)

**Onda 1 — Fundação Enterprise (bloqueadores B2B)**
Multi-tenant, roles, cliente como entidade, audit universal, Sentry.

**Onda 2 — Diferencial competitivo**
Proofing com markup, DAM, portal do cliente, módulo financeiro inicial.

**Onda 3 — Escala & Integrações**
API pública, webhooks, integrações ERP, IA avançada, i18n, PWA.

---

Posso transformar qualquer item desta lista em um plano de implementação detalhado. Diga qual onda ou gap específico atacar primeiro.

