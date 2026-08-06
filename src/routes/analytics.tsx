import { createFileRoute } from "@tanstack/react-router";
import { Download, Filter, FileDown } from "lucide-react";
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
import { useI18n } from "@/lib/i18n";
import { KpiCard } from "@/components/kpi-card";
import { FileText, ShieldCheck, ListChecks, Send } from "lucide-react";
import { kpis } from "@/lib/mock-data";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
  head: () => ({
    meta: [
      { title: "Analytique & Archives — LAS Inspections" },
      { name: "description", content: "Analyse filtrée des inspections et archives PDF." },
    ],
  }),
});

function Analytics() {
  const { t } = useI18n();
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.analytics")}
        title={t("dashboard.title")}
        subtitle="Filtrez, analysez et exportez les données d'inspection"
      />
      <div className="grid grid-cols-1 gap-6 p-6 md:p-8 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{t("filters.title")}</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{t("filters.year")}</Label>
                <Select><SelectTrigger className="h-9 bg-background/60"><SelectValue placeholder="2025" /></SelectTrigger>
                  <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2024">2024</SelectItem></SelectContent></Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{t("filters.period")}</Label>
                <Input type="date" className="h-9 bg-background/60" />
                <Input type="date" className="mt-2 h-9 bg-background/60" />
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{t("filters.group")}</Label>
                <Select><SelectTrigger className="h-9 bg-background/60"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="rwy">Runway</SelectItem><SelectItem value="twy">Taxiway</SelectItem></SelectContent></Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{t("filters.form")}</Label>
                <Select><SelectTrigger className="h-9 bg-background/60"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tous</SelectItem></SelectContent></Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{t("filters.bimester")}</Label>
                <Select><SelectTrigger className="h-9 bg-background/60"><SelectValue placeholder="Tous" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Tous</SelectItem></SelectContent></Select>
              </div>
              <Button size="sm" className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                {t("common.apply")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Download className="h-4 w-4" />
              {t("action.export_charts")}
            </Button>
            <Button size="sm" className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <FileDown className="h-4 w-4" />
              {t("action.export_pdf")}
            </Button>
          </div>
        </aside>

        {/* Content */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t("kpi.total_forms")} value={kpis.totalForms} icon={FileText} accent="info" />
            <KpiCard label={t("kpi.verified")} value={kpis.verifiedForms} suffix={`${kpis.verifiedPct}%`} icon={ShieldCheck} accent="primary" />
            <KpiCard label={t("kpi.total_tasks")} value={kpis.totalTasks} icon={ListChecks} accent="warning" />
            <KpiCard label={t("kpi.submitted_tasks")} value={kpis.submittedTasks} suffix={`${kpis.submittedPct}%`} icon={Send} accent="primary" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
            <h3 className="font-display text-base font-semibold">Archive PDF</h3>
            <p className="mt-1 text-sm text-muted-foreground">Fichiers PDF archivés correspondant aux filtres.</p>
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/40 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FileDown className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium">Aucun fichier PDF affiché</div>
              <div className="mt-1 text-xs text-muted-foreground">Appliquez des filtres pour voir les archives.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
