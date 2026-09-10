// import { useEffect, useState } from "react";
// import { FileDown, Loader2 } from "lucide-react";
// import { toast } from "sonner";
// import {
//   useFormTypeSchema,
//   useInspection,
//   useResumeInspection,
//   usePatchInspectionValues,
//   type ValueUpsertInput,
// } from "@/lib/queries/inspections";
// import { exportInspectionPdf } from "@/lib/inspection-pdf";
// import { InspectionSection } from "@/components/inspection/inspection-section";
// import { InspectionHeaderFields } from "@/components/inspection/inspection-header-fields";
// import { InspectionSubmitBar } from "@/components/inspection/inspection-submit-bar";
// import { Button } from "@/components/ui/button";

// export function InspectionForm({
//   assignmentId,
//   onSubmitted,
// }: {
//   assignmentId: string;
//   onSubmitted?: () => void;
// }) {
//   const resumeInspection = useResumeInspection();
//   const [inspectionId, setInspectionId] = useState<string | null>(null);
//   const [exportingPdf, setExportingPdf] = useState(false);

//   useEffect(() => {
//     setInspectionId(null);
//     resumeInspection.mutate(assignmentId, {
//       onSuccess: (inspection) => setInspectionId(inspection.id),
//       onError: () => toast.error("Impossible d'ouvrir la fiche", { description: "Réessayez." }),
//     });
//   }, [assignmentId]);

//   const inspectionQuery = useInspection(inspectionId ?? undefined);
//   const schemaQuery = useFormTypeSchema(inspectionQuery.data?.formTypeId);
//   const patchValues = usePatchInspectionValues(inspectionId ?? "");

//   if (
//     resumeInspection.isPending ||
//     !inspectionId ||
//     inspectionQuery.isLoading ||
//     schemaQuery.isLoading
//   ) {
//     return (
//       <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
//         <Loader2 className="h-5 w-5 animate-spin" />
//         Chargement de la fiche…
//       </div>
//     );
//   }

//   if (!inspectionQuery.data || !schemaQuery.data) {
//     return (
//       <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
//         Impossible de charger cette fiche.
//       </div>
//     );
//   }

//   const inspection = inspectionQuery.data;
//   const schema = schemaQuery.data;
//   const isSubmitted = inspection.status !== "non_soumis";

//   function handleValueChange(input: ValueUpsertInput) {
//     patchValues.mutate([input], {
//       onSuccess: (result) => {
//         if (result.queued) {
//           toast("Enregistré hors-ligne", {
//             description: "Sera synchronisé automatiquement dès le retour du réseau.",
//           });
//         }
//       },
//       onError: (err) => {
//         toast.error("Échec de l'enregistrement", {
//           description: err instanceof Error ? err.message : "Réessayez.",
//         });
//       },
//     });
//   }

//   async function handleExportPdf() {
//     setExportingPdf(true);
//     try {
//       await exportInspectionPdf(inspection, schema);
//     } catch {
//       toast.error("Échec de l'export PDF", { description: "Réessayez." });
//     } finally {
//       setExportingPdf(false);
//     }
//   }

//   return (
//     <div className="space-y-4">
//       <div className="flex items-start justify-between gap-3">
//         <div>
//           <h2 className="text-lg font-semibold">{schema.name}</h2>
//           <p className="text-sm text-muted-foreground">
//             Version {schema.version} · {schema.sections.length} famille(s)
//           </p>
//         </div>
//         <Button
//           type="button"
//           variant="outline"
//           size="sm"
//           className="gap-1.5"
//           disabled={exportingPdf}
//           onClick={() => void handleExportPdf()}
//         >
//           {exportingPdf ? (
//             <Loader2 className="h-3.5 w-3.5 animate-spin" />
//           ) : (
//             <FileDown className="h-3.5 w-3.5" />
//           )}
//           Export PDF
//         </Button>
//       </div>

//       {schema.module === "vertical" && (
//         <InspectionHeaderFields inspection={inspection} disabled={isSubmitted} />
//       )}

