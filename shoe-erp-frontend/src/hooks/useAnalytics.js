import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

// All backends return { success: true, data: <payload> }.
// queryFn extracts res.data.data (the actual payload) — never the envelope.

export const useAnalyticsOverview = () => {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const res = await axiosInstance.get('/analytics/overview');
      return res.data?.data ?? {};
    },
    refetchInterval: 300000, // 5 minutes
  });
};

export const useProductionTrend = (period = '30d', group_by = 'day') => {
  return useQuery({
    queryKey: ['analytics', 'productionTrend', period, group_by],
    queryFn: async () => {
      const res = await axiosInstance.get('/analytics/production-trend', { params: { period, group_by } });
      return res.data?.data ?? {};
    },
  });
};

export const useMaterialConsumptionTrend = (period = '30d') => {
  return useQuery({
    queryKey: ['analytics', 'materialConsumptionTrend', period],
    queryFn: async () => {
      const res = await axiosInstance.get('/analytics/material-consumption-trend', { params: { period } });
      return res.data?.data ?? {};
    },
  });
};

export const useProductMix = (period = '30d') => {
  return useQuery({
    queryKey: ['analytics', 'productMix', period],
    queryFn: async () => {
      const res = await axiosInstance.get('/analytics/product-mix', { params: { period } });
      return res.data?.data ?? {};
    },
  });
};

export const useWipByAge = () => {
  return useQuery({
    queryKey: ['analytics', 'wipByAge'],
    queryFn: async () => {
      const res = await axiosInstance.get('/analytics/wip-by-age');
      return res.data?.data ?? {};
    },
  });
};

export const useSupplierPerformance = (period = '90d') => {
  return useQuery({
    queryKey: ['analytics', 'supplierPerformance', period],
    queryFn: async () => {
      const res = await axiosInstance.get('/analytics/supplier-performance', { params: { period } });
      return res.data?.data ?? {};
    },
  });
};
