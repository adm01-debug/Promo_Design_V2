import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useClientContacts,
  type ClientContact,
  type ClientContactInput,
} from "../hooks/use-client-contacts";
import type { Client } from "../hooks/use-clients";

const emptyDraft: ClientContactInput = {
  name: "",
  role: "",
  email: "",
  phone: "",
  is_primary: false,
};

interface ClientContactsDialogProps {
  client: Client | null;
  organizationId: string | null;
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Cadastro de pessoas de contato do cliente (tabela `client_contacts`).
 * Antes desta tela o CRM só guardava o e-mail/telefone principal do próprio
 * cliente e os contatos gravados no banco ficavam invisíveis.
 */
const ClientContactsDialog = ({
  client,
  organizationId,
  canEdit,
  onOpenChange,
}: ClientContactsDialogProps) => {
  const {
    contacts,
    isLoading,
    isError,
    error,
    addContact,
    updateContact,
    setPrimary,
    deleteContact,
  } = useClientContacts(client?.id ?? null, organizationId);
  const { toast } = useToast();
  const [draft, setDraft] = useState<ClientContactInput>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(emptyDraft);
    setEditingId(null);
  }, [client?.id]);

  const saving = addContact.isPending || updateContact.isPending;

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const startEdit = (contact: ClientContact) => {
    setEditingId(contact.id);
    setDraft({
      name: contact.name,
      role: contact.role ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      is_primary: contact.is_primary,
    });
  };

  const handleSubmit = async () => {
    if (!draft.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    try {
      if (editingId) await updateContact.mutateAsync({ id: editingId, patch: draft });
      else await addContact.mutateAsync(draft);
      toast({ title: editingId ? "Contato atualizado" : "Contato adicionado" });
      resetDraft();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este contato?")) return;
    try {
      await deleteContact.mutateAsync(id);
      if (editingId === id) resetDraft();
      toast({ title: "Contato excluído" });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await setPrimary.mutateAsync(id);
      toast({ title: "Contato principal atualizado" });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!client} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contatos — {client?.name}</DialogTitle>
          <DialogDescription>
            Pessoas de contato deste cliente. O contato principal é quem recebe as comunicações e
            aprovações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {canEdit && (
            <form
              className="space-y-3 rounded-md border border-border bg-surface-1 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="contact-name">Nome *</Label>
                  <Input
                    id="contact-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-role">Cargo</Label>
                  <Input
                    id="contact-role"
                    value={draft.role ?? ""}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">E-mail</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={draft.email ?? ""}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-phone">Telefone</Label>
                  <Input
                    id="contact-phone"
                    value={draft.phone ?? ""}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="contact-primary"
                  checked={!!draft.is_primary}
                  onCheckedChange={(value) => setDraft({ ...draft, is_primary: value === true })}
                />
                <Label htmlFor="contact-primary" className="cursor-pointer">
                  Contato principal
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                {editingId && (
                  <Button type="button" variant="outline" size="sm" onClick={resetDraft}>
                    Cancelar edição
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  {editingId ? "Salvar contato" : "Adicionar contato"}
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando contatos…
            </p>
          ) : isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Não foi possível carregar os contatos</p>
                <p className="text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : "Tente novamente em instantes."}
                </p>
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-muted-foreground">
              <UserRound className="mx-auto mb-2 h-6 w-6 opacity-40" />
              <p className="text-sm">Nenhum contato cadastrado neste cliente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{contact.name}</span>
                        {contact.is_primary && <Badge variant="secondary">Principal</Badge>}
                        {contact.role && (
                          <span className="text-xs text-muted-foreground">{contact.role}</span>
                        )}
                      </div>
                      {(contact.email || contact.phone) && (
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {contact.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        {!contact.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Marcar ${contact.name} como principal`}
                            disabled={setPrimary.isPending}
                            onClick={() => void handleSetPrimary(contact.id)}
                          >
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar ${contact.name}`}
                          onClick={() => startEdit(contact)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Excluir ${contact.name}`}
                          disabled={deleteContact.isPending}
                          onClick={() => void handleDelete(contact.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientContactsDialog;
