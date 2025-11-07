import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseApi } from '../services/supabase-api';
import { Product, Client, Material, ProductionBatch, Delivery } from '../types';

// Query Keys - Centralized for consistency
export const QUERY_KEYS = {
  PRODUCTS: 'products',
  CLIENTS: 'clients', 
  MATERIALS: 'materials',
  PRODUCTION_BATCHES: 'production_batches',
  DELIVERIES: 'deliveries',
  USER_PROFILE: 'user_profile'
} as const;

// Products Hooks
export function useProducts() {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCTS],
    queryFn: async () => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Products query timeout')), 8000)
      );
      try {
        return await Promise.race([supabaseApi.getProducts(), timeout]);
      } catch (error) {
        console.error('❌ Products query failed:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productData: Omit<Product, 'id'>) => supabaseApi.createProduct(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      supabaseApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => supabaseApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
    },
  });
}

// Clients Hooks
export function useClients() {
  return useQuery({
    queryKey: [QUERY_KEYS.CLIENTS],
    queryFn: async () => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Clients query timeout')), 8000)
      );
      try {
        return await Promise.race([supabaseApi.getClients(), timeout]);
      } catch (error) {
        console.error('❌ Clients query failed:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (clientData: Omit<Client, 'id'>) => supabaseApi.createClient(clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) => 
      supabaseApi.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => supabaseApi.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] });
    },
  });
}

// Materials Hooks
export function useMaterials() {
  return useQuery({
    queryKey: [QUERY_KEYS.MATERIALS],
    queryFn: async () => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Materials query timeout')), 8000)
      );
      try {
        return await Promise.race([supabaseApi.getMaterials(), timeout]);
      } catch (error) {
        console.error('❌ Materials query failed:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (materialData: Omit<Material, 'id'>) => supabaseApi.createMaterial(materialData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MATERIALS] });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Material> }) => 
      supabaseApi.updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MATERIALS] });
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => supabaseApi.deleteMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MATERIALS] });
    },
  });
}

// Production Batches Hooks
export function useProductionBatches() {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCTION_BATCHES],
    queryFn: async () => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Production batches query timeout')), 8000)
      );
      try {
        return await Promise.race([supabaseApi.getProductionBatches(), timeout]);
      } catch (error) {
        console.error('❌ Production batches query failed:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for production data
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateProductionBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (batchData: { productId: string; quantity: number; startDate: string; notes?: string }) => 
      supabaseApi.createProductionBatch(batchData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTION_BATCHES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] }); // May affect stock
    },
  });
}

export function useDeleteProductionBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => supabaseApi.deleteProductionBatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTION_BATCHES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
    },
  });
}

// Deliveries Hooks
export function useDeliveries() {
  return useQuery({
    queryKey: [QUERY_KEYS.DELIVERIES],
    queryFn: async () => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Deliveries query timeout')), 8000)
      );
      try {
        return await Promise.race([supabaseApi.getDeliveries(), timeout]);
      } catch (error) {
        console.error('❌ Deliveries query failed:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (deliveryData: { clientId: string; date: string; items: any[]; notes?: string }) => 
      supabaseApi.createDelivery(deliveryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DELIVERIES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] }); // May affect stock
    },
  });
}

export function useDeleteDelivery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => supabaseApi.deleteDelivery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DELIVERIES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
    },
  });
}

// Utility: Invalidate all data on auth changes
export function useInvalidateAllQueries() {
  const queryClient = useQueryClient();
  
  return () => {
    console.log('🔄 Invalidating all queries due to auth change');
    queryClient.invalidateQueries();
  };
}