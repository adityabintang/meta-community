import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

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

export default function RecordingsCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recordingId = searchParams.get("id");
  const isEditMode = Boolean(recordingId);
  const token = localStorage.getItem("auth_token");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecording, setIsLoadingRecording] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    youtubeLink: "",
    description: "",
    category: "webinar",
    recordingDate: "",
    duration: "",
    speakersInput: "",
    thumbnail: "",
  });

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("auth_user");
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user || user.role !== "admin") {
        navigate("/dashboard/recordings");
      }
    } catch {
      navigate("/dashboard/recordings");
    }
  }, [navigate]);

  useEffect(() => {
    if (!recordingId) return;

    const loadRecording = async () => {
      setIsLoadingRecording(true);
      try {
        const res = await fetch(`${CMS_API}/recordings/${recordingId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error("Failed to load recording");
        }

        const data = await res.json();
        const doc = data.doc || {};
        setFormData({
          title: doc.title || "",
          youtubeLink: doc.youtubeLink || doc.youtube_link || "",
          description: doc.description || "",
          category: doc.category || "webinar",
          recordingDate: doc.recordingDate || doc.recording_date || doc.date || "",
          duration: doc.duration || doc.length || "",
          speakersInput: Array.isArray(doc.speakers)
            ? doc.speakers.join(", ")
            : typeof doc.speakers === "string"
              ? doc.speakers
              : "",
          thumbnail: doc.thumbnail || doc.image || doc.image_url || "",
        });
      } catch (error) {
        toast({
          title: "Failed to load recording",
          description: error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
        navigate("/dashboard/recordings");
      } finally {
        setIsLoadingRecording(false);
      }
    };

    loadRecording();
  }, [recordingId, navigate, token]);

  const previewVideoId = extractVideoId(formData.youtubeLink);
  const previewEmbedUrl = previewVideoId
    ? `https://www.youtube.com/embed/${previewVideoId}`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.youtubeLink.trim()) {
      toast({
        title: "Title and YouTube link are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        isEditMode ? `${CMS_API}/recordings/${recordingId}` : `${CMS_API}/recordings`,
        {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          youtubeLink: formData.youtubeLink,
          description: formData.description,
          category: formData.category,
          recordingDate: formData.recordingDate,
          duration: formData.duration,
          thumbnail: formData.thumbnail,
          speakers: formData.speakersInput
            .split(",")
            .map((speaker) => speaker.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        toast({ title: isEditMode ? "Recording updated successfully" : "Recording created successfully" });
        navigate("/dashboard/recordings");
      } else {
        toast({ title: isEditMode ? "Failed to update recording" : "Failed to create recording", variant: "destructive" });
      }
    } catch {
      toast({ title: isEditMode ? "Error updating recording" : "Error creating recording", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/recordings")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditMode ? "Edit Recording" : "Add Recording"}</h1>
          <p className="text-muted-foreground">
            {isEditMode ? "Update recording detail and YouTube preview" : "Create a recording with YouTube preview"}
          </p>
        </div>
      </div>

      {isLoadingRecording ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading recording data...
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recording Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Enter recording title"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="youtubeLink">YouTube Link</Label>
                  <Input
                    id="youtubeLink"
                    type="url"
                    value={formData.youtubeLink}
                    onChange={(e) =>
                      setFormData({ ...formData, youtubeLink: e.target.value })
                    }
                    placeholder="https://youtube.com/watch?v=..."
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={8}
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      placeholder="webinar / meetup / workshop"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="recordingDate">Recording Date</Label>
                    <Input
                      id="recordingDate"
                      type="date"
                      value={formData.recordingDate}
                      onChange={(e) =>
                        setFormData({ ...formData, recordingDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({ ...formData, duration: e.target.value })
                      }
                      placeholder="1h 45m"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="thumbnail">Thumbnail URL</Label>
                    <Input
                      id="thumbnail"
                      type="url"
                      value={formData.thumbnail}
                      onChange={(e) =>
                        setFormData({ ...formData, thumbnail: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="speakersInput">Speakers</Label>
                  <Input
                    id="speakersInput"
                    value={formData.speakersInput}
                    onChange={(e) =>
                      setFormData({ ...formData, speakersInput: e.target.value })
                    }
                    placeholder="Dr. A. Smith, J. Doe, K. Lee"
                  />
                  <p className="text-xs text-muted-foreground">Pisahkan dengan koma.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Video Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {previewEmbedUrl ? (
                  <div className="overflow-hidden rounded-lg border bg-muted">
                    <div className="aspect-video w-full">
                      <iframe
                        src={previewEmbedUrl}
                        title="YouTube preview"
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Paste a valid YouTube URL to see preview.
                  </div>
                )}

                {previewVideoId && (
                  <a
                    href={`https://youtu.be/${previewVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm text-blue-500 hover:underline"
                  >
                    <Play className="h-4 w-4" />
                    Open on YouTube
                  </a>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? "Save Recording" : "Add Recording"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
