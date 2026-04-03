## Plano de Melhorias — Rumo ao 10/10

### 1. Feature Folders — Reorganizar código por domínio
- Mover componentes, hooks e tipos de Service Order para `/features/service-orders/`
- Mover lógica de Mockup para `/features/mockup/`
- Mover lógica de MagicUp para `/features/magic-up/`
- Atualizar todos os imports

### 2. Expandir cobertura de testes (+100 testes)
- Testes para hooks (useProducts, useServiceOrders, useAuth)
- Testes para utilitários (canvas-utils, pdf-export, utils)
- Testes para lógica de negócio complexa
- Testes de edge cases e regressão

### 3. Segurança — Scan e correções
- Executar scan de segurança no banco
- Corrigir vulnerabilidades encontradas
- Validar RLS policies

### 4. Performance e Acessibilidade
- Lazy loading otimizado
- Aria labels e roles em componentes interativos
- Memoização de componentes pesados

### 5. Catálogo de Produtos (requer migração DB)
- Criar tabelas no Lovable Cloud
- Tela CRUD de produtos
- Seletor inteligente nos formulários
