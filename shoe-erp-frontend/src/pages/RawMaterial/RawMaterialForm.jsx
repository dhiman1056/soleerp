import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useForm }   from 'react-hook-form'
import Modal         from '../../components/common/Modal.jsx'
import { useCreateRawMaterial, useUpdateRawMaterial } from '../../hooks/useRawMaterials.js'
import { UOM_OPTIONS } from '../../utils/constants.js'

export default function RawMaterialForm({ isOpen, onClose, existing = null }) {
  const isEdit = !!existing?.sku_code

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { sku_code: '', description: '', uom: 'PCS', rate: 0 },
  })

  const createMut = useCreateRawMaterial()
  const updateMut = useUpdateRawMaterial()
  const isBusy    = createMut.isPending || updateMut.isPending

  // Reset / pre-fill form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset(
        isEdit
          ? { sku_code: existing.sku_code, description: existing.description, uom: existing.uom, rate: existing.rate }
          : { sku_code: '', description: '', uom: 'PCS', rate: 0 },
      )
    }
  }, [isOpen, isEdit, existing, reset])

  const onSubmit = (values) => {
    const payload = { ...values, rate: parseFloat(values.rate) }
    const mut     = isEdit ? updateMut : createMut
    const args    = isEdit ? { sku: existing.sku_code, ...payload } : payload

    mut.mutate(args, { onSuccess: onClose })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit: ${existing.sku_code}` : 'Add Raw Material'}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isBusy}>Cancel</button>
          <button type="submit" form="rm-form" className="btn-primary" disabled={isBusy}>
            {isBusy ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
        </>
      }
    >
      <form id="rm-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* SKU Code — locked in edit mode */}
        <div>
          <label className="label">SKU Code *</label>
          <input
            {...register('sku_code', {
              required: 'SKU Code is required',
              maxLength: { value: 50, message: 'Max 50 characters' },
            })}
            disabled={isEdit}
            placeholder="e.g. RM-LEA-001"
            className={`input-field uppercase ${errors.sku_code ? 'input-error' : ''} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
          />
          {errors.sku_code && <p className="text-red-500 text-xs mt-1">{errors.sku_code.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="label">Description *</label>
          <input
            {...register('description', { required: 'Description is required', maxLength: { value: 255, message: 'Max 255 characters' } })}
            placeholder="e.g. Full Grain Leather — Black"
            className={`input-field ${errors.description ? 'input-error' : ''}`}
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* UOM */}
          <div>
            <label className="label">Unit of Measure *</label>
            <select {...register('uom', { required: true })} className="input-field">
              {UOM_OPTIONS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>

          {/* Rate */}
          <div>
            <label className="label">Rate per Unit (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('rate', {
                required: 'Rate is required',
                min: { value: 0, message: 'Must be ≥ 0' },
                valueAsNumber: true,
              })}
              className={`input-field ${errors.rate ? 'input-error' : ''}`}
            />
            {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate.message}</p>}
          </div>
        </div>
      </form>
    </Modal>
  )
}
