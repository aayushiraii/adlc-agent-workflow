import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useOrderTracking
 * Custom hook that establishes a WebSocket (or SSE fallback) connection
 * to stream real-time order status updates.
 *
 * @param {string} orderId - The unique order identifier to track.
 * @param {string} [baseUrl] - Optional override for the WebSocket base URL.
 * @returns {{
 *   orderStatus: Object|null,
 *   estimatedDelivery: string|null,
 *   isConnected: boolean,
 *   error: string|null,
 *   reconnect: Function
 * }}
 */
const DEFAULT_WS_BASE = process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:4000';

const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
];

const CANCELLABLE_STATUSES = new Set(['placed', 'confirmed']);

export function useOrderTracking(orderId, baseUrl = DEFAULT_WS_BASE) {
  const [orderStatus, setOrderStatus] = useState(null);
  const [estimatedDelivery, setEstimatedDelivery] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // ms

  const connect = useCallback(() => {
    if (!orderId) return;

    // Close any existing connection before opening a new one
    if (wsRef.current) {
      wsRef.current.close();
    }

    const url = `${baseUrl}/orders/${orderId}/track`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status) {
            setOrderStatus((prev) => ({
              ...prev,
              ...data,
              isCancellable: CANCELLABLE_STATUSES.has(data.status),
              statusIndex: ORDER_STATUSES.indexOf(data.status),
            }));
          }

          if (data.estimatedDelivery) {
            setEstimatedDelivery(data.estimatedDelivery);
          }
        } catch {
          setError('Received malformed data from server.');
        }
      };

      ws.onerror = () => {
        setError('Connection error. Attempting to reconnect…');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        setIsConnected(false);

        // Do not reconnect if the closure was intentional (code 1000)
        if (event.code === 1000) return;

        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current += 1;
          setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttemptRef.current);
        } else {
          setError('Unable to maintain connection. Please refresh the page.');
        }
      };
    } catch (err) {
      setError(`Failed to connect: ${err.message}`);
    }
  }, [orderId, baseUrl]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        // Use code 1000 to signal intentional closure
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    setError(null);
    connect();
  }, [connect]);

  return { orderStatus, estimatedDelivery, isConnected, error, reconnect };
}

export { ORDER_STATUSES, CANCELLABLE_STATUSES };
