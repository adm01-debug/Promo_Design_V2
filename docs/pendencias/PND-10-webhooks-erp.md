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
  - **Tecnica acentuada legada**: OS antigas foram gravadas com encoding quebrado
    (CP1252 lido como UTF-8) e `Sublimacao` virou `Sublima<U+FFFD><U+FFFD>o`. Medido em
    producao: `integration_fg_technique()` devolvia NULL, o adapter marca `skipped` e o job
    **nunca** nascia no Fast Gravacoes. Correcao: `integration_norm_technique()` remove
    `chr(65533)` e o mapa ganhou as chaves legadas (`sublimao`, `sublimao - caneca`, ...).
    Verificado com a OS real: payload sai com `fg_technique_id = thermal-press`.
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
| Promo_Design_V2      | #136 | fila multi-destino, triggers, dispatcher e os 3 adapters | mergeada         |
| Fast_Gravacoes_V2    | #272 | `technique_id` TEXT + `external_ref` + migration         | mergeada         |
| Fast_Gravacoes_V2    | #277 | `erp_api_keys` recriada (tabela ausente em producao)     | aberta (regra 8) |
| Promo_Design_V2      | #138 | mapa de tecnicas com os ids reais do destino             | mergeada         |
| Fast_Gravacoes_V2    | #280 | `erp-api` responde 400 (nao 500) em dado invalido        | aberta (CI)      |
| Promo_Champions_V2.1 | #686 | workflow que publica `DESIGN_SYNC_WEBHOOK_SECRET`        | aberta (regra 8) |
| Promo_Supply_V2      | #352 | workflow que publica `PROMO_DESIGN_WEBHOOK_SECRET`       | aberta (regra 8) |
| Promo_Supply_V2      | #326 | `receive-os-sync`, mapeamento e migration                | mergeada         |
| Promo_Supply_V2      | #345 | `receive-os-sync` com `verify_jwt = false`               | mergeada         |
| Promo_Champions_V2.1 | #674 | `receive-design-sync`, `designs_inbound` e pagina admin  | mergeada         |
| Promo_Champions_V2.1 | #678 | `receive-design-sync` com `verify_jwt = false`           | mergeada         |

A falha que a #674 herdou do `main` (3 asserts do `winloss-webhook-dispatcher`) foi corrigida no
`main` pelo PR #677 (`fix: testes do dispatcher Win/Loss acompanham a assinatura HMAC`). Com o
`main` mergeado na branch e a Fase 7 entregue, a #674 esta com CI verde.

## Estado em producao (24/11/2026)

Aplicado e verificado nos tres destinos. As duas unicas pontas soltas sao os segredos dos
receptores Champions/Supply (item 1 de "O que falta").

### Promo Design (`fygxlswpkjtjpcefjfty`) - completo

- Migration `20261125120000` aplicada pela Management API (HTTP 201): `integration_queue`,
  o mapa de tecnicas e o cron `integration-dispatcher-every-minute`.
- Migration `20261125180000` aplicada pelo `Deploy Supabase` do merge da #138: o mapa apontava
  para os slugs de uma migration antiga do destino (`laser-co2`, `thermal-press`), que **nao
  existem** em `public.techniques` de producao do Fast Gravacoes. Resultado final: 27 chaves,
  0 ids invalidos contra as 9 tecnicas do destino.
- `integration-dispatcher` deployado (`verify_jwt = false`) e redeployado apos a rotacao dos
  segredos, para o container nascer com os valores novos.
- 7 secrets de integracao no projeto. `GET /secrets` da Management API devolve **apenas o
  SHA-256** de cada valor, entao a conferencia e por hash: as tres URLs e a
  `FAST_GRAVACOES_ANON_KEY` conferem com o valor esperado.
- Cron drenando a fila: `cron.job_run_details` com runs `succeeded` a cada minuto e
  `net._http_response` 200 com o summary por destino.
- Smoke: `POST /functions/v1/integration-dispatcher` sem credencial -> 401.

### Fast Gravacoes (`uoujzvpecohinketylud`) - completo e provado

- #272 mergeada; o workflow `Deploy` (run `45292427329`, success) aplicou
  `20261125130000_jobs_external_ref.sql` - coluna e indice unico parcial presentes
  (`information_schema` 1 / `pg_indexes` 1).
- `public.erp_api_keys` **nao existia em producao** (`42P01`) apesar de as migrations
  `20260520`/`20260521`/`20260620` constarem aplicadas. Recriada com RLS e policy
  `Managers can manage API keys`, mais a chave da integracao.
- Prova com **as credenciais exatas do dispatcher** (anon key do projeto + `x-api-key` cujo
  SHA-256 casa com o `key_hash` da tabela): `GET /erp-api/jobs` -> **200** com `external_ref`
  no payload; chave errada -> **401**; corpo invalido -> **400** `Invalid job data`.
