import { createFileRoute } from "@tanstack/react-router";
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/planning")({
  component: Planning,
  head: () => ({
    meta: [
      { title: "Planning — LAS Inspections" },
      { name: "description", content: "Importer le planning des inspections." },
    ],
  }),
});

function Planning() {
  const { t } = useI18n();
  return (
    <div className="pb-10">
      <PageHeader eyebrow={t("nav.tasks")} title={t("planning.title")} subtitle="Importez le fichier CSV pour générer les tâches" />
      <div className="mx-auto max-w-3xl p-6 md:p-8">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-8 text-center backdrop-blur-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary glow-primary">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-semibold">{t("planning.upload")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Formats acceptés : .csv, .xlsx — max 10 MB
          </p>

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-10 transition-colors hover:border-primary hover:bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
            <div>
              <div className="font-medium">Déposez votre fichier ici</div>
              <div className="text-xs text-muted-foreground">ou cliquez pour parcourir</div>
            </div>
            <input type="file" accept=".csv,.xlsx" className="hidden" />
          </label>

          <div className="mt-6 flex justify-center gap-2">
            <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_-4px_var(--color-primary)]">
              <CheckCircle2 className="h-4 w-4" />
              {t("planning.complete")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
