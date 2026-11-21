---
ID: PND-07
Titulo: Deprecar overloads check_ai_quota/cleanup_expired_data
Estado: DONE
Fonte: docs/senior-backend-audit-2026-07.md [Media]
Data: 2026-11-21
---

# PND-07 - Deprecar overloads check_ai_quota/cleanup_expired_data

## Estado

DONE (2026-11-21)

## Fonte

docs/senior-backend-audit-2026-07.md [Media]

## Descricao

Assinaturas duplicadas com semântica divergente; deprecar versao antiga apontando para nova.

## Evidencia / Acao

Migration 20260712215949_8fdfcd42 no head d2004c6e depreca as assinaturas 1-arg e 3-arg: DROP FUNCTION + CREATE OR REPLACE wrapper delegando para a assinatura completa ( numeric DEFAULT 0 / 5 params). Call sites ativos: brand-guidelines-infer.ts L107, mockup-ai.ts L150, cleanup-expired-data/index.ts L40, admin-maintenance.ts L552 — todos agora via wrapper delegado (assinatura completa), sem dispatch ambiguo restante. Verificado na fonte.
