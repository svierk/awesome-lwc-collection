import CustomMapView from 'c/customMapView';
import { getRecord } from 'lightning/uiRecordApi';
import { createElement } from 'lwc';

const mockGetRecord = require('./data/getRecord.json');

let element;

describe('c-custom-map-view', () => {
  beforeEach(() => {
    element = createElement('c-custom-map-view', {
      is: CustomMapView
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should be accessible and successfully load map view', async () => {
    // given
    element.recordId = '123';
    element.objectApiName = 'Account';
    element.height = '400px';
    element.width = '100%';
    element.listView = 'auto';
    element.titleField = 'Name';
    element.cityField = 'BillingCity';
    element.countryField = 'BillingCountry';
    element.postalCodeField = 'BillingPostalCode';
    element.stateField = '';
    element.streetField = 'BillingStreet';

    // when
    document.body.appendChild(element);
    getRecord.emit(mockGetRecord);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });

  it('should be accessible and show card icon and title when show card option is selected', async () => {
    // given
    element.recordId = '123';
    element.objectApiName = 'Account';
    element.showCard = true;
    element.cardIcon = 'standard:account';
    element.cardTitle = 'Billing Address';

    // when
    document.body.appendChild(element);
    getRecord.emit(mockGetRecord);

    // then
    const card = element.shadowRoot.querySelector('lightning-card');
    expect(card).not.toBeNull();
    expect(card.iconName).toBe('standard:account');
    expect(card.title).toBe('Billing Address');
    expect(card.querySelector('lightning-map')).not.toBeNull();
    await expect(element).toBeAccessible();
  });

  it('should render the map without card by default', () => {
    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('lightning-card')).toBeNull();
    expect(element.shadowRoot.querySelector('lightning-map')).not.toBeNull();
  });

  it('should handle errors properly', async () => {
    // when
    document.body.appendChild(element);
    getRecord.error();

    // then
    expect(element).toBeTruthy();
  });
});
