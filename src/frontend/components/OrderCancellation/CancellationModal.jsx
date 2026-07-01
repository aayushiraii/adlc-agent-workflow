import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * CancellationModal
 * Accessible confirmation dialog shown before an order cancellation is submitted.
 * Traps focus inside the modal while it is open, and restores focus on close.
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen       - Controls visibility
 * @param {string}   props.orderId      - Order ID for display purposes
 * @param {Function} props.onConfirm    - Called with (reason: string) when user confirms
 * @param {Function} props.onClose      - Called when user dismisses without confirming
 * @param {boolean}  [props.isSubmitting] - Disables actions while API call is in-flight
 */
function CancellationModal({ isOpen, orderId, onConfirm, onClose, isSubmitting }) {
  const [reason, setReason] = useState('');
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const triggerRef = useRef(document.activeElement);

  // Reset reason when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
      triggerRef.current = document.activeElement;
      // Defer focus until modal is in the DOM
      setTimeout(() => firstFocusableRef.current?.focus(), 50);
    } else {
      // Restore focus to the element that triggered the modal
      triggerRef.current?.focus?.();
    }
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (event) => {
      if (!isOpen) return;

      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }

      // Focus trap: keep Tab / Shift+Tab inside the modal
      if (event.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstEl) {
            event.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            event.preventDefault();
            firstEl.focus();
          }
        }
      }
    },
    [isOpen, isSubmitting, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget && !isSubmitting) {
        onClose();
      }
    },
    [onClose, isSubmitting]
  );

  const handleConfirm = useCallback(() => {
    onConfirm(reason.trim());
  }, [onConfirm, reason]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        aria-describedby="cancel-modal-desc"
        ref={modalRef}
      >
        {/* Header */}
        <div className="modal__header">
          <h2 id="cancel-modal-title" className="modal__title">
            Cancel Order
          </h2>
          <button
            className="modal__close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close cancel order dialog"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal__body">
          <p id="cancel-modal-desc" className="modal__description">
            Are you sure you want to cancel <strong>Order #{orderId}</strong>?
            This action cannot be undone.
          </p>

          <label htmlFor="cancel-reason" className="modal__label">
            Reason for cancellation <span className="modal__label--optional">(optional)</span>
          </label>
          <textarea
            id="cancel-reason"
            className="modal__textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Changed my mind, ordered by mistake…"
            rows={3}
            maxLength={300}
            disabled={isSubmitting}
            ref={firstFocusableRef}
          />
          <p className="modal__char-count" aria-live="polite">
            {reason.length}/300
          </p>
        </div>

        {/* Footer */}
        <div className="modal__footer">
          <button
            className="modal__btn modal__btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
            type="button"
          >
            Keep Order
          </button>

          <button
            className="modal__btn modal__btn--danger"
            onClick={handleConfirm}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            type="button"
          >
            {isSubmitting ? (
              <>
                <span className="modal__spinner" aria-hidden="true" /> Cancelling…
              </>
            ) : (
              'Yes, Cancel Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

CancellationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  orderId: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
};

CancellationModal.defaultProps = {
  isSubmitting: false,
};

export default CancellationModal;