//       {schema.sections.map((section) => (
//         <InspectionSection
//           key={section.id}
//           inspectionId={inspection.id}
//           section={section}
//           segments={schema.segments}
//           values={inspection.values.filter((v) => section.items.some((i) => i.id === v.itemId))}
//           onValueChange={handleValueChange}
//           disabled={isSubmitted}
//         />
//       ))}

//       <InspectionSubmitBar inspection={inspection} onSubmitted={onSubmitted} />
//     </div>
//   );
// }

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useFormTypeSchema,
  useInspection,
  useResumeInspection,
  usePatchInspectionValues,
  type ValueUpsertInput,
} from "@/lib/queries/inspections";

import { exportInspectionPdf } from "@/lib/inspection-pdf";

import { InspectionSection } from "@/components/inspection/inspection-section";
import { InspectionHeaderFields } from "@/components/inspection/inspection-header-fields";
import { InspectionSubmitBar } from "@/components/inspection/inspection-submit-bar";

import { Button } from "@/components/ui/button";

export function InspectionForm({
  assignmentId,
  onSubmitted,
}: {
  assignmentId: string;
  onSubmitted?: () => void;
}) {
  const resumeInspection = useResumeInspection();

  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Famille actuellement affichée
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  /*
   * ------------------------------------------------------------
   * OUVERTURE / REPRISE DE L'INSPECTION
   * ------------------------------------------------------------
   */

  useEffect(() => {
    setInspectionId(null);
    setCurrentSectionIndex(0);

    resumeInspection.mutate(assignmentId, {
      onSuccess: (inspection) => {
        setInspectionId(inspection.id);
      },
      onError: () => {
        toast.error("Impossible d'ouvrir la fiche", {
          description: "Réessayez.",
        });
      },
    });
  }, [assignmentId]);

  /*
   * ------------------------------------------------------------
   * CHARGEMENT DES DONNÉES
   * ------------------------------------------------------------
   */

  const inspectionQuery = useInspection(inspectionId ?? undefined);
  const schemaQuery = useFormTypeSchema(inspectionQuery.data?.formTypeId);
  const patchValues = usePatchInspectionValues(inspectionId ?? "");

  if (
    resumeInspection.isPending ||
    !inspectionId ||
    inspectionQuery.isLoading ||
    schemaQuery.isLoading
  ) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement de la fiche…
      </div>
    );
  }

  if (!inspectionQuery.data || !schemaQuery.data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Impossible de charger cette fiche.
      </div>
    );
  }

  const inspection = inspectionQuery.data;
  const schema = schemaQuery.data;
  const sections = schema.sections;
  const totalSections = sections.length;
  const isSubmitted = inspection.status !== "non_soumis";

  /*
   * ------------------------------------------------------------
   * SÉCURITÉ SUR L'INDEX COURANT
   * ------------------------------------------------------------
   */

  const safeSectionIndex = totalSections > 0 ? Math.min(currentSectionIndex, totalSections - 1) : 0;
  const currentSection = sections[safeSectionIndex];
  const isFirstSection = safeSectionIndex === 0;
  const isLastSection = totalSections > 0 && safeSectionIndex === totalSections - 1;

  /*
   * ------------------------------------------------------------
   * VALEURS DE LA FAMILLE COURANTE
   * ------------------------------------------------------------
   */

  const currentSectionValues = currentSection
    ? inspection.values.filter((value) =>
        currentSection.items.some((item) => item.id === value.itemId),
      )
    : [];

  /*
   * ------------------------------------------------------------
   * UNE VALEUR EST-ELLE CONSIDÉRÉE COMME RENSEIGNÉE ?
   * ------------------------------------------------------------
   *
   * "non_inspecte" = pas encore traité.
   *
   * Toutes les autres valeurs d'état sont considérées
   * comme une réponse valide :
   *
   * ras
   * minor
   * major
   * yes
   * na
   */

  function isValueCompleted(state: string | null | undefined) {
    return !!state && state !== "non_inspecte";
  }

  /*
   * ------------------------------------------------------------
   * VALIDATION D'UNE FAMILLE
   * ------------------------------------------------------------
   *
   * Vertical :
   *   → chaque item doit avoir une valeur.
   *
   * Horizontal :
   *   → chaque item doit avoir une valeur pour chaque
   *     segment attendu.
   *
   * Les segments présents dans excludedSegmentIds sont ignorés.
   */

  function isSectionComplete(section: (typeof sections)[number]): boolean {
    if (section.items.length === 0) {
      return true;
    }

    /*
     * ----------------------------------------------------------
     * MODULE VERTICAL
     * ----------------------------------------------------------
     */

    if (schema.module === "vertical") {
      return section.items.every((item) => {
        const value = inspection.values.find(
          (inspectionValue) =>
            inspectionValue.itemId === item.id && inspectionValue.segmentId === null,
        );

        return isValueCompleted(value?.state);
      });
    }

    /*
     * ----------------------------------------------------------
     * MODULE HORIZONTAL
     * ----------------------------------------------------------
     */

    return section.items.every((item) => {
      const expectedSegments = schema.segments.filter(
        (segment) => !item.excludedSegmentIds.includes(segment.id),
      );

      /*
       * S'il n'y a aucun segment configuré,
       * on recherche simplement une valeur pour l'item.
       */

      if (expectedSegments.length === 0) {
        const value = inspection.values.find(
          (inspectionValue) => inspectionValue.itemId === item.id,
        );

        return isValueCompleted(value?.state);
      }

      /*
       * Chaque segment attendu doit être renseigné.
       */

      return expectedSegments.every((segment) => {
        const value = inspection.values.find(
          (inspectionValue) =>
            inspectionValue.itemId === item.id && inspectionValue.segmentId === segment.id,
        );

        return isValueCompleted(value?.state);
      });
    });
  }

  /*
   * ------------------------------------------------------------
   * PROGRESSION GLOBALE
   * ------------------------------------------------------------
   */

  const completedSections = sections.filter(isSectionComplete).length;
  const allSectionsComplete = totalSections > 0 && completedSections === totalSections;

  /*
   * ------------------------------------------------------------
   * PROGRESSION EN POURCENTAGE
   * ------------------------------------------------------------
   */

  const progressPercentage =
    totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  /*
   * ------------------------------------------------------------
   * SAUVEGARDE D'UNE VALEUR
   * ------------------------------------------------------------
   */

  function handleValueChange(input: ValueUpsertInput) {
    patchValues.mutate([input], {
      onSuccess: (result) => {
        if (result.queued) {
          toast("Enregistré hors-ligne", {
            description: "Sera synchronisé automatiquement dès le retour du réseau.",
          });
        }
      },

      onError: (err) => {
        toast.error("Échec de l'enregistrement", {
          description: err instanceof Error ? err.message : "Réessayez.",
        });
      },
    });
  }

  /*
   * ------------------------------------------------------------
   * VALIDATION DE LA FAMILLE COURANTE
   * ------------------------------------------------------------
   */

  function validateCurrentSection(): boolean {
    if (!currentSection) {
      return false;
    }

    if (!isSectionComplete(currentSection)) {
      toast.error("Famille incomplète", {
        description: "Veuillez renseigner tous les éléments de cette famille avant de continuer.",
      });

      return false;
    }

    return true;
  }

  /*
   * ------------------------------------------------------------
   * FAMILLE PRÉCÉDENTE
   * ------------------------------------------------------------
   */

  function handlePrevious() {
    if (isFirstSection) {
      return;
    }

    setCurrentSectionIndex((index) => Math.max(index - 1, 0));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ------------------------------------------------------------
   * FAMILLE SUIVANTE
   * ------------------------------------------------------------
   */

  function handleNext() {
    if (!validateCurrentSection()) {
      return;
    }

    if (isLastSection) {
      return;
    }

    setCurrentSectionIndex((index) => Math.min(index + 1, totalSections - 1));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ------------------------------------------------------------
   * NAVIGATION DIRECTE DANS LE STEPPER
   * ------------------------------------------------------------
   */

  function handleStepClick(index: number) {
    if (index === safeSectionIndex || isSubmitted) {
      return;
    }

    /*
     * Retour vers une famille précédente :
     * toujours autorisé.
     */

    if (index < safeSectionIndex) {
      setCurrentSectionIndex(index);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    /*
     * Pour aller vers une famille suivante,
     * on valide d'abord la famille actuelle.
     */

    if (!validateCurrentSection()) {
      return;
    }

    setCurrentSectionIndex(index);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ------------------------------------------------------------
   * EXPORT PDF
   * ------------------------------------------------------------
   */

  async function handleExportPdf() {
    setExportingPdf(true);

    try {
      await exportInspectionPdf(inspection, schema);
    } catch {
      toast.error("Échec de l'export PDF", {
        description: "Réessayez.",
      });
    } finally {
      setExportingPdf(false);
    }
  }

  /*
   * ------------------------------------------------------------
   * AUCUNE FAMILLE
   * ------------------------------------------------------------
   */

  if (totalSections === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Cette fiche ne contient aucune famille d'inspection.
        </p>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * RENDU
   * ------------------------------------------------------------
   */

  return (
    <div className="space-y-6">
      {/* ========================================================
          EN-TÊTE
          ======================================================== */}

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{schema.name}</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Version {schema.version} · {totalSections} famille
            {totalSections > 1 ? "s" : ""}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          disabled={exportingPdf}
          onClick={() => void handleExportPdf()}
        >
          {exportingPdf ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          Export PDF
        </Button>
      </div>

      {/* ========================================================
          INFORMATIONS GÉNÉRALES
          ======================================================== */}

      {schema.module === "vertical" && (
        <InspectionHeaderFields inspection={inspection} disabled={isSubmitted} />
      )}

      {/* ========================================================
          STEPPER
          ======================================================== */}

      {/* ========================================================
          FAMILLE ACTUELLE
          ======================================================== */}

      {currentSection && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Famille {safeSectionIndex + 1} sur {totalSections}
                </p>

                <h3 className="mt-1 text-lg font-semibold">{currentSection.label}</h3>
              </div>

              <span
                className={[
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                  isSectionComplete(currentSection)
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isSectionComplete(currentSection) ? "Complétée" : "À compléter"}
              </span>
            </div>
          </div>

          <div className="p-5 md:p-6">
            <InspectionSection
              key={currentSection.id}
              inspectionId={inspection.id}
              section={currentSection}
              segments={schema.segments}
              values={currentSectionValues}
              onValueChange={handleValueChange}
              disabled={isSubmitted}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          NAVIGATION
          ======================================================== */}

      {!isSubmitted && (
        <div className="flex flex-col-reverse gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstSection}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>

          {!isLastSection && (
            <Button
              type="button"
              onClick={handleNext}
              disabled={patchValues.isPending}
              className="gap-2"
            >
              {patchValues.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  Famille suivante
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Progression
            </p>

            <p className="mt-1 text-lg font-semibold">
              {completedSections} / {totalSections} familles
            </p>
          </div>

          <span className="text-sm font-semibold text-primary">{progressPercentage}%</span>
        </div>

        {/* Barre globale */}

        <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>

        {/* Étapes */}

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start">
            {sections.map((section, index) => {
              const isCurrent = index === safeSectionIndex;

              const isCompleted = isSectionComplete(section);

              return (
                <div key={section.id} className="flex items-start">
                  <button
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleStepClick(index)}
                    className="group flex min-w-[130px] flex-col items-center gap-2 px-2 disabled:cursor-default"
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span
                      className={[
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                        isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted-foreground/30 bg-background text-muted-foreground",
                      ].join(" ")}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                    </span>

                    <span
                      className={[
                        "max-w-[140px] text-center text-xs font-medium leading-tight",
                        isCurrent ? "text-foreground" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {section.label}
                    </span>
                  </button>

                  {index < totalSections - 1 && (
                    <div
                      className={[
                        "mt-[18px] h-0.5 w-8 shrink-0 transition-colors md:w-16",
                        isSectionComplete(section) ? "bg-primary" : "bg-muted",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================
          SOUMISSION
          ======================================================== */}

      <InspectionSubmitBar
        inspection={inspection}
        onSubmitted={onSubmitted}
        canSubmit={allSectionsComplete}
        completedSections={completedSections}
        totalSections={totalSections}
      />
    </div>
  );
}
