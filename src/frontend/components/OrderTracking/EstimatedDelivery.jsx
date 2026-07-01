import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Formats an ISO date string into a human-readable "Today at HH:MM" or
 * "Mon DD at HH:MM" format.
 * @param {string} isoString
 * @returns {string}
 */
function formatETA(isoString) {
  if (!isoString) return 'Calculating…';

  try {
    const date = new Date(isoString);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) return `Today at ${timeStr}`;

    const dateStr = date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return `${dateStr} at ${timeStr}`;
  } catch {
    return 'Unavailable';
  }
}

/**
 * Computes the number of minutes remaining until the ETA.
 * @param {string} isoString
 * @returns {number|null}
 */
function getMinutesRemaining(isoString) {
  if (!isoString) return null;
  try {
    const diff = new Date(isoString).getTime() - Date.now();
    return diff > 0 ? Math.ceil(diff / 60000) : 0;
  } catch {
    return null;
  }
}

/**
 * EstimatedDelivery
 * Displays the dynamically updating estimated delivery time.
 * Refreshes the countdown every minute automatically.
 *
 * @param {Object} props
 * @param {string|null} props.estimatedDelivery - ISO timestamp of expected delivery
 * @param {boolean}     [props.isDelivered]     - Hides ETA when order is delivered
 */
function EstimatedDelivery({ estimatedDelivery, isDelivered }) {
  const [minutesRemaining, setMinutesRemaining] = useState(
    getMinutesRemaining(estimatedDelivery)
  );

  // Refresh countdown every minute
  useEffect(() => {
    if (!estimatedDelivery || isDelivered) return;

    setMinutesRemaining(getMinutesRemaining(estimatedDelivery));

    const interval = setInterval(() => {
      setMinutesRemaining(getMinutesRemaining(estimatedDelivery));
    }, 60_000);

    return () => clearInterval(interval);
  }, [estimatedDelivery, isDelivered]);

  if (isDelivered) {
    return (
      <div className="estimated-delivery estimated-delivery--delivered" role="status">
        <span className="estimated-delivery__icon" aria-hidden="true">🎉</span>
        <span className="estimated-delivery__text">Your order has been delivered!</span>
      </div>
    );
  }

  return (
    <div className="estimated-delivery" role="status" aria-live="polite" aria-atomic="true">
      <div className="estimated-delivery__header">
        <span className="estimated-delivery__icon" aria-hidden="true">🕐</span>
        <span className="estimated-delivery__label">Estimated Delivery</span>
      </div>

      <p className="estimated-delivery__time">
        {formatETA(estimatedDelivery)}
      </p>

      {minutesRemaining !== null && minutesRemaining > 0 && (
        <p className="estimated-delivery__countdown">
          About <strong>{minutesRemaining} min</strong> away
        </p>
      )}

      {minutesRemaining === 0 && (
        <p className="estimated-delivery__arriving">
          <strong>Arriving now!</strong>
        </p>
      )}
    </div>
  );
}

EstimatedDelivery.propTypes = {
  estimatedDelivery: PropTypes.string,
  isDelivered: PropTypes.bool,
};

EstimatedDelivery.defaultProps = {
  estimatedDelivery: null,
  isDelivered: false,
};

export default EstimatedDelivery;
export { formatETA, getMinutesRemaining };
