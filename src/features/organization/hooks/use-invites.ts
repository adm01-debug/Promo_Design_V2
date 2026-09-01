import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/hooks/use-organization";
import { toast } from "sonner";
import { ErrorLogger } from "@/lib/error-logger";

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: AppRole;
  invited_by: string;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  organizations?: {
    name: string;
  } | null;
}

export function useOrganizationInvites(organizationId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["org-invites", organizationId];

  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<OrganizationInvite[]> => {
      let q = supabase.from("organization_invites").select("*, organizations(name)");
      
      if (organizationId) {
        q = q.eq("organization_id", organizationId);
      } else if (user?.email) {
        q = q.eq("email", user.email);
      } else {
        return [];
      }

      const { data, error } = await q.order("created_at", { ascending: false });
      
      if (error) {
        ErrorLogger.error("Failed to fetch organization invites", error, { organizationId });
        throw error;
      }
      return (data ?? []) as unknown as OrganizationInvite[];
    },
  });

  const createInvite = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      if (!user || !organizationId) throw new Error("Contexto inválido");
      
      const requestId = crypto.randomUUID();
      ErrorLogger.info("Creating organization invite", { email, role, organizationId, requestId });

      const { data, error } = await supabase
          .from("organization_invites")
          .insert({
            organization_id: organizationId,
            email,
            role,
            invited_by: user.id
          })
          .select()
          .single();
      
      if (error) {
        if (error.code === '23505') throw new Error("Já existe um convite pendente para este e-mail.");
        ErrorLogger.error("Failed to create organization invite", error, { email, organizationId, requestId });
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Convite enviado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const requestId = crypto.randomUUID();
      const { error } = await supabase
          .from("organization_invites")
          .delete()
          .eq("id", inviteId);
      
      if (error) {
        ErrorLogger.error("Failed to delete invite", error, { inviteId, requestId });
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Convite cancelado.");
    }
  });

  const acceptInvite = useMutation({
    mutationFn: async (token: string) => {
      const requestId = crypto.randomUUID();
      const { data, error } = await supabase.rpc("accept_organization_invite", { _token: token });
      if (error) {
        ErrorLogger.error("Failed to accept invite", error, { token, requestId });
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-memberships"] });
      toast.success("Convite aceito! Bem-vindo à organização.");
    }
  });

  return {
    invites: query.data ?? [],
    isLoading: query.isLoading,
    createInvite,
    deleteInvite,
    acceptInvite
  };
}
