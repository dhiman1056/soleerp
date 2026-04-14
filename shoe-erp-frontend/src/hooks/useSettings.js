import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'

// ─── All settings (grouped by key) ──────────────────────────────────────────
// Returns: { COMPANY: { ... }, FINANCIAL: { ... }, ... }
export const useAllSettingsQuery = () => {
  return useQuery({
    queryKey: ['settings', 'all'],
    queryFn: async () => {
      const res = await api.get('/settings')
      return res.data?.data ?? {}
    },
  })
}

// ─── Single group settings ────────────────────────────────────────────────────
// Returns: { setting_key: { setting_key, setting_value, description } }
export const useSettingsGroupQuery = (group) => {
  return useQuery({
    queryKey: ['settings', group],
    queryFn: async () => {
      const res = await api.get(`/settings/${group}`)
      return res.data?.data ?? {}
    },
    enabled: !!group,
  })
}

// ─── Update settings ─────────────────────────────────────────────────────────
export const useUpdateSettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates) => api.put('/settings', { updates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}
