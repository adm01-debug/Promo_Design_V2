---
ID: PND-10
Titulo: Webhooks de saida das OS para os tres sistemas internos (Champions, Fast Gravacoes, Supply)
Estado: EM IMPLEMENTACAO - codigo e migrations prontos, PRs abertas aguardando o dono (DDL em producao)
Fonte: docs/enterprise-audit-report.md [lacuna]
Data: 2026-11-23
---

# PND-10 - Webhooks de saida das OS para os tres sistemas internos

## Decisao de negocio (dona do processo)

O webhook de OS **nao vai para um ERP unico**. Vai para tres sistemas proprios, com roteamento
por natureza do evento:

| Evento                              | Destino                  | Papel do destino                                  |
| ----------------------------------- | ------------------------ | ------------------------------------------------- |
| `design.created` / `design.updated` | **Promo_Champions_V2.1** | CRM dos vendedores - criacao de design para venda |
| `os.closed` / `os.completed`        | **Fast_Gravacoes_V2**    | Personalizacao/fabricacao do produto              |
| `os.closed` / `os.completed`        | **Promo_Supply_V2**      | Compras de material                               |

## Estado atual

### Fluxo legado (intocado)

`os_webhook_queue` + `os-webhook-dispatcher` continuam como estavam: fila unica, HMAC, cron
`os-webhook-dispatcher-every-minute`. Nenhuma regressao - o fluxo novo e paralelo e so entra em
uso quando os secrets dos destinos existirem.

### Fluxo multi-destino (novo)

Migration `supabase/migrations/20261125120000_integration_multi_destino.sql`:

- `integration_queue` - `entity`/`entity_id`/`event`/`destination`, UNIQUE nos quatro juntos
  (idempotencia), status `pending | delivered | failed | dead | skipped`, RLS restrita a
  `service_role`. `skipped` e estado proprio: lacuna de cadastro nao queima tentativa nem vira
  dead-letter.
- Normalizacao de tecnica: `integration_norm_technique()` (unaccent + lower), mapa
  `integration_technique_map` e `integration_fg_technique()`. Os 6 vocabularios de producao
  mapeiam para as tecnicas do Fast Gravacoes.
- Triggers de enfileiramento:
  - `tg_os_integration_enqueue()` - status `pronta` -> `os.closed`; `concluida` ->
    `os.completed`; ambos para Fast Gravacoes **e** Supply.
  - `tg_design_integration_enqueue()` - `mockup_drafts` INSERT -> `design.created`; UPDATE
    relevante -> `design.updated`; so para Champions.
- Fila: `dequeue_integration_events()` (`FOR UPDATE SKIP LOCKED`, backoff),
  `mark_integration_delivered/skipped/failed` (dead apos 8 tentativas).
- `integration_config()` le do Vault com fallback nas chaves `os_webhook_*` antigas.
- `run_integration_dispatcher()` + cron `integration-dispatcher-every-minute`.

Edge Function `supabase/functions/integration-dispatcher/` (Deno):

- `adapters/fast_gravacoes.ts` - `POST /jobs` com `x-api-key`, envia `external_ref: entity_id`
  como chave de idempotencia ponta a ponta.
- `adapters/champions.ts` - envelope PromoGifts + `x-webhook-signature: sha256=<hex>`.
- `adapters/supply.ts` - payload alinhado ao schema real de `solicitacoes` (sem `tipo` e sem
  `vendedor`, que nao existem la); HTTP 422 -> `skipped`.
- Destino sem env e pulado no loop (nao trava a fila dos outros).
- 22 testes Deno (inclui os casos de gateway JWT).

### Destinos

- **Fast_Gravacoes_V2** - `erp-api` `POST /jobs`. Corrigido `technique_id` de `uuid` para
  `text` (a coluna real e TEXT) e adicionado `external_ref` com indice unico parcial +
  caminho 409/23505 idempotente.
- **Promo_Supply_V2** - edge nova `receive-os-sync`: HMAC SHA-256 hex sobre o corpo cru,
  fail-closed 503 sem secret, `timingSafeEqual`, idempotencia por `external_ref` (sem
  envenenar a chave em erro transitorio), `solicitacoes.external_ref` + indice unico parcial.
  15 testes do mapeamento.
- **Promo_Champions_V2.1** - tabela `designs_inbound` (RLS SELECT admin/manager/vendedor),
  edge `receive-design-sync` (HMAC sobre o corpo cru, fail-closed 503 sem secret, dedupe por
  `design_id:event`) e superficie de leitura em `/admin/design-inbound`: ultimos 100 designs
  recebidos com thumbnail, produto/SKU/vendedor, badge do ultimo evento e atalho "Designs
  Recebidos" no painel admin. Leitura via hook `useDesignsInbound` (camada de dados).

