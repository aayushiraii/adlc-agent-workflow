import React from 'react';
import PropTypes from 'prop-types';
import { ORDER_STATUSES } from '../../hooks/useOrderTracking';

/**
 * Human-readable labels for each order status step.
 */
const STATUS_LABELS = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
};

/**
 * Icons (Unicode emoji) per status — replace with SVG icons in production.
 */
const STATUS_ICONS = {
  placed: '🛒',
  confirmed: '✅',
  preparing: '👨‍🍳',
  out_for_delivery: '🚴',
  delivered: '🎉',
};

/**
 * OrderProgressStepper
 * Renders a horizontal progress stepper showing all order lifecycle stages.
 * Completed steps are filled, the current step is highlighted, future steps are muted.
 *
 * @param {Object}  props
 * @param {string}  props.currentStatus   - Active status key (e.g. 'preparing')
 * @param {boolean} [props.isCancelled]   - Whether the order was cancelled
 */
function OrderProgressStepper({ currentStatus, isCancelled }) {
  const currentIndex = ORDER_STATUSES.indexOf(currentStatus);

  if (isCancelled) {
    return (
      <div className="order-stepper order-stepper--cancelled" role="status" aria-label="Order cancelled">
        <div className="order-stepper__cancelled-banner">
          <span className="order-stepper__cancelled-icon" aria-hidden="true">❌</span>
          <span className="order-stepper__cancelled-text">Order Cancelled</span>
        </div>
      </div>
    );
  }

  return (
    <nav className="order-stepper" aria-label="Order progress">
      <ol className="order-stepper__list">
        {ORDER_STATUSES.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          let stepState = 'future';
          if (isCompleted) stepState = 'completed';
          if (isCurrent) stepState = 'current';

          return (
            <li
              key={status}
              className={`order-stepper__step order-stepper__step--${stepState}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Connector line between steps */}
              {index > 0 && (
                <div
                  className={`order-stepper__connector ${
                    isCompleted || isCurrent ? 'order-stepper__connector--active' : ''
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Step circle */}
              <div className="order-stepper__circle" aria-hidden="true">
                {isCompleted ? (
                  <span className="order-stepper__check">✓</span>
                ) : (
                  <span className="order-stepper__icon">{STATUS_ICONS[status]}</span>
                )}
              </div>

              {/* Step label */}
              <span className="order-stepper__label">
                {STATUS_LABELS[status]}
              </span>

              {/* Screen reader only status */}
              <span className="sr-only">
                {isCompleted && '(completed)'}
                {isCurrent && '(current step)'}
                {isFuture && '(pending)'}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

OrderProgressStepper.propTypes = {
  currentStatus: PropTypes.oneOf(ORDER_STATUSES).isRequired,
  isCancelled: PropTypes.bool,
};

OrderProgressStepper.defaultProps = {
  isCancelled: false,
};

export default OrderProgressStepper;
