import { api, LightningElement } from 'lwc';

/**
 * Configurable map component for displaying locations via Google Maps API.
 * @alias GraphqlMapView
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-graphql-map-view
 *   object-api-name="Account"
 *   height="400px"
 *   width="100%"
 * ></c-graphql-map-view>
 */
export default class GraphqlMapView extends LightningElement {
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

  connectedCallback() {
    globalThis.mapConfig = {
      id: this.recordId,
      object: this.objectApiName,
      height: this.height,
      width: this.width,
      view: this.listView,
      zoom: this.zoomLevel,
      fields: {
        title: this.titleField,
        city: this.cityField,
        country: this.countryField,
        code: this.postalCodeField,
        state: this.stateField,
        street: this.streetField
      }
    };
  }
}
