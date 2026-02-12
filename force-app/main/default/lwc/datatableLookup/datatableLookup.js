import { api, LightningElement } from 'lwc';

export default class DatatableLookup extends LightningElement {
  @api recordId;
  @api objectName;
  @api fieldName;
}
