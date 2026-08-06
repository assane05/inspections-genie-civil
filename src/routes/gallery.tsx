import { createFileRoute } from "@tanstack/react-router";
import { Camera, Calendar, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/gallery")({
  component: Gallery,
  head: () => ({
    meta: [
      { title: "Galerie photos — LAS Inspections" },
      { name: "description", content: "Preuves photographiques associées aux inspections." },
    ],
  }),
});

const photos = [
  { id: 1, form: "Runway 05", date: "12 juin 2025", group: "Runway", tone: "from-primary/20 to-primary/5" },
  { id: 2, form: "Taxiway A", date: "8 juin 2025", group: "Taxiway", tone: "from-info/20 to-info/5" },
  { id: 3, form: "Apron 2", date: "3 juin 2025", group: "Apron", tone: "from-warning/20 to-warning/5" },
  { id: 4, form: "Fence Nord", date: "1 juin 2025", group: "Fence", tone: "from-accent/20 to-accent/5" },
  { id: 5, form: "Runway 23", date: "28 mai 2025", group: "Runway", tone: "from-success/20 to-success/5" },
  { id: 6, form: "GSE Road", date: "24 mai 2025", group: "GSE", tone: "from-chart-2/20 to-chart-2/5" },
  { id: 7, form: "Drainage Est", date: "20 mai 2025", group: "Drainage", tone: "from-muted/40 to-muted/10" },
  { id: 8, form: "Access Road", date: "18 mai 2025", group: "Access", tone: "from-destructive/20 to-destructive/5" },
];

function Gallery() {
  const { t } = useI18n();
  return (
    <div className="pb-10">
      <PageHeader eyebrow={t("nav.gallery")} title={t("gallery.title")} subtitle={t("gallery.subtitle")} />
      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_60px_-20px_var(--color-primary)]">
              <div className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${p.tone}`}>
                <Camera className="h-10 w-10 text-foreground/20" />
                <Badge variant="outline" className="absolute left-3 top-3 border-border/60 bg-background/80 text-[10px] uppercase tracking-wider text-foreground backdrop-blur-md">
                  {p.group}
                </Badge>
              </div>
              <div className="p-4">
                <div className="font-medium">{p.form}</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {p.date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    LAS
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
