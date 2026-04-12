import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/sizeApi'

export const useSizesQuery = (params) => {
  return useQuery({
    queryKey: ['sizes', params],
    queryFn: () => api.fetchSizes(params),
  })
}

export const useCreateSize = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createSize,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sizes'] })
  })
}

export const useUpdateSize = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateSize(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sizes'] })
  })
}

export const useDeleteSize = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSize,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sizes'] })
  })
}
