import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

export type ClientContact = Tables<"client_contacts">;

export interface ClientContactInput {
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean;
}

/**
 * Contatos de um cliente (CRM). A tabela `client_contacts` sempre existiu no
 * banco com RLS por organização, mas ate aqui nao tinha nenhuma tela: o CRM
 * so guardava o e-mail/telefone principal do proprio cliente.
 */
export function useClientContacts(clientId: string | null, organizationId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["client-contacts", clientId];

  const query = useQuery({
    queryKey,
    enabled: !!clientId,
    queryFn: async (): Promise<ClientContact[]> => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId!)
        .order("is_primary", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as ClientContact[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  // A tabela nao tem constraint de unicidade para `is_primary`, entao a
  // exclusividade do contato principal e garantida aqui antes de marcá-lo.
  const clearOtherPrimaries = async (keepId: string | null) => {
    const zeros = supabase
      .from("client_contacts")
      .update({ is_primary: false })
      .eq("client_id", clientId!)
      .eq("is_primary", true);
    const { error } = keepId ? await zeros.neq("id", keepId) : await zeros;
    if (error) throw error;
  };

  const addContact = useMutation({
    mutationFn: async (input: ClientContactInput) => {
      if (!user || !clientId || !organizationId) {
        throw new Error("Selecione uma organização e um cliente");
      }
      if (input.is_primary) await clearOtherPrimaries(null);
      const { data, error } = await supabase
        .from("client_contacts")
        .insert({
          client_id: clientId,
          organization_id: organizationId,
          name: input.name.trim(),
          role: input.role?.trim() || null,
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          is_primary: input.is_primary ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ClientContact;
    },
    onSuccess: invalidate,
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ClientContactInput }) => {
      if (patch.is_primary) await clearOtherPrimaries(id);
      const { error } = await supabase
        .from("client_contacts")
        .update({
          name: patch.name.trim(),
          role: patch.role?.trim() || null,
          email: patch.email?.trim() || null,
          phone: patch.phone?.trim() || null,
          is_primary: patch.is_primary ?? false,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setPrimary = useMutation({
    mutationFn: async (id: string) => {
      await clearOtherPrimaries(id);
      const { error } = await supabase
        .from("client_contacts")
        .update({ is_primary: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    addContact,
    updateContact,
    setPrimary,
    deleteContact,
  };
}
