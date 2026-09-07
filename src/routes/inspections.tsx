import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormTypesList } from "@/lib/queries/assignments";
import {
  useSubmittedInspections,
  type SubmittedInspectionFilters,
} from "@/lib/queries/inspections";

export const Route = createFileRoute("/inspections")({
  component: InspectionsPage,
  head: () => ({
    meta: [{ title: "Fiches soumises — LAS Inspections" }],
  }),
});

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  soumis: {
    label: "Soumise",
    className: "bg-warning/15 text-warning-foreground border-warning/30",
  },
  verifie: { label: "Vérifiée", className: "bg-primary/15 text-primary border-primary/30" },
  rejete: {
    label: "Rejetée",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1].map(String);
const WEEKS = Array.from({ length: 53 }, (_, i) => String(i + 1));
const BIMESTERS = ["1", "2", "3", "4", "5", "6"];

function InspectionsPage() {
  const [filters, setFilters] = useState<SubmittedInspectionFilters>({ status: "all" });
  const set = (patch: Partial<SubmittedInspectionFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const { data: formTypes = [] } = useFormTypesList();
  const { data: inspections = [], isLoading, isError } = useSubmittedInspections(filters);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Administration"
        title="Fiches soumises"
        subtitle="Toutes les fiches traitées par les superviseurs, tous groupes confondus"
      />

      <div className="p-6 md:p-8">
        <div className="mb-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.q ?? ""}
                onChange={(e) => set({ q: e.target.value })}
                placeholder="Recherche libre…"
                className="h-9 bg-background/60 pl-9"
              />
            </div>
            <Select
              value={filters.formTypeId ?? "all"}
              onValueChange={(v) => set({ formTypeId: v })}
            >
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder="Formulaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les formulaires</SelectItem>
                {formTypes.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.year ?? "all"} onValueChange={(v) => set({ year: v })}>
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes années</SelectItem>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.bimester ?? "all"} onValueChange={(v) => set({ bimester: v })}>
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder="Bimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous bimestres</SelectItem>
                {BIMESTERS.map((b) => (
                  <SelectItem key={b} value={b}>
                    Bimestre {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.week ?? "all"} onValueChange={(v) => set({ week: v })}>
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder="Semaine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes semaines</SelectItem>
                {WEEKS.map((w) => (
                  <SelectItem key={w} value={w}>
                    Semaine {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status ?? "all"}
              onValueChange={(v) => set({ status: v as SubmittedInspectionFilters["status"] })}
            >
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="soumis">Soumise</SelectItem>
                <SelectItem value="verifie">Vérifiée</SelectItem>
                <SelectItem value="rejete">Rejetée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-5">Formulaire</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead>Soumise par</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Chargement…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                    Impossible de charger les fiches.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && inspections.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucune fiche pour ces filtres.
                  </TableCell>
                </TableRow>
              )}
              {inspections.map((insp) => {
                const badge = STATUS_BADGE[insp.status] ?? STATUS_BADGE.soumis;
                return (
                  <TableRow key={insp.id} className="border-border/40">
                    <TableCell className="pl-5 font-medium">
                      <Link
                        to="/inspections/$id"
                        params={{ id: insp.id }}
                        className="hover:underline"
                      >
                        {insp.formType.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{insp.assignment?.zoneNotes ?? "—"}</TableCell>
                    <TableCell className="text-sm">{insp.group.name}</TableCell>
                    <TableCell className="text-sm">
                      {insp.submittedBy?.displayName ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {insp.submittedAt
                        ? new Date(insp.submittedAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
