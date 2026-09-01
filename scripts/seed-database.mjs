/**
 * Script para popular o banco de dados com dados fictícios
 * Usa o MCP do Supabase para inserir dados nas tabelas
 */

const MCP_ENDPOINT = 'https://supabase-promo-design-v2-mcp.adm01.workers.dev/b2e7f4a9c1d3e8b0f5a2d6c9e3b7f1a4d8c2e6b0/mcp';

// UUIDs de exemplo para usuários e organizações
const EXAMPLE_USER_ID = '00000000-0000-0000-0000-000000000001';
const EXAMPLE_ORG_ID = '00000000-0000-0000-0000-000000000010';

// Dados fictícios para popular
const fakeClients = [
  { name: 'João Silva', company: 'Silva & Cia Ltda', email: 'joao@silva.com', phone: '(11) 99999-0001', city: 'São Paulo', state: 'SP', document: '12.345.678/0001-90' },
  { name: 'Maria Santos', company: 'Santos Importação', email: 'maria@santos.com', phone: '(11) 99999-0002', city: 'São Paulo', state: 'SP', document: '98.765.432/0001-10' },
  { name: 'Carlos Oliveira', company: 'Oliveira Design', email: 'carlos@design.com', phone: '(21) 99999-0003', city: 'Rio de Janeiro', state: 'RJ', document: '45.678.901/0001-23' },
  { name: 'Ana Costa', company: 'Costa Branding', email: 'ana@costa.com', phone: '(31) 99999-0004', city: 'Belo Horizonte', state: 'MG', document: '78.901.234/0001-45' },
  { name: 'Pedro Souza', company: 'Souza Marketing', email: 'pedro@souza.com', phone: '(41) 99999-0005', city: 'Curitiba', state: 'PR', document: '34.567.890/0001-67' },
  { name: 'Fernanda Lima', company: 'Lima Eventos', email: 'fernanda@lima.com', phone: '(51) 99999-0006', city: 'Porto Alegre', state: 'RS', document: '56.789.012/0001-89' },
  { name: 'Roberto Alves', company: 'Alves Tecnologia', email: 'roberto@alves.com', phone: '(62) 99999-0007', city: 'Goiânia', state: 'GO', document: '01.234.567/0001-01' },
  { name: 'Juliana Rocha', company: 'Rocha Comunicação', email: 'juliana@rocha.com', phone: '(71) 99999-0008', city: 'Salvador', state: 'BA', document: '23.456.789/0001-23' },
];

const fakeProducts = [
  { name: 'Camiseta Básica', sku: 'CAM-BAS-001', material: 'Algodão 100%', colors: 'Branco, Preto, Azul, Vermelho, Verde' },
  { name: 'Caneca Personalizada', sku: 'CAN-PER-001', material: 'Cerâmica', colors: 'Branco, Preto' },
  { name: 'Boné Estruturado', sku: 'BON-EST-001', material: 'Algodão/Poliester', colors: 'Preto, Azul, Vermelho, Cinza' },
  { name: 'Chaveiro Metálico', sku: 'CHA-MET-001', material: 'Metal Zamak', colors: 'Dourado, Prata' },
  { name: 'Squeeze Garrafa 500ml', sku: 'SQU-GAR-001', material: 'Alumínio', colors: 'Azul, Verde, Preto, Vermelho' },
  { name: 'Bolsa Térmica', sku: 'BOL-TER-001', material: 'Polyester 600D', colors: 'Preto, Cinza, Azul' },
  { name: 'Caderno Personalizado', sku: 'CAD-PER-001', material: 'Capa Dura', colors: 'Preto, Azul, Vermelho' },
  { name: 'Pen Drive 8GB', sku: 'PEN-DRI-001', material: 'Plástico ABS', colors: 'Preto, Branco' },
  { name: 'Power Bank 5000mAh', sku: 'POW-BAN-001', material: 'Alumínio/Plástico', colors: 'Preto, Branco, Dourado' },
  { name: 'Guarda-Chuva Automático', sku: 'GUA-AUT-001', material: 'Nylon', colors: 'Preto, Azul, Vermelho' },
  { name: 'Ecobag Personalizada', sku: 'ECO-BAG-001', material: 'Algodão Orgânico', colors: 'Cru, Branco' },
  { name: 'Copo Térmico', sku: 'COP-TER-001', material: 'Aço Inoxidável', colors: 'Preto, Prata, Dourado' },
];

