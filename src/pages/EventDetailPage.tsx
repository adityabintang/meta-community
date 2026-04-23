import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Calendar, Clock, Clock3, Eye, ExternalLink, Heart, Link2, Mail, MapPin, User } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useEvent } from "@/hooks/use-events";
import type { Event } from "@/lib/api/events";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

type EventRegistration = {
  name: string;
  email: string | null;
  isAnonymous: boolean;
  createdAt: string;
};

function getMediaUrl(media: unknown): string | null {
  if (!media) return null;

  if (typeof media === "string") {
    const trimmed = media.trim();
    return trimmed || null;
  }

  if (typeof media === "object") {
    const typedMedia = media as { url?: unknown; thumbnailURL?: unknown };
    if (typeof typedMedia.url === "string" && typedMedia.url.trim()) {
      return typedMedia.url;
    }
    if (typeof typedMedia.thumbnailURL === "string" && typedMedia.thumbnailURL.trim()) {
      return typedMedia.thumbnailURL;
    }
  }

  return null;
}

function formatDate(value?: string | null, locale = "id-ID") {
  if (!value) return "Tanggal belum tersedia";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(event: Event) {
  const startAt = event.startAt || event.date;
  const endAt = event.endAt;

  if (!startAt) return "Waktu belum tersedia";

  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return startAt;

  const startText = start.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!endAt) return startText;

  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) return startText;

  const endText = end.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${startText} - ${endText}`;
}

function extractDescription(description: unknown): string {
  if (!description) return "Deskripsi event belum tersedia.";

  if (typeof description === "string") {
    return description
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim() || "Deskripsi event belum tersedia.";
  }

  return "Deskripsi event belum tersedia.";
}

function isUrlText(value?: string | null) {
  if (!value || typeof value !== "string") return false;
  return /^https?:\/\//i.test(value.trim());
}

export default function EventDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { data: event, isLoading, error } = useEvent(id);
  const token = localStorage.getItem("auth_token");
  const authUser = (() => {
    try {
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [views, setViews] = useState(0);

  const coverImage = event ? getMediaUrl(event.thumbnail || event.image) : null;
  const registerUrl = event?.locationLink || event?.embedLink || "";
  const rawLocationText = (event?.location || event?.locationLink || "").trim();
  const shouldHideLocationLink = !registered && isUrlText(rawLocationText);
  const displayedLocation = shouldHideLocationLink
    ? "Link meeting akan muncul setelah registrasi"
    : rawLocationText || "Online";
  const createdDate = formatDate(event?.createdAt || event?.created_at);
  const updatedDate = formatDate(event?.updatedAt);
  const creatorName = event?.ownerName || "Community Creator";
  const creatorEmail = event?.ownerEmail || "-";
  const authEmail = typeof authUser?.email === "string" ? authUser.email.trim().toLowerCase() : "";
  const ownerEmails = [
    (event as Event & Record<string, unknown> | undefined)?.ownerEmail,
    (event as Event & Record<string, unknown> | undefined)?.owner_email,
    (event as Event & Record<string, unknown> | undefined)?.authorEmail,
    (event as Event & Record<string, unknown> | undefined)?.author_email,
    (event as Event & Record<string, unknown> | undefined)?.createdByEmail,
    (event as Event & Record<string, unknown> | undefined)?.created_by_email,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());
  const canViewStats = Boolean(authEmail && ownerEmails.includes(authEmail));
  const isUpcoming = (() => {
    const eventTime = new Date(event?.startAt || event?.date || "").getTime();
    return Number.isFinite(eventTime) ? eventTime >= Date.now() : false;
  })();
  const stats = useMemo(
    () => [
      { label: "Views", value: views.toLocaleString("id-ID"), icon: Eye },
      { label: "Status", value: isUpcoming ? "Upcoming" : "Completed", icon: Clock3 },
      { label: "Going", value: registrations.length.toLocaleString("id-ID"), icon: Link2 },
      { label: "Updated", value: updatedDate === "-" ? createdDate : updatedDate, icon: BarChart3 },
    ],
    [createdDate, isUpcoming, registrations.length, updatedDate, views],
  );

  useEffect(() => {
    if (!event?.id) return;
    const storageKey = `event:views:${event.id}`;
    const current = Number(localStorage.getItem(storageKey) || "0");
    const next = Number.isFinite(current) ? current + 1 : 1;
    localStorage.setItem(storageKey, String(next));
    setViews(next);
  }, [event?.id]);

  useEffect(() => {
    if (!event?.id) return;

    const fetchEngagement = async () => {
      try {
        const [likesRes, registrationsRes] = await Promise.all([
          fetch(`${CMS_API}/events/${event.id}/likes`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(`${CMS_API}/events/${event.id}/registrations`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        if (likesRes.ok) {
          const likesData = await likesRes.json();
          setLikes(Number(likesData.total || 0));
          setLiked(Boolean(likesData.liked));
        }

        if (registrationsRes.ok) {
          const registrationsData = await registrationsRes.json();
          setRegistrations(registrationsData.registrations || []);
          setRegistered(Boolean(registrationsData.registered));
        }
      } catch {
        // Keep page usable if engagement fetch fails.
      }
    };

    fetchEngagement();
  }, [event?.id, token]);

  const handleLike = async () => {
    if (!event?.id) return;
    try {
      const res = await fetch(`${CMS_API}/events/${event.id}/likes`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to like event");
      }

      const data = await res.json();
      setLiked(Boolean(data.liked));
      setLikes(Number(data.total || 0));
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to like",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async () => {
    if (!event?.id) return;

    if (!token || !authUser) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    setRegistering(true);

    try {
      const fullName = typeof authUser?.name === "string" ? authUser.name.trim() : "";
      const res = await fetch(`${CMS_API}/events/${event.id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fullName: fullName || null }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Gagal registrasi event");
      }

      setRegistered(true);
      toast({ title: data?.message || "Registrasi berhasil" });

      const registrationsRes = await fetch(`${CMS_API}/events/${event.id}/registrations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (registrationsRes.ok) {
        const registrationsData = await registrationsRes.json();
        setRegistrations(registrationsData.registrations || []);
        setRegistered(Boolean(registrationsData.registered));
      }
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Gagal registrasi event",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <Link
            to="/event"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Event
          </Link>

          {!id ? <p className="text-sm text-red-500">ID event tidak valid.</p> : null}

          {isLoading && <p className="text-muted-foreground">Memuat detail event...</p>}

          {!isLoading && error && (
            <p className="text-sm text-red-500">
              {error instanceof Error ? error.message : "Gagal memuat detail event."}
            </p>
          )}

          {!isLoading && !error && event && (
            <div className="grid lg:grid-cols-3 gap-6">
              <article className="lg:col-span-2 rounded-2xl border border-border/50 bg-card shadow-card overflow-hidden">
                <div className="h-64 md:h-96 bg-secondary/40 overflow-hidden">
                  {coverImage ? (
                    <img src={coverImage} alt={event.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 via-card to-accent/10" />
                  )}
                </div>

                <div className="p-6 md:p-8">
                  <h1 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-5">
                    {event.title}
                  </h1>

                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    <div className="rounded-lg border border-border/50 bg-background/50 p-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.startAt || event.date || event.createdAt)}</span>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/50 p-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatTimeRange(event)}</span>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/50 p-3 text-sm text-muted-foreground flex items-center gap-2 sm:col-span-2">
                      <MapPin className="w-4 h-4" />
                      <span>{displayedLocation}</span>
                    </div>
                  </div>

                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line mb-6">
                    {extractDescription(event.description)}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button variant={liked ? "default" : "outline"} onClick={handleLike} className="gap-2">
                      <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                      {likes} Likes
                    </Button>

                    {!registered ? (
                      <Button onClick={handleRegister} disabled={registering || !registerUrl || !isUpcoming}>
                        {!isUpcoming ? "Registrasi Ditutup" : registering ? "Memproses..." : "Registrasi Event"}
                      </Button>
                    ) : null}

                    {registered && registerUrl ? (
                      <Button asChild>
                        <a href={registerUrl} target="_blank" rel="noopener noreferrer">
                          Buka Link Event
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    ) : null}

                    {registered && event.embedLink && event.embedLink !== registerUrl ? (
                      <Button asChild variant="outline">
                        <a href={event.embedLink} target="_blank" rel="noopener noreferrer">
                          Buka Link Embed
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>

              <aside className="space-y-4 lg:sticky lg:top-28 self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
                {canViewStats ? (
                  <section className="rounded-xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                    <h2 className="text-sm font-semibold text-foreground mb-3">Creator Profile</h2>
                    <div className="flex items-center gap-2 text-sm text-foreground mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{creatorName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Mail className="w-4 h-4" />
                      <span>{creatorEmail}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Published: {createdDate}</p>
                  </section>
                ) : null}

                {canViewStats ? (
                  <section className="rounded-xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                    <h2 className="text-sm font-semibold text-foreground mb-3">Stats</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <div key={stat.label} className="rounded-lg border border-border/50 bg-background/50 p-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <Icon className="w-3.5 h-3.5" />
                              {stat.label}
                            </div>
                            <p className="text-sm font-semibold text-foreground truncate">{stat.value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {canViewStats ? (
                  <section className="rounded-xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                    <h2 className="text-sm font-semibold text-foreground mb-3">
                      Registrants ({registrations.length})
                    </h2>

                    {registrations.length > 0 ? (
                      <>
                        <div className="flex items-center -space-x-2 mb-3">
                          {registrations.slice(0, 6).map((person, index) => (
                            <div
                              key={`${person.name}-${index}`}
                              className="w-8 h-8 rounded-full border-2 border-background bg-secondary text-foreground text-xs font-semibold flex items-center justify-center"
                              title={person.name}
                            >
                              {(person.name || "A").slice(0, 1).toUpperCase()}
                            </div>
                          ))}

                          {registrations.length > 6 ? (
                            <span
                              className="w-8 h-8 rounded-full border-2 border-background bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center"
                              title={`${registrations.length - 6} peserta lainnya`}
                            >
                              +{registrations.length - 6}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">Arahkan kursor ke icon profile untuk melihat username.</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Belum ada peserta yang registrasi.</p>
                    )}
                  </section>
                ) : null}
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
