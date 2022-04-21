import LightningDatatable from 'lightning/datatable';
import lookupCustomType from './customDatatableExtensionLookup.html';

export default class CustomDatatableExtension extends LightningDatatable {
  static customTypes = {
    datatableLookup: {
      template: lookupCustomType,
      standardCellLayout: true,
      typeAttributes: ['recordId', 'fieldName', 'objectName']
    }
  };
}
