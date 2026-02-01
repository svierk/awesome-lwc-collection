import { gql, graphql } from 'lightning/graphql';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { LightningElement, track, wire } from 'lwc';

const ICONS = {
  Account: 'standard:account',
  Asset: 'standard:asset_object'
};

let query;

export default class GraphqlMapViewExtension extends LightningElement {
  @track mapMarkers;
  config;

  constructor() {
    super();
    this.config = globalThis.mapConfig;

    let fields = '';
    if (this.config?.fields) {
      Object.keys(this.config.fields).forEach((field) => {
        if (this.config.fields[field]) fields += `${this.config.fields[field]} {\n\tvalue\n}\n`;
      });
    }

    query = `query getLocation($recordId: ID!) {
          uiapi {
            query {
              ${this.config.object}(where: { Id: { eq: $recordId } }) {
                edges {
                  node {
                    Id
                    ${fields}
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
    query: gql`
      ${query}
    `,
    variables: '$variables'
  })
  location({ data, errors }) {
    if (data?.uiapi?.query[this.config.object]?.edges?.length > 0) {
      const fields = data.uiapi.query[this.config.object].edges[0].node;
      this.mapMarkers = [
        {
          location: {
            City: fields[this.config.fields.city]?.value,
            Country: fields[this.config.fields.country]?.value,
            PostalCode: fields[this.config.fields.code]?.value,
            State: fields[this.config.fields.state]?.value,
            Street: fields[this.config.fields.street]?.value
          },
          icon: ICONS[this.config.object],
          title: fields[this.config.fields.title]?.value
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
      recordId: this.config.id
    };
  }

  get styles() {
    return `height:${this.config.height}; width:${this.config.width}`;
  }
}
