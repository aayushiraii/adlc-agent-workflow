/**
 * orderService.js
 * Provides HTTP API calls related to order tracking, cancellation, and history.
 * All requests automatically attach the Authorization header from localStorage.
 */

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

/**
 * Builds common request headers.
 * @returns {HeadersInit}
 */
function buildHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Parses the HTTP response and throws a structured error on non-2xx status.
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      (typeof body === 'object' && body.message) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

/**
 * Fetch the current status of an order.
 * @param {string} orderId
 * @returns {Promise<Object>} Order status payload
 */
export async function fetchOrderStatus(orderId) {
  if (!orderId) throw new Error('orderId is required');

  const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Cancel an order by ID.
 * @param {string} orderId
 * @param {string} [reason] - Optional cancellation reason
 * @returns {Promise<Object>} Cancellation result payload
 */
export async function cancelOrder(orderId, reason = '') {
  if (!orderId) throw new Error('orderId is required');

  const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ reason }),
  });

  return parseResponse(response);
}

/**
 * Fetch the authenticated user's order history.
 * @param {{ page?: number, limit?: number }} [options]
 * @returns {Promise<{ orders: Array, total: number, page: number }>}
 */
export async function fetchOrderHistory({ page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page, limit });

  const response = await fetch(`${API_BASE}/orders/history?${params.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Fetch a single order's full details.
 * @param {string} orderId
 * @returns {Promise<Object>}
 */
export async function fetchOrderDetails(orderId) {
  if (!orderId) throw new Error('orderId is required');

  const response = await fetch(`${API_BASE}/orders/${orderId}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  return parseResponse(response);
}
