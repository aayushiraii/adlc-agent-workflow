'use strict';

/**
 * Paginates a given array and returns a standardised pagination envelope.
 *
 * @param {Array}  items   - The full array of items to paginate.
 * @param {number} page    - Current page number (1-based). Defaults to 1.
 * @param {number} limit   - Number of items per page. Defaults to 10. Max 100.
 * @returns {{
 *   data       : Array,
 *   pagination : {
 *     total      : number,
 *     page       : number,
 *     limit      : number,
 *     totalPages : number,
 *     hasNext    : boolean,
 *     hasPrev    : boolean,
 *   }
 * }}
 */
function paginate(items, page = 1, limit = 10) {
  const safePage  = Math.max(1, parseInt(page,  10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const total     = items.length;
  const totalPages = Math.ceil(total / safeLimit) || 1;

  const clampedPage = Math.min(safePage, totalPages);
  const start       = (clampedPage - 1) * safeLimit;
  const data        = items.slice(start, start + safeLimit);

  return {
    data,
    pagination: {
      total,
      page       : clampedPage,
      limit      : safeLimit,
      totalPages,
      hasNext    : clampedPage < totalPages,
      hasPrev    : clampedPage > 1,
    },
  };
}

module.exports = { paginate };
