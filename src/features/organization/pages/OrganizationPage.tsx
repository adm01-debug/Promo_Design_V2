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
import { Building2, Plus, Trash2, Crown, Mail, Send, X as XIcon, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationInvites } from "../hooks/use-invites";
import { AiUsagePanel } from "../components/AiUsagePanel";
import { MaintenancePanel } from "../components/MaintenancePanel";
import { LastHourOverviewPanel } from "../components/LastHourOverviewPanel";
import { BrandRecommendationPanel } from "../components/BrandRecommendationPanel";
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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await createInvite.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      setInviteOpen(false);
      setInviteEmail("");
    } catch {
      // toast handled in hook
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

      {currentOrgId && canManage && <AiUsagePanel organizationId={currentOrgId} />}
      {currentOrgId && canManage && <LastHourOverviewPanel />}
      {currentOrgId && canManage && <BrandRecommendationPanel />}
      {currentOrgId && canManage && <MaintenancePanel />}




      {currentOrgId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              Membros
              {currentRole && <Badge variant="secondary" className="text-[10px] uppercase font-mono">{ROLE_LABEL[currentRole]}</Badge>}
            </CardTitle>
            {canManage && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" /> Convidar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Convidar para organização</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colaborador@empresa.com" className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Papel</Label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground italic">O papel define as permissões que o usuário terá ao aceitar o convite.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                    <Button onClick={handleInvite} disabled={createInvite.isPending || !inviteEmail.trim()} className="gap-1.5">
                      {createInvite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Enviar Convite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
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
            {invites.length > 0 && (
              <div className="mt-8 space-y-4 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" /> Convites Pendentes
                  </h3>
                  <Badge variant="outline" className="font-mono text-[10px]">{invites.length}</Badge>
                </div>
                <div className="space-y-2">
                  {invites.filter(inv => !inv.accepted_at).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-md border border-dashed bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{inv.email}</span>
                          <Badge variant="secondary" className="text-[9px] uppercase">{ROLE_LABEL[inv.role]}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Enviado em {format(new Date(inv.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {canManage && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteInvite.mutate(inv.id)} title="Cancelar convite">
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border/50">
              💡 Os membros convidados podem aceitar o convite através do link enviado por e-mail ou na tela de login.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrganizationPage;
