-- ============================================================
-- Script para Popular o Banco de Dados - Promo Design V2
-- ============================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/fygxlswpkjtjpcefjfty/sql
-- ============================================================

-- ============================================================
-- PASSO 1: Desabilitar triggers de validação (necessário para inserts via MCP/script)
-- ============================================================
ALTER TABLE clients DISABLE TRIGGER trg_validate_client_org;
ALTER TABLE service_orders DISABLE TRIGGER trg_validate_service_orders_org;
ALTER TABLE catalog_products DISABLE TRIGGER trg_validate_catalog_products_org;
ALTER TABLE magicup_history DISABLE TRIGGER trg_validate_magicup_history_org;

-- ============================================================
-- PASSO 2: Criar usuário e organização de teste (se não existir)
-- ============================================================
DO $$
BEGIN
  -- Criar organização
  INSERT INTO organizations (id, name, slug, created_by, audit_retention_days, notifications_retention_days, status_audit_retention_days)
  VALUES ('00000000-0000-0000-0000-000000000010', 'Promo Design Demo', 'promo-design-demo', '00000000-0000-0000-0000-000000000001', 90, 30, 30)
  ON CONFLICT (id) DO NOTHING;

  -- Criar membro da organização
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'owner')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- PASSO 3: Inserir clientes fictícios
-- ============================================================
INSERT INTO clients (id, organization_id, name, company, email, phone, city, state, document, created_by, is_active) VALUES
(gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'João Silva', 'Silva & Cia Ltda', 'joao@silva.com', '(11) 99999-0001', 'São Paulo', 'SP', '12.345.678/0001-90', '00000000-0000-0000-0000-000000000001', true),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Maria Santos', 'Santos Importação', 'maria@santos.com', '(11) 99999-0002', 'São Paulo', 'SP', '98.765.432/0001-10', '00000000-0000-0000-0000-000000000001', true),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Carlos Oliveira', 'Oliveira Design', 'carlos@design.com', '(21) 99999-0003', 'Rio de Janeiro', 'RJ', '45.678.901/0001-23', '00000000-0000-0000-0000-000000000001', true),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Ana Costa', 'Costa Branding', 'ana@costa.com', '(31) 99999-0004', 'Belo Horizonte', 'MG', '78.901.234/0001-45', '00000000-0000-0000-0000-000000000001', true),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Pedro Souza', 'Souza Marketing', 'pedro@souza.com', '(41) 99999-0005', 'Curitiba', 'PR', '34.567.890/0001-67', '00000000-0000-0000-0000-000000000001', true),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Fernanda Lima', 'Lima Eventos', 'fernanda@lima.com', '(51) 99999-0006', 'Porto Alegre', 'RS', '56.789.012/0001-89', '00000000-0000-0000-0000-000000000001', true),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Roberto Alves', 'Alves Tecnologia', 'roberto@alves.com', '(62) 99999-0007', 'Goiânia', 'GO', '01.234.567/0001-01', '00000000-0000-0000-0000-000000000001', true),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Juliana Rocha', 'Rocha Comunicação', 'juliana@rocha.com', '(71) 99999-0008', 'Salvador', 'BA', '23.456.789/0001-23', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASSO 4: Inserir categorias de produtos
-- ============================================================
INSERT INTO product_categories (name, user_id, description) VALUES
('Vestuário', '00000000-0000-0000-0000-000000000001', 'Produtos de vestuário para brindes corporativos'),
('Brindes', '00000000-0000-0000-0000-000000000001', 'Brindes diversos personalizados'),
('Embalagens', '00000000-0000-0000-0000-000000000001', 'Materiais de embalagem personalizados'),
('Papelaria', '00000000-0000-0000-0000-000000000001', 'Produtos de papelaria corporativa'),
('Acessórios', '00000000-0000-0000-0000-000000000001', 'Acessórios diversos'),
('Utilidades', '00000000-0000-0000-0000-000000000001', 'Produtos utilitários personalizados'),
('Tecnologia', '00000000-0000-0000-0000-000000000001', 'Produtos tecnológicos para brindes')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASSO 5: Inserir produtos do catálogo
-- ============================================================
INSERT INTO catalog_products (id, name, sku, material, colors, user_id, active, organization_id) VALUES
(gen_random_uuid(), 'Camiseta Básica', 'CAM-BAS-001', 'Algodão 100%', 'Branco, Preto, Azul, Vermelho, Verde', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Caneca Personalizada', 'CAN-PER-001', 'Cerâmica', 'Branco, Preto', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Boné Estruturado', 'BON-EST-001', 'Algodão/Poliester', 'Preto, Azul, Vermelho, Cinza', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Chaveiro Metálico', 'CHA-MET-001', 'Metal Zamak', 'Dourado, Prata', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Squeeze Garrafa 500ml', 'SQU-GAR-001', 'Alumínio', 'Azul, Verde, Preto, Vermelho', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Bolsa Térmica', 'BOL-TER-001', 'Polyester 600D', 'Preto, Cinza, Azul', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Caderno Personalizado', 'CAD-PER-001', 'Capa Dura', 'Preto, Azul, Vermelho', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Pen Drive 8GB', 'PEN-DRI-001', 'Plástico ABS', 'Preto, Branco', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Power Bank 5000mAh', 'POW-BAN-001', 'Alumínio/Plástico', 'Preto, Branco, Dourado', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Guarda-Chuva Automático', 'GUA-AUT-001', 'Nylon', 'Preto, Azul, Vermelho', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Ecobag Personalizada', 'ECO-BAG-001', 'Algodão Orgânico', 'Cru, Branco', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010'),
(gen_random_uuid(), 'Copo Térmico', 'COP-TER-001', 'Aço Inoxidável', 'Preto, Prata, Dourado', '00000000-0000-0000-0000-000000000001', true, '00000000-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASSO 6: Inserir ordens de serviço
-- ============================================================
DO $$
DECLARE
  clients_arr UUID[] := ARRAY(
    SELECT id FROM clients WHERE organization_id = '00000000-0000-0000-0000-000000000010' LIMIT 8
  );
  products_arr RECORD;
  os_date DATE;
  delivery_date DATE;
  statuses TEXT[] := ARRAY['aberta', 'aprovada', 'em_producao', 'pronta', 'entregue'];
  techniques TEXT[] := ARRAY['Silk Screen', 'Sublimação', 'Tampografia', 'Laser', 'Embossing'];
BEGIN
  FOR i IN 1..20 LOOP
    os_date := CURRENT_DATE - (random() * 90)::INTEGER;
    delivery_date := os_date + (3 + (random() * 15)::INTEGER);

    SELECT name, sku, material, colors INTO products_arr FROM catalog_products ORDER BY random() LIMIT 1;

    INSERT INTO service_orders (
      user_id, organization_id, os_number, date, delivery_date,
      client_name, client_company, client_phone, client_email,
      product_name, product_sku, product_material, product_colors,
      technique, area_width, area_height, area_shape,
      quantity, status, observations
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000010',
      'OS-' || EXTRACT(YEAR FROM os_date) || '-' || LPAD((random() * 99999)::INTEGER::TEXT, 5, '0'),
      os_date,
      delivery_date,
      'Cliente OS ' || i,
      'Empresa OS ' || i,
      '(11) 99999-' || LPAD(i::TEXT, 4, '0'),
      'cliente' || i || '@empresa.com',
      COALESCE(products_arr.name, 'Produto Genérico'),
      COALESCE(products_arr.sku, 'GEN-001'),
      COALESCE(products_arr.material, 'Material Padrão'),
      COALESCE(products_arr.colors, 'Cor Única'),
      techniques[1 + (random() * 4)::INTEGER],
      (5 + (random() * 45)::INTEGER) || 'cm',
      (5 + (random() * 45)::INTEGER) || 'cm',
      CASE (random() * 4)::INTEGER
        WHEN 0 THEN 'Retângulo'
        WHEN 1 THEN 'Redondo'
        WHEN 2 THEN 'Quadrado'
        WHEN 3 THEN 'Oval'
        ELSE 'Irregular'
      END,
      (50 + (random() * 4950)::INTEGER),
      statuses[1 + (random() * 4)::INTEGER],
      'Pedido gerado automaticamente para testes'
    );
  END LOOP;
END $$;

-- ============================================================
-- PASSO 7: Inserir histórico do MagicUp
-- ============================================================
DO $$
DECLARE
  styles TEXT[] := ARRAY['moderno', 'minimalista', 'corporativo', 'divertido', 'elegante'];
  prompts TEXT[] := ARRAY[
    'Camiseta com logo minimalista',
    'Caneca com design corporativo',
    'Boné com estampa moderna',
    'Squeeze com branding elegante',
    'Power bank personalizado'
  ];
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO magicup_history (
      user_id, organization_id, prompt, image_url,
      product_name, product_sku, style, favorite
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000010',
      prompts[1 + (random() * 4)::INTEGER],
      'https://example.com/generated-' || i || '.png',
      (SELECT name FROM catalog_products ORDER BY random() LIMIT 1),
      (SELECT sku FROM catalog_products ORDER BY random() LIMIT 1),
      styles[1 + (random() * 4)::INTEGER],
      random() > 0.7
    );
  END LOOP;
END $$;

-- ============================================================
-- PASSO 8: Reabilitar triggers de validação
-- ============================================================
ALTER TABLE clients ENABLE TRIGGER trg_validate_client_org;
ALTER TABLE service_orders ENABLE TRIGGER trg_validate_service_orders_org;
ALTER TABLE catalog_products ENABLE TRIGGER trg_validate_catalog_products_org;
ALTER TABLE magicup_history ENABLE TRIGGER trg_validate_magicup_history_org;

-- ============================================================
-- PASSO 9: Verificar dados inseridos
-- ============================================================
SELECT 'organizations' as tabela, COUNT(*) as total FROM organizations
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'service_orders', COUNT(*) FROM service_orders
UNION ALL
SELECT 'catalog_products', COUNT(*) FROM catalog_products
UNION ALL
SELECT 'magicup_history', COUNT(*) FROM magicup_history
UNION ALL
SELECT 'product_categories', COUNT(*) FROM product_categories;
