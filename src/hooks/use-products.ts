import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi, ProductFormData } from "@/lib/api/products";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await productsApi.getAll({ depth: 1 });
      return res.docs;
    },
  });
}

export function useApprovedProducts() {
  return useQuery({
    queryKey: ["products", "approved"],
    queryFn: async () => {
      const res = await productsApi.getApproved();
      return res.docs;
    },
  });
}

export function useProduct(id: number | string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => productsApi.getById(id as number | string),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductFormData) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "pending" | "approved" | "rejected" }) =>
      productsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
