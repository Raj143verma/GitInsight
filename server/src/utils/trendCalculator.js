/**
 * Utility functions for computing mathematical trends, deltas, and percentage distributions.
 * Safely guards against division-by-zero, NaN, and Infinity.
 */

/**
 * Calculates absolute and percentage change between an initial and final value.
 */
export const calculateDelta = (startValue = 0, endValue = 0) => {
  const start = Number(startValue) || 0;
  const end = Number(endValue) || 0;
  const absoluteChange = end - start;

  let percentageChange = 0;
  if (start === 0 && end === 0) {
    percentageChange = 0;
  } else if (start === 0 && end !== 0) {
    percentageChange = end > 0 ? 100 : -100;
  } else {
    percentageChange = Number((((end - start) / Math.abs(start)) * 100).toFixed(2));
  }

  return {
    start,
    end,
    absoluteChange,
    percentageChange,
  };
};

/**
 * Normalizes a key-value record of counts/bytes into a sorted percentage distribution array.
 */
export const calculateDistribution = (dataMapOrObject = {}) => {
  const rawObj =
    dataMapOrObject instanceof Map
      ? Object.fromEntries(dataMapOrObject)
      : dataMapOrObject || {};

  const entries = Object.entries(rawObj).map(([name, value]) => ({
    name,
    value: Number(value) || 0,
  }));

  const total = entries.reduce((sum, item) => sum + item.value, 0);

  const distribution = entries
    .map((item) => ({
      name: item.name,
      value: item.value,
      percentage: total > 0 ? Number(((item.value / total) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    total,
    items: distribution,
  };
};

/**
 * Validates date strings in YYYY-MM-DD format.
 */
export const validateDateRange = (from, to) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (from && !dateRegex.test(from)) {
    const err = new Error("Invalid 'from' date format. Expected YYYY-MM-DD.");
    err.statusCode = 400;
    throw err;
  }

  if (to && !dateRegex.test(to)) {
    const err = new Error("Invalid 'to' date format. Expected YYYY-MM-DD.");
    err.statusCode = 400;
    throw err;
  }

  if (from && to && from > to) {
    const err = new Error("'from' date cannot be after 'to' date.");
    err.statusCode = 400;
    throw err;
  }
};
