

## Teste E2E — atalhos de teclado em `/audit`

Adicionar um arquivo Playwright que valide os dois atalhos já implementados em `AuditLogPage`:
- `/` → foca o input de busca por ID do registro
- `Esc` → limpa todos os filtros aplicados

### Arquivo novo: `e2e/audit-shortcuts.spec.ts`

Segue o mesmo padrão de `e2e/audit-alerts.spec.ts`: skip automático quando faltam credenciais, mas mantém um smoke test (redirecionamento para `/auth` sem sessão) para nunca passar com 0 testes.

**Setup**
- Reutiliza `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` (mesmo helper `login(page)` da suíte de alertas).
- `test.describe.serial` com `test.setTimeout(45_000)`.

**Cenário 1 — smoke (sem credenciais)**
- `goto('/audit')` → espera redirect para `/auth`.

**Cenário 2 — `/` foca o input de ID**
1. `login(page)` → `goto('/audit')`.
2. Garantir que o foco inicial não está no input (clicar no `<h1>` da página).
3. `page.keyboard.press('/')`.
4. Asserir `expect(page.locator('#audit-id-search')).toBeFocused()` (ou via `data-testid` se o id não existir — verificar em `AuditFilters.tsx`).
5. Caso o input alvo não tenha id estável, o plano inclui adicionar `data-testid="audit-id-search-input"` no campo correspondente em `AuditFilters.tsx` (ajuste mínimo, sem mudança de comportamento).

**Cenário 3 — `Esc` limpa filtros**
1. `goto('/audit?action=INSERT&table=service_orders&recordId=abc123')` (hidrata filtros via URL).
2. Asserir que a URL contém os params e que os chips/inputs refletem os filtros (ex.: badge `INSERT` visível, input de ID com `abc123`).
3. Tirar foco de qualquer input (`page.locator('h1').click()` — o handler de `Esc` ignora quando o foco está em input/textarea).
4. `page.keyboard.press('Escape')`.
5. Asserir:
   - URL não contém mais `action`, `table`, `recordId` (apenas `/audit` ou query vazia).
   - Input de ID está vazio.
   - Nenhum chip de ação/tabela visível.

**Cenário 4 — `Esc` é ignorado quando foco está em input**
1. `goto('/audit?action=INSERT')`.
2. Focar o input de ID (`page.locator('#audit-id-search').focus()`).
3. `page.keyboard.press('Escape')`.
4. Asserir que `action=INSERT` ainda está na URL (o atalho global não dispara dentro de inputs, conforme `useKeyboardShortcuts`).

### Ajuste mínimo no código (se necessário)

Verificar em `AuditFilters.tsx` se o input de ID tem `id="audit-id-search"` (referenciado em `AuditLogPage.tsx` no handler do atalho `/`). Se não tiver, adicionar:
- `id="audit-id-search"` + `data-testid="audit-id-search-input"` no `<Input>` correspondente.

Sem alterações em hooks, lógica de filtros ou comportamento do usuário.

### Critérios de aceite

- `bunx playwright test e2e/audit-shortcuts.spec.ts` passa localmente.
- Smoke test sempre roda (mesmo sem credenciais).
- Cenários 2–4 cobrem foco, limpeza e o caso negativo (Esc dentro de input).
- Nenhuma regressão em `e2e/audit-alerts.spec.ts`, `e2e/auth.spec.ts`, `e2e/navigation.spec.ts`.
- Seletores estáveis (`id` + `data-testid`), sem dependência de texto traduzido.

### Arquivos tocados

- `e2e/audit-shortcuts.spec.ts` (novo)
- `src/features/audit/components/AuditFilters.tsx` (ajuste mínimo de `id`/`data-testid` no input de ID, apenas se ainda não existir)