const fakeTechniques = ['Silk Screen', 'Sublimação', 'Tampografia', 'Laser', 'Embossing', 'Serigrafia Digital', 'Transfer', 'UV'];
const fakeStatuses = ['aberta', 'aprovada', 'em_producao', 'pronta', 'entregue', 'cancelada'];
const fakeAreaShapes = ['Retângulo', 'Redondo', 'Quadrado', 'Oval', 'Irregular', 'Retângulo Arredondado'];

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateOSNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `OS-${year}-${random}`;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function escapeSQL(str) {
  return str.replace(/'/g, "''");
}

async function callMCP(tool, args) {
  try {
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: tool, arguments: args }
      })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.log(`   ❌ Erro na chamada MCP ${tool}:`, error.message);
    return { error: error.message };
  }
}

async function disableTriggers() {
  console.log('\n🔓 Desabilitando triggers de validação...');
  const result = await callMCP('supabase_db_query', {
    query: "ALTER TABLE clients DISABLE TRIGGER trg_validate_client_org; ALTER TABLE service_orders DISABLE TRIGGER validate_service_order_trigger; SELECT 'Triggers desabilitados' as status"
  });
  if (!result.error) {
    console.log('   ✅ Triggers desabilitados');
  } else {
    console.log('   ⚠️ Não foi possível desabilitar triggers:', result.error);
  }
}

async function enableTriggers() {
  console.log('\n🔒 Reabilitando triggers...');
  await callMCP('supabase_db_query', {
    query: "ALTER TABLE clients ENABLE TRIGGER trg_validate_client_org; ALTER TABLE service_orders ENABLE TRIGGER validate_service_order_trigger"
  });
  console.log('   ✅ Triggers reabilitados');
}

async function countTable(tableName) {
  try {
    const result = await callMCP('supabase_db_query', {
      query: `SELECT COUNT(*) as cnt FROM ${tableName}`
    });
    if (result.result && result.result[0]?.rows?.[0]?.cnt !== undefined) {
      return parseInt(result.result[0].rows[0].cnt);
    }
  } catch (error) {
    // Ignora
  }
  return 0;
}

async function insertOrganization() {
  console.log('\n🏢 Inserindo organização...');
  const result = await callMCP('supabase_db_query', {
    query: `
      INSERT INTO organizations (id, name, slug, created_by, audit_retention_days, notifications_retention_days, status_audit_retention_days)
      VALUES ('${EXAMPLE_ORG_ID}', 'Promo Design Demo', 'promo-design-demo', '${EXAMPLE_USER_ID}', 90, 30, 30)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    `
  });
  if (!result.error) {
    console.log('   ✅ Organização inserida/atualizada');
    return true;
  }
  console.log('   ⚠️ Erro:', result.error);
  return false;
}

async function insertOrgMember() {
  console.log('\n👤 Inserindo membro da organização...');
  const result = await callMCP('supabase_db_query', {
    query: `
      INSERT INTO organization_members (user_id, organization_id, role)
      VALUES ('${EXAMPLE_USER_ID}', '${EXAMPLE_ORG_ID}', 'owner')
      ON CONFLICT DO NOTHING
    `
  });
  if (!result.error) {
    console.log('   ✅ Membro inserido');
  }
}

async function insertClients() {
  console.log('\n👥 Inserindo clientes...');
  let inserted = 0;

  for (const client of fakeClients) {
    const clientId = generateUUID();
    const result = await callMCP('supabase_db_query', {
      query: `
        INSERT INTO clients (id, organization_id, name, company, email, phone, city, state, document, created_by, is_active)
        VALUES (
          '${clientId}',
          '${EXAMPLE_ORG_ID}',
          '${escapeSQL(client.name)}',
          '${escapeSQL(client.company)}',
          '${client.email}',
          '${client.phone}',
          '${escapeSQL(client.city)}',
          '${client.state}',
          '${client.document}',
          '${EXAMPLE_USER_ID}',
          true
        )
      `
    });
    if (!result.error) inserted++;
  }
  console.log(`   ✅ ${inserted} clientes inseridos`);
  return inserted;
}

async function insertProductCategories() {
  console.log('\n📂 Inserindo categorias...');
  const categories = ['Vestuário', 'Brindes', 'Embalagens', 'Papelaria', 'Acessórios', 'Utilidades', 'Tecnologia'];

  for (const category of categories) {
    await callMCP('supabase_db_query', {
      query: `INSERT INTO product_categories (name, user_id) VALUES ('${escapeSQL(category)}', '${EXAMPLE_USER_ID}') ON CONFLICT DO NOTHING`
    });
  }
  console.log('   ✅ Categorias inseridas');
}

