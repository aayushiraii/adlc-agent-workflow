import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { fetchOrderHistory } from '../../services/orderService';

/**
 * Human-readable status labels with associated colour classes.
 */
const STATUS_DISPLAY = {
  placed: { label: 'Placed', className: 'badge--info' },
  confirmed: { label: 'Confirmed', className: 'badge--info' },
  preparing: { label: 'Preparing', className: 'badge--warning' },
  out_for_delivery: { label: 'Out for Delivery', className: 'badge--warning' },
  delivered: { label: 'Delivered', className: 'badge--success' },
  cancelled: { label: 'Cancelled', className: 'badge--error' },
};

/**
 * Formats a monetary amount as a locale currency string.
 * @param {number} amount
 * @param {string} [currency='USD']
 * @returns {string}
 */
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/**
 * Formats an ISO date string to a readable short date.
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

/**
 * OrderHistoryScreen
 * Lists the authenticated user's past orders with status badges and totals.
 * Supports pagination.
 *
 * @param {Object}   props
 * @param {Function} [props.onOrderClick] - Optional callback when an order row is clicked;
 *                                          receives the order object
 */
function OrderHistoryScreen({ onOrderClick }) {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const loadOrders = useCallback(async (pageNum) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchOrderHistory({ page: pageNum, limit: ITEMS_PER_PAGE });
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load order history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(page);
  }, [page, loadOrders]);

  const handlePrev = () => setPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setPage((p) => Math.min(p + 1, totalPages));

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="order-history order-history--loading" role="status" aria-live="polite">
        <div className="order-history__spinner" aria-hidden="true" />
        <p>Loading order history…</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="order-history order-history--error" role="alert">
        <p className="order-history__error">{error}</p>
        <button
          className="order-history__retry-btn"
          onClick={() => loadOrders(page)}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <main className="order-history order-history--empty" aria-label="Order history">
        <h1 className="order-history__title">Order History</h1>
        <div className="order-history__empty-state">
          <span className="order-history__empty-icon" aria-hidden="true">📦</span>
          <p className="order-history__empty-text">You haven't placed any orders yet.</p>
        </div>
      </main>
    );
  }

  // ── Main list ─────────────────────────────────────────────────────────────
  return (
    <main className="order-history" aria-label="Order history">
      <header className="order-history__header">
        <h1 className="order-history__title">Order History</h1>
        <p className="order-history__count">{total} orders total</p>
      </header>

      <ul className="order-history__list" aria-label="Past orders">
        {orders.map((order) => {
          const statusInfo = STATUS_DISPLAY[order.status] || {
            label: order.status,
            className: 'badge--default',
          };

          return (
            <li key={order.id} className="order-history__item">
              <button
                className="order-history__item-btn"
                onClick={() => onOrderClick && onOrderClick(order)}
                type="button"
                aria-label={`View details for order #${order.id}`}
              >
                {/* Order ID + Date */}
                <div className="order-history__item-meta">
                  <span className="order-history__item-id">Order #{order.id}</span>
                  <time
                    className="order-history__item-date"
                    dateTime={order.createdAt}
                  >
                    {formatDate(order.createdAt)}
                  </time>
                </div>

                {/* Items summary */}
                {order.items && order.items.length > 0 && (
                  <p className="order-history__item-summary">
                    {order.items.map((item) => item.name).join(', ')}
                    {order.items.length > 3 && ` +${order.items.length - 3} more`}
                  </p>
                )}

                {/* Status badge + Total */}
                <div className="order-history__item-footer">
                  <span className={`badge ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                  <span className="order-history__item-total">
                    {formatCurrency(order.total, order.currency)}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="order-history__pagination" aria-label="Order history pagination">
          <button
            className="order-history__page-btn"
            onClick={handlePrev}
            disabled={page === 1}
            aria-label="Previous page"
            type="button"
          >
            ← Previous
          </button>

          <span className="order-history__page-indicator" aria-current="page">
            Page {page} of {totalPages}
          </span>

          <button
            className="order-history__page-btn"
            onClick={handleNext}
            disabled={page === totalPages}
            aria-label="Next page"
            type="button"
          >
            Next →
          </button>
        </nav>
      )}
    </main>
  );
}

OrderHistoryScreen.propTypes = {
  onOrderClick: PropTypes.func,
};

OrderHistoryScreen.defaultProps = {
  onOrderClick: null,
};

export default OrderHistoryScreen;
export { formatCurrency, formatDate, STATUS_DISPLAY };
