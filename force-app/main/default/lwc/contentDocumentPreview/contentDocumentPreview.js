import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { LightningElement, api, wire } from 'lwc';

export default class ContentDocumentPreview extends NavigationMixin(LightningElement) {
  @wire(CurrentPageReference) pageRef;
  @api preview;

  showPreview() {
    this[NavigationMixin.Navigate]({
      type: 'standard__namedPage',
      attributes: {
        pageName: 'filePreview'
      },
      state: {
        selectedRecordId: this.preview.id
      }
    });
  }
}
