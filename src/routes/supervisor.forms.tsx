import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { availableForms } from "@/lib/mock-data";
import { useTasks } from "@/lib/queries/tasks";
import { progressByForm } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/supervisor/forms")({
  component: SupervisorForms,
  head: () => ({
    meta: [
      { title: "Formulaires disponibles — LAS Superviseur" },
      { name: "description", content: "Fiches d'inspection à remplir par le superviseur." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SupervisorForms() {
  const { t } = useI18n();
  const [open, setOpen] = useState<Record<string, boolean>>({ Runway: true });

  // Progression "X of Y" par formulaire (sprint 13) — même source que la liste des
  // tâches et le tableau de bord, pour un compteur exact et cohérent partout.
  const { data: rows = [] } = useTasks();
  const progress = useMemo(() => new Map(progressByForm(rows).map((p) => [p.form, p])), [rows]);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.forms")}
        title={t("forms.available")}
        subtitle="Sélectionnez une fiche d'inspection à remplir"
      />

      <div className="mx-auto max-w-5xl space-y-3 p-6 md:p-8">
        {availableForms.map((section) => {
          const isOpen = open[section.group] ?? false;
          return (
            <div
              key={section.group}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm transition-all"
            >
              <button
                onClick={() => setOpen((o) => ({ ...o, [section.group]: !isOpen }))}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{section.group}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {section.items.length} formulaire{section.items.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen && (
                <div className="grid grid-cols-1 gap-2 border-t border-border/60 bg-background/40 p-4 md:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((item) => {
                    const p = progress.get(item.name);
                    return (
                      <a
                        key={item.name}
                        href="#"
                        className="group rounded-xl border border-border/50 bg-card/40 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-[0_10px_30px_-12px_var(--color-primary)]"
                      >
                        <div className="font-medium leading-snug text-primary group-hover:underline">
                          {item.name}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {t("forms.code")}
                            </span>
                            <span className="font-mono text-xs text-foreground/80">
                              {item.code}
                            </span>
                          </div>
                          {p && (
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold",
                                p.submitted === p.total
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border/60 bg-muted/40 text-muted-foreground",
                              )}
                            >
                              {p.submitted} of {p.total}
                            </span>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
