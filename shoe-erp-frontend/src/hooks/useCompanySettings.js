import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

export function useCompanySettings() {
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ['settings', 'COMPANY'],
    queryFn: async () => {
      const res = await axiosInstance.get('/settings/COMPANY');
      return res.data.data || {};
    },
    staleTime: Infinity,
  });

  return {
    companyName: settings.company_name,
    address: settings.address,
    city: settings.city,
    gstin: settings.gstin,
    phone: settings.phone,
    email: settings.email,
    logoUrl: settings.logo_url,
    isLoading
  };
}
