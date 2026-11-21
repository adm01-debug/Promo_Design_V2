---
ID: PND-08
Titulo: Dashboard consolidado ultimos 60min de erros
Estado: DONE
Fonte: docs/senior-backend-audit-2026-07.md
Data: 2026-11-21
---

# PND-08 - Dashboard consolidado ultimos 60min de erros

## Estado

DONE (2026-11-21)

## Fonte

docs/senior-backend-audit-2026-07.md

## Descricao

Falta painel unico de erros da ultima hora; hoje dev abre 4 paineis.

## Evidencia / Acao

Dashboard de ultima hora no head d2004c6e: hook use-last-hour-overview.ts (OverviewMaintenanceError, OverviewAlert, OverviewTopFeature) + migration 20260722195924_42835bf0 para a query de agregacao de erros. Verificado na fonte.
