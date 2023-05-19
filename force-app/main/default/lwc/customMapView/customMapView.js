import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import { api, LightningElement, track, wire } from 'lwc';

const ICONS = {
  Account: 'standard:account',
  Asset: 'standard:asset_object'
};

/**
 * Configurable map component for displaying locations via Google Maps API.
 * @alias CustomMapView
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-custom-map-view
 *   object-api-name="Account"
 *   height="400px"
 *   width="100%"
 * ></c-custom-map-view>
 */
export default class CustomMapView extends LightningElement {
  /**
   * If the component is used on a lightning record page, the page sets the property to the id of the current record.
   * @type {string}
   */
  @api recordId;

  /**
   * If the component is used on a lightning record page, the page sets the property to the API name of the current object.
   * @type {string}
   */
  @api objectApiName;

  /**
   * Height of the map component in percent or pixels. The default is 400px.
   * @type {string}
   * @default '400px'
   */
  @api height = '400px';

  /**
   * Width of the map component in percent or pixels. The default is 100%.
   * @type {string}
   * @default '100%'
   */
  @api width = '100%';

  /**
   * Displays or hides the list of locations. Valid values are visible, hidden, or auto.
   * @type {string}
   * @default 'auto'
   */
  @api listView = 'auto';

  /**
   * Supports zoom levels from 1 to 20. If not specified, the component calculates a zoom level to accommodate the markers in the map.
   * @type {string}
   */
  @api zoomLevel;

  /**
   * API name of the field that contains the location title. The default is the Name field.
   * @type {string}
   * @default 'Name'
   */
  @api titleField = 'Name';

  /**
   * API name of the field that contains the city.
   * @type {string}
   */
  @api cityField;

  /**
   * API name of the field that contains the country.
   * @type {string}
   */
  @api countryField;

  /**
   * API name of the field that contains the postal code.
   * @type {string}
   */
  @api postalCodeField;

  /**
   * API name of the field that contains the state.
   * @type {string}
   */
  @api stateField;

  /**
   * API name of the field that contains the street.
   * @type {string}
   */
  @api streetField;

  @track mapMarkers;

  @wire(getRecord, { recordId: '$recordId', layoutTypes: ['Full'] })
  wiredRecord({ error, data }) {
    if (data?.fields) {
      const fields = data.fields;
      const title = fields[this.titleField]?.value;
      const city = fields[this.cityField]?.value;
      const country = fields[this.countryField]?.displayValue;
      const postalCode = fields[this.postalCodeField]?.value;
      const state = fields[this.stateField]?.value;
      const street = fields[this.streetField]?.value;
      const location = {
        City: city,
        Country: country,
        PostalCode: postalCode,
        State: state,
        Street: street
      };
      this.mapMarkers = [
        {
          location: location,
          icon: ICONS[this.objectApiName],
          title: title
        }
      ];
    } else if (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Error loading location data',
          message: error.body.message,
          variant: 'error'
        })
      );
    }
  }

  get styles() {
    return `height:${this.height}; width:${this.width}`;
  }
}
