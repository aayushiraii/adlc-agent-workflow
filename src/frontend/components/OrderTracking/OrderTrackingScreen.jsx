import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useOrderTracking } from '../../hooks/useOrderTracking';
import OrderProgressStepper from './OrderProgressStepper';
import EstimatedDelivery from './EstimatedDelivery';
import CancelButton from '../OrderCancellation/CancelButton';
import CancellationModal from '../OrderCancellation/CancellationModal';
import CancellationFeedback from '../OrderCancellation/CancellationFeedback';
import { cancelOrder } from '../../services/orderService';

/**
 * OrderTrackingScreen
 * The primary screen for real-time order tracking.
 * Orchestrates the WebSocket hook, progress stepper, ETA display,
 * and the complete order cancellation flow (button → modal → feedback).
 *
 * @param {Object} props
 * @param {string} props.orderId - The order ID to track
 */
function OrderTrackingScreen({ orderId }) {
  const { orderStatus, estimatedDelivery, isConnected, error: wsError, reconnect } =
    useOrderTracking(orderId);

  // ── Cancellation state ────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancellationState, setCancellationState] = useState(null); // 'success' | 'error' | null
  const [cancellationMessage, setCancellationMessage] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCancelClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleConfirmCancellation = useCallback(
    async (reason) => {
      setIsCancelling(true);
      setIsModalOpen(false);

      try {
        await cancelOrder(orderId, reason);
        setIsCancelled(true);
        setCancellationState('success');
        setCancellationMessage('Your order has been successfully cancelled.');
      } catch (err) {
        setCancellationState('error');
        setCancellationMessage(
          err.message || 'Failed to cancel the order. Please try again.'
        );
      } finally {
        setIsCancelling(false);
      }
    },
    [orderId]
  );

  const handleDismissFeedback = useCallback(() => {
    setCancellationState(null);
    setCancellationMessage('');
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const currentStatus = orderStatus?.status ?? null;
  const isDelivered = currentStatus === 'delivered';
  const isCancellable = !isCancelled && (orderStatus?.isCancellable ?? false);

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (!orderStatus && !wsError) {
    return (
      <div className="order-tracking order-tracking--loading" role="status" aria-live="polite">
        <div className="order-tracking__spinner" aria-hidden="true" />
        <p className="order-tracking__loading-text">Loading order status…</p>
      </div>
    );
  }

  // ── Render: Connection error ───────────────────────────────────────────────
  if (wsError && !orderStatus) {
    return (
      <div className="order-tracking order-tracking--error" role="alert">
        <p className="order-tracking__error-text">{wsError}</p>
        <button
          className="order-tracking__retry-btn"
          onClick={reconnect}
          type="button"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // ── Render: Main ──────────────────────────────────────────────────────────
  return (
    <main className="order-tracking" aria-label="Order tracking">
      {/* Header */}
      <header className="order-tracking__header">
        <h1 className="order-tracking__title">Track Your Order</h1>
        <p className="order-tracking__order-id">Order #{orderId}</p>
        <span
          className={`order-tracking__connection-badge ${
            isConnected
              ? 'order-tracking__connection-badge--live'
              : 'order-tracking__connection-badge--offline'
          }`}
          aria-label={isConnected ? 'Live updates active' : 'Offline — updates paused'}
        >
          {isConnected ? '● Live' : '○ Offline'}
        </span>
      </header>

      {/* Soft WebSocket error (still showing stale data) */}
      {wsError && orderStatus && (
        <div className="order-tracking__warning" role="alert">
          <p>{wsError}</p>
          <button onClick={reconnect} type="button" className="order-tracking__retry-btn">
            Reconnect
          </button>
        </div>
      )}

      {/* Cancellation feedback banner */}
      {cancellationState && (
        <CancellationFeedback
          state={cancellationState}
          message={cancellationMessage}
          onDismiss={handleDismissFeedback}
        />
      )}

      {/* Progress Stepper */}
      {currentStatus && (
        <section className="order-tracking__stepper-section" aria-label="Order progress">
          <OrderProgressStepper
            currentStatus={currentStatus}
            isCancelled={isCancelled}
          />
        </section>
      )}

      {/* Estimated Delivery */}
      <section className="order-tracking__eta-section" aria-label="Estimated delivery time">
        <EstimatedDelivery
          estimatedDelivery={estimatedDelivery}
          isDelivered={isDelivered || isCancelled}
        />
      </section>

      {/* Cancel Button */}
      {!isDelivered && (
        <section className="order-tracking__actions" aria-label="Order actions">
          <CancelButton
            isCancellable={isCancellable}
            isCancelling={isCancelling}
            isCancelled={isCancelled}
            onClick={handleCancelClick}
          />
        </section>
      )}

      {/* Cancellation Confirmation Modal */}
      <CancellationModal
        isOpen={isModalOpen}
        orderId={orderId}
        onConfirm={handleConfirmCancellation}
        onClose={handleModalClose}
        isSubmitting={isCancelling}
      />
    </main>
  );
}

OrderTrackingScreen.propTypes = {
  orderId: PropTypes.string.isRequired,
};

export default OrderTrackingScreen;
