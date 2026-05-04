import { createTestWireAdapter } from '@salesforce/wire-service-jest-util';

class GraphqlWireAdapter extends createTestWireAdapter() {
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
    GraphqlWireAdapter.emit(undefined);
  }
}

// Spy used for all imperative mutation calls. Exposed as graphql.mutate so
// tests only need to import the canonical `graphql` identifier.
GraphqlWireAdapter.mutate = jest.fn().mockResolvedValue({ data: {} });

// Proxy makes graphql callable as a regular function (for mutations) while
// keeping the wire adapter class behaviour intact for @wire(graphql, ...) usage.
export const graphql = new Proxy(GraphqlWireAdapter, {
  apply(_target, _thisArg, args) {
    return GraphqlWireAdapter.mutate(...args);
  }
});

export const gql = jest.fn((strings, ...values) => {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
});
