# Ordem de Execucao do Backlog

Prioridade por impacto no negocio e dependencia, validada no baseline 246e410c.
Ultima revisao do estado de producao: 2026-11-23 (Management API, projeto `fygxlswpkjtjpcefjfty`).

## Bloqueios do dono (nao sao BR)

Apenas dois bloqueios continuam abertos, e ambos dependem de credencial que so o dono possui:

- [DONO] Secret `OPENROUTER_API_KEY` na Edge Function `mockup-ai`. Sem ela a funcao responde
  **HTTP 500** `"Configuracao do servidor incompleta"` (`supabase/functions/mockup-ai/index.ts:94`)
  e o Magic Up nunca gera imagem. Este e o unico item que impede a geracao real de arte.
- [DONO] Secrets `ERP_WEBHOOK_URL` + `ERP_WEBHOOK_SECRET` da edge `os-webhook-dispatcher`. Sem elas
  a funcao roda em modo self-disable e responde `{"ok":true,"disabled":true,"delivered":0}`
  (`supabase/functions/os-webhook-dispatcher/index.ts:41`). Toda a infraestrutura esta pronta e
  provada: fila, triggers, cron, assinatura HMAC e 19/19 chamadas com HTTP 200.
- [DONO] Rotacionar a service_role do projeto. O access token e a `SUPABASE_SECRET_KEY` foram
  expostos no chat; o token da controle total do projeto.

## Bloqueios resolvidos (nao repetir)

Historico do que foi executado direto em producao e provado, para que este documento nao volte a
mentir sobre o estado real:

- 8 tabelas do backlog **existem** em producao com `relrowsecurity=true` e **0 registros**:
  `approval_tokens`, `brand_guidelines_history`, `brand_share_tokens`, `dam_collections`,
  `magic_up_jobs`, `magic_up_styles`, `os_webhook_queue` (e a `organization_members` de apoio).
- Edge functions **deployadas**: 10 no total. `magic-up-jobs` e `os-webhook-dispatcher` nao
  respondem mais 404. `verify_jwt=false` apenas nas 3 publicas (`os-webhook-dispatcher`,
  `mockup-approval`, `brand-share`); as demais foram corrigidas para `true` via
  `PATCH /v1/projects/{ref}/functions/{slug}`.
- `migrate-helper` **deletada** em producao (`DELETE` HTTP 200, probe HTTP 404) e removida do repo
  na PR #119. Era endpoint de exfiltracao: `action=credentials` devolvia a service_role key com
  `verify_jwt=false` e CORS `*`.
- Migration `20261122160000_check_rls_enabled.sql` **aplicada** (PR #114). `check_rls_enabled()`
  retorna 40 tabelas e 0 sem RLS.
- Migration `20261123130000_os_webhook_vault_config.sql` **aplicada** (PR #118). Substitui a leitura
  de GUC `app.net.*` — que **nao existe** no Supabase hospedado (`postgres` tem `rolsuper=false`,
  `ALTER DATABASE SET` falha com `42501`) — pela leitura no **Vault**. Segredos
  `os_webhook_cron_secret` e `os_webhook_functions_base` gravados no Vault; `CRON_SECRET`
  rotacionado. Resultado: `run_os_webhook_dispatcher()` passou de 0 para 23 chamadas HTTP 200
  em `net._http_response` (100% de sucesso), e o job de cron acumula 894 execucoes `succeeded`.
- Migration `20261122150000_cron_retencao_dados.sql` (PR #102) **aplicada**. O job de retencao
  (`cron.job_run_details` jobid 13) roda com `succeeded` a cada minuto.
- Magic Up **UI ligada ao backend real** (PRs #122 e #123). `MagicUpGenerate.tsx` tinha um
  `handleGenerate` que era mock puro: `setTimeout(2000)` + `Math.random() < 0.05` + variacoes com
  `imageUrl: "/placeholder.svg"`, sem nenhuma chamada ao backend, e gravava o mesmo placeholder em
  `magicup_history`. O botao **Gerar** (principal) agora enfileira via `enqueueBatch` com o estilo
  selecionado; o `MagicUpResultsGrid` renderiza `MagicUpJob` reais em vez de batches locais. No
  backend, `resultImageUrl` passou de `"/placeholder.svg"` para `null`, tornando `done` sem imagem
  impossivel por construcao. Verificado: `magicup_history` tem 10 registros reais e **0** com
  placeholder em producao; edge `magic-up-jobs` deployada na `version=5`.
- `migrate-push` **removida** (PR #124). Codigo morto, nunca deployada (404), copiava 19 tabelas com
  `service_role` autenticando por header. Com a `migrate-helper`, fecha o par de endpoints de
  exfiltracao.
- RPCs de Magic Up **validadas em producao**: `enqueue_magic_up_jobs` cria 1 job por estilo
  (3 estilos = 3 jobs) e `cancel_magic_up_job` grava `cancelled` + `completed_at` sem afetar os
  irmaos do batch. Guards confirmados: `ERR_NO_STYLES`, `ERR_TOO_MANY_STYLES` (>8),
  `ERR_SHORT_PROMPT`, `ERR_NOT_MEMBER`, `ERR_JOB_NOT_FOUND`, `ERR_JOB_FINAL`.

## Estado real (revalidado 2026-11-23 no head `94f2b329`)

PND-01..08: DONE (verificados na fonte, docs fechados com evidencia).

1. **PND-09 offline mode - DONE** (PR #75). Service worker real com fallback de navegacao e
   cache de assets; dados do Supabase nunca cacheados. 752/752 vitest, 4/4 e2e em build de
   producao, 16/16 na simulacao do `sw.js`.
2. **PND-10 webhooks ERP - DONE em producao.** Migration aplicada, edge deployada, triggers ativos
   e cron rodando a cada minuto. Os 4 eventos que o dono pediu estao enfileirando em producao:
   `os.created`, `os.updated`, `os.status_changed`, `os.deleted`. Assinatura HMAC-SHA256
   (`X-Webhook-Signature`) com 7/7 testes Deno passando. Ciclo da fila provado:
   `pending -> dequeue (attempts 1) -> mark_failed (backoff futuro) -> mark_delivered`.
   **Unico pendente:** as duas credenciais do ERP do cliente (bloqueio do dono acima).
3. **Backlog do FEATURES.md (12 itens) - DONE em codigo e CI** (PR #78, `fa7e0f42`). Nenhum
   item 🔴, 🟡 ou 🔵 restante no doc. Aprovacao de cliente, colecoes DAM, brand history,
   brand share, Magic Up jobs e Magic Up styles: hooks, paginas, rotas, sidebar, command
   palette, edge functions e migrations completos. 2 bugs corrigidos na consolidacao:
   `verify_jwt` das functions publicas e erro engolido (estado vazio mascarando falha) em 3 telas.
   **Runtime agora existe em producao** — o que falta e apenas a chave de IA.
4. **Magic Up UI sem falso sucesso - DONE** (PRs #122, #123). Dois caminhos existiam na pagina de
   geracao: o botao **Gerar lote** usava o pipeline real e o botao principal **Gerar** simulava
   2 segundos e criava 4 miniaturas `/placeholder.svg`. O mock foi eliminado e o grid passou a
   renderizar os jobs da fila com polling de 3s. Nenhum `handleGenerate` mockado resta em `src/`.

## Iteracao contabilizada

PND-01..10 criados em 2026-11-21 a partir das 3 auditorias (docs/enterprise-audit-report.md,
docs/senior-frontend-audit.md, docs/senior-backend-audit-2026-07.md) + prod-readiness.
