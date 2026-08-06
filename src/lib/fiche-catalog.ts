/**
 * Catalogue des fiches d'inspection horizontales.
 *
 * Chaque fiche déclare :
 *  - les catégories de contrôle qui s'y appliquent (cf. inspection-checklist.ts) ;
 *  - son mode de segmentation physique par défaut ("linear" → 1/3·2/3·3/3,
 *    "single" → un seul segment, l'ouvrage/la zone dans son ensemble).
 *
 * `confirmed: true` = nom de fiche retrouvé tel quel dans mock-data.ts.
 * `confirmed: false` = entrée absente des données actuelles, à valider par les
 * superviseurs avant mise en production (cf. critère d'acceptation "100% des
 * fiches validées par les superviseurs").
 *
 * IMPORTANT : mock-data.ts ne contient que 18 fiches distinctes (une fois la
 * casse normalisée), pas ~26. Les entrées confirmées ci-dessous couvrent ces
 * 18 ; il en manque donc encore pour atteindre le compte cible du cahier des
 * charges — à compléter dès que la liste réelle sera communiquée.
 */

export type SegmentationKind = "linear" | "single";

export type FicheType = {
  id: string;
  /** Code interne LAS, ex. MAINT/EN/73/00. Absent pour les fiches non encore codifiées. */
  code: string | null;
  /** Libellé exact tel qu'utilisé dans les tâches / formulaires. */
  label: string;
  /** Groupe d'appartenance (cf. byGroup / availableForms dans mock-data.ts). */
  group: string;
  /** Catégories de contrôle applicables (ids de familles dans inspection-checklist.ts). */
  categories: string[];
  segmentation: SegmentationKind;
  confirmed: boolean;
};

const linear = (categories: string[]): Pick<FicheType, "categories" | "segmentation"> => ({
  categories,
  segmentation: "linear",
});
const single = (categories: string[]): Pick<FicheType, "categories" | "segmentation"> => ({
  categories,
  segmentation: "single",
});

const SURFACE_SET = ["surface", "marquage", "balisage", "abords", "drainage"];
const BALISAGE_SET = ["marquage", "balisage"];
const ROUTE_SET = ["surface", "marquage", "abords", "drainage"];
const CLOTURE_SET = ["surete", "abords", "drainage"];
const OUVRAGE_SET = ["drainage", "abords", "surface"];
const BANDE_SET = ["surface", "abords", "drainage"];

