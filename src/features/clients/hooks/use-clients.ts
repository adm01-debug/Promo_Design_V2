import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  tags: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ClientInput = Partial<Omit<Client, "id" | "created_at" | "updated_at" | "organization_id" | "created_by">> & {
  name: string;
};

export function useClients(organizationId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["clients", organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  const addClient = useMutation({
    mutationFn: async (input: ClientInput) => {
      if (!user || !organizationId) throw new Error("Selecione uma organização");
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...input, organization_id: organizationId, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients", organizationId] }),
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ClientInput> }) => {
      const { error } = await supabase.from("clients").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients", organizationId] }),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients", organizationId] }),
  });

  return {
    clients: query.data ?? [],
    isLoading: query.isLoading,
    addClient,
    updateClient,
    deleteClient,
  };
}
