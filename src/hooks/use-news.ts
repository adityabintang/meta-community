import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { newsApi, NewsFormData } from "@/lib/api/news";

export function useNews() {
  return useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const res = await newsApi.getAll({ depth: 1 });
      return res;
    },
  });
}

export function usePublishedNews(page: number = 1, limit: number = 10, search = "") {
  return useQuery({
    queryKey: ["news", "published", page, limit, search],
    queryFn: () => newsApi.getPublished({ page, limit, search: search.trim() || undefined }),
  });
}

export function useNewsBySlug(slug: string) {
  return useQuery({
    queryKey: ["news", "slug", slug],
    queryFn: () => newsApi.getBySlug(slug),
    enabled: !!slug,
  });
}

export function useCreateNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewsFormData) => newsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });
}

export function useUpdateNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NewsFormData> }) =>
      newsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });
}

export function useDeleteNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => newsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });
}
