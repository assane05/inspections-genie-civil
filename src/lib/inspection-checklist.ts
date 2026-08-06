/**
 * Modèle de fiche d'inspection « par famille ».
 * Remplace la matrice dense : chaque famille regroupe des segments,
 * chaque segment une liste de points de contrôle.
 * Tous les points sont à RAS par défaut ; seule l'exception est saisie.
 */

export type CheckPoint = { id: string; label: string };
export type Segment = { id: string; label: string; points: CheckPoint[] };
export type Family = { id: string; label: string; hint?: string; segments: Segment[] };

/**
 * Un point de contrôle a 3 états distincts :
 * - "non_inspecte" (état initial) : point pas encore renseigné, traçable comme tel.
 * - "ras"    : inspecté, rien à signaler.
 * - "defaut" : inspecté, défaut relevé → ouvre la saisie détaillée.
 * "non_inspecte" ne doit jamais être confondu avec "ras".
 */
export type PointStatus = "non_inspecte" | "ras" | "defaut";

export type Severity = "minor" | "major" | "yes";

export const SEVERITIES: Severity[] = ["minor", "major", "yes"];

export const SEVERITY_LABELS: Record<Severity, string> = {
  minor: "Minor",
  major: "Major",
  yes: "Yes",
};

export type PointState = {
  status: PointStatus;
  /** Sévérité du défaut — requise dès le passage en "defaut". */
  severity: Severity | null;
  /** Révélé qualitatif : description qualitative du défaut constaté. */
  qualitatif: string;
  /** Localisation précise du défaut sur le segment. */
  localisation: string;
  /**
   * Photo(s) du défaut — une ou plusieurs, capturées directement depuis l'appareil
   * photo sans quitter la saisie. Encodées en data URL compressée (en attendant le
   * stockage objets côté backend).
   */
  photos: string[];
  /**
   * Lien vers l'action corrective (ex. « Ouverture d'une fiche de réparation N°… ») —
   * un constat non conforme peut référencer une fiche d'action corrective, à titre
   * traçable mais non obligatoire.
   */
  actionCorrective: string;
};

export type ChecklistState = Record<string, PointState>;

export const emptyPoint: PointState = {
  status: "non_inspecte",
  severity: null,
  qualitatif: "",
  localisation: "",
  photos: [],
  actionCorrective: "",
};

function seg(id: string, label: string, points: string[]): Segment {
  return { id, label, points: points.map((p, i) => ({ id: `${id}.${i + 1}`, label: p })) };
}

/** Familles génériques applicables à toutes les zones aéroportuaires. */
const baseFamilies: Family[] = [
  {
    id: "surface",
    label: "Surface & revêtement",
    hint: "État du revêtement et propreté de la zone",
    segments: [
      seg("surface.chaussee", "Chaussée", [
        "Fissures / faïençage",
        "Nids-de-poule, épaufrures",
        "Décollement d'enrobé (FOD potentiel)",
        "Affaissement / déformation",
      ]),
      seg("surface.proprete", "Propreté / FOD", [
        "Présence de FOD",
        "Traces d'hydrocarbures",
        "Végétation sur la surface",
      ]),
    ],
  },
  {
    id: "marquage",
    label: "Marquage & signalisation",
    hint: "Peintures, panneaux et repères",
    segments: [
      seg("marquage.peinture", "Marquage au sol", [
        "Lisibilité du marquage axial",
        "Lisibilité des marquages latéraux",
        "Marquage de seuil / points d'attente",
      ]),
      seg("marquage.panneaux", "Panneaux", [
        "Panneaux propres et lisibles",
        "Fixation et verticalité",
      ]),
    ],
  },
  {
    id: "balisage",
    label: "Balisage lumineux",
    hint: "Feux, alimentation et alignement",
    segments: [
      seg("balisage.feux", "Feux", [
        "Feux hors service",
        "Vitrage cassé ou encrassé",
        "Alignement / hauteur",
      ]),
      seg("balisage.alim", "Alimentation", ["Câblage apparent", "Regards et boîtes de dérivation"]),
    ],
  },
  {
    id: "abords",
    label: "Abords & accotements",
    hint: "Bandes, talus et végétation",
    segments: [
      seg("abords.bande", "Bande / accotement", [
        "Dénivelé en bord de chaussée",
        "Érosion / ravinement",
        "Hauteur de la végétation",
      ]),
      seg("abords.obstacles", "Obstacles", [
        "Objets ou matériels non autorisés",
        "Nids d'oiseaux / faune",
      ]),
    ],
  },
  {
    id: "drainage",
    label: "Drainage",
    hint: "Écoulement des eaux",
    segments: [
      seg("drainage.ouvrages", "Ouvrages", [
        "Grilles et avaloirs obstrués",
        "Caniveaux dégradés",
        "Stagnation d'eau",
      ]),
    ],
  },
  {
    id: "surete",
    label: "Sûreté & clôture",
    hint: "Périmètre et accès",
    segments: [
      seg("surete.cloture", "Clôture / Chemin de ronde", [
        "Grillage percé ou déformé",
        "Fils barbelés manquants",
        "Traces d'intrusion / creusement",
      ]),
      seg("surete.acces", "Accès", ["Portails et serrures", "Éclairage périmétrique"]),
    ],
  },
];

/** Renvoie les catégories de contrôle applicables, dans l'ordre demandé par la fiche. */
export function categoriesForGroup(categoryIds: string[]): Family[] {
  return categoryIds
    .map((id) => baseFamilies.find((f) => f.id === id))
    .filter((f): f is Family => !!f);
}

/**
 * Clone un ensemble de catégories en préfixant chaque id de point par un segment
 * physique (ex. "1-3::surface.chaussee.1"), pour que le même jeu de catégories
 * puisse être répété sous plusieurs segments physiques (1/3, 2/3, 3/3, SR 5, SR 6…)
 * sans collision de clés dans le ChecklistState.
 */
export function namespaceFamilies(families: Family[], prefix: string): Family[] {
  return families.map((f) => ({
    ...f,
    segments: f.segments.map((s) => ({
      ...s,
      points: s.points.map((p) => ({ ...p, id: `${prefix}::${p.id}` })),
    })),
  }));
}

export function familyPointIds(family: Family): string[] {
  return family.segments.flatMap((s) => s.points.map((p) => p.id));
}

export function pointState(state: ChecklistState, id: string): PointState {
  return state[id] ?? emptyPoint;
}

export function familyDefectCount(state: ChecklistState, family: Family): number {
  return familyPointIds(family).filter((id) => pointState(state, id).status === "defaut").length;
}

/** Points jamais renseignés — traçabilité distincte de RAS. */
export function familyNonInspecteCount(state: ChecklistState, family: Family): number {
  return familyPointIds(family).filter((id) => pointState(state, id).status === "non_inspecte")
    .length;
}

/** true si tous les points de la famille ont été traités (RAS ou Défaut), aucun laissé "Non inspecté". */
export function familyFullyInspected(state: ChecklistState, family: Family): boolean {
  return familyNonInspecteCount(state, family) === 0;
}
