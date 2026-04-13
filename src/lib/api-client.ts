const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

export interface PayloadResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  page: number;
  nextPage: number | null;
  prevPage: number | null;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export interface PayloadQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  where?: Record<string, any>;
  depth?: number;
}

function getToken(): string | string | null {
  return localStorage.getItem("auth_token");
}

function buildQueryString(params: PayloadQueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.depth !== undefined) searchParams.set("depth", String(params.depth));
  if (params.where) searchParams.set("where", JSON.stringify(params.where));

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

function getHeaders(custom?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...custom,
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

export const apiClient = {
  async get<T>(path: string, params?: PayloadQueryParams): Promise<T> {
    const qs = params ? buildQueryString(params) : "";
    const response = await fetch(`${CMS_API}${path}${qs}`, {
      method: "GET",
      headers: getHeaders(),
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${CMS_API}${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, data: unknown): Promise<T> {
    const response = await fetch(`${CMS_API}${path}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async del<T>(path: string): Promise<T> {
    const response = await fetch(`${CMS_API}${path}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse<T>(response);
  },
};
