import React from 'react';
import PropTypes from 'prop-types';

/**
 * CancelButton
 * A conditionally rendered cancel action button.
 *
 * Visibility rules:
 *  - Hidden entirely when `isCancelled` is true (order already cancelled)
 *  - Disabled (with tooltip) when `isCancellable` is false (status does not allow it)
 *  - Shows a spinner when `isCancelling` is true
 *
 * @param {Object}   props
 * @param {boolean}  props.isCancellable  - Whether the current order status allows cancellation
 * @param {boolean}  props.isCancelling   - Whether a cancellation API call is in progress
 * @param {boolean}  props.isCancelled    - Whether the order has already been cancelled
 * @param {Function} props.onClick        - Handler triggered when the button is clicked
 */
function CancelButton({ isCancellable, isCancelling, isCancelled, onClick }) {
  // Do not render anything once the order is already cancelled
  if (isCancelled) return null;

  const isDisabled = !isCancellable || isCancelling;

  return (
    <div className="cancel-button-wrapper">
      <button
        className={`cancel-button ${
          isCancellable ? 'cancel-button--active' : 'cancel-button--disabled'
        }`}
        onClick={isCancellable && !isCancelling ? onClick : undefined}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isCancelling}
        type="button"
        title={
          !isCancellable
            ? 'This order can no longer be cancelled'
            : 'Cancel this order'
        }
      >
        {isCancelling ? (
          <>
            <span className="cancel-button__spinner" aria-hidden="true" />
            <span>Cancelling…</span>
          </>
        ) : (
          <>
            <span className="cancel-button__icon" aria-hidden="true">✕</span>
            <span>Cancel Order</span>
          </>
        )}
      </button>

      {!isCancellable && !isCancelling && (
        <p className="cancel-button__hint" role="note">
          Cancellation is only available before your order begins preparation.
        </p>
      )}
    </div>
  );
}

CancelButton.propTypes = {
  isCancellable: PropTypes.bool.isRequired,
  isCancelling: PropTypes.bool.isRequired,
  isCancelled: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default CancelButton;
