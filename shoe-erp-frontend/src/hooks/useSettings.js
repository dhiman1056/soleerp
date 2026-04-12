import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/settingsApi'

export const useSettingsGroupQuery = (group) => {
  return useQuery({
    queryKey: ['settings', group],
    queryFn: () => api.fetchSettingsGroup(group),
  })
}

export const useAllSettingsQuery = () => {
  return useQuery({
    queryKey: ['settings', 'all'],
    queryFn: api.fetchAllSettings,
  })
}

export const useUpdateSettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
    }
  })
}
