import { useState } from "react";
import { useOrganizations, useOrgMembers, type AppRole } from "@/hooks/use-organization";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Trash2, Crown, Mail, Send, X as XIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationInvites } from "../hooks/use-invites";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ROLES: AppRole[] = ["owner", "admin", "designer", "approver", "viewer"];
const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  designer: "Designer",
  approver: "Aprovador",
  viewer: "Visualizador",
};

const OrganizationPage = () => {
  const { user } = useAuth();
  const { organizations, currentOrgId, currentRole, switchOrg, createOrg, can, isLoading } = useOrganizations();
  const { members, updateRole, removeMember } = useOrgMembers(currentOrgId);
  const { invites, createInvite, deleteInvite } = useOrganizationInvites(currentOrgId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("viewer");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createOrg.mutateAsync(newName.trim());
      toast({ title: "Organização criada", description: newName });
      setOpen(false);
      setNewName("");
    } catch (e) {
      toast({ title: "Erro ao criar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const canManage = can(["owner", "admin"]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" /> Organizações
          </h1>
          <p className="text-muted-foreground">Gerencie workspaces, membros e papéis.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova organização</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar organização</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="org-name">Nome</Label>
              <Input id="org-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Acme Brindes" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createOrg.isPending || !newName.trim()}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Suas organizações</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : organizations.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma organização ainda. Crie a primeira para começar.</p>
          ) : (
            <div className="space-y-2">
              {organizations.map((org) => (
                <div key={org.id} className={`flex items-center justify-between p-3 rounded-md border ${currentOrgId === org.id ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </div>
                  {currentOrgId === org.id ? (
                    <Badge variant="default">Ativa</Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => switchOrg(org.id)}>Selecionar</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {currentOrgId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Membros
              {currentRole && <Badge variant="secondary">{ROLE_LABEL[currentRole]}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-muted-foreground">Nenhum membro encontrado.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const isMe = m.user_id === user?.id;
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-md border">
                      <div className="flex items-center gap-2">
                        {m.role === "owner" && <Crown className="h-4 w-4 text-amber-500" />}
                        <span className="font-mono text-xs">{m.user_id.slice(0, 8)}…</span>
                        {isMe && <Badge variant="outline">Você</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage && !isMe ? (
                          <Select value={m.role} onValueChange={(v) => updateRole.mutate({ memberId: m.id, role: v as AppRole })}>
                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{ROLE_LABEL[m.role as AppRole]}</Badge>
                        )}
                        {canManage && !isMe && (
                          <Button variant="ghost" size="icon" onClick={() => removeMember.mutate(m.id)} aria-label="Remover">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              💡 Para adicionar membros, eles precisam se cadastrar primeiro. O fluxo de convite por e-mail será implementado na próxima onda.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrganizationPage;
