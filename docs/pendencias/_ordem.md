# Ordem de Execucao do Backlog

Prioridade por impacto no negocio e dependencia, validada no baseline 246e410c.

## Bloqueios do dono (nao sao BR)

- [DONO] Rotacionar service_role + reset senha postgres (Dashboard fygxlswpkjtjpcefjfty) - item 19 prod-readiness.
- [DONO] Deletar edge function migrate-helper no Dashboard - responde HTTP 401 hoje.

## Estado real (revalidado 2026-11-21 no head d2004c6e)

PND-01..08 e PND-08: DONE (verificados na fonte, docs fechados com evidencia). Pendentes reais:

1. PND-09 offline mode - lacuna enterprise (hoje so ha indicador OnlineIndicator).
2. PND-10 webhooks ERP - integracao externa, depende de decisao de negocio (formato/ERP).

## Iteracao contabilizada

PND-01..10 criados em 2026-11-21 a partir das 3 auditorias (docs/enterprise-audit-report.md, docs/senior-frontend-audit.md, docs/senior-backend-audit-2026-07.md) + prod-readiness.
