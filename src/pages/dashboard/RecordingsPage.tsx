import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Play, Pencil, Search, Download, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { recordingsApi, type Recording } from "@/lib/api/recordings";

export default function RecordingsPage() {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [speakerFilter, setSpeakerFilter] = useState("all");

  const getUserFromStorage = () => {
    try {
      const userStr = localStorage.getItem("auth_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const user = getUserFromStorage();
  const isAdmin = user?.role === "admin";

  const fetchRecordings = async () => {
    try {
      const data = await recordingsApi.getAll({ limit: 200 });
      setRecordings(data.docs || []);
    } catch (error) {
      console.error("Failed to fetch recordings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const handleDelete = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this recording?")) return;

    setDeletingId(id);
    try {
      await recordingsApi.remove(id);
      toast({ title: "Recording deleted successfully" });
      await fetchRecordings();
    } catch (error) {
      console.error("Failed to delete recording:", error);
      toast({
        title: "Error deleting recording",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const extractVideoId = (url: string) => {
    if (!url) return null;

    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname.includes("youtu.be")) {
        return parsedUrl.pathname.split("/").filter(Boolean)[0] || null;
      }

      if (parsedUrl.hostname.includes("youtube.com")) {
        if (parsedUrl.pathname === "/watch") {
          return parsedUrl.searchParams.get("v");
        }

        const segments = parsedUrl.pathname.split("/").filter(Boolean);
        return segments[1] || segments[0] || null;
      }
    } catch {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^?&/]+)/);
      return match ? match[1] : null;
    }

    return null;
  };

  const getThumbnail = (recording: Recording) => {
    if (recording.thumbnail) {
      return recording.thumbnail;
    }

    const videoId = extractVideoId(recording.youtubeLink);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }

    return "https://placehold.co/800x450?text=No+Preview";
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Unknown date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const normalizeSpeakers = (speakers?: string[] | null) => {
    if (!Array.isArray(speakers)) return [];
    return speakers.map((speaker) => speaker.trim()).filter(Boolean);
  };

  const allCategories = useMemo(() => {
    return Array.from(
      new Set(
        recordings
          .map((recording) => recording.category || "General")
          .map((category) => category.trim())
          .filter(Boolean),
      ),
    );
  }, [recordings]);

  const allDates = useMemo(() => {
    return Array.from(
      new Set(recordings.map((recording) => recording.recordingDate).filter(Boolean) as string[]),
    );
  }, [recordings]);

  const allSpeakers = useMemo(() => {
    const list = recordings.flatMap((recording) => normalizeSpeakers(recording.speakers));
    return Array.from(new Set(list));
  }, [recordings]);

  const filteredRecordings = useMemo(() => {
    return recordings.filter((recording) => {
      const categoryValue = (recording.category || "General").toLowerCase();
      const titleValue = (recording.title || "").toLowerCase();
      const descriptionValue = String(recording.description || "").toLowerCase();
      const speakers = normalizeSpeakers(recording.speakers);

      const matchSearch =
        !search ||
        titleValue.includes(search.toLowerCase()) ||
        descriptionValue.includes(search.toLowerCase()) ||
        speakers.some((speaker) => speaker.toLowerCase().includes(search.toLowerCase()));

      const matchDate = dateFilter === "all" || (recording.recordingDate || "") === dateFilter;
      const matchCategory =
        categoryFilter === "all" || categoryValue === categoryFilter.toLowerCase();
      const matchSpeaker =
        speakerFilter === "all" || speakers.some((speaker) => speaker === speakerFilter);

      return matchSearch && matchDate && matchCategory && matchSpeaker;
    });
  }, [recordings, search, dateFilter, categoryFilter, speakerFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recordings</h1>
          <p className="text-muted-foreground">{isAdmin ? "Manage recordings" : "View recordings"}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate("/dashboard/recordings/create")}>
            <Plus className="mr-2" size={18} />
            Add Recording
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            placeholder="Search recordings..."
          />
        </div>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">Filter by Date</option>
          {allDates.map((date) => (
            <option key={date} value={date}>
              {formatDate(date)}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">Filter by Category</option>
          {allCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={speakerFilter}
          onChange={(e) => setSpeakerFilter(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">Filter by Speaker</option>
          {allSpeakers.map((speaker) => (
            <option key={speaker} value={speaker}>
              {speaker}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filteredRecordings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No recordings match your filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredRecordings.map((recording) => {
            const speakers = normalizeSpeakers(recording.speakers);
            return (
              <Card
                key={recording.id}
                className="cursor-pointer border transition-shadow hover:shadow-md"
                onClick={() => navigate(`/dashboard/recordings/${recording.id}`)}
              >
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
                    <div className="relative overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={getThumbnail(recording)}
                        alt={recording.title}
                        className="aspect-video h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="rounded-full bg-black/55 p-3 text-white">
                          <Play className="h-6 w-6 fill-current" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="line-clamp-2 text-3xl font-bold tracking-tight md:text-4xl">
                          {recording.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Date: {formatDate(recording.recordingDate)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {recording.duration || "-"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {speakers.slice(0, 4).map((speaker) => (
                          <div key={speaker} className="flex items-center gap-2 text-sm">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {speaker
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{speaker}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <a
                          href={recording.youtubeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                        >
                          <Play className="h-4 w-4" />
                          Watch on YouTube
                        </a>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(recording.youtubeLink, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await navigator.clipboard.writeText(recording.youtubeLink);
                                toast({ title: "Link copied" });
                              } catch {
                                toast({ title: "Failed to copy link", variant: "destructive" });
                              }
                            }}
                          >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </Button>

                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/dashboard/recordings/create?id=${encodeURIComponent(String(recording.id))}`,
                                  );
                                }}
                              >
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={deletingId === recording.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(recording.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