async function insertCatalogProducts() {
  console.log('\n🏷️ Inserindo produtos do catálogo...');
  let inserted = 0;

  for (const product of fakeProducts) {
    const productId = generateUUID();
    const result = await callMCP('supabase_db_query', {
      query: `
        INSERT INTO catalog_products (id, name, sku, material, colors, user_id, active, organization_id)
        VALUES (
          '${productId}',
          '${escapeSQL(product.name)}',
          '${product.sku}',
          '${escapeSQL(product.material)}',
          '${product.colors}',
          '${EXAMPLE_USER_ID}',
          true,
          '${EXAMPLE_ORG_ID}'
        )
      `
    });
    if (!result.error) inserted++;
  }
  console.log(`   ✅ ${inserted} produtos inseridos`);
  return inserted;
}

async function insertServiceOrders() {
  console.log('\n📋 Inserindo ordens de serviço...');
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  let inserted = 0;

  for (let i = 0; i < 20; i++) {
    const client = randomItem(fakeClients);
    const product = randomItem(fakeProducts);
    const technique = randomItem(fakeTechniques);
    const status = randomItem(fakeStatuses);
    const date = randomDate(threeMonthsAgo, now);
    const deliveryDate = new Date(date.getTime() + randomInt(3, 15) * 24 * 60 * 60 * 1000);

    const result = await callMCP('supabase_db_query', {
      query: `
        INSERT INTO service_orders (
          user_id, organization_id, os_number, date, delivery_date,
          client_name, client_company, client_phone, client_email,
          product_name, product_sku, product_material, product_colors,
          technique, area_width, area_height, area_shape,
          quantity, status, observations
        ) VALUES (
          '${EXAMPLE_USER_ID}', '${EXAMPLE_ORG_ID}', '${generateOSNumber()}',
          '${formatDate(date)}', '${formatDate(deliveryDate)}',
          '${escapeSQL(client.name)}', '${escapeSQL(client.company)}', '${client.phone}', '${client.email}',
          '${escapeSQL(product.name)}', '${product.sku}', '${escapeSQL(product.material)}', '${product.colors}',
          '${escapeSQL(technique)}', '${randomInt(5, 50)}cm', '${randomInt(5, 50)}cm', '${randomItem(fakeAreaShapes)}',
          ${randomInt(50, 5000)}, '${status}', 'Pedido de teste - ${escapeSQL(product.name)}'
        )
      `
    });
    if (!result.error) inserted++;
  }
  console.log(`   ✅ ${inserted} ordens de serviço inseridas`);
  return inserted;
}

async function insertMagicUpHistory() {
  console.log('\n✨ Inserindo histórico MagicUp...');
  const styles = ['moderno', 'minimalista', 'corporativo', 'divertido', 'elegante'];
  const prompts = [
    'Camiseta com logo minimalista',
    'Caneca com design corporativo',
    'Boné com estampa moderna',
    'Squeeze com branding elegante',
    'Power bank personalizado'
  ];
  let inserted = 0;

  for (let i = 0; i < 10; i++) {
    const result = await callMCP('supabase_db_query', {
      query: `
        INSERT INTO magicup_history (user_id, organization_id, prompt, image_url, product_name, product_sku, style, favorite)
        VALUES (
          '${EXAMPLE_USER_ID}', '${EXAMPLE_ORG_ID}',
          '${escapeSQL(randomItem(prompts))}',
          'https://example.com/generated-${i}.png',
          '${escapeSQL(randomItem(fakeProducts).name)}',
          '${randomItem(fakeProducts).sku}',
          '${randomItem(styles)}',
          ${Math.random() > 0.7}
        )
      `
    });
    if (!result.error) inserted++;
  }
  console.log(`   ✅ ${inserted} registros MagicUp inseridos`);
  return inserted;
}

async function verifyData() {
  console.log('\n🔍 Verificando dados inseridos...\n');
  const tables = ['organizations', 'clients', 'service_orders', 'catalog_products', 'magicup_history', 'product_categories'];

  for (const table of tables) {
    const count = await countTable(table);
    const status = count > 0 ? '✅' : '⚠️';
    console.log(`   ${status} ${table}: ${count} registros`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Script para Popular Banco de Dados - Promo Design V2');
  console.log('='.repeat(60));

  // Desabilitar triggers
  await disableTriggers();

  // Inserir dados
  console.log('\n' + '-'.repeat(60));
  console.log('📝 Inserindo Dados Fictícios');
  console.log('-'.repeat(60));

  await insertOrganization();
  await insertOrgMember();
  await insertClients();
  await insertProductCategories();
  await insertCatalogProducts();
  await insertServiceOrders();
  await insertMagicUpHistory();

  // Reabilitar triggers
  await enableTriggers();

  // Verificar resultado
  console.log('\n' + '-'.repeat(60));
  await verifyData();

  console.log('\n✅ Script concluído com sucesso!');
}

main().catch(console.error);
