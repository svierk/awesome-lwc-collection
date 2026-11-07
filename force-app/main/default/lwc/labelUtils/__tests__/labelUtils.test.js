import { formatLabel } from 'c/labelUtils';

describe('c-label-utils', () => {
  it.each([
    ['in order', 'Imported {0} of {1} rows.', [3, 10], 'Imported 3 of 10 rows.'],
    ['in another order and more than once', '{1} before {0}, then {1} again', ['a', 'b'], 'b before a, then b again'],
    ['that are empty or zero', '"{0}" has {1} rows', ['', 0], '"" has 0 rows'],
    ['and keep the ones without a value', 'Rows {0} to {1}', [1], 'Rows 1 to {1}'],
    ['without placeholders', 'Next', [], 'Next']
  ])('should fill placeholders %s', (_label, label, values, expected) => {
    // when / then
    expect(formatLabel(label, ...values)).toBe(expected);
  });
});
