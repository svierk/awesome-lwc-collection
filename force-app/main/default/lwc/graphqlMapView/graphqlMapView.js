import { gql, graphql } from 'lightning/graphql';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { api, LightningElement, track, wire } from 'lwc';

const ICONS = {
  Account: 'standard:account',
  Asset: 'standard:asset_object'
};

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

  @track mapMarkers;

  get graphqlQuery() {
    if (!this.objectApiName) return undefined;

    const fieldEntries = [
      this.titleField,
      this.cityField,
      this.countryField,
      this.postalCodeField,
      this.stateField,
      this.streetField
    ];
    const fieldNodes = fieldEntries
      .filter((f) => f)
      .map((f) => `${f} { value }`)
      .join('\n');

    return gql`
      query getLocation($recordId: ID!) {
        uiapi {
          query {
            ${this.objectApiName}(where: { Id: { eq: $recordId } }) {
              edges {
                node {
                  Id
                  ${fieldNodes}
                }
              }
              pageInfo {
                endCursor
                hasNextPage
                hasPreviousPage
              }
            }
          }
        }
      }
    `;
  }

  @wire(graphql, {
    query: '$graphqlQuery',
    variables: '$variables'
  })
  location({ data, errors }) {
    if (data?.uiapi?.query[this.objectApiName]?.edges?.length > 0) {
      const fields = data.uiapi.query[this.objectApiName].edges[0].node;
      this.mapMarkers = [
        {
          location: {
            City: fields[this.cityField]?.value,
            Country: fields[this.countryField]?.value,
            PostalCode: fields[this.postalCodeField]?.value,
            State: fields[this.stateField]?.value,
            Street: fields[this.streetField]?.value
          },
          icon: ICONS[this.objectApiName],
          title: fields[this.titleField]?.value
        }
      ];
    } else if (errors) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Error loading location data',
          message: errors[0].message,
          variant: 'error'
        })
      );
    }
  }

  get variables() {
    return {
      recordId: this.recordId
    };
  }

  get styles() {
    return `height:${this.height}; width:${this.width}`;
  }
}
