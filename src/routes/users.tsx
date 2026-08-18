import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Power, History, RotateCcw, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { Role, SessionUser } from "@/lib/auth-api";
import {
  listUsers,
  saveUsers,
  resetUsers,
  getUsersVersion,
  usersCustomized,
  createUser,
  deleteUser,
  SUPERVISOR_GROUPS,
} from "@/lib/user-directory";

export const Route = createFileRoute("/users")({
  component: UsersPage,
  head: () => ({
    meta: [
      { title: "Utilisateurs — LAS Inspections" },
      { name: "description", content: "Gestion des comptes, rôles et groupes de supervision." },
    ],
  }),
});

function isSeedAccount(id: string) {
  return id === "u-admin-1" || /^u-supervisor-\d+$/.test(id);
}

function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<SessionUser[]>(() => listUsers());
  const [version, setVersion] = useState(getUsersVersion());
  const [customized, setCustomized] = useState(usersCustomized());

  const persist = (next: SessionUser[]) => {
    const v = saveUsers(next);
    setUsers(next);
    setVersion(v);
    setCustomized(true);
  };

  const update = (id: string, patch: Partial<SessionUser>) =>
    persist(users.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const toggleGroup = (id: string, group: string) =>
    persist(
      users.map((u) =>
        u.id === id
          ? {
              ...u,
              groups: u.groups.includes(group)
                ? u.groups.filter((g) => g !== group)
                : [...u.groups, group],
            }
          : u,
      ),
    );

  const toggleActive = (u: SessionUser) => {
    if (u.id === me?.id && u.isActive) {
      toast.error("Action impossible", {
        description: "Vous ne pouvez pas désactiver votre propre compte.",
      });
      return;
    }
    update(u.id, { isActive: !u.isActive });
    toast.success(u.isActive ? `${u.name} désactivé` : `${u.name} réactivé`);
  };

  const remove = (u: SessionUser) => {
    if (isSeedAccount(u.id)) {
      toast.error("Suppression impossible", {
        description:
          "Ce compte fait partie du jeu de données de démonstration — désactivez-le plutôt.",
      });
      return;
    }
    const next = listUsers().filter((x) => x.id !== u.id);
    const v = saveUsers(next);
    setUsers(next);
    setVersion(v);
    setCustomized(true);
    toast.success("Utilisateur supprimé");
  };

  const addUser = () => {
    const created = createUser({
      name: "Nouvel utilisateur",
      username: `user${Date.now().toString().slice(-5)}`,
      email: "",
      role: "supervisor",
      groups: [],
      isActive: true,
    });
    setUsers(listUsers());
    setVersion(getUsersVersion());
    setCustomized(true);
    toast.success("Utilisateur créé", {
      description: `Complétez le profil de ${created.username}.`,
    });
  };

  const reset = () => {
    const v = resetUsers();
    setUsers(listUsers());
    setVersion(v);
    setCustomized(false);
    toast.success("Annuaire réinitialisé aux valeurs par défaut");
  };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs & groupes"
        subtitle="Comptes, rôles et rattachement aux groupes de supervision"
        actions={
          <Button
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={addUser}
          >
            <Plus className="h-4 w-4" /> Nouvel utilisateur
          </Button>
        }
      />

      <div className="p-6 md:p-8">
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Aucun mot de passe n'est géré ici (voir auth-api.ts) — la vérification des identifiants se
          fait côté backend une fois branché. Un compte désactivé ne peut plus se connecter.
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Version {version}
            {customized ? " · personnalisé" : " · valeurs par défaut"}
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
          </Button>
        </div>

        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className={cn(
                "rounded-xl border bg-card/60 p-4 transition-colors",
                u.isActive
                  ? "border-border/60"
                  : "border-destructive/30 bg-destructive/5 opacity-70",
              )}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div>
                  <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                    Nom
                  </Label>
                  <Input
                    value={u.name}
                    onChange={(e) => update(u.id, { name: e.target.value })}
                    className="h-9 bg-background/60"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                    Identifiant
                  </Label>
                  <Input
                    value={u.username}
                    onChange={(e) => update(u.id, { username: e.target.value })}
                    className="h-9 bg-background/60"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    value={u.email}
                    onChange={(e) => update(u.id, { email: e.target.value })}
                    className="h-9 bg-background/60"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                    Rôle
                  </Label>
                  <Select value={u.role} onValueChange={(v) => update(u.id, { role: v as Role })}>
                    <SelectTrigger className="h-9 bg-background/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supervisor">Superviseur</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "gap-1.5",
                      u.isActive
                        ? "text-warning hover:bg-warning/10"
                        : "text-primary hover:bg-primary/10",
                    )}
                    onClick={() => toggleActive(u)}
                  >
                    <Power className="h-3.5 w-3.5" /> {u.isActive ? "Désactiver" : "Réactiver"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:bg-destructive/10"
                    onClick={() => remove(u)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </Button>
                </div>

                <div className="md:col-span-5">
                  <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                    Groupes ({u.groups.length})
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPERVISOR_GROUPS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGroup(u.id, g)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                          u.groups.includes(g)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-background/60 text-muted-foreground",
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {!u.isActive && (
                <p className="mt-2 text-[11px] font-medium text-destructive">
                  Compte désactivé — ne peut plus se connecter.
                </p>
              )}
              {isSeedAccount(u.id) && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Info className="h-3 w-3" /> Compte de démonstration — les modifications sont
                  enregistrées comme pour tout compte.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
