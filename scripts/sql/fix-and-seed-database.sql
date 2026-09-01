-- ============================================================
-- Script para Corrigir e Popular o Banco de Dados
-- Promo Design V2 (IDEMPOTENTE - pode ser executado várias vezes)
-- ============================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/fygxlswpkjtjpcefjfty/sql
-- ============================================================

-- ============================================================
-- PASSO 1: Corrigir a função log_generic_change (colunas incorretas)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_generic_change()
RETURNS TRIGGER AS $func$
DECLARE
  v_user_id uuid;
BEGIN
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  INSERT INTO public.audit_log (
    organization_id,
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changed_fields
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) END,
    NULL
  );

  RETURN COALESCE(NEW, OLD);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PASSO 2: Desabilitar triggers de validação temporariamente
-- ============================================================
ALTER TABLE clients DISABLE TRIGGER trg_validate_client_org;
ALTER TABLE service_orders DISABLE TRIGGER validate_service_order_trigger;

-- ============================================================
-- PASSO 3: Inserir organização (se não existir)
-- ============================================================
INSERT INTO organizations (id, name, slug, created_by, audit_retention_days, notifications_retention_days, status_audit_retention_days)
VALUES ('00000000-0000-0000-0000-000000000010', 'Promo Design Demo', 'promo-design-demo', '98ec2046-8bad-475e-a728-8bfc2812549e', 90, 30, 30)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASSO 4: Adicionar usuário real à organização
-- ============================================================
INSERT INTO organization_members (user_id, organization_id, role)
VALUES ('98ec2046-8bad-475e-a728-8bfc2812549e', '00000000-0000-0000-0000-000000000010', 'owner')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASSO 5: Inserir clientes (apenas se não existir nenhum)
-- ============================================================
DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000010';
  v_user_id uuid := '98ec2046-8bad-475e-a728-8bfc2812549e';
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM clients WHERE organization_id = v_org_id;
  IF v_count = 0 THEN
    INSERT INTO clients (organization_id, name, company, email, phone, city, state, document, created_by, is_active) VALUES
    (v_org_id, 'João Silva', 'Silva & Cia Ltda', 'joao@silva.com', '(11) 99999-0001', 'São Paulo', 'SP', '12.345.678/0001-90', v_user_id, true),
    (v_org_id, 'Maria Santos', 'Santos Importação', 'maria@santos.com', '(11) 99999-0002', 'São Paulo', 'SP', '98.765.432/0001-10', v_user_id, true),
    (v_org_id, 'Carlos Oliveira', 'Oliveira Design', 'carlos@design.com', '(21) 99999-0003', 'Rio de Janeiro', 'RJ', '45.678.901/0001-23', v_user_id, true),
    (v_org_id, 'Ana Costa', 'Costa Branding', 'ana@costa.com', '(31) 99999-0004', 'Belo Horizonte', 'MG', '78.901.234/0001-45', v_user_id, true),
    (v_org_id, 'Pedro Souza', 'Souza Marketing', 'pedro@souza.com', '(41) 99999-0005', 'Curitiba', 'PR', '34.567.890/0001-67', v_user_id, true),
    (v_org_id, 'Fernanda Lima', 'Lima Eventos', 'fernanda@lima.com', '(51) 99999-0006', 'Porto Alegre', 'RS', '56.789.012/0001-89', v_user_id, true),
    (v_org_id, 'Roberto Alves', 'Alves Tecnologia', 'roberto@alves.com', '(62) 99999-0007', 'Goiânia', 'GO', '01.234.567/0001-01', v_user_id, true),
    (v_org_id, 'Juliana Rocha', 'Rocha Comunicação', 'juliana@rocha.com', '(71) 99999-0008', 'Salvador', 'BA', '23.456.789/0001-23', v_user_id, true);
  END IF;
END $$;

-- ============================================================
-- PASSO 6: Inserir categorias de produtos (apenas se não existirem)
-- ============================================================
DO $$
DECLARE
  v_user_id uuid := '98ec2046-8bad-475e-a728-8bfc2812549e';
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM product_categories WHERE user_id = v_user_id;
  IF v_count = 0 THEN
    INSERT INTO product_categories (name, user_id) VALUES
    ('Vestuário', v_user_id),
    ('Brindes', v_user_id),
    ('Embalagens', v_user_id),
    ('Papelaria', v_user_id),
    ('Acessórios', v_user_id),
    ('Utilidades', v_user_id),
    ('Tecnologia', v_user_id);
  END IF;
END $$;

