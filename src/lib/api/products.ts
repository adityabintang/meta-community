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

export interface ProductScreenshot {
  image: number | Media;
  caption?: string | null;
  id?: string | null;
}

export interface Product {
  id: number | string;
  title: string;
  category?: string | null;
  description?: string | null;
  tags?: string[] | null;
  screenshots?: ProductScreenshot[] | null;
  owner?: number | { id: number; email: string; name?: string } | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  productLink?: string | null;
  demoLink?: string | null;
  technicalLead?: string | null;
  supportEmail?: string | null;
  status: "pending" | "approved" | "rejected";
  updatedAt?: string;
  createdAt?: string;
  created_at?: string;
}

interface ProductSingleResponse {
  doc: Product;
}

export interface ProductFormData {
  title: string;
  description?: string;
  productLink?: string;
  ownerName?: string;
  ownerEmail?: string;
  screenshots?: { image: string; caption?: string }[];
  status?: "pending" | "approved" | "rejected";
}

export const productsApi = {
  getAll(params?: PayloadQueryParams) {
    return apiClient.get<PayloadResponse<Product>>("/products", {
      sort: "-createdAt",
      ...params,
    });
  },

  getApproved(params?: PayloadQueryParams) {
    return apiClient.get<PayloadResponse<Product>>("/products", {
      sort: "-createdAt",
      depth: 1,
      where: { status: { equals: "approved" } },
      ...params,
    });
  },

  getById(id: number | string) {
    return apiClient
      .get<Product | ProductSingleResponse>(`/products/${id}`, { depth: 1 })
      .then((response) => ("doc" in response ? response.doc : response));
  },

  create(data: ProductFormData) {
    return apiClient.post<Product>("/products", data);
  },

  updateStatus(id: number, status: "pending" | "approved" | "rejected") {
    return apiClient.patch<Product>(`/products/${id}`, { status });
  },

  remove(id: number) {
    return apiClient.del<Product>(`/products/${id}`);
  },
};