### Gateway: `verify_jwt` (bloqueio real em producao)

O gateway do Supabase valida o JWT **antes** de o codigo da function rodar. Function que nao
esta declarada em `supabase/config.toml` e publicada com `verify_jwt = true`, e todo webhook
(HMAC / `x-api-key`, sem `Authorization`) morre em
`401 {"code":"UNAUTHORIZED_NO_AUTH_HEADER"}`, **sem log da function** - parece que ela nao
existe. Probes reais (23/11): `os-webhook-dispatcher` sem declaracao -> 401; `mockup-approval`
declarada -> 400 de payload (chegou ao codigo).

| Function                                             | Fix                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integration-dispatcher` (Design, chamada pelo cron) | `[functions.integration-dispatcher] verify_jwt = false` no `config.toml` (#136)                                                                                                                                                                                                   |
| `receive-design-sync` (Champions)                    | `[functions.receive-design-sync] verify_jwt = false` no `config.toml` (#678)                                                                                                                                                                                                      |
| `receive-os-sync` (Supply)                           | `[functions.receive-os-sync] verify_jwt = false` no `config.toml` (#345)                                                                                                                                                                                                          |
| `erp-api` (Fast Gravacoes)                           | mantem `verify_jwt = true` (defesa em camada); o adapter manda **tambem** `Authorization: Bearer <anon key do FG>` (`FAST_GRAVACOES_ANON_KEY`) e a autorizacao real continua sendo `x-api-key`. 401 de gateway nesse destino vira `skipped` com motivo, em vez de retry infinito. |

`run_integration_dispatcher()` chama a function com apenas `Content-Type` e `x-cron-secret`, sem
`Authorization` - por isso a declaracao explicita e obrigatoria. Verificado em producao (23/11)
que o dispatcher **legado** (`os-webhook-dispatcher`) ja e alcancavel: o cron
`os-webhook-dispatcher-every-minute` recebe `200 {"ok":true,"disabled":true,"delivered":0}` a
cada minuto (chega no handler, que se auto-desabilita sem `ERP_WEBHOOK_URL`). O bloqueio do
gateway atinge so as functions publicadas a partir de um `config.toml` sem a entrada.

### Configuracao do cron (Vault)

`integration_config()` procura `integration_cron_secret` / `integration_functions_base` e cai
para `os_webhook_cron_secret` / `os_webhook_functions_base`. **Os dois antigos ja existem no
Vault do projeto** (criados em 22/11), entao o cron novo ja nasce configurado - nao precisa
criar secret novo. Unico cuidado: o env `CRON_SECRET` da edge function precisa ter **o mesmo
valor** de `os_webhook_cron_secret`, senao o dispatcher responde 401 no proprio handler.

## PRs da integracao (regra 8: DDL em producao)

| Repo                 | PR   | Conteudo                                                 | Estado           |
| -------------------- | ---- | -------------------------------------------------------- | ---------------- |
| Promo_Design_V2      | #136 | fila multi-destino, triggers, dispatcher e os 3 adapters | aberta, CI verde |
| Fast_Gravacoes_V2    | #272 | `technique_id` TEXT + `external_ref` + migration         | aberta, CI verde |
| Promo_Supply_V2      | #326 | `receive-os-sync`, mapeamento e migration                | mergeada         |
| Promo_Supply_V2      | #345 | `receive-os-sync` com `verify_jwt = false`               | aberta           |
| Promo_Champions_V2.1 | #674 | `receive-design-sync`, `designs_inbound` e pagina admin  | mergeada         |
| Promo_Champions_V2.1 | #678 | `receive-design-sync` com `verify_jwt = false`           | aberta           |

A falha que a #674 herdou do `main` (3 asserts do `winloss-webhook-dispatcher`) foi corrigida no
`main` pelo PR #677 (`fix: testes do dispatcher Win/Loss acompanham a assinatura HMAC`). Com o
`main` mergeado na branch e a Fase 7 entregue, a #674 esta com CI verde.

## O que falta (depende do dono)

0. **Estado real em producao (23/11/2026)** - nada disso esta aplicado ainda:
   - Promo Design: `integration_queue` nao existe (`42P01`); `schema_migrations` para em
     `20261124170000` (a `20261125120000` nunca rodou); `integration-dispatcher` responde 404.
   - Champions: `receive-design-sync` responde 404 (edge nunca deployada). `deploy.yml` so
     dispara por `workflow_dispatch`/tag - merge **nao** deploya.
   - Supply: `receive-os-sync` existe mas responde 401 do gateway (fix na #345).
   - Fast Gravacoes: `webhook-handler`/`erp-api` respondem 401 do gateway (esperado).
1. **Aplicar as migrations** nos bancos que faltam (`20261125120000` no Design,
   `20261125150000` no Champions) e deployar as edges. #326 e #674 ja estao mergeadas.
2. **Secrets** nas Edge Functions:
   - Promo Design: `CHAMPIONS_WEBHOOK_URL` + `CHAMPIONS_WEBHOOK_SECRET`,
     `FAST_GRAVACOES_API_URL` + `FAST_GRAVACOES_API_KEY`, `FAST_GRAVACOES_ANON_KEY` (anon key
     do projeto do Fast Gravacoes - so passa o gateway; a autorizacao e o `x-api-key`),
     `SUPPLY_WEBHOOK_URL` + `SUPPLY_WEBHOOK_SECRET`, `CRON_SECRET`.
   - Promo Supply: `PROMO_DESIGN_WEBHOOK_SECRET`.
   - Promo Champions: `DESIGN_SYNC_WEBHOOK_SECRET` (mesmo valor de
     `CHAMPIONS_WEBHOOK_SECRET` do Promo Design).
3. **Deploy** de `integration-dispatcher` (Promo Design), `receive-design-sync` (Champions) e
   `receive-os-sync` (Supply). Champions aceita `workflow_dispatch` com `ref`; Supply aceita
   `workflow_dispatch` com `functions=receive-os-sync`.
4. **Tokens da Management API** dos projetos Fast_Gravacoes, Champions e Supply - sem eles
   nada pode ser aplicado nem validado nos bancos deles.
5. **Fase 7 - consumo nos destinos**: entregue nos tres.
   - Champions: pagina `/admin/design-inbound` lendo `designs_inbound` via `useDesignsInbound`.
   - Supply: o receptor ja grava em `solicitacoes` com titulo `Compra p/ OS <numero> - <produto>`,
     `observacoes` com `Origem: Promo Design (OS <numero>)` e `prioridade = alta` - a tela de
     solicitacoes existente ja mostra a linha, sem mudanca de UI.
   - Fast Gravacoes: o job entra em `jobs` pelo `POST /jobs` e aparece no kanban/telas de jobs
     ja existentes.

## Evidencia coletada nesta sessao

- Trigger e fila testados em transacao real com `ROLLBACK` no Postgres de producao do Promo
  Design (3 rodadas, todas verdes) - nenhum dado gravado.
- Migration **inteira** (`20261125120000`, 508 linhas) rodada em transacao com `ROLLBACK` contra
  o schema de producao (HTTP 201, sem erro) - aplica limpa. Depois do rollback:
  `to_regclass('public.integration_queue') = null`, 0 jobs de cron, 0 linha em
  `schema_migrations`.
- Estado real de producao (23/11): `integration_queue` inexistente (`42P01`),
  `integration-dispatcher` 404, `receive-design-sync` (Champions) 404, `receive-os-sync`
  (Supply) 401 do gateway.
- Cron legado `os-webhook-dispatcher-every-minute` ativo e saudavel: `net._http_response`
  mostra 200 `{"ok":true,"disabled":true,"delivered":0}` a cada minuto (self-disable sem
  `ERP_WEBHOOK_URL`).
- `deno test` do `integration-dispatcher`: 22/22. `deno test` do `receive-os-sync`: 15/15.
- Fast Gravacoes: `deno check` OK, `deno test _shared/contracts.test.ts` 5/5,
  `vitest src/test/erpApiContracts.test.ts` 58/58, `vitest src/test/webhookFuzz.test.ts`
  107/107.
- Promo Champions: `deno test` do `receive-design-sync` (mapeamento 12/12, contrato cruzado
  3/3), `deno check` do handler limpo, `lint-input-validation.ts` sem drift (27/147).
- Promo Champions (Fase 7): pagina e hook passam `tsc --noEmit`, `eslint --max-warnings 0`,
  `prettier --check`, `typecheck:baseline` (0 erro novo) e `vite build`; `check-data-layer` sem
  violacao nova.
- Suite Deno do Supply: 166 passando; a unica falha (`_shared/xbz_pedido_map.test.ts:90`) e
  pre-existente, provada com `git stash` no `main`.

## Fonte

docs/enterprise-audit-report.md [lacuna]
