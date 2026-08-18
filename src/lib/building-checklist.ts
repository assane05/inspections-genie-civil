import { emptyPoint, pointState, type ChecklistState } from "@/lib/inspection-checklist";

export type BuildingItem = { id: string; label: string };
export type BuildingCategory = {
  id: string;
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

export function buildingItemCount(categories: BuildingCategory[]): number {
  return categories.reduce((n, c) => n + c.items.length, 0);
}

export const naPoint = { ...emptyPoint, status: "ras" } as const;

export function defaultBuildingPoints(categories: BuildingCategory[]): ChecklistState {
  const out: ChecklistState = {};
  for (const cat of categories) {
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
