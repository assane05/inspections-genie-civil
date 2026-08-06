import { createFileRoute } from "@tanstack/react-router";
import { Search, Filter, Pencil, Eye } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { formRows } from "@/lib/mock-data";
import { StatusBadge } from "@/routes/dashboard";

export const Route = createFileRoute("/forms")({
  component: FormsPage,
  head: () => ({
    meta: [
      { title: "Formulaires — LAS Inspections" },
      { name: "description", content: "Liste des soumissions de formulaires d'inspection." },
    ],
  }),
});

function FormsPage() {
  const { t } = useI18n();
  return (
    <div className="pb-10">
      <PageHeader eyebrow={t("nav.forms")} title={t("forms.title")} subtitle="Soumissions récentes et à valider" />

      <div className="p-6 md:p-8">
        <div className="mb-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t("topbar.search")} className="h-9 bg-background/60 pl-9" />
            </div>
            <Input type="date" className="h-9 bg-background/60" />
            <Input type="date" className="h-9 bg-background/60" />
            <Input placeholder={t("filters.week")} className="h-9 bg-background/60" />
            <Button size="sm" className="h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Filter className="h-4 w-4" />
              {t("action.filter")}
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-5">{t("table.form")}</TableHead>
                <TableHead>{t("table.last_submission")}</TableHead>
                <TableHead>{t("table.week")}</TableHead>
                <TableHead>{t("table.verified_on")}</TableHead>
                <TableHead>{t("table.assignments")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.approver")}</TableHead>
                <TableHead className="pr-5 text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formRows.map((r) => (
                <TableRow key={r.id} className="border-border/40">
                  <TableCell className="pl-5 font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.lastSubmission}</TableCell>
                  <TableCell className="font-mono">S{r.week}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.verifiedOn ?? "—"}</TableCell>
                  <TableCell className="font-mono">{r.assignments}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-sm">{r.approver ?? "—"}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 gap-1 text-primary hover:bg-primary/10">
                        <Eye className="h-3.5 w-3.5" /> {t("action.review")}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 gap-1 text-warning hover:bg-warning/10">
                        <Pencil className="h-3.5 w-3.5" /> {t("action.edit")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
