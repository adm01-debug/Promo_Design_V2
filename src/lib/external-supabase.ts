import { createClient } from "@supabase/supabase-js";
import type { ExternalDatabase } from "./external-supabase-types";

// External Supabase for product images database (6.100+ products)
const EXTERNAL_SUPABASE_URL = "https://doufsxqlfjyuvxuezpln.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdWZzeHFsZmp5dXZ4dWV6cGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODY2NDMsImV4cCI6MjA4Mjk2MjY0M30.nm3WMOBSx5SUnIBmvF_Mj0Y-4hV6UohrBF0sUpuQvPc";

// O generic `ExternalDatabase` faz o compilador validar tabela e coluna deste
// catálogo espelhado: a RLS é por coluna, então um nome errado só aparecia em
// produção (401/400 com o app caindo no fallback).
export const externalSupabase = createClient<ExternalDatabase>(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
);
