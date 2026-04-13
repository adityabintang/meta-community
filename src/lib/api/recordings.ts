import { apiClient, PayloadResponse, PayloadQueryParams } from "@/lib/api-client";

export interface Recording {
  id: string | number;
  title: string;
  youtubeLink: string;
  description: any;
  category?: string;
  speakers?: string[];
  duration?: string;
  recordingDate?: string | null;
  thumbnail?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface RecordingFormData {
  title: string;
  youtubeLink: string;
  description?: string;
  category?: string;
  speakers?: string[];
  duration?: string;
  recordingDate?: string;
  thumbnail?: string;
}

export interface RecordingSingleResponse {
  doc: Recording;
}

export const recordingsApi = {
  getAll(params?: PayloadQueryParams) {
    return apiClient.get<PayloadResponse<Recording>>("/recordings", {
      sort: "-createdAt",
      ...params,
    });
  },

  getById(id: string | number) {
    return apiClient.get<RecordingSingleResponse>(`/recordings/${id}`);
  },

  create(data: RecordingFormData) {
    return apiClient.post<Recording>("/recordings", data);
  },

  update(id: string | number, data: Partial<RecordingFormData>) {
    return apiClient.patch<Recording>(`/recordings/${id}`, data);
  },

  remove(id: string | number) {
    return apiClient.del<Recording>(`/recordings/${id}`);
  },
};
