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

export const graphql = GraphqlWireAdapter;

export const executeMutation = jest.fn().mockResolvedValue({ data: {} });

export const gql = jest.fn((strings, ...values) => {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
});
