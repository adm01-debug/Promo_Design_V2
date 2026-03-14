import { externalSupabase } from "@/lib/external-supabase";

/**
 * Utility to explore the external Supabase database structure.
 * Run this from the browser console or a temp component.
 */

export async function exploreDatabase() {
  console.log("=== EXPLORING EXTERNAL SUPABASE DATABASE ===");

  // Try common table names for product databases
  const commonTables = [
    "products", "produtos", "items", "itens",
    "categories", "categorias", "catalog", "catalogo",
    "images", "imagens", "product_images",
    "mockup_drafts", "generated_mockups", "magic_up_generations",
    "customization_options", "areas", "techniques", "materials",
    "clients", "clientes", "orders", "pedidos",
    "profiles", "users"
  ];

  const foundTables: string[] = [];

  for (const table of commonTables) {
    try {
      const { data, error, count } = await externalSupabase
        .from(table)
        .select("*", { count: "exact", head: false })
        .limit(1);

      if (!error && data) {
        foundTables.push(table);
        console.log(`\n✅ TABLE: "${table}" — ${count ?? "?"} rows`);
        if (data.length > 0) {
          console.log("  COLUMNS:", Object.keys(data[0]));
          console.log("  SAMPLE ROW:", JSON.stringify(data[0], null, 2));
        }
      } else {
        // Don't log 404s, only real errors
        if (error?.code !== "PGRST116" && error?.code !== "42P01") {
          console.log(`❌ TABLE "${table}": ${error?.message}`);
        }
      }
    } catch (e) {
      // skip
    }
  }

  console.log("\n=== FOUND TABLES:", foundTables);

  // Deep dive into found tables - get more rows
  for (const table of foundTables) {
    const { data, error, count } = await externalSupabase
      .from(table)
      .select("*", { count: "exact" })
      .limit(5);

    if (data && data.length > 0) {
      console.log(`\n📊 DEEP DIVE: "${table}" (${count} total rows)`);
      console.log("  ALL COLUMNS:", Object.keys(data[0]));
      console.log("  COLUMN TYPES:");
      for (const [key, value] of Object.entries(data[0])) {
        console.log(`    ${key}: ${typeof value} = ${JSON.stringify(value)?.substring(0, 100)}`);
      }
      console.log("  FIRST 5 ROWS:", JSON.stringify(data, null, 2));
    }
  }

  // Try RPC functions
  const rpcFunctions = [
    "fn_get_product_customization_options",
    "get_product_customization_options",
    "get_products",
    "get_categories"
  ];

  for (const fn of rpcFunctions) {
    try {
      const { data, error } = await externalSupabase.rpc(fn, {});
      if (!error) {
        console.log(`\n🔧 RPC "${fn}" found!`);
        console.log("  RESULT:", JSON.stringify(data)?.substring(0, 500));
      }
    } catch {
      // skip
    }
  }

  return foundTables;
}

// Auto-run
exploreDatabase();
