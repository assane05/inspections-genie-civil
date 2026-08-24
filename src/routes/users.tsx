import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Power,
  Info,
  Loader2,
  RefreshCw,
  Pencil,
  Search,
  Users as UsersIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      { property: "og:title", content: "Utilisateurs — LAS Inspections" },
      {
        property: "og:description",
        content: "Gestion des comptes, rôles et groupes de supervision.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function UsersPage() {
  const { user: me } = useAuth();
  const { data: users = [], isLoading, isError } = useAdminUsers();
  const { data: groups = [] } = useAdminGroups();

  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.displayName, u.username, u.email ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [users, query]);

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

  const confirmRemove = () => {
    const u = pendingDelete;
    if (!u) return;
    deleteUser.mutate(u.id, {
      onSuccess: () => {
        toast.success("Utilisateur supprimé", { description: u.displayName });
        setPendingDelete(null);
      },
      onError: (err) =>
        toast.error("Suppression impossible", { description: describeError(err, "Réessayez.") }),
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <PageHeader
        title="Utilisateurs"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" /> Nouvel utilisateur
          </Button>
        }
      />

      <div className="mt-6 space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Un mot de passe temporaire est généré à la création — communiquez-le à l'utilisateur et
            faites-le changer dès la première connexion. Un compte désactivé ne peut plus se
            connecter. La modification se fait via le bouton « Modifier » : plus rien n'est
            enregistré par inadvertance depuis la liste.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom, identifiant, email…"
            className="pl-9"
            aria-label="Rechercher un utilisateur"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Utilisateur</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Groupes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline size-4 animate-spin" /> Chargement des
                    utilisateurs…
                  </TableCell>
                </TableRow>
              )}

              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    Impossible de charger les utilisateurs.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <UsersIcon className="mx-auto mb-2 size-5" />
                    Aucun utilisateur ne correspond à cette recherche.
                  </TableCell>
                </TableRow>
              )}

              {filtered.map((u) => (
                <TableRow key={u.id} className={cn(!u.isActive && "opacity-60")}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(u.displayName)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {u.displayName}
                          {me?.id === u.id && (
                            <span className="ml-2 text-xs text-muted-foreground">(vous)</span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {u.email ?? "—"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {u.username}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.groups.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Aucun</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.groups.slice(0, 2).map((g) => (
                          <Badge key={g.id} variant="outline" className="text-xs">
                            {g.name}
                          </Badge>
                        ))}
                        {u.groups.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{u.groups.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "outline"}>
                      {u.isActive ? "Actif" : "Désactivé"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(u)}
                        aria-label={`Modifier ${u.displayName}`}
                      >
                        <Pencil className="mr-1.5 size-4" /> Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(u)}
                        aria-label={u.isActive ? "Désactiver" : "Réactiver"}
                        title={u.isActive ? "Désactiver" : "Réactiver"}
                      >
                        <Power className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(u)}
                        aria-label={`Supprimer ${u.displayName}`}
                        title="Supprimer"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} groups={groups} />

      <EditUserDialog
        user={editing}
        groups={groups}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte «&nbsp;{pendingDelete?.displayName}&nbsp;» ({pendingDelete?.username}) sera
              définitivement supprimé. Cette action est irréversible — préférez la désactivation si
              l'accès doit seulement être suspendu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmRemove();
              }}
              disabled={deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? "Suppression…" : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupPicker({
  groups,
  selected,
  onToggle,
}: {
  groups: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {groups.length === 0 && (
        <span className="text-xs text-muted-foreground">Aucun groupe disponible.</span>
      )}
      {groups.map((g) => {
        const active = selected.includes(g.id);
        return (
          <button
            key={g.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(g.id)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {g.name}
          </button>
        );
      })}
    </div>
  );
}

function EditUserDialog({
  user,
  groups,
  onOpenChange,
}: {
  user: AdminUser | null;
  groups: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
}) {
  const updateUser = useUpdateUser();
  const [draft, setDraft] = useState<{
    displayName: string;
    username: string;
    email: string;
    role: AdminRole;
    groupIds: string[];
  } | null>(null);

  // Réinitialise le brouillon à chaque ouverture sur un autre utilisateur.
  const key = user?.id ?? "";
  const [loadedKey, setLoadedKey] = useState("");
  if (user && loadedKey !== key) {
    setLoadedKey(key);
    setDraft({
      displayName: user.displayName,
      username: user.username,
      email: user.email ?? "",
      role: user.role,
      groupIds: user.groups.map((g) => g.id),
    });
  }

  if (!user || !draft) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const canSubmit = draft.username.trim().length >= 3 && draft.displayName.trim().length > 0;

  const submit = () => {
    updateUser.mutate(
      {
        id: user.id,
        displayName: draft.displayName.trim(),
        username: draft.username.trim(),
        email: draft.email.trim() || null,
        role: draft.role,
        groupIds: draft.groupIds,
      },
      {
        onSuccess: () => {
          toast.success("Utilisateur mis à jour");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error("Échec de la mise à jour", { description: describeError(err, "Réessayez.") }),
      },
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>
            Les changements ne sont enregistrés qu'après validation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nom complet</Label>
            <Input
              id="edit-name"
              value={draft.displayName}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-username">Identifiant</Label>
            <Input
              id="edit-username"
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email (optionnel)</Label>
            <Input
              id="edit-email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Rôle</Label>
            <Select
              value={draft.role}
              onValueChange={(v) => setDraft({ ...draft, role: v as AdminRole })}
            >
              <SelectTrigger id="edit-role">
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Groupes ({draft.groupIds.length})</Label>
            <GroupPicker
              groups={groups}
              selected={draft.groupIds}
              onToggle={(id) =>
                setDraft({
                  ...draft,
                  groupIds: draft.groupIds.includes(id)
                    ? draft.groupIds.filter((x) => x !== id)
                    : [...draft.groupIds, id],
                })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!canSubmit || updateUser.isPending}>
            {updateUser.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: { id: string; name: string }[];
}) {
  const createUser = useCreateUser();
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
            description: `Identifiant : ${username.trim()} · Mot de passe temporaire : ${password}`,
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
          {/* <DialogDescription>
            Un mot de passe temporaire est proposé — communiquez-le et faites-le changer dès la
            première connexion.
          </DialogDescription> */}
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="space-y-3">
            {/* <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Identité
            </h3> */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-username">Identifiant</Label>
                <Input
                  id="new-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="jdupont"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">3 caractères minimum.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-name">Nom complet</Label>
                <Input
                  id="new-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="new-email">Email </Label>
                <Input
                  id="new-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.dupont@las.local"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Accès
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-role">Rôle</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
                  <SelectTrigger id="new-role">
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
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Mot de passe </Label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPassword(randomTempPassword())}
                    aria-label="Regénérer un mot de passe"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Groupes ({groupIds.length})
            </h3>
            <GroupPicker
              groups={groups}
              selected={groupIds}
              onToggle={(id) =>
                setGroupIds((gs) => (gs.includes(id) ? gs.filter((x) => x !== id) : [...gs, id]))
              }
            />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!canSubmit || createUser.isPending}>
            {createUser.isPending ? "Création…" : "Créer l'utilisateur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
