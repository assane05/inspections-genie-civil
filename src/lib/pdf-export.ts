import { jsPDF } from "jspdf";

/**
 * Export PDF d'une fiche remplie (sprint 14) — en-tête, constats, photos.
 * Génère un PDF fidèle au contenu réellement saisi (pas de données inventées :
 * un champ vide reste vide dans le PDF) et déclenche son téléchargement.
 */

const MARGIN = 14;
const PAGE_WIDTH = 210; // A4 portrait, mm
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const THUMB = 28;

export type PdfMeta = { label: string; value: string }[];

export type PdfConstat = {
  heading: string;
  fields: { label: string; value: string }[];
  photos: string[];
};

export type PdfFicheData = {
  title: string;
  subtitle: string;
  status: string;
  meta: PdfMeta;
  constats: PdfConstat[];
  comment: string;
  submittedBy: string | null;
  submittedAt: string | null;
};

function sanitizeFilename(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function exportFichePdf(data: PdfFicheData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // En-tête
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.title, MARGIN, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(data.subtitle, MARGIN, y);
  doc.setTextColor(0);
  y += 6;
  doc.setFontSize(10);
  doc.text(`Statut : ${data.status}`, MARGIN, y);
  y += 6;

  doc.setDrawColor(200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  // Métadonnées (2 colonnes)
  doc.setFontSize(9);
  const colWidth = CONTENT_WIDTH / 2;
  data.meta.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * colWidth;
    const rowY = y + row * 9;
    doc.setFont("helvetica", "bold");
    doc.text(m.label, x, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(m.value, colWidth - 4), x, rowY + 4);
  });
  y += Math.ceil(data.meta.length / 2) * 9 + 4;

  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  // Constats
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  ensureSpace(8);
  doc.text(`Constats (${data.constats.length})`, MARGIN, y);
  y += 7;

  if (data.constats.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    ensureSpace(6);
    doc.text("Aucun défaut relevé.", MARGIN, y);
    y += 8;
  }

  for (const c of data.constats) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    const headingLines = doc.splitTextToSize(c.heading, CONTENT_WIDTH);
    doc.text(headingLines, MARGIN, y);
    y += headingLines.length * 5 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const f of c.fields) {
      if (!f.value) continue;
      ensureSpace(5);
      const lines = doc.splitTextToSize(`${f.label} : ${f.value}`, CONTENT_WIDTH);
      doc.text(lines, MARGIN + 2, y);
      y += lines.length * 4.2;
    }

    if (c.photos.length) {
      ensureSpace(THUMB + 3);
      let x = MARGIN + 2;
      for (const photo of c.photos) {
        if (x + THUMB > PAGE_WIDTH - MARGIN) {
          x = MARGIN + 2;
          y += THUMB + 2;
          ensureSpace(THUMB + 3);
        }
        try {
          doc.addImage(photo, "JPEG", x, y, THUMB, THUMB, undefined, "FAST");
        } catch {
          // Image illisible par jsPDF (format inattendu) : on l'ignore plutôt que
          // de faire échouer tout l'export.
        }
        x += THUMB + 3;
      }
      y += THUMB + 4;
    }

    y += 3;
    doc.setDrawColor(230);
    ensureSpace(2);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 5;
  }

  // Commentaire général
  ensureSpace(12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Commentaire général", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const commentLines = doc.splitTextToSize(data.comment || "—", CONTENT_WIDTH);
  ensureSpace(commentLines.length * 4.2);
  doc.text(commentLines, MARGIN, y);
  y += commentLines.length * 4.2 + 6;

  // Auteur / horodatage (sprint 12) — fidèle : n'affiche rien si pas encore soumis.
  ensureSpace(6);
  doc.setFontSize(8);
  doc.setTextColor(120);
  const submissionLine = data.submittedBy
    ? `Soumis par ${data.submittedBy} le ${new Date(data.submittedAt!).toLocaleString("fr-FR")}`
    : "Brouillon — non soumis";
  doc.text(submissionLine, MARGIN, y);
  doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, PAGE_WIDTH - MARGIN, y, {
    align: "right",
  });

  doc.save(`${sanitizeFilename(data.title)}-${sanitizeFilename(data.subtitle)}.pdf`);
}
