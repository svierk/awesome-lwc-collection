import { createTestWireAdapter } from '@salesforce/wire-service-jest-util';

class Graphql extends createTestWireAdapter() {
  static emit(value, filterFn, refreshFn) {
    super.emit(
      {
        data: value,
        errors: undefined,
        ...(refreshFn !== undefined && { refresh: refreshFn })
      },
      filterFn
    );
  }

  static emitErrors(errors, filterFn, refreshFn) {
    super.emit(
      {
        data: undefined,
        errors,
        ...(refreshFn !== undefined && { refresh: refreshFn })
      },
      filterFn
    );
  }

  constructor(dataCallback) {
    super(dataCallback);
    Graphql.emit(undefined);
  }
}

export { Graphql as graphql };

export const gql = jest.fn((strings, ...values) => {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
});
