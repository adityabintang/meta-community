import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi, EventFormData } from "@/lib/api/events";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await eventsApi.getAll({ depth: 1 });
      return res.docs;
    },
  });
}

export function usePublishedEvents() {
  return useQuery({
    queryKey: ["events", "published"],
    queryFn: async () => {
      const res = await eventsApi.getPublished();
      return res.docs;
    },
  });
}

export function useEvent(id: number | string | undefined) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => eventsApi.getById(id as number | string),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EventFormData) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EventFormData> }) =>
      eventsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => eventsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
