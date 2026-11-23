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
- 17 testes Deno.

### Destinos

- **Fast_Gravacoes_V2** - `erp-api` `POST /jobs`. Corrigido `technique_id` de `uuid` para
  `text` (a coluna real e TEXT) e adicionado `external_ref` com indice unico parcial +
  caminho 409/23505 idempotente.
- **Promo_Supply_V2** - edge nova `receive-os-sync`: HMAC SHA-256 hex sobre o corpo cru,
  fail-closed 503 sem secret, `timingSafeEqual`, idempotencia por `external_ref` (sem
  envenenar a chave em erro transitorio), `solicitacoes.external_ref` + indice unico parcial.
  15 testes do mapeamento.
- **Promo_Champions_V2.1** - ainda **nao iniciado**: falta a tabela de design e a edge
  receptora. O adapter do lado do Promo Design ja esta pronto e testado.

## PRs abertas (regra 8: DDL em producao, aguardando o dono)

| Repo              | PR   | Conteudo                                                 |
| ----------------- | ---- | -------------------------------------------------------- |
| Promo_Design_V2   | #136 | fila multi-destino, triggers, dispatcher e os 3 adapters |
| Fast_Gravacoes_V2 | #272 | `technique_id` TEXT + `external_ref` + migration         |
| Promo_Supply_V2   | #326 | `receive-os-sync`, mapeamento e migration                |

## O que falta (depende do dono)

1. **Aplicar as migrations** nos tres bancos e mergear #136, #272 e #326.
2. **Secrets** nas Edge Functions:
   - Promo Design: `CHAMPIONS_WEBHOOK_URL` + `CHAMPIONS_WEBHOOK_SECRET`,
     `FAST_GRAVACOES_API_URL` + `FAST_GRAVACOES_API_KEY`, `SUPPLY_WEBHOOK_URL` +
     `SUPPLY_WEBHOOK_SECRET`, `CRON_SECRET`.
   - Promo Supply: `PROMO_DESIGN_WEBHOOK_SECRET`.
3. **Deploy** de `integration-dispatcher` (Promo Design) e `receive-os-sync` (Supply).
4. **Fase 6 - Champions**: receptor `receive-design-sync` + tabela de design.
5. **Tokens da Management API** dos projetos Fast_Gravacoes, Champions e Supply - sem eles
   nada pode ser aplicado nem validado nos bancos deles.

## Evidencia coletada nesta sessao

- Trigger e fila testados em transacao real com `ROLLBACK` no Postgres de producao do Promo
  Design (3 rodadas, todas verdes) - nenhum dado gravado.
- `deno test` do `integration-dispatcher`: 17/17. `deno test` do `receive-os-sync`: 15/15.
- Fast Gravacoes: `deno check` OK, `deno test _shared/contracts.test.ts` 5/5,
  `vitest src/test/erpApiContracts.test.ts` 58/58.
- Suite Deno do Supply: 166 passando; a unica falha (`_shared/xbz_pedido_map.test.ts:90`) e
  pre-existente, provada com `git stash` no `main`.

## Fonte

docs/enterprise-audit-report.md [lacuna]
