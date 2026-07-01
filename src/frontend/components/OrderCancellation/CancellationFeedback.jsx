import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * CancellationFeedback
 * Displays an accessible success or error banner after a cancellation attempt.
 * Automatically announces itself to screen readers via role="alert".
 * Focuses the banner on mount so keyboard users are aware of the state change.
 *
 * @param {Object}   props
 * @param {'success'|'error'} props.state   - Feedback type
 * @param {string}   props.message          - Message to display
 * @param {Function} props.onDismiss        - Called when user dismisses the banner
 */
function CancellationFeedback({ state, message, onDismiss }) {
  const bannerRef = useRef(null);

  // Move focus to the banner so keyboard/screen-reader users are notified
  useEffect(() => {
    bannerRef.current?.focus();
  }, [state]);

  if (!state || !message) return null;

  const isSuccess = state === 'success';

  return (
    <div
      ref={bannerRef}
      className={`cancellation-feedback cancellation-feedback--${state}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={-1}
    >
      <div className="cancellation-feedback__content">
        <span className="cancellation-feedback__icon" aria-hidden="true">
          {isSuccess ? '✅' : '❌'}
        </span>
        <p className="cancellation-feedback__message">{message}</p>
      </div>

      <button
        className="cancellation-feedback__dismiss-btn"
        onClick={onDismiss}
        type="button"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

CancellationFeedback.propTypes = {
  state: PropTypes.oneOf(['success', 'error']).isRequired,
  message: PropTypes.string.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default CancellationFeedback;
