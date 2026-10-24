import GraphqlMapView from 'c/graphqlMapView';
import { graphql } from 'lightning/graphql';
import { createElement } from 'lwc';

const mockGraphQL = require('./data/getLocation.json');

let element;

describe('c-graphql-map-view', () => {
  beforeEach(() => {
    element = createElement('c-graphql-map-view', {
      is: GraphqlMapView
    });

    element.recordId = '123';
    element.titleField = 'Name';
    element.cityField = 'BillingCity';
    element.countryField = 'BillingCountry';
    element.postalCodeField = 'BillingPostalCode';
    element.streetField = 'BillingStreet';
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should create and be accessible', async () => {
    // given
    element.objectApiName = 'Account';

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });

  it('should be accessible when data returned', async () => {
    // given
    element.objectApiName = 'Account';

    // when
    document.body.appendChild(element);
    graphql.emit(mockGraphQL);

    // then
    await expect(element).toBeAccessible();
  });

  it('should be accessible and show card icon and title when show card option is selected', async () => {
    // given
    element.objectApiName = 'Account';
    element.showCard = true;
    element.cardIcon = 'standard:account';
    element.cardTitle = 'Billing Address';

    // when
    document.body.appendChild(element);
    graphql.emit(mockGraphQL);

    // then
    const card = element.shadowRoot.querySelector('lightning-card');
    expect(card).not.toBeNull();
    expect(card.iconName).toBe('standard:account');
    expect(card.title).toBe('Billing Address');
    expect(card.querySelector('lightning-map')).not.toBeNull();
    await expect(element).toBeAccessible();
  });

  it('should render the map without card by default', () => {
    // given
    element.objectApiName = 'Account';

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('lightning-card')).toBeNull();
    expect(element.shadowRoot.querySelector('lightning-map')).not.toBeNull();
  });

  it('should be accessible when error returned', async () => {
    // given
    element.objectApiName = undefined;

    // when
    document.body.appendChild(element);
    graphql.emitErrors(['error']);

    // then
    await expect(element).toBeAccessible();
  });
});
