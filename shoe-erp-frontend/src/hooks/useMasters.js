import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axiosInstance'
import toast from 'react-hot-toast'

// ── UOMs ──────────────────────────────────────────────────────────────────────
export const useUOMs = () =>
  useQuery({
    queryKey: ['masters', 'uom'],
    queryFn: async () => {
      const res = await api.get('/masters/uom')
      return res.data?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

// ── Brands ────────────────────────────────────────────────────────────────────
export const useBrands = (all = false) =>
  useQuery({
    queryKey: ['masters', 'brands', all],
    queryFn: async () => {
      const res = await api.get('/masters/brands', { params: all ? { all: 'true' } : {} })
      return res.data?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

export const useCreateBrand = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/masters/brands', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'brands'] })
      toast.success('Brand created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useUpdateBrand = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/masters/brands/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'brands'] })
      toast.success('Brand updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Categories ────────────────────────────────────────────────────────────────
export const useCategories = (all = false) =>
  useQuery({
    queryKey: ['masters', 'categories', all],
    queryFn: async () => {
      const res = await api.get('/masters/categories', { params: all ? { all: 'true' } : {} })
      return res.data?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

export const useCreateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/masters/categories', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'categories'] })
      toast.success('Category created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useUpdateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/masters/categories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'categories'] })
      toast.success('Category updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Sub-Categories ────────────────────────────────────────────────────────────
export const useSubCategories = (categoryId) =>
  useQuery({
    queryKey: ['masters', 'sub-categories', categoryId],
    queryFn: async () => {
      const params = {}
      if (categoryId) params.category_id = categoryId
      const res = await api.get('/masters/sub-categories', { params })
      return res.data?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

export const useCreateSubCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/masters/sub-categories', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'sub-categories'] })
      toast.success('Sub-category created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useUpdateSubCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/masters/sub-categories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'sub-categories'] })
      toast.success('Sub-category updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Designs ───────────────────────────────────────────────────────────────────
export const useDesigns = (all = false) =>
  useQuery({
    queryKey: ['masters', 'designs', all],
    queryFn: async () => {
      const res = await api.get('/masters/designs', { params: all ? { all: 'true' } : {} })
      return res.data?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

export const useCreateDesign = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/masters/designs', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'designs'] })
      toast.success('Design created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useUpdateDesign = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/masters/designs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'designs'] })
      toast.success('Design updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Colors ────────────────────────────────────────────────────────────────────
export const useColors = (all = false) =>
  useQuery({
    queryKey: ['masters', 'colors', all],
    queryFn: async () => {
      const res = await api.get('/masters/colors', { params: all ? { all: 'true' } : {} })
      return res.data?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

export const useCreateColor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/masters/colors', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'colors'] })
      toast.success('Color created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useUpdateColor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/masters/colors/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'colors'] })
      toast.success('Color updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── HSN Codes ─────────────────────────────────────────────────────────────────
export const useHSNCodes = (all = false) =>
  useQuery({
    queryKey: ['masters', 'hsn', all],
    queryFn: async () => {
      const res = await api.get('/masters/hsn', { params: all ? { all: 'true' } : {} })
      return res.data?.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

export const useCreateHSN = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/masters/hsn', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'hsn'] })
      toast.success('HSN code created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

export const useUpdateHSN = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/masters/hsn/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['masters', 'hsn'] })
      toast.success('HSN code updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  })
}

// ── Size Charts ───────────────────────────────────────────────────────────────
export const useSizeCharts = (category) =>
  useQuery({
    queryKey: ['masters', 'size-charts', category],
    queryFn: async () => {
      const params = {}
      if (category) params.category = category
      const res = await api.get('/masters/size-charts', { params })
      return res.data?.data ?? []
    },
    enabled: !!category,
    staleTime: 10 * 60 * 1000,
  })