export const ficheCatalog: FicheType[] = [
  // --- Runway ---
  {
    id: "runway",
    code: "MAINT/EN/73/00",
    label: "Fiche d'inspection Runway",
    group: "Runway",
    confirmed: true,
    ...linear(SURFACE_SET),
  },
  {
    id: "runway-resa",
    code: "TEMP-1",
    label: "Fiche inspection bande de pistes-RESA",
    group: "Runway",
    confirmed: true,
    ...linear(BANDE_SET),
  },
  {
    id: "runway-balisage",
    code: "MAINT/EN/110/00",
    label: "Fiche d'inspection balisage diurne Runway",
    group: "Runway",
    confirmed: true,
    ...linear(BALISAGE_SET),
  },

  // --- Taxiway ---
  {
    id: "taxiway",
    code: "MAINT/EN/74/00",
    label: "Fiche d'inspection Taxiway",
    group: "Taxiway",
    confirmed: true,
    ...linear(SURFACE_SET),
  },
  {
    id: "taxiway-bande",
    code: "TEMP-2",
    label: "Fiche inspection bande de piste-TWY",
    group: "Taxiway",
    confirmed: true,
    ...linear(BANDE_SET),
  },
  {
    id: "taxiway-balisage",
    code: "MAINT/EN/111/00",
    label: "Fiche d'inspection balisage diurne Taxiway",
    group: "Taxiway",
    confirmed: true,
    ...linear(BALISAGE_SET),
  },

  // --- Apron / GSE Road ---
  {
    id: "apron",
    code: "MAINT/EN/75/00",
    label: "Fiche d'inspection Apron",
    group: "Apron et GSE Road",
    confirmed: true,
    ...linear(SURFACE_SET),
  },
  {
    id: "apron-balisage",
    code: "MAINT/EN/112/00",
    label: "Fiche d'inspection balisage diurne Apron",
    group: "Apron et GSE Road",
    confirmed: true,
    ...linear(BALISAGE_SET),
  },
  {
    id: "gse-road",
    code: "MAINT/EN/76/00",
    label: "Fiche d'inspection GSE Road",
    group: "Apron et GSE Road",
    confirmed: true,
    ...linear(ROUTE_SET),
  },
  {
    id: "gse-road-balisage",
    code: null,
    label: "Fiche d'inspection balisage GSE Road",
    group: "Apron et GSE Road",
    confirmed: true,
    ...linear(BALISAGE_SET),
  },

  // --- Service Road ---
  {
    id: "service-road",
    code: "MAINT/EN/77/00",
    label: "Fiche d'inspection Service Road",
    group: "Service Road",
    confirmed: true,
    ...linear(ROUTE_SET),
  },

  // --- Access Road / Parking ---
  {
    id: "access-road",
    code: "MAINT/EN/78/00",
    label: "Fiche d'inspection Access Road",
    group: "Acces Road - Chemin de Ronde Ext - Parking Auto",
    confirmed: true,
    ...linear(ROUTE_SET),
  },
  {
    id: "parking",
    code: "MAINT/EN/79/00",
    label: "Fiche d'inspection Parking",
    group: "Acces Road - Chemin de Ronde Ext - Parking Auto",
    confirmed: true,
    ...linear(ROUTE_SET),
  },
  {
    id: "parking-balisage",
    code: null,
    label: "Fiche d'inspection balisage diurne parking",
    group: "Acces Road - Chemin de Ronde Ext - Parking Auto",
    confirmed: true,
    ...linear(BALISAGE_SET),
  },

  // --- Fence / Chemin de Ronde Int ---
  {
    id: "fence",
    code: "MAINT/EN/80/00",
    label: "Fiche d'inspection Fence",
    group: "Fence et Chemin de Ronde Int",
    confirmed: true,
    ...linear(CLOTURE_SET),
  },
  {
    id: "cr-interieur",
    code: null,
    label: "Fiche d'inspection Chemin de Ronde Interieur",
    group: "Fence et Chemin de Ronde Int",
    confirmed: true,
    ...linear(CLOTURE_SET),
  },
  {
    id: "cr-interieur-balisage",
    code: null,
    label: "Fiche d'inspection balisage diurne CR Interieur",
    group: "Fence et Chemin de Ronde Int",
    confirmed: true,
    ...linear(BALISAGE_SET),
  },

  // --- Ouvrage de Drainage ---
  {
    id: "drainage",
    code: "MAINT/EN/81/00",
    label: "Fiche d'inspection Drainage",
    group: "Ouvrage de Drainage",
    confirmed: true,
    ...single(OUVRAGE_SET),
  },
];

function normalize(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const byNormalizedLabel = new Map(ficheCatalog.map((f) => [normalize(f.label), f]));

/** Retrouve la fiche du catalogue à partir du libellé porté par la tâche (insensible à la casse/accents). */
export function resolveFicheType(formLabel: string): FicheType | undefined {
  return byNormalizedLabel.get(normalize(formLabel));
}

export type PhysicalSegment = { id: string; label: string };

const RANGE_RE = /^(.*?\D)(\d+)\s*(?:à|a|-)\s*(\d+)\s*$/i;

/**
 * Calcule les segments physiques d'une tâche.
 * 1) Plage numérique détectée dans la zone (ex. "SR 5 à 8") → un segment par numéro.
 * 2) Sinon, mode de segmentation par défaut de la fiche : linéaire (1/3·2/3·3/3) ou unique.
 */
export function segmentsForTask(
  fiche: FicheType | undefined,
  task: { zone: string },
): PhysicalSegment[] {
  const match = RANGE_RE.exec(task.zone.trim());
  if (match) {
    const prefix = match[1].trim();
    const start = parseInt(match[2], 10);
    const end = parseInt(match[3], 10);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start < 50) {
      const out: PhysicalSegment[] = [];
      for (let n = start; n <= end; n++) out.push({ id: `n${n}`, label: `${prefix} ${n}` });
      return out;
    }
  }

  if (fiche?.segmentation === "single") {
    return [{ id: "zone", label: task.zone || "Zone unique" }];
  }

  // Par défaut (fiche inconnue du catalogue ou segmentation "linear") : découpage linéaire en tiers.
  return [
    { id: "1-3", label: "1/3" },
    { id: "2-3", label: "2/3" },
    { id: "3-3", label: "3/3" },
  ];
}
