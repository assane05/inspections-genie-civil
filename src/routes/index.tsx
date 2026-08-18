import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth, homeRouteFor } from "@/lib/auth";

import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";
import loginHero from "@/assets/login-hero.jpg";
import LogoLas from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connexion — LAS Inspections" },
      {
        name: "description",
        content:
          "Accédez à votre espace LAS Inspections pour piloter les inspections d'infrastructures horizontales.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const { login, user, ready, lastLogoutReason } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const t = (fr: string, en: string) => (lang === "fr" ? fr : en);

  useEffect(() => {
    if (ready && user) navigate({ to: homeRouteFor(user.role), replace: true });
  }, [ready, user, navigate]);

  const notice =
    lastLogoutReason === "idle"
      ? t(
          "Session fermée après 15 minutes d'inactivité. Merci de vous reconnecter.",
          "Session closed after 15 minutes of inactivity. Please sign in again.",
        )
      : lastLogoutReason === "expired"
        ? t(
            "Votre session a expiré. Merci de vous reconnecter.",
            "Your session expired. Please sign in again.",
          )
        : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t("Veuillez remplir tous les champs.", "Please fill in all fields."));
      return;
    }
    setLoading(true);
    try {
      const signedIn = await login(email, password);
      navigate({ to: homeRouteFor(signedIn.role), replace: true });
    } catch {
      setError(t("Identifiants invalides.", "Invalid credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden lg:flex">
          <img
            src={loginHero}
            alt="Aerial view of airport runway and taxiway infrastructure"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12">
            <div className="flex items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center text-primary-foreground">
                <img src={LogoLas} alt="" />
                {/* <Plane className="h-5 w-5" strokeWidth={2.5} /> */}
              </div>
              <div>
                <div className="font-display text-lg font-semibold tracking-tight text-white drop-shadow-sm">
                  LAS Inspections
                </div>
                {/* <div className="text-xs text-white/80 drop-shadow-sm">
                  {t("Infrastructures Horizontales", "Horizontal Infrastructures")}
                </div> */}
              </div>
            </div>

            <div className="text-xs text-white/80 drop-shadow-sm">
              © {new Date().getFullYear()} LAS ·{" "}
              {t("Tous droits réservés.", "All rights reserved.")}
            </div>
          </div>
        </aside>

        {/* Formulaire */}
        <section className="relative flex items-center justify-center p-6 sm:p-10">
          <div className="absolute right-6 top-6 flex items-center gap-1 rounded-full border border-border bg-card p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLang("fr")}
              className={`rounded-full px-3 py-1 transition-colors ${
                lang === "fr"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-full px-3 py-1 transition-colors ${
                lang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
          </div>

          <div className="w-full max-w-md">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {t("Bon Retour", "Welcome back")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  "Connectez-vous à votre espace pour continuer.",
                  "Sign in to your workspace to continue.",
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {t("Adresse e-mail professionnelle", "Work email address")}
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="prenom.nom@las.aero"
                    className="pl-9 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("Mot de passe", "Password")}</Label>
                  <Link to="/" className="text-xs font-medium text-primary hover:underline">
                    {t("Mot de passe oublié ?", "Forgot password?")}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9 pr-10 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? t("Masquer", "Hide") : t("Afficher", "Show")}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox id="remember" />
                  <span>{t("Rester connecté", "Keep me signed in")}</span>
                </label>
              </div>

              {notice && !error && (
                <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                  {notice}
                </div>
              )}

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("Connexion…", "Signing in…")}
                  </>
                ) : (
                  t("Se connecter", "Sign in")
                )}
              </Button>

              {/* <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t("ou", "or")}</span>
                </div>
              </div> */}

              {/* <p className="text-center text-xs text-muted-foreground">
                {t("Pas encore de compte ?", "No account yet?")}{" "}
                <a href="#" className="font-medium text-primary hover:underline">
                  {t("Contactez votre administrateur", "Contact your administrator")}
                </a>
              </p> */}
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