-- ============================================================
-- PASSO 7: Inserir produtos do catálogo (apenas se não existirem)
-- ============================================================
DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000010';
  v_user_id uuid := '98ec2046-8bad-475e-a728-8bfc2812549e';
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM catalog_products WHERE organization_id = v_org_id;
  IF v_count = 0 THEN
    INSERT INTO catalog_products (name, sku, material, colors, user_id, active, organization_id) VALUES
    ('Camiseta Básica', 'CAM-BAS-001', 'Algodão 100%', 'Branco, Preto, Azul, Vermelho, Verde', v_user_id, true, v_org_id),
    ('Caneca Personalizada', 'CAN-PER-001', 'Cerâmica', 'Branco, Preto', v_user_id, true, v_org_id),
    ('Boné Estruturado', 'BON-EST-001', 'Algodão/Poliester', 'Preto, Azul, Vermelho, Cinza', v_user_id, true, v_org_id),
    ('Chaveiro Metálico', 'CHA-MET-001', 'Metal Zamak', 'Dourado, Prata', v_user_id, true, v_org_id),
    ('Squeeze Garrafa 500ml', 'SQU-GAR-001', 'Alumínio', 'Azul, Verde, Preto, Vermelho', v_user_id, true, v_org_id),
    ('Bolsa Térmica', 'BOL-TER-001', 'Polyester 600D', 'Preto, Cinza, Azul', v_user_id, true, v_org_id),
    ('Caderno Personalizado', 'CAD-PER-001', 'Capa Dura', 'Preto, Azul, Vermelho', v_user_id, true, v_org_id),
    ('Pen Drive 8GB', 'PEN-DRI-001', 'Plástico ABS', 'Preto, Branco', v_user_id, true, v_org_id),
    ('Power Bank 5000mAh', 'POW-BAN-001', 'Alumínio/Plástico', 'Preto, Branco, Dourado', v_user_id, true, v_org_id),
    ('Guarda-Chuva Automático', 'GUA-AUT-001', 'Nylon', 'Preto, Azul, Vermelho', v_user_id, true, v_org_id),
    ('Ecobag Personalizada', 'ECO-BAG-001', 'Algodão Orgânico', 'Cru, Branco', v_user_id, true, v_org_id),
    ('Copo Térmico', 'COP-TER-001', 'Aço Inoxidável', 'Preto, Prata, Dourado', v_user_id, true, v_org_id);
  END IF;
END $$;

-- ============================================================
-- PASSO 8: Inserir ordens de serviço (apenas se não existirem)
-- ============================================================
DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000010';
  v_user_id uuid := '98ec2046-8bad-475e-a728-8bfc2812549e';
  v_client_id uuid;
  v_product_name text;
  v_product_sku text;
  v_count integer;
  v_statuses text[] := ARRAY['aberta', 'aprovada', 'em_producao', 'pronta', 'entregue'];
  v_techniques text[] := ARRAY['Silk Screen', 'Sublimação', 'Tampografia', 'Laser', 'Embossing'];
BEGIN
  SELECT COUNT(*) INTO v_count FROM service_orders WHERE user_id = v_user_id AND organization_id = v_org_id;
  IF v_count = 0 THEN
    FOR i IN 1..20 LOOP
      -- Get random client
      SELECT id INTO v_client_id FROM clients WHERE organization_id = v_org_id ORDER BY random() LIMIT 1;

      -- Get random product
      SELECT name, sku INTO v_product_name, v_product_sku FROM catalog_products WHERE organization_id = v_org_id ORDER BY random() LIMIT 1;

      INSERT INTO service_orders (
        user_id, organization_id, os_number, date, delivery_date,
        client_name, client_company, client_phone, client_email,
        product_name, product_sku,
        technique, area_width, area_height, area_shape,
        quantity, status, observations
      ) VALUES (
        v_user_id, v_org_id,
        'OS-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(i::TEXT, 5, '0'),
        CURRENT_DATE - (random() * 90)::INTEGER,
        CURRENT_DATE - (random() * 90)::INTEGER + (3 + (random() * 15)::INTEGER),
        'Cliente ' || i,
        'Empresa ' || i,
        '(11) 99999-' || LPAD(i::TEXT, 4, '0'),
        'cliente' || i || '@empresa.com',
        COALESCE(v_product_name, 'Camiseta Básica'),
        COALESCE(v_product_sku, 'CAM-BAS-001'),
        v_techniques[1 + (random() * 4)::INTEGER],
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
        v_statuses[1 + (random() * 4)::INTEGER],
        'Pedido de teste gerado automaticamente'
      );
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- PASSO 9: Inserir histórico MagicUp (apenas se não existir)
-- ============================================================
DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000010';
  v_user_id uuid := '98ec2046-8bad-475e-a728-8bfc2812549e';
  v_count integer;
  v_styles text[] := ARRAY['moderno', 'minimalista', 'corporativo', 'divertido', 'elegante'];
  v_prompts text[] := ARRAY[
    'Camiseta com logo minimalista',
    'Caneca com design corporativo',
    'Boné com estampa moderna',
    'Squeeze com branding elegante',
    'Power bank personalizado'
  ];
BEGIN
  SELECT COUNT(*) INTO v_count FROM magicup_history WHERE user_id = v_user_id AND organization_id = v_org_id;
  IF v_count = 0 THEN
    FOR i IN 1..10 LOOP
      INSERT INTO magicup_history (
        user_id, organization_id, prompt, image_url,
        product_name, product_sku, style, favorite
      ) VALUES (
        v_user_id, v_org_id,
        v_prompts[1 + (random() * 4)::INTEGER],
        'https://example.com/generated-' || i || '.png',
        (SELECT name FROM catalog_products WHERE organization_id = v_org_id ORDER BY random() LIMIT 1),
        (SELECT sku FROM catalog_products WHERE organization_id = v_org_id ORDER BY random() LIMIT 1),
        v_styles[1 + (random() * 4)::INTEGER],
        random() > 0.7
      );
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- PASSO 10: Reabilitar triggers
-- ============================================================
ALTER TABLE clients ENABLE TRIGGER trg_validate_client_org;
ALTER TABLE service_orders ENABLE TRIGGER validate_service_order_trigger;

-- ============================================================
-- PASSO 11: Verificar dados inseridos
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
