import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recordingsApi, RecordingFormData } from "@/lib/api/recordings";

export function useRecordings() {
  return useQuery({
    queryKey: ["recordings"],
    queryFn: async () => {
      const res = await recordingsApi.getAll();
      return res.docs;
    },
  });
}

export function useRecording(id: number) {
  return useQuery({
    queryKey: ["recordings", id],
    queryFn: () => recordingsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordingFormData) => recordingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
    },
  });
}

export function useUpdateRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecordingFormData> }) =>
      recordingsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
    },
  });
}

export function useDeleteRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => recordingsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
    },
  });
}
