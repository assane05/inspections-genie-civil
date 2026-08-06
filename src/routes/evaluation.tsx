import { createFileRoute } from "@tanstack/react-router";
import { Plus, Send, X } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/evaluation")({
  component: Evaluation,
  head: () => ({
    meta: [
      { title: "Formulaire d'évaluation — LAS Inspections" },
      { name: "description", content: "Formulaire d'évaluation périodique des inspections." },
    ],
  }),
});

function Evaluation() {
  const { t } = useI18n();
  const [rows, setRows] = useState([{ id: 1 }, { id: 2 }]);
  return (
    <div className="pb-10">
      <PageHeader eyebrow={t("nav.evaluation")} title={t("evaluation.title")} subtitle="Définissez la période puis ajoutez les évaluations" />
      <div className="mx-auto max-w-5xl space-y-4 p-6 md:p-8">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 backdrop-blur-sm glow-primary">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-primary/80">
                {t("evaluation.period_start")} *
              </Label>
              <Input type="date" className="h-10 bg-background/60" />
            </div>
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-primary/80">
                {t("evaluation.period_end")} *
              </Label>
              <Input type="date" className="h-10 bg-background/60" />
            </div>
          </div>
        </div>

        {rows.map((r, i) => (
          <div key={r.id} className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <h4 className="font-medium">Évaluation</h4>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setRows(rows.filter((x) => x.id !== r.id))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">Zone</Label>
                <Input placeholder="Runway 05" className="h-9 bg-background/60" />
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">Note</Label>
                <Input type="number" max={10} placeholder="0-10" className="h-9 bg-background/60" />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">Observations</Label>
                <Input placeholder="Notes de l'évaluation" className="h-9 bg-background/60" />
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setRows([...rows, { id: Date.now() }])}>
            <Plus className="h-4 w-4" /> {t("evaluation.add_row")}
          </Button>
          <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_-4px_var(--color-primary)]">
            <Send className="h-4 w-4" /> {t("evaluation.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
