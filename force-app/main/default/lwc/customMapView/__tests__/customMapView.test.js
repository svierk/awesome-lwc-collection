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

  it('should handle errors properly', async () => {
    // when
    document.body.appendChild(element);
    getRecord.error();

    // then
    expect(element).toBeTruthy();
  });
});
