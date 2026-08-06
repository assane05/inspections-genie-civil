/**
 * Checklist bâtiment — catégories A → H.
 *
 * Les 8 catégories et leur ordre sont fixés par le cahier des charges.
 * Le contenu des items de chaque catégorie est une proposition basée sur des
 * points de contrôle bâtiment standards — À VALIDER PAR LES SUPERVISEURS avant
 * mise en production (cf. critère d'acceptation "Tous les items de chaque
 * catégorie présents et validés par les superviseurs").
 *
 * Saisie par item (sprint 6) : chaque item est à "N/A" par défaut ("rien à
 * signaler" — équivalent bâtiment du "RAS" de la fiche horizontale) ; sur
 * défaut, les mêmes champs de détail (Sévérité, Action/localisation,
 * Commentaire, Photo) s'ouvrent, avec la même logique par exception que la
 * fiche horizontale. On réutilise donc directement PointState /
 * ChecklistState de inspection-checklist.ts, en repurposant l'état "ras"
 * pour représenter "N/A" côté bâtiment (même mécanique, libellé différent) —
 * contrairement à la fiche horizontale, l'état "non_inspecte" n'est jamais
 * utilisé ici : chaque item est explicitement initialisé à "N/A".
 */

import { createVersionedDictionary } from "./dictionary-store";
import { emptyPoint, pointState, type ChecklistState } from "@/lib/inspection-checklist";

export type BuildingItem = { id: string; label: string };
export type BuildingCategory = {
  id: string;
  /** Lettre de catégorie A → H, imposée par le cahier des charges. */
  code: string;
  label: string;
  items: BuildingItem[];
};

function items(categoryId: string, labels: string[]): BuildingItem[] {
  return labels.map((label, i) => ({ id: `${categoryId}.${i + 1}`, label }));
}
export const DEFAULT_BUILDING_CATEGORIES: BuildingCategory[] = [
  {
    id: "murs",
    code: "A",
    label: "Murs / Cloisons",
    items: items("murs", [
      "Fissures visibles",
      "Enduit décollé ou cloqué",
      "Humidité / traces d'infiltration",
      "Cloisons désolidarisées ou déformées",
    ]),
  },
  {
    id: "structures",
    code: "B",
    label: "Structures",
    items: items("structures", [
      "Fissures structurelles (poteaux, poutres)",
      "Corrosion des éléments métalliques apparents",
      "Affaissement / déformation",
      "Points d'appui ou fondations visibles dégradés",
    ]),
  },
  {
    id: "menuiserie",
    code: "C",
    label: "Menuiserie",
    items: items("menuiserie", [
      "Portes : fonctionnement, fermeture, quincaillerie",
      "Fenêtres : étanchéité, vitrage, fonctionnement",
      "Serrures et ferme-portes",
      "Déformation des huisseries",
    ]),
  },
  {
    id: "faux-plafond",
    code: "D",
    label: "Faux plafond / Étanchéité",
    items: items("faux-plafond", [
      "Dalles de faux plafond manquantes ou tachées",
      "Infiltrations / traces d'humidité en plafond",
      "Ossature apparente ou affaissée",
      "Étanchéité des points singuliers (toiture-terrasse)",
    ]),
  },
  {
    id: "peinture",
    code: "E",
    label: "Peinture",
    items: items("peinture", [
      "Écaillage / cloquage",
      "Décoloration / ternissement",
      "Salissures / graffitis",
      "Reprises de peinture non homogènes",
    ]),
  },
  {
    id: "carrelage",
    code: "F",
    label: "Carrelage / Revêtement",
    items: items("carrelage", [
      "Carreaux fissurés ou descellés",
      "Joints dégradés",
      "Revêtement de sol soulevé ou décollé",
      "Plinthes endommagées",
    ]),
  },
  {
    id: "toiture",
    code: "G",
    label: "Toiture métallique",
    items: items("toiture", [
      "Corrosion / oxydation des tôles",
      "Fixations desserrées ou manquantes",
      "Déformation ou soulèvement au vent",
      "Étanchéité des recouvrements",
    ]),
  },
  {
    id: "eaux-pluviales",
    code: "H",
    label: "Descente eaux pluviales",
    items: items("eaux-pluviales", [
      "Gouttières obstruées",
      "Descentes désolidarisées ou fuyantes",
      "Corrosion des chéneaux",
      "Évacuations au sol obstruées",
    ]),
  },
];

const buildingCategoriesStore = createVersionedDictionary<BuildingCategory[]>(
  "building-categories",
  DEFAULT_BUILDING_CATEGORIES,
);

/** Checklist bâtiment actuellement en vigueur (éditée par l'admin ou par défaut). */
export function getBuildingCategories(): BuildingCategory[] {
  return buildingCategoriesStore.current();
}
export const getBuildingCategoriesVersion = buildingCategoriesStore.version;
export const saveBuildingCategories = buildingCategoriesStore.save;
export const resetBuildingCategories = buildingCategoriesStore.resetToDefaults;
export const buildingCategoriesCustomized = buildingCategoriesStore.isCustomized;

export function buildingItemCount(): number {
  return getBuildingCategories().reduce((n, c) => n + c.items.length, 0);
}

/** État "N/A par défaut" pour un item bâtiment (repurpose "ras" du modèle générique). */
export const naPoint = { ...emptyPoint, status: "ras" } as const;

/** Initialise tous les items bâtiment à "N/A" — jamais de "non_inspecte" côté bâtiment. */
export function defaultBuildingPoints(): ChecklistState {
  const out: ChecklistState = {};
  for (const cat of getBuildingCategories()) {
    for (const item of cat.items) out[item.id] = { ...naPoint };
  }
  return out;
}

export function categoryPointIds(cat: BuildingCategory): string[] {
  return cat.items.map((i) => i.id);
}

export function categoryDefectCount(state: ChecklistState, cat: BuildingCategory): number {
  return cat.items.filter((i) => pointState(state, i.id).status === "defaut").length;
}
