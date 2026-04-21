

## Testes E2E para alertas de auditoria

Vamos adicionar uma suíte Playwright que valida o fluxo completo: login → criar regra de alerta no Audit Trail → disparar um evento que case com a regra → confirmar que a notificação `audit_alert` aparece no `NotificationPanel`.

### Pré-requisito (bloqueante)

A funcionalidade de **regras de alerta** ainda não foi implementada (o plano anterior foi apresentado mas não aprovado/codificado). Para os testes terem o que validar, precisamos primeiro implementar:

1. Migração: tabela `audit_alert_rules` + função/trigger `notify_audit_alert` + RLS.
2. Frontend: `useAuditAlerts`, `AuditAlertsManager` (Sheet), `AuditAlertRuleForm` (Dialog), botão "Alertas" no header de `/audit`.
3. `NotificationPanel`: tratamento visual do `event_type='audit_alert'`.

Esta etapa é coberta pelo plano anterior — vamos executá-la junto deste, num único loop.

### Estrutura dos testes E2E

**Arquivo novo: `e2e/audit-alerts.spec.ts`**

Premissas (alinhadas com `e2e/auth.spec.ts` / `e2e/service-orders.spec.ts` existentes):
- Usuário de teste já autenticado por helper compartilhado (reutilizar padrão atual de login).
- Organização ativa com pelo menos 1 membro (o próprio usuário).
- Fixture: `playwright-fixture.ts` exporta `test/expect`.

**Cenário 1 — Criar regra de alerta a partir de filtros atuais**
1. `goto('/audit')`.
2. Aplicar filtro: ação `INSERT`, tabela `service_orders` (via `AuditFilters`).
3. Clicar botão `Alertas` no header → abre `Sheet`.
4. Clicar `Nova regra` → abre `Dialog` com filtros pré-preenchidos.
5. Preencher nome `E2E - INSERT em service_orders`.
6. Salvar → confirmar toast de sucesso e regra na lista do Sheet com chips corretos (`INSERT`, `service_orders`).

**Cenário 2 — Disparar evento e validar notificação**
1. Garantir que a regra do cenário 1 está ativa (toggle on).
2. Em outra aba/contexto, navegar para `/service-orders/new` e criar uma OS mínima → submeter.
3. Voltar à primeira aba, abrir `NotificationPanel` (clicar sino no header).
4. Aguardar até 20s (cobre os 15s de polling) → asserir presença de item com:
   - badge/ícone âmbar de `audit_alert`
   - texto contendo `INSERT em service_orders`
   - rótulo da regra `E2E - INSERT em service_orders`
5. Clicar no item → asserir navegação para `/audit?...` com filtros aplicados.

**Cenário 3 — Toggle desliga sem perder a regra**
1. Em `/audit`, abrir Sheet de alertas, desativar toggle da regra E2E.
2. Criar nova OS.
3. Após 20s, asserir que **nenhuma** notificação nova de `audit_alert` para essa regra apareceu (contador permanece igual ao snapshot inicial).

**Cenário 4 — Cleanup**
1. `afterAll`: deletar a regra E2E e qualquer notificação `audit_alert` criada (via `supabase` client direto com chave de teste, padrão usado em `service-orders.spec.ts`).
2. Deletar a OS de teste criada.

### Helpers/utilitários

Adicionar `e2e/helpers/audit-alerts.ts` com:
- `createTestAlertRule(page, { name, actions, tables })` — abstrai cliques.
- `waitForAuditAlertNotification(page, ruleName, timeout = 20_000)` — polling do painel.
- `cleanupAuditTestData(supabase, ruleName)` — usa service-role no Node test runner para garantir limpeza determinística.

Garantir IDs/data-testids estáveis nos componentes novos para os testes não dependerem de texto:
- Botão "Alertas": `data-testid="audit-alerts-button"`
- Sheet: `data-testid="audit-alerts-sheet"`
- Item da lista: `data-testid="audit-alert-rule-{id}"` + `data-testid="audit-alert-rule-toggle-{id}"`
- Notificação: `data-testid="notification-item-{id}"` com `data-event-type="audit_alert"`

### Configuração de teste

- Usar `test.describe.serial` para os 3 cenários (compartilham regra + OS).
- Polling no painel: `expect.poll(...).toBeTruthy()` com timeout `20_000` e intervalo `1500ms` para encaixar com o `useVisibilityPolling` (15s).
- `playwright.config.ts`: aumentar `timeout` global do arquivo para `60_000` apenas para esta suíte via `test.setTimeout(60_000)` no `describe`.

### Arquivos tocados

**Implementação base (pré-requisito do plano anterior — a executar junto):**
- Migração nova: `audit_alert_rules` + trigger `notify_audit_alert`.
- `src/features/audit/hooks/use-audit-alerts.ts` (novo)
- `src/features/audit/components/AuditAlertsManager.tsx` (novo)
- `src/features/audit/components/AuditAlertRuleForm.tsx` (novo)
- `src/features/audit/pages/AuditLogPage.tsx` (botão Alertas + data-testids)
- `src/components/NotificationPanel.tsx` (render `audit_alert` + data-testids)

**Testes E2E (foco deste plano):**
- `e2e/audit-alerts.spec.ts` (novo, 3 cenários + cleanup)
- `e2e/helpers/audit-alerts.ts` (novo)

### Critérios de aceite

- `bunx playwright test e2e/audit-alerts.spec.ts` passa em CI local.
- Cenário 2 confirma notificação `audit_alert` no painel após criação de OS, dentro de 20s.
- Cenário 3 confirma que toggle desativado bloqueia novas notificações.
- Cleanup remove 100% dos dados criados (regra, notificações, OS).
- Sem regressão em `e2e/auth.spec.ts`, `e2e/navigation.spec.ts`, `e2e/service-orders.spec.ts`.
- Componentes novos expõem `data-testid` estáveis para os testes não dependerem de texto traduzido.

