import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal.jsx'
import { fetchProducts, createProduct, updateProduct } from '../../api/productApi.js'
import { UOM_OPTIONS, PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from '../../utils/constants.js'

export default function ProductForm({ isOpen, onClose, existing = null }) {
  const isEdit = !!existing?.sku_code
  const qc     = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { sku_code: '', description: '', product_type: 'RAW_MATERIAL', uom: 'PCS' },
  })

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created!'); onClose() },
    onError: (err) => toast.error(err.message || 'Failed to create product'),
  })
  const updateMut = useMutation({
    mutationFn: updateProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated!'); onClose() },
    onError: (err) => toast.error(err.message || 'Failed to update product'),
  })
  const isBusy = createMut.isPending || updateMut.isPending

  useEffect(() => {
    if (isOpen) {
      reset(
        isEdit
          ? { sku_code: existing.sku_code, description: existing.description, product_type: existing.product_type, uom: existing.uom }
          : { sku_code: '', description: '', product_type: 'RAW_MATERIAL', uom: 'PCS' },
      )
    }
  }, [isOpen, isEdit, existing, reset])

  const onSubmit = (values) => {
    if (isEdit) {
      updateMut.mutate({ sku: existing.sku_code, description: values.description, product_type: values.product_type, uom: values.uom })
    } else {
      createMut.mutate(values)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit: ${existing.sku_code}` : 'Add Product'}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isBusy}>Cancel</button>
          <button type="submit" form="product-form" className="btn-primary" disabled={isBusy}>
            {isBusy ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">SKU Code *</label>
          <input
            {...register('sku_code', { required: 'SKU is required', maxLength: { value: 50, message: 'Max 50 chars' } })}
            disabled={isEdit}
            placeholder="e.g. FG-SHO-001"
            className={`input-field uppercase ${errors.sku_code ? 'input-error' : ''} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
          />
          {errors.sku_code && <p className="text-red-500 text-xs mt-1">{errors.sku_code.message}</p>}
        </div>

        <div>
          <label className="label">Description *</label>
          <input
            {...register('description', { required: 'Description is required' })}
            placeholder="e.g. Gents Oxford Leather Shoe — Black"
            className={`input-field ${errors.description ? 'input-error' : ''}`}
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Product Type *</label>
            <select {...register('product_type', { required: true })} className="input-field">
              {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">UOM *</label>
            <select {...register('uom', { required: true })} className="input-field">
              {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  )
}
