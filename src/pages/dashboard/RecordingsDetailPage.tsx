import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { recordingsApi, type Recording } from "@/lib/api/recordings";

function extractVideoId(url: string) {
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
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^?&/]+)/,
    );
    return match ? match[1] : null;
  }

  return null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RecordingsDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState<Recording | null>(null);

  useEffect(() => {
    if (!id) {
      navigate("/dashboard/recordings");
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await recordingsApi.getById(id);
        setRecording(data.doc || null);
      } catch {
        setRecording(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  const videoId = useMemo(() => extractVideoId(recording?.youtubeLink || ""), [recording?.youtubeLink]);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

  if (loading) {
    return <p className="text-muted-foreground">Loading recording...</p>;
  }

  if (!recording) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Recording not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/recordings")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Recording Detail</h1>
          <p className="text-muted-foreground">Watch recording in wider view</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-2xl">{recording.title}</CardTitle>
            <Badge variant="secondary">{recording.category || "General"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Date: {formatDate(recording.recordingDate)} • Duration: {recording.duration || "-"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {embedUrl ? (
            <div className="overflow-hidden rounded-lg border bg-black">
              <div className="aspect-video w-full">
                <iframe
                  src={embedUrl}
                  title={recording.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              <Play className="mx-auto mb-3 h-8 w-8" />
              Preview is unavailable for this URL.
            </div>
          )}

          {Array.isArray(recording.speakers) && recording.speakers.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Speakers</h3>
              <div className="flex flex-wrap gap-2">
                {recording.speakers.map((speaker) => (
                  <Badge key={speaker} variant="outline">
                    {speaker}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {recording.description && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Description</h3>
              <p className="whitespace-pre-wrap text-sm leading-6">{String(recording.description)}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button asChild>
              <a href={recording.youtubeLink} target="_blank" rel="noopener noreferrer">
                Open on YouTube
              </a>
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard/recordings")}>Back to List</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
