import LightningDatatable from 'lightning/datatable';
import contentDocumentIcon from './contentDocumentIcon.html';
import contentDocumentPreview from './contentDocumentPreview.html';

export default class ContentDocumentTableExtension extends LightningDatatable {
  static customTypes = {
    contentDocumentIcon: {
      template: contentDocumentIcon,
      standardCellLayout: true,
      typeAttributes: ['icon']
    },
    contentDocumentPreview: {
      template: contentDocumentPreview,
      standardCellLayout: true,
      typeAttributes: ['preview']
    }
  };
}
