import { api, LightningElement } from 'lwc';

export default class CustomDatatableLookup extends LightningElement {
  @api recordId;
  @api objectName;
  @api fieldName;
}
