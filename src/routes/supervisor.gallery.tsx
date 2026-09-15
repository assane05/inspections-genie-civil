import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Calendar, MapPin, ImageOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { api, type InspectionGalleryPhoto } from "@/lib/api-client";

export const Route = createFileRoute("/supervisor/gallery")({
  component: SupervisorGallery,

  head: () => ({
    meta: [
      {
        title: "Galerie photos — LAS Superviseur",
      },
      {
        name: "description",
        content: "Preuves photographiques des inspections du superviseur.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
});

function formatDate(value: string | null) {
  if (!value) {
    return "Date inconnue";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getPhotoUrl(photo: InspectionGalleryPhoto) {
  return photo.thumbUrl || photo.url;
}

function SupervisorGallery() {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<InspectionGalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGallery() {
      try {
        setLoading(true);
        setError("");

        const response = await api.inspectionGallery();

        if (!cancelled) {
          setPhotos(response.photos);
        }
      } catch (err) {
        console.error("Erreur chargement galerie :", err);

        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Impossible de charger la galerie.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadGallery();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.gallery")}
        title={t("gallery.title")}
        subtitle={t("gallery.subtitle")}
      />

      <div className="p-6 md:p-8">
        {loading && (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border/60 bg-card/60">
            <div className="text-center">
              <Camera className="mx-auto h-10 w-10 animate-pulse text-muted-foreground/50" />

              <p className="mt-4 text-sm text-muted-foreground">Chargement des photos...</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
            <p className="font-medium text-destructive">Impossible de charger la galerie</p>

            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && photos.length === 0 && (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40">
            <div className="text-center">
              <ImageOff className="mx-auto h-10 w-10 text-muted-foreground/40" />

              <p className="mt-4 font-medium">Aucune photo disponible</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Les photos de vos inspections apparaîtront ici après leur enregistrement.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && photos.length > 0 && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold">Photos d'inspection</h2>

                <p className="text-xs text-muted-foreground">
                  {photos.length} photo
                  {photos.length > 1 ? "s" : ""} disponible
                  {photos.length > 1 ? "s" : ""}
                </p>
              </div>

              <Badge variant="outline">{photos.length}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo) => {
                const imageUrl = getPhotoUrl(photo);

                return (
                  <Card
                    key={photo.id}
                    className="group overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_60px_-20px_var(--color-primary)]"
                  >
                    <div className="relative h-52 overflow-hidden bg-muted">
                      <img
                        src={imageUrl}
                        alt={photo.item.label}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />

                      <Badge
                        variant="outline"
                        className="absolute left-3 top-3 border-border/60 bg-background/80 text-[10px] uppercase tracking-wider text-foreground backdrop-blur-md"
                      >
                        {photo.group.name}
                      </Badge>

                      <Badge
                        variant="secondary"
                        className="absolute right-3 top-3 bg-background/80 backdrop-blur-md"
                      >
                        {photo.inspectionStatus === "verifie"
                          ? "Vérifiée"
                          : photo.inspectionStatus === "rejete"
                            ? "Rejetée"
                            : "Soumise"}
                      </Badge>
                    </div>

                    <CardContent className="p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{photo.formType.name}</p>

                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {photo.item.label}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />

                          {formatDate(photo.createdAt)}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          LAS
                        </span>
                      </div>

                      {photo.segment && (
                        <div className="mt-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {photo.segment.label}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
