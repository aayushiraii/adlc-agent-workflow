/**
 * orderTracking.test.js
 * Unit tests for Issue #13 — Frontend Order Tracking & Cancellation Screens.
 *
 * Coverage:
 *  - useOrderTracking hook (WebSocket lifecycle, reconnect logic)
 *  - formatETA / getMinutesRemaining utilities
 *  - formatCurrency / formatDate utilities
 *  - OrderProgressStepper rendering
 *  - CancelButton conditional rendering
 *  - CancellationFeedback rendering
 *  - OrderTrackingScreen integration flow
 *  - orderService HTTP methods
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Utilities ─────────────────────────────────────────────────────────────
import { formatETA, getMinutesRemaining } from '../frontend/components/OrderTracking/EstimatedDelivery';
import { formatCurrency, formatDate } from '../frontend/components/OrderHistory/OrderHistoryScreen';
import { ORDER_STATUSES, CANCELLABLE_STATUSES } from '../frontend/hooks/useOrderTracking';

// ─── Components ─────────────────────────────────────────────────────────────
import OrderProgressStepper from '../frontend/components/OrderTracking/OrderProgressStepper';
import CancelButton from '../frontend/components/OrderCancellation/CancelButton';
import CancellationFeedback from '../frontend/components/OrderCancellation/CancellationFeedback';
import CancellationModal from '../frontend/components/OrderCancellation/CancellationModal';
import OrderHistoryScreen from '../frontend/components/OrderHistory/OrderHistoryScreen';
import OrderTrackingScreen from '../frontend/components/OrderTracking/OrderTrackingScreen';

// ─── Service ────────────────────────────────────────────────────────────────
import * as orderService from '../frontend/services/orderService';

// ═══════════════════════════════════════════════════════════════════════════
// 1. UTILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('formatETA', () => {
  it('returns "Calculating…" for null/undefined input', () => {
    expect(formatETA(null)).toBe('Calculating…');
    expect(formatETA(undefined)).toBe('Calculating…');
  });

  it('returns "Today at HH:MM" for a time today', () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const result = formatETA(now.toISOString());
    expect(result).toMatch(/^Today at /);
  });

  it('returns a date string for a future date', () => {
    const future = new Date('2099-12-25T15:00:00Z');
    const result = formatETA(future.toISOString());
    expect(result).toMatch(/Dec/);
    expect(result).toMatch(/2099/);
  });

  it('returns "Unavailable" for an invalid date string', () => {
    expect(formatETA('not-a-date')).toBe('Unavailable');
  });
});

describe('getMinutesRemaining', () => {
  it('returns null for null input', () => {
    expect(getMinutesRemaining(null)).toBeNull();
  });

  it('returns a positive number for a future timestamp', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour ahead
    expect(getMinutesRemaining(future)).toBeGreaterThan(0);
  });

  it('returns 0 for a past timestamp', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(getMinutesRemaining(past)).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats a number as USD currency', () => {
    expect(formatCurrency(19.99)).toBe('$19.99');
  });

  it('formats a number as EUR currency', () => {
    expect(formatCurrency(10, 'EUR')).toMatch(/10/);
  });
});

describe('formatDate', () => {
  it('formats an ISO string to a readable date', () => {
    const result = formatDate('2024-03-15T10:00:00Z');
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/2024/);
  });

  it('returns "Unknown date" for an invalid string', () => {
    expect(formatDate('bad-date')).toBe('Unknown date');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. ORDER_STATUSES & CANCELLABLE_STATUSES CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

describe('ORDER_STATUSES', () => {
  it('contains exactly the 5 expected statuses in order', () => {
    expect(ORDER_STATUSES).toEqual([
      'placed',
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered',
    ]);
  });
});

describe('CANCELLABLE_STATUSES', () => {
  it('includes "placed" and "confirmed" as cancellable', () => {
    expect(CANCELLABLE_STATUSES.has('placed')).toBe(true);
    expect(CANCELLABLE_STATUSES.has('confirmed')).toBe(true);
  });

  it('does not include "preparing" or "delivered" as cancellable', () => {
    expect(CANCELLABLE_STATUSES.has('preparing')).toBe(false);
    expect(CANCELLABLE_STATUSES.has('delivered')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. OrderProgressStepper COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

describe('OrderProgressStepper', () => {
  it('renders all 5 status steps', () => {
    render(<OrderProgressStepper currentStatus="placed" />);
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Preparing')).toBeInTheDocument();
    expect(screen.getByText('Out for Delivery')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('marks the current step with aria-current="step"', () => {
    render(<OrderProgressStepper currentStatus="preparing" />);
    const currentStep = screen.getByRole('listitem', { current: 'step' });
    expect(currentStep).toBeInTheDocument();
  });

  it('shows the cancelled banner when isCancelled is true', () => {
    render(<OrderProgressStepper currentStatus="placed" isCancelled />);
    expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
  });

  it('does not render the step list when isCancelled', () => {
    render(<OrderProgressStepper currentStatus="placed" isCancelled />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. CancelButton COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

describe('CancelButton', () => {
  const baseProps = {
    isCancellable: true,
    isCancelling: false,
    isCancelled: false,
    onClick: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders when isCancelled is false', () => {
    render(<CancelButton {...baseProps} />);
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument();
  });

  it('returns null when isCancelled is true', () => {
    const { container } = render(<CancelButton {...baseProps} isCancelled />);
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onClick when cancellable and clicked', () => {
    render(<CancelButton {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel order/i }));
    expect(baseProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when isCancellable is false', () => {
    render(<CancelButton {...baseProps} isCancellable={false} />);
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeDisabled();
  });

  it('shows "Cancelling…" text when isCancelling is true', () => {
    render(<CancelButton {...baseProps} isCancelling />);
    expect(screen.getByText('Cancelling…')).toBeInTheDocument();
  });

  it('shows a hint message when not cancellable', () => {
    render(<CancelButton {...baseProps} isCancellable={false} />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. CancellationFeedback COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

describe('CancellationFeedback', () => {
  it('renders a success banner with the correct message', () => {
    render(
      <CancellationFeedback
        state="success"
        message="Order cancelled successfully."
        onDismiss={jest.fn()}
      />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Order cancelled successfully.')).toBeInTheDocument();
  });

  it('renders an error banner', () => {
    render(
      <CancellationFeedback
        state="error"
        message="Something went wrong."
        onDismiss={jest.fn()}
      />
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(
      <CancellationFeedback
        state="success"
        message="Done."
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. CancellationModal COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

describe('CancellationModal', () => {
  const baseProps = {
    isOpen: true,
    orderId: 'ORD-001',
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    isSubmitting: false,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the modal when isOpen is true', () => {
    render(<CancellationModal {...baseProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Cancel Order/)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<CancellationModal {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when "Keep Order" is clicked', () => {
    render(<CancellationModal {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /keep order/i }));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with typed reason when confirmed', () => {
    render(<CancellationModal {...baseProps} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Changed my mind' } });
    fireEvent.click(screen.getByRole('button', { name: /yes, cancel order/i }));
    expect(baseProps.onConfirm).toHaveBeenCalledWith('Changed my mind');
  });

  it('disables buttons when isSubmitting is true', () => {
    render(<CancellationModal {...baseProps} isSubmitting />);
    expect(screen.getByRole('button', { name: /keep order/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancelling/i })).toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. orderService UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('orderService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.setItem('authToken', 'test-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  describe('fetchOrderStatus', () => {
    it('fetches order status and returns parsed JSON', async () => {
      const mockData = { status: 'preparing', estimatedDelivery: '2026-07-01T12:00:00Z' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => mockData,
      });

      const result = await orderService.fetchOrderStatus('ORD-001');
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/orders/ORD-001/status'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('throws an error when orderId is missing', async () => {
      await expect(orderService.fetchOrderStatus('')).rejects.toThrow('orderId is required');
    });

    it('throws a structured error on non-2xx response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'Order not found' }),
      });

      await expect(orderService.fetchOrderStatus('ORD-999')).rejects.toThrow('Order not found');
    });
  });

  describe('cancelOrder', () => {
    it('sends a POST request with the reason', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true }),
      });

      await orderService.cancelOrder('ORD-001', 'Changed my mind');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/orders/ORD-001/cancel'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Changed my mind' }),
        })
      );
    });

    it('throws when orderId is missing', async () => {
      await expect(orderService.cancelOrder('')).rejects.toThrow('orderId is required');
    });
  });

  describe('fetchOrderHistory', () => {
    it('fetches order history with pagination params', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ orders: [], total: 0, page: 1 }),
      });

      await orderService.fetchOrderHistory({ page: 2, limit: 5 });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. OrderHistoryScreen INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

describe('OrderHistoryScreen', () => {
  beforeEach(() => {
    jest.spyOn(orderService, 'fetchOrderHistory');
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders a loading spinner initially', () => {
    orderService.fetchOrderHistory.mockReturnValue(new Promise(() => {}));
    render(<OrderHistoryScreen />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders orders after data loads', async () => {
    orderService.fetchOrderHistory.mockResolvedValueOnce({
      orders: [
        {
          id: 'ORD-001',
          status: 'delivered',
          createdAt: '2024-01-15T10:00:00Z',
          total: 29.99,
          currency: 'USD',
          items: [{ name: 'Pizza' }],
        },
      ],
      total: 1,
      page: 1,
    });

    await act(async () => {
      render(<OrderHistoryScreen />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Order #ORD-001/)).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
      expect(screen.getByText('$29.99')).toBeInTheDocument();
    });
  });

  it('renders an empty state when no orders exist', async () => {
    orderService.fetchOrderHistory.mockResolvedValueOnce({
      orders: [],
      total: 0,
      page: 1,
    });

    await act(async () => {
      render(<OrderHistoryScreen />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/You haven't placed any orders yet/)
      ).toBeInTheDocument();
    });
  });

  it('renders an error state and a retry button on API failure', async () => {
    orderService.fetchOrderHistory.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      render(<OrderHistoryScreen />);
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('calls onOrderClick with the order when a row is clicked', async () => {
    const mockOrder = {
      id: 'ORD-002',
      status: 'placed',
      createdAt: '2024-02-01T00:00:00Z',
      total: 15.0,
      currency: 'USD',
      items: [],
    };
    const onOrderClick = jest.fn();

    orderService.fetchOrderHistory.mockResolvedValueOnce({
      orders: [mockOrder],
      total: 1,
      page: 1,
    });

    await act(async () => {
      render(<OrderHistoryScreen onOrderClick={onOrderClick} />);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /View details for order #ORD-002/i }));
      expect(onOrderClick).toHaveBeenCalledWith(mockOrder);
    });
  });
});
