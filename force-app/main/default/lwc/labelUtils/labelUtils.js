/**
 * Fills the placeholders of a Custom Label: {0} with the first value, {1} with the second, and so on. A placeholder
 * without a value stays as it is, so a missing value shows up instead of disappearing.
 * @param {string} label - The text of the label, e.g. 'Imported {0} of {1} rows.'
 * @param {...*} values - The values of the placeholders
 * @returns {string} The text with the values
 *
 * @example
 * formatLabel(IMPORTED, 3, 10); // 'Imported 3 of 10 rows.'
 */
export function formatLabel(label, ...values) {
  return String(label).replace(/\{(\d+)\}/g, (placeholder, index) => {
    return index < values.length ? String(values[index]) : placeholder;
  });
}
