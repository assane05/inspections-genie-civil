import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Camera, ImageOff, MapPin, Search, X } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useI18n } from "@/lib/i18n";
import { api, type InspectionGalleryPhoto } from "@/lib/api-client";

export const Route = createFileRoute("/gallery")({
  component: Gallery,
  head: () => ({
    meta: [
      { title: "Galerie photos — LAS Inspections" },
      {
        name: "description",
        content: "Preuves photographiques associées aux inspections.",
      },
    ],
  }),
});

function getPhotoUrl(photo: InspectionGalleryPhoto) {
  return photo.thumbUrl || photo.url;
}

function formatDate(date: string | null) {
  if (!date) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function getStatusLabel(status: InspectionGalleryPhoto["inspectionStatus"]) {
  switch (status) {
    case "soumis":
      return "Soumise";
    case "verifie":
      return "Vérifiée";
    case "rejete":
      return "Rejetée";
    default:
      return status;
  }
}

function getStatusVariant(status: InspectionGalleryPhoto["inspectionStatus"]) {
  switch (status) {
    case "verifie":
      return "default" as const;
    case "rejete":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function Gallery() {
  const { t } = useI18n();

  const [photos, setPhotos] = useState<InspectionGalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<InspectionGalleryPhoto | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGallery() {
      try {
        setLoading(true);
        setError(null);

        const response = await api.inspectionGallery();

        if (!cancelled) {
          setPhotos(response.photos);
        }
      } catch (err) {
        console.error("Erreur chargement galerie:", err);

        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Impossible de charger la galerie.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGallery();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPhotos = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return photos;

    return photos.filter((photo) => {
      return [
        photo.formType.name,
        photo.formType.code,
        photo.group.name,
        photo.item.label,
        photo.segment?.label,
        photo.ouvrage,
        photo.submittedBy?.displayName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [photos, search]);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.gallery")}
        title={t("gallery.title")}
        subtitle={t("gallery.subtitle")}
      />

      <div className="p-6 md:p-8">
        {/* Barre de recherche */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une photo, un groupe, un formulaire..."
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredPhotos.length} photo
            {filteredPhotos.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Chargement */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card/60"
              >
                <div className="h-48 animate-pulse bg-muted" />

                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Erreur */}
        {!loading && error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <ImageOff className="mx-auto mb-3 h-10 w-10 text-destructive/70" />

            <h3 className="font-semibold">Impossible de charger la galerie</h3>

            <p className="mt-2 text-sm text-muted-foreground">{error}</p>

            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Aucune photo */}
        {!loading && !error && filteredPhotos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Camera className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />

            <h3 className="font-semibold">
              {search ? "Aucune photo trouvée" : "Aucune photo disponible"}
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              {search
                ? "Essayez avec un autre terme de recherche."
                : "Les photos associées aux inspections apparaîtront ici."}
            </p>
          </div>
        )}

        {/* Galerie */}
        {!loading && !error && filteredPhotos.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPhotos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhoto(photo)}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card/60 text-left backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_60px_-20px_var(--color-primary)]"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-muted">
                  <img
                    src={getPhotoUrl(photo)}
                    alt={photo.item.label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  <Badge
                    variant={getStatusVariant(photo.inspectionStatus)}
                    className="absolute left-3 top-3 bg-background/85 backdrop-blur-md"
                  >
                    {getStatusLabel(photo.inspectionStatus)}
                  </Badge>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
                    <span className="text-xs font-medium text-white">{photo.group.name}</span>
                  </div>
                </div>

                {/* Informations */}
                <div className="p-4">
                  <div className="line-clamp-1 font-medium">{photo.formType.name}</div>

                  <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {photo.item.label}
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDate(photo.submittedAt || photo.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{photo.ouvrage || photo.group.name}</span>
                    </div>
                  </div>

                  {photo.submittedBy && (
                    <div className="mt-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                      Par{" "}
                      <span className="font-medium text-foreground">
                        {photo.submittedBy.displayName}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aperçu */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPhoto(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          {selectedPhoto && (
            <>
              <DialogHeader className="border-b px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle>{selectedPhoto.formType.name}</DialogTitle>

                    <p className="mt-1 text-sm text-muted-foreground">{selectedPhoto.item.label}</p>
                  </div>

                  <Badge variant={getStatusVariant(selectedPhoto.inspectionStatus)}>
                    {getStatusLabel(selectedPhoto.inspectionStatus)}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="grid max-h-[80vh] overflow-auto lg:grid-cols-[1fr_300px]">
                <div className="flex min-h-[400px] items-center justify-center bg-black/5 p-4">
                  <img
                    src={getPhotoUrl(selectedPhoto)}
                    alt={selectedPhoto.item.label}
                    className="max-h-[65vh] max-w-full rounded-lg object-contain"
                  />
                </div>

                <div className="border-l p-6">
                  <h3 className="mb-4 font-semibold">Informations</h3>

                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Groupe</div>
                      <div className="mt-1 font-medium">{selectedPhoto.group.name}</div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Formulaire</div>
                      <div className="mt-1 font-medium">{selectedPhoto.formType.name}</div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground">Élément contrôlé</div>
                      <div className="mt-1 font-medium">{selectedPhoto.item.label}</div>
                    </div>

                    {selectedPhoto.segment && (
                      <div>
                        <div className="text-xs text-muted-foreground">Segment</div>
                        <div className="mt-1 font-medium">{selectedPhoto.segment.label}</div>
                      </div>
                    )}

                    {selectedPhoto.ouvrage && (
                      <div>
                        <div className="text-xs text-muted-foreground">Ouvrage</div>
                        <div className="mt-1 font-medium">{selectedPhoto.ouvrage}</div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs text-muted-foreground">Date</div>
                      <div className="mt-1 font-medium">
                        {formatDate(selectedPhoto.submittedAt || selectedPhoto.createdAt)}
                      </div>
                    </div>

                    {selectedPhoto.submittedBy && (
                      <div>
                        <div className="text-xs text-muted-foreground">Superviseur</div>
                        <div className="mt-1 font-medium">
                          {selectedPhoto.submittedBy.displayName}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