- **Bug encontrado e corrigido em 24/11**: com `technique_id` inexistente o destino respondia
  **500** (`jobs_technique_id_fkey`, erro 23503) e a fila retentava para sempre. Causa: os ids
  do mapa eram os slugs de uma migration antiga do destino; a producao usa ids curtos
  (`bordado`, `dtf`, `flexo`, `laser`, `serigrafia`, `sublimacao`, `tampografia`, `tamposec`,
  `uv`, referenciados por 413 jobs e 10 maquinas). Mapa corrigido na #138; o 500 -> 400 na
  #280 (aguardando CI). As 7 chaves sem equivalente no destino (`corte`, `corte midia`,
  `decalque`, `decalque forno`, `embossing`, `hot stamp`, `hot stamping`) foram removidas do
  mapa: o evento fica `skipped` com motivo em vez de queimar tentativas.
- Prova ponta a ponta pela fila em 24/11: evento `os.created` -> `status=delivered`,
  `attempts=1`, `net._http_response` 200 com `{"fast_gravacoes":{"delivered":1}}` e job criado
  em `jobs` (`technique_id=sublimacao`, `status=queue`, `external_ref` da OS). O job de teste
  (`E2E-86901`) foi removido depois.

### Promo Champions (`usyxfpqlsspldubptrdl`) - deployado, falta o segredo

- Migration `20261125150000_designs_inbound.sql` aplicada (`apply-migration.yml`, run
  `45289261208`, success); `deploy.yml` executado e `receive-design-sync` deixou de ser 404.
- Hoje: `503 {"ok":false,"error":"secret_not_configured"}` - fail-closed correto enquanto
  `DESIGN_SYNC_WEBHOOK_SECRET` nao existir no projeto.

### Promo Supply (`lmypcdfsrgfftzhxawao`) - deployado, falta o segredo

- Migration `20261125140000_integracao_promo_design.sql` aplicada (run `45289409407`) e
  `receive-os-sync` deployado (run `45289415471`), ambos success.
- Hoje: `503 {"error":"webhook not configured"}` - fail-closed correto enquanto
  `PROMO_DESIGN_WEBHOOK_SECRET` nao existir no projeto.

### OS antigas com encoding quebrado - corrigidas

- As 4 OS com `Sublima<U+FFFD><U+FFFD>o` em `service_orders.technique` foram corrigidas:
  `OS-2026-00002` e `00005` -> `Sublimacao`; `00009` (Caneca) e `00013` (Copo Termico) ->
  `Sublimacao - Caneca`.
- `integration_fg_technique()` devolve hoje `sublimacao` para `Sublimacao` e
  `sublimacao` para `Sublimacao - Caneca` (o destino nao distingue caneca de copo termico:
  tem uma unica tecnica `sublimacao`). Varredura global: `os_corrompidas = 0` de 20.

## O que falta

1. **Dois PRs de regra 8 aguardando aprovacao** - cada um adiciona um workflow de dispatch
   manual (inerte ate ser executado) que publica o segredo do receptor pela Management API,
   lendo o valor do secret do repositorio:
   - Promo_Champions_V2.1 **#686** -> `DESIGN_SYNC_WEBHOOK_SECRET`
   - Promo_Supply_V2 **#352** -> `PROMO_DESIGN_WEBHOOK_SECRET`

   Os dois secrets de repositorio ja estao cadastrados e conferidos por hash contra o valor que
   o Promo Design usa (rotacionado nesta sessao). Depois do merge, disparar o workflow com
   `confirmacao=APLICAR`; a prova e o receptor sair de `503` para `401 hmac_missing` (sem
   assinatura) e `200` no corpo assinado.

2. **Fast_Gravacoes_V2 #280** (CI vermelha, nao e do PR) - `erp-api` passa a responder 400 em
   dado invalido em vez de 500, o que corta o retry infinito. A CI falha em tres testes
   herdados de data (`useSchedulingData.test.tsx`), que quebram entre 00:00 e 03:00 UTC porque
   `vitest.config.ts` fixa `TZ=America/Sao_Paulo` e os fixtures usam `new Date().toISOString()`.
   Reproduzido em codigo nao modificado; nao corrigido por ser debito do `main`.
3. **Fast_Gravacoes_V2 #277** (regra 8, DDL) - migration idempotente que garante
   `public.erp_api_keys` em ambiente novo. Producao ja tem a tabela; o PR evita repetir o
   `42P01` em clone/preview branch.
4. **Ponto de disparo do Supply (decisao de negocio)**: a trigger manda `os.closed` quando a OS
   fica `pronta` e `os.completed` quando fica `concluida` - status que **nao existe** na
   producao atual (`aberta -> aprovada -> em_producao -> pronta -> entregue`). Se a compra de
   material tem de comecar na aprovacao, o gatilho muda de `pronta` para `aprovada`.
5. **Debito de seguranca da #272**: `jobs.external_ref` e gravavel por operador pela RLS de
   `jobs`. Endurecer exige trigger/RPC ou policy restrita a `service_role` - DDL, regra 8.
