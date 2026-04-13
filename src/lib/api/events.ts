import { apiClient, PayloadResponse, PayloadQueryParams } from "@/lib/api-client";

export interface Media {
  id: number;
  alt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface Event {
  id: number | string;
  title: string;
  category?: string;
  description?: any;
  date?: string;
  startAt?: string;
  endAt?: string;
  location?: string | null;
  locationType?: "zoom" | "google_meet" | "custom" | "link";
  locationLink?: string | null;
  thumbnail?: string | null;
  embedLink?: string | null;
  isEmbedOnly?: boolean;
  image?: (number | null) | Media;
  ownerName?: string | null;
  ownerEmail?: string | null;
  status: "draft" | "published";
  updatedAt?: string;
  createdAt?: string;
  created_at?: string;
}

interface EventSingleResponse {
  doc: Event;
}

export interface EventFormData {
  title: string;
  category?: string;
  description?: string;
  date?: string;
  startAt?: string;
  endAt?: string;
  location?: string;
  locationType?: "zoom" | "google_meet" | "custom" | "link";
  locationLink?: string;
  thumbnail?: string;
  embedLink?: string;
  embeddedEventLink?: string;
  isEmbedOnly?: boolean;
  status?: "draft" | "published";
}

export const eventsApi = {
  getAll(params?: PayloadQueryParams) {
    return apiClient.get<PayloadResponse<Event>>("/events", {
      sort: "-createdAt",
      ...params,
    });
  },

  getPublished(params?: PayloadQueryParams) {
    return apiClient.get<PayloadResponse<Event>>("/events", {
      sort: "-date",
      depth: 1,
      where: { status: { equals: "published" } },
      ...params,
    });
  },

  getById(id: number | string) {
    return apiClient
      .get<Event | EventSingleResponse>(`/events/${id}`, { depth: 1 })
      .then((response) => ("doc" in response ? response.doc : response));
  },

  create(data: EventFormData) {
    return apiClient.post<Event>("/events", data);
  },

  update(id: number, data: Partial<EventFormData>) {
    return apiClient.patch<Event>(`/events/${id}`, data);
  },

  remove(id: number) {
    return apiClient.del<Event>(`/events/${id}`);
  },
};
