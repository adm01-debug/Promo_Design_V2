---
ID: PND-04
Titulo: Corrigir vazamento de memoria (objectURL)
Estado: DONE
Fonte: docs/senior-frontend-audit.md [MEDIO]
Data: 2026-11-21
---

# PND-04 - Corrigir vazamento de memoria (objectURL)

## Estado

DONE (2026-11-21)

## Fonte

docs/senior-frontend-audit.md [MEDIO]

## Descricao

Uso inconsistente de URL.revokeObjectURL em previews/export; revogar no useEffect de limpeza.

## Evidencia / Acao

Revokes implementados no head d2004c6e: audit-csv.ts L42, asset-export.ts, use-asset-upload.ts (L102/110/114/135/147), use-asset-upload-entries.ts (L38/47/170), rasterizeSvg (finally L115), SavedSearchesMenu, DownloadMenu, Settings, ServiceOrder. Verificado na fonte.
