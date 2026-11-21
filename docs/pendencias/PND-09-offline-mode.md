---
ID: PND-09
Titulo: Service Workers para offline basico
Estado: DONE
Fonte: docs/enterprise-audit-report.md [lacuna]
Data: 2026-11-21
Fechado em: 2026-11-21 (PR #75)
---

# PND-09 - Service Workers para offline basico

## Estado

DONE - implementado e verificado em navegador real (PR #75).

## Fonte

docs/enterprise-audit-report.md [lacuna]

## Descricao

Suporte offline basico em ambiente fabril com conectividade instavel.

## O que existe agora

- `public/sw.js` - VERSION `promo-design-v1`, dois caches (`-shell`, `-assets`).
  - Navegacao: network-first, grava o ultimo `/index.html` bom e o serve como fallback offline.
  - `/assets/*`: cache-first (imutaveis por hash de build).
  - Supabase (3 projetos), `/functions/v1`, `/admin-api`, `/auth/v1`, `/rest/v1` e qualquer
    metodo diferente de GET: nunca cacheados. Requisicao mutante offline falha de proposito e a
    UI avisa - preferimos erro visivel a dado falso.
- `src/lib/service-worker.ts` - registro guardado por `import.meta.env.PROD`; falha silenciosa
  (SW indisponivel nao pode quebrar o boot).
- `src/hooks/use-online-status.ts` + `src/components/OnlineIndicator.tsx` - `role="status"` e
  `aria-live="polite"`, reagindo aos eventos `online`/`offline`.
- `src/main.tsx` - `bootstrapServiceWorker()` no boot.

## Evidencia / Acao

| Verificacao                                              | Resultado                              |
| -------------------------------------------------------- | -------------------------------------- |
| `npx vitest run`                                         | 741/741 (44 arquivos), 12 testes novos |
| `tsc -b`                                                 | exit 0                                 |
| `eslint .`                                               | exit 0                                 |
| `npm run build`                                          | OK - `dist/sw.js` presente (3862 B)    |
| e2e Playwright contra `vite preview` (build de producao) | 4/4                                    |
| Simulacao do `sw.js` em sandbox Node (`vm` + mocks)      | 16/16                                  |

e2e cobre: SW `activated` com escopo `/`, cache `-shell` com `/index.html`, cache `-assets`
criado apos a primeira requisicao controlada, app abrindo com `context.setOffline(true)`.

CI da PR #75: Format, Lint, Typecheck, Tests, Build e Edge Functions todos verdes.