6. **Tecnicas sem par no Fast Gravacoes**: `corte`, `corte midia`, `decalque`, `decalque forno`,
   `embossing`, `hot stamp`, `hot stamping` nao existem no destino (9 tecnicas). Hoje qualquer
   OS com uma delas fica `skipped` com motivo. Para fluir, o Fast Gravacoes precisa cadastrar a
   tecnica ou o negocio precisa definir o equivalente - decisao de negocio, nao de codigo.

### Runbook do dia da liberacao (nesta ordem)

```bash
# 1. Promo Design: migration (cria fila, triggers, RPCs e o cron de 1 min)
supabase db push --project-ref fygxlswpkjtjpcefjfty     # ou aplicar o .sql pela Management API

# 2. Promo Design: deploy do dispatcher (le supabase/config.toml -> verify_jwt = false)
supabase functions deploy integration-dispatcher --project-ref fygxlswpkjtjpcefjfty

# 3. secrets do Promo Design (CRON_SECRET ja existe e casa com os_webhook_cron_secret do
#    Vault - nao trocar; os destinos so ligam quando as env abaixo existirem)
supabase secrets set --project-ref fygxlswpkjtjpcefjfty \
  CHAMPIONS_WEBHOOK_URL=https://usyxfpqlsspldubptrdl.supabase.co/functions/v1/receive-design-sync \
  CHAMPIONS_WEBHOOK_SECRET=... \
  FAST_GRAVACOES_API_URL=https://uoujzvpecohinketylud.supabase.co/functions/v1/erp-api \
  FAST_GRAVACOES_API_KEY=... FAST_GRAVACOES_ANON_KEY=<anon key do FG> \
  SUPPLY_WEBHOOK_URL=https://lmypcdfsrgfftzhxawao.supabase.co/functions/v1/receive-os-sync \
  SUPPLY_WEBHOOK_SECRET=...

# 4. destinos: mesma credencial do outro lado + deploy da edge
#    Champions: DESIGN_SYNC_WEBHOOK_SECRET = CHAMPIONS_WEBHOOK_SECRET
#    Supply:    PROMO_DESIGN_WEBHOOK_SECRET = SUPPLY_WEBHOOK_SECRET

# 5. prova real (espera 200 com o summary por destino)
curl -s -X POST https://fygxlswpkjtjpcefjfty.supabase.co/functions/v1/integration-dispatcher \
  -H "x-cron-secret: <valor de os_webhook_cron_secret>" \
  -H "Content-Type: application/json" -d '{}'
```

## Evidencia coletada nesta sessao

- Mergeadas e aplicadas em producao em 24/11: #136 (Design, main `85f990d2`) e #272 (Fast
  Gravacoes, main `17a3af4`); a migration do Design entrou pela Management API e a do Fast
  Gravacoes pelo workflow de deploy (run `45292427329`).
- Rotacao dos segredos HMAC feita com conferencia por hash nos dois lados (o valor do secret
  do repositorio e o do projeto batem), porque a Management API nao devolve o valor em claro.

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
- **Trigger de design exercitado com dado sintetico** em transacao com `ROLLBACK`: insert gerou
  `design.created` e um `update` de `name` gerou `design.updated`; um `update` so de
  `editor_state` **nao** gerou evento (guarda de campo relevante funcionando). Payload completo,
  com `owner_email` resolvido por `auth.users` (producao tinha `mockup_drafts` vazia).
- **Contratos cruzados conferidos campo a campo**: o adapter do Champions entrega
  `seller_email`, `x-webhook-signature: sha256=<hex>` e `correlation_key =
design_id:event`, exatamente o que `receive-design-sync` valida; o do Supply entrega
  `solicitante_email`, HMAC e trata 422 (tenant nao resolvido) como `skipped`, que e o que
  `receive-os-sync` devolve.
- **Correcao de uma conclusao errada registrada antes**: a conferencia do mapa de tecnicas
  contra `public.techniques` do Fast Gravacoes foi refeita em 24/11 contra a producao real e
  reprovou 34 de 34 chaves. A checagem anterior comparou o mapa com o **seed da migration**
  do destino, nao com a tabela de producao - por isso passou indevidamente. O mapa foi
  corrigido na #138 (27 chaves, 0 invalidas) e revalidado com insert em `jobs` pela propria
  fila (HTTP 200, job criado).
- Prova ponta a ponta em 24/11 pela fila real: `integration_queue` -> `delivered` em 1
  tentativa, `net._http_response` `200 {"ok":true,"summary":{"fast_gravacoes":{"delivered":1}}}`,
  `jobs.technique_id = sublimacao`, e nenhum evento preso em `retry` no destino.
- Corrupcao de encoding medida em producao: 4 de 20 OS, so na coluna `technique`.

## Fonte

docs/enterprise-audit-report.md [lacuna]
