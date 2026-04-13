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

export interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  content?: any;
  thumbnail?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  ogImage?: (number | null) | Media;
  status: "draft" | "published";
  updatedAt?: string;
  createdAt?: string;
  created_at?: string;
}

export interface NewsFormData {
  title: string;
  slug: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  status?: "draft" | "published";
}

export const newsApi = {
  getAll(params?: PayloadQueryParams) {
    return apiClient.get<PayloadResponse<NewsArticle>>("/news", {
      sort: "-createdAt",
      ...params,
    });
  },

  getPublished(params?: PayloadQueryParams & { search?: string }) {
    return apiClient.get<PayloadResponse<NewsArticle>>("/news", {
      sort: "-createdAt",
      depth: 1,
      where: { status: { equals: "published" } },
      ...params,
    });
  },

  getBySlug(slug: string) {
    return apiClient.get<NewsArticle>(`/news/slug/${encodeURIComponent(slug)}`, { depth: 1 });
  },

  getById(id: number) {
    return apiClient.get<NewsArticle>(`/news/${id}`, { depth: 1 });
  },

  create(data: NewsFormData) {
    return apiClient.post<NewsArticle>("/news", data);
  },

  update(id: number, data: Partial<NewsFormData>) {
    return apiClient.patch<NewsArticle>(`/news/${id}`, data);
  },

  remove(id: number) {
    return apiClient.del<NewsArticle>(`/news/${id}`);
  },
};
