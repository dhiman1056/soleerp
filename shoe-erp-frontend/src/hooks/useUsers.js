import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/userApi'

export const useUsersQuery = () => useQuery({
  queryKey: ['admin-users'],
  queryFn: api.fetchUsers,
})

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => qc.invalidateQueries(['admin-users'])
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.updateUser,
    onSuccess: () => qc.invalidateQueries(['admin-users'])
  })
}

export const useResetPassword = () => {
  return useMutation({ mutationFn: api.resetUserPassword })
}
