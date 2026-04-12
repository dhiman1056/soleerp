import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import Modal from './Modal.jsx'

/**
 * Confirm / delete dialog built on top of Modal.
 * Props: isOpen, onClose, onConfirm, title, message, confirmLabel, loading
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title   = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmLabel = 'Confirm',
  loading = false,
  requireConfirmText = null, // e.g. "DELETE"
}) {
  const [confirmInput, setConfirmInput] = React.useState('');

  const handleClose = () => {
    setConfirmInput('');
    onClose();
  };

  const isConfirmDisabled = loading || (requireConfirmText && confirmInput !== requireConfirmText);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="flex gap-4">
        {/* Warning icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
        </div>
      </div>

      {requireConfirmText && (
        <div className="mt-4 pl-14">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type <strong>{requireConfirmText}</strong> to confirm
          </label>
          <input
            type="text"
            className="input-field"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={requireConfirmText}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={handleClose} className="btn-secondary" disabled={loading}>Cancel</button>
        <button
          onClick={onConfirm}
          disabled={isConfirmDisabled}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
