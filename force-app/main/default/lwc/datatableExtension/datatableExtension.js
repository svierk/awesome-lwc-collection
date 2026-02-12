import LightningDatatable from 'lightning/datatable';
import lookupCustomType from './datatableExtensionLookup.html';

export default class DatatableExtension extends LightningDatatable {
  static customTypes = {
    datatableLookup: {
      template: lookupCustomType,
      standardCellLayout: true,
      typeAttributes: ['recordId', 'fieldName', 'objectName']
    }
  };
}
