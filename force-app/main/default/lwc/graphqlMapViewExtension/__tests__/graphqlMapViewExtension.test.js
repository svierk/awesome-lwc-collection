import GraphqlMapViewExtension from 'c/graphqlMapViewExtension';
import { graphql } from 'lightning/uiGraphQLApi';
import { createElement } from 'lwc';

const mockGraphQL = require('./data/getLocation.json');

Object.defineProperty(global.window, 'mapConfig', {
  value: {
    id: '123',
    object: 'Account',
    height: '400px',
    width: '100%',
    view: 'auto',
    zoom: '8',
    fields: {
      title: 'Name',
      city: 'BillingCity',
      country: 'BillingCountry',
      code: 'BillingPostalCode',
      state: undefined,
      street: 'BillingStreet'
    }
  }
});

let element;

describe('c-graphql-map-view-extension', () => {
  beforeEach(() => {
    element = createElement('c-graphql-map-view-extension', {
      is: GraphqlMapViewExtension
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('is accessible when data returned', async () => {
    // when
    document.body.appendChild(element);
    graphql.emit(mockGraphQL);

    // then
    await expect(element).toBeAccessible();
  });

  it('is accessible when error returned', async () => {
    // when
    document.body.appendChild(element);
    graphql.emitErrors(['error']);

    // then
    await expect(element).toBeAccessible();
  });
});
