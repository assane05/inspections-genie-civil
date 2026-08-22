import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Power, Info, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  useAdminUsers,
  useAdminGroups,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type AdminRole,
  type AdminUser,
} from "@/lib/queries/users";
import { ApiError } from "@/lib/api-client";

export const Route = createFileRoute("/users")({
  component: UsersPage,
  head: () => ({
    meta: [
      { title: "Utilisateurs — LAS Inspections" },
      { name: "description", content: "Gestion des comptes, rôles et groupes de supervision." },
    ],
  }),
});

const ROLE_LABELS: Record<AdminRole, string> = {
  superviseur: "Superviseur",
  administrateur: "Administrateur",
  approbateur: "Approbateur",
};

function randomTempPassword(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.message) return err.message;
  return fallback;
}

function UsersPage() {
  const { user: me } = useAuth();
  const { data: users = [], isLoading, isError } = useAdminUsers();
  const { data: groups = [] } = useAdminGroups();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const toggleGroup = (u: AdminUser, groupId: string) => {
    const groupIds = u.groups.some((g) => g.id === groupId)
      ? u.groups.filter((g) => g.id !== groupId).map((g) => g.id)
      : [...u.groups.map((g) => g.id), groupId];
    updateUser.mutate(
      { id: u.id, groupIds },
      {
        onError: (err) =>
          toast.error("Échec de la mise à jour", { description: describeError(err, "Réessayez.") }),
      },
    );
  };

  const toggleActive = (u: AdminUser) => {
    updateUser.mutate(
      { id: u.id, isActive: !u.isActive },
      {
        onSuccess: () =>
          toast.success(u.isActive ? `${u.displayName} désactivé` : `${u.displayName} réactivé`),
        onError: (err) =>
          toast.error("Action impossible", { description: describeError(err, "Réessayez.") }),
      },
    );
  };

  const remove = (u: AdminUser) => {
    deleteUser.mutate(u.id, {
      onSuccess: () => toast.success("Utilisateur supprimé"),
      onError: (err) =>
        toast.error("Suppression impossible", { description: describeError(err, "Réessayez.") }),
    });
  };

  const [createOpen, setCreateOpen] = useState(false);

  const update = (
    u: AdminUser,
    patch: Partial<Pick<AdminUser, "displayName" | "username" | "email">>,
  ) => updateUser.mutate({ id: u.id, ...patch });

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
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Nouvel utilisateur
          </Button>
        }
      />

      <div className="p-6 md:p-8">
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Un mot de passe temporaire est généré à la création — communiquez-le à l'utilisateur et
          faites-le changer dès la première connexion. Un compte désactivé ne peut plus se
          connecter.
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des utilisateurs…
          </div>
        )}
        {isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Impossible de charger les utilisateurs.
          </div>
        )}

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
                    defaultValue={u.displayName}
                    onBlur={(e) =>
                      e.target.value !== u.displayName && update(u, { displayName: e.target.value })
                    }
                    className="h-9 bg-background/60"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                    Identifiant
                  </Label>
                  <Input
                    defaultValue={u.username}
                    onBlur={(e) =>
                      e.target.value !== u.username && update(u, { username: e.target.value })
                    }
                    className="h-9 bg-background/60"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    defaultValue={u.email ?? ""}
                    onBlur={(e) =>
                      e.target.value !== (u.email ?? "") &&
                      update(u, { email: e.target.value || null })
                    }
                    className="h-9 bg-background/60"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                    Rôle
                  </Label>
                  <Select
                    value={u.role}
                    onValueChange={(v) =>
                      updateUser.mutate(
                        { id: u.id, role: v as AdminRole },
                        {
                          onError: (err) =>
                            toast.error("Changement de rôle impossible", {
                              description: describeError(err, "Réessayez."),
                            }),
                        },
                      )
                    }
                  >
                    <SelectTrigger className="h-9 bg-background/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
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
                    disabled={u.id === me?.id && u.isActive}
                    onClick={() => toggleActive(u)}
                  >
                    <Power className="h-3.5 w-3.5" /> {u.isActive ? "Désactiver" : "Réactiver"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:bg-destructive/10"
                    disabled={u.id === me?.id}
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
                    {groups.map((g) => {
                      const active = u.groups.some((ug) => ug.id === g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleGroup(u, g.id)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/60 bg-background/60 text-muted-foreground",
                          )}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        groups={groups}
        createUser={createUser}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  groups,
  createUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: { id: string; name: string }[];
  createUser: ReturnType<typeof useCreateUser>;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("superviseur");
  const [password, setPassword] = useState(randomTempPassword());
  const [groupIds, setGroupIds] = useState<string[]>([]);

  const reset = () => {
    setUsername("");
    setDisplayName("");
    setEmail("");
    setRole("superviseur");
    setPassword(randomTempPassword());
    setGroupIds([]);
  };

  const toggleGroup = (id: string) =>
    setGroupIds((gs) => (gs.includes(id) ? gs.filter((x) => x !== id) : [...gs, id]));

  const canSubmit =
    username.trim().length >= 3 && displayName.trim().length > 0 && password.length >= 8;

  const submit = () => {
    createUser.mutate(
      {
        username: username.trim(),
        displayName: displayName.trim(),
        email: email.trim() || null,
        role,
        password,
        groupIds,
      },
      {
        onSuccess: () => {
          toast.success("Utilisateur créé", {
            description: `Identifiant : ${username.trim()} · Mot de passe temporaire : ${password} (à transmettre et faire changer).`,
          });
          onOpenChange(false);
          reset();
        },
        onError: (err) =>
          toast.error("Création impossible", { description: describeError(err, "Réessayez.") }),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Un mot de passe temporaire est proposé — communiquez-le et faites-le changer dès la
            première connexion.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Identifiant
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jdupont"
              autoFocus
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Nom complet
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jean Dupont"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Email (optionnel)
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jean.dupont@las.local"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Rôle
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Mot de passe temporaire
            </Label>
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPassword(randomTempPassword())}
                aria-label="Regénérer un mot de passe"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
              Groupes ({groupIds.length})
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                    groupIds.includes(g.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-background/60 text-muted-foreground",
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button disabled={!canSubmit || createUser.isPending} onClick={submit}>
            {createUser.isPending ? "Création…" : "Créer l'utilisateur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
