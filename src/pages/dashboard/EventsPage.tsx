import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

type LocationType = "zoom" | "google_meet" | "custom";

interface Event {
  id: string | number;
  title: string;
  category?: string;
  description?: string;
  date?: string;
  startAt?: string;
  endAt?: string;
  location?: string;
  locationType?: LocationType;
  locationLink?: string;
  thumbnail?: string | null;
  status: "draft" | "published";
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | number | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [sourceLink, setSourceLink] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    category: "general",
    thumbnail: "",
    description: "",
    startAt: "",
    endAt: "",
    locationType: "zoom" as LocationType,
    locationLink: "",
    status: "draft" as "draft" | "published",
  });

  const token = localStorage.getItem("auth_token");

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${CMS_API}/events`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setEvents(data.docs || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const validateLocationByType = (locationType: LocationType, locationLink: string) => {
    const link = locationLink.trim();
    if (!link) return false;

    try {
      const parsed = new URL(link);
      const host = parsed.hostname.toLowerCase();

      if (locationType === "zoom") {
        return host.includes("zoom.us") || host.includes("zoom.com");
      }

      if (locationType === "google_meet") {
        return host.includes("meet.google.com");
      }

      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  const handleThumbnailSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingThumbnail(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, thumbnail: data.url }));
      toast({ title: "Thumbnail uploaded successfully" });
    } catch {
      toast({ title: "Failed to upload thumbnail", variant: "destructive" });
    } finally {
      setIsUploadingThumbnail(false);
      event.target.value = "";
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      category: "general",
      thumbnail: "",
      description: "",
      startAt: "",
      endAt: "",
      locationType: "zoom",
      locationLink: "",
      status: "draft",
    });
    setSourceLink("");
    setEditingEventId(null);
  };

  const toDateTimeLocalValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const pad = (input: number) => String(input).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    const normalized = value.replace(" ", "T").trim();
    if (normalized.includes("T") && normalized.length >= 16) {
      return normalized.slice(0, 16);
    }

    if (normalized.length >= 10) {
      return `${normalized.slice(0, 10)}T00:00`;
    }

    return "";
  };

  const handleScrapeEventInfo = async () => {
    const url = sourceLink.trim();
    if (!url) {
      toast({ title: "Event source URL is required", variant: "destructive" });
      return;
    }

    try {
      new URL(url);
    } catch {
      toast({ title: "Invalid source URL", variant: "destructive" });
      return;
    }

    setIsScraping(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${CMS_API}/events/scrape`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.message || "Failed to scrape event details");
      }

      const data = payload?.data || {};
      setFormData((prev) => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        startAt: data.startAt ? toDateTimeLocalValue(data.startAt) : prev.startAt,
        endAt: data.endAt ? toDateTimeLocalValue(data.endAt) : prev.endAt,
        thumbnail: data.thumbnail || prev.thumbnail,
      }));

      toast({ title: "Event info imported" });
    } catch (error) {
      toast({
        title: "Failed to import event info",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  const inferLocationType = (event: Event): LocationType => {
    if (event.locationType === "zoom" || event.locationType === "google_meet" || event.locationType === "custom") {
      return event.locationType;
    }
    const link = event.locationLink || "";
    if (link.includes("zoom.")) return "zoom";
    if (link.includes("meet.google.com")) return "google_meet";
    return "custom";
  };

  const handleEdit = (event: Event) => {
    setEditingEventId(event.id);
    setFormData({
      title: event.title || "",
      category: event.category || "general",
      thumbnail: event.thumbnail || "",
      description: event.description || "",
      startAt: toDateTimeLocalValue(event.startAt || event.date),
      endAt: toDateTimeLocalValue(event.endAt),
      locationType: inferLocationType(event),
      locationLink: event.locationLink || event.location || "",
      status: event.status || "draft",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({ title: "Event name is required", variant: "destructive" });
      return;
    }

    if (!formData.startAt || !formData.endAt) {
      toast({ title: "Start and end date/time are required", variant: "destructive" });
      return;
    }

    if (new Date(formData.endAt).getTime() < new Date(formData.startAt).getTime()) {
      toast({ title: "End time must be after start time", variant: "destructive" });
      return;
    }

    if (!validateLocationByType(formData.locationType, formData.locationLink)) {
      toast({
        title: "Invalid event location link",
        description:
          formData.locationType === "zoom"
            ? "Please paste a valid Zoom link"
            : formData.locationType === "google_meet"
              ? "Please paste a valid Google Meet link"
              : "Please paste a valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const isEditMode = editingEventId !== null;
      const res = await fetch(
        isEditMode ? `${CMS_API}/events/${editingEventId}` : `${CMS_API}/events`,
        {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          thumbnail: formData.thumbnail,
          description: formData.description,
          startAt: formData.startAt,
          endAt: formData.endAt,
          locationType: formData.locationType,
          locationLink: formData.locationLink,
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to save event" }));
        throw new Error(error.message || "Failed to save event");
      }

      toast({ title: isEditMode ? "Event updated successfully" : "Event created successfully" });
      setDialogOpen(false);
      resetForm();
      await fetchEvents();
    } catch (error) {
      toast({
        title: editingEventId !== null ? "Error updating event" : "Error creating event",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`${CMS_API}/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Event deleted" });
        fetchEvents();
      }
    } catch {
      toast({ title: "Error deleting event", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">Manage your events</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2" size={18} />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingEventId !== null ? "Edit Event" : "Create New Event"}</DialogTitle>
                <DialogDescription>
                  Upload thumbnail, set event schedule, choose Zoom/Google Meet location, and add description.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="sourceLink">Import from Event URL</Label>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      id="sourceLink"
                      type="url"
                      value={sourceLink}
                      onChange={(e) => setSourceLink(e.target.value)}
                      placeholder="Paste an event link"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isScraping}
                      onClick={handleScrapeEventInfo}
                      className="md:w-52"
                    >
                      {isScraping ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Mengambil...
                        </>
                      ) : (
                        "Tampilkan informasi"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports popular event pages like Luma, Eventbrite, and Meetup.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Thumbnail</Label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelected}
                        className="hidden"
                      />
                      <Button type="button" variant="outline" disabled={isUploadingThumbnail} asChild>
                        <span>
                          {isUploadingThumbnail ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Thumbnail
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    {formData.thumbnail ? (
                      <img
                        src={formData.thumbnail}
                        alt="Event thumbnail"
                        className="h-14 w-24 rounded-md border object-cover"
                      />
                    ) : (
                      <div className="h-14 w-24 rounded-md border border-dashed bg-muted" />
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title">Event Name</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Event Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="webinar">Webinar</SelectItem>
                      <SelectItem value="meetup">Meetup</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="launch">Launch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startAt">Start Date & Time</Label>
                    <Input
                      id="startAt"
                      type="datetime-local"
                      value={formData.startAt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, startAt: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endAt">End Date & Time</Label>
                    <Input
                      id="endAt"
                      type="datetime-local"
                      value={formData.endAt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endAt: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="locationType">Event Location</Label>
                    <Select
                      value={formData.locationType}
                      onValueChange={(value: LocationType) =>
                        setFormData((prev) => ({ ...prev, locationType: value }))
                      }
                    >
                      <SelectTrigger id="locationType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                        <SelectItem value="custom">Paste Link (other)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="locationLink">Meeting Link</Label>
                    <Input
                      id="locationLink"
                      type="url"
                      value={formData.locationLink}
                      onChange={(e) => setFormData((prev) => ({ ...prev, locationLink: e.target.value }))}
                      placeholder={
                        formData.locationType === "zoom"
                          ? "https://zoom.us/j/..."
                          : formData.locationType === "google_meet"
                            ? "https://meet.google.com/..."
                            : "https://..."
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Add Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "draft" | "published") =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting || isUploadingThumbnail}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingEventId !== null ? "Save Event" : "Create Event"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground">No events yet. Create your first event!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {event.thumbnail ? (
                        <img
                          src={event.thumbnail}
                          alt={event.title}
                          className="h-12 w-20 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="h-12 w-20 rounded-md border bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.category || "general"}</Badge>
                    </TableCell>
                    <TableCell>
                      {event.startAt
                        ? `${new Date(event.startAt).toLocaleString()}${
                            event.endAt ? ` - ${new Date(event.endAt).toLocaleString()}` : ""
                          }`
                        : event.date
                          ? new Date(event.date).toLocaleDateString()
                          : "-"}
                    </TableCell>
                    <TableCell>
                      {event.locationLink ? (
                        <a
                          href={event.locationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {event.locationType === "zoom"
                            ? "Zoom"
                            : event.locationType === "google_meet"
                              ? "Google Meet"
                              : "Open Link"}
                        </a>
                      ) : (
                        event.location || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.status === "published" ? "default" : "secondary"}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
