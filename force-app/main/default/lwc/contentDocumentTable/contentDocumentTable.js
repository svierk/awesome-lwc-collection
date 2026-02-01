import { refreshApex } from '@salesforce/apex';
import getDocuments from '@salesforce/apex/ContentDocumentController.getDocuments';
import getLatestVersion from '@salesforce/apex/ContentDocumentController.getLatestVersion';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { deleteRecord } from 'lightning/uiRecordApi';
import { api, LightningElement, track, wire } from 'lwc';

const ICONS = {
  csv: 'doctype:csv',
  default: 'doctype:attachment',
  docx: 'doctype:word',
  jpeg: 'doctype:image',
  jpg: 'doctype:image',
  pdf: 'doctype:pdf',
  png: 'doctype:image',
  pptx: 'doctype:ppt',
  rtf: 'doctype:rtf',
  txt: 'doctype:txt',
  xlsx: 'doctype:excel',
  xml: 'doctype:xml',
  zip: 'doctype:zip'
};

const COLUMNS = [
  {
    label: '',
    fieldName: 'icon',
    type: 'contentDocumentIcon',
    hideDefaultActions: true,
    fixedWidth: 40
  },
  {
    label: 'Title',
    fieldName: 'preview',
    type: 'contentDocumentPreview',
    hideDefaultActions: true
  },
  {
    label: 'Size',
    fieldName: 'ContentSize',
    hideDefaultActions: true,
    initialWidth: 80,
    cellAttributes: { alignment: 'right' }
  },
  {
    label: 'Created',
    fieldName: 'CreatedDate',
    type: 'date',
    hideDefaultActions: true,
    initialWidth: 100
  }
];

/**
 * A generic table to show shared documents from a Salesforce Files library.
 * @alias ContentDocumentTable
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-content-document-table library="Documents" record-id={recordid}></c-content-document-table>
 */
export default class ContentDocumentTable extends NavigationMixin(LightningElement) {
  /**
   * If show card option is active,, the card icon is displayed in the header before the card title.
   * It should contain the SLDS name of the icon.
   * Specify the name in the format 'standard:case' where 'standard' is the category and 'case' the icon to be displayed.
   * @type {string}
   * @default ''
   * @example 'standard:case'
   */
  @api cardIcon = 'standard:file';

  /**
   * If show card option is active, The card title can include text and is displayed in the header above the table.
   * @type {string}
   * @default 'Document Table'
   */
  @api cardTitle = 'Document Table';

  /**
   * Folder name within Files library.
   * @type {string}
   */
  @api folder = null;

  /**
   * Files library name.
   * @type {string}
   * @default 'Documents'
   */
  @api library = 'Documents';

  /**
   * If the component is used on a lightning record page, the page sets the property to the id of the current record.
   * @type {string}
   */
  @api recordId = null;

  /**
   * If present, the table is wrapped in a lightning card to fit better into the overall page layout.
   * @type {boolean}
   * @default false
   */
  @api showCard = false;

  /**
   * If present, the last column contains a delete file action.
   * @type {boolean}
   * @default false
   */
  @api showDeleteAction = false;

  /**
   * If present, the last column contains a download file action.
   * @type {boolean}
   * @default false
   */
  @api showDownloadAction = false;

  /**
   * If present, the last column contains a view file action.
   * @type {boolean}
   * @default false
   */
  @api showViewAction = false;

  @track columns = COLUMNS;
  @track documents = [];
  @track wiredRecords = [];

  isLoading = true;

  @wire(getDocuments, {
    library: '$library',
    folder: '$folder',
    recordId: '$recordId'
  })
  wiredGetRecords(result) {
    this.wiredRecords = result;

    if (result.data) {
      const documents = JSON.parse(result.data);

      if (Array.isArray(documents)) {
        documents.forEach((element) => {
          element.icon = ICONS[element.FileExtension] ? ICONS[element.FileExtension] : ICONS.default;
          element.preview = {
            id: element.Id,
            name: element.Title
          };
          if (element.ContentSize) element.ContentSize = this.formatSize(element.ContentSize);
        });
        this.documents = structuredClone(documents);
      }
      this.isLoading = false;
    }
  }

  connectedCallback() {
    this.columns = COLUMNS.slice();
    this.addRowActions();
  }

  addRowActions() {
    const actions = [];
    if (this.showDownloadAction) actions.push({ label: 'Download', name: 'download' });
    if (this.showViewAction) actions.push({ label: 'View', name: 'view' });
    if (this.showDeleteAction) actions.push({ label: 'Delete', name: 'delete' });
    if (actions.length) {
      this.columns.push({ type: 'action', typeAttributes: { rowActions: actions, menuAlignment: 'right' } });
    }
  }

  handleRowAction(event) {
    const actionName = event.detail.action.name;
    const row = event.detail.row;
    switch (actionName) {
      case 'download':
        this.download(row);
        break;
      case 'view':
        this.view(row);
        break;
      case 'delete':
        this.delete(row);
        break;
      default:
        break;
    }
  }

  download(row) {
    getLatestVersion({ recordId: row.Id })
      .then((version) => {
        globalThis.open(`/sfc/servlet.shepherd/version/download/${version}`);
      })
      .catch((error) => {
        this.showToast('Error downloading file', error?.body?.message, 'error');
      });
  }

  view(row) {
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: {
        recordId: row.Id,
        objectApiName: 'ContentDocument',
        actionName: 'view'
      }
    });
  }

  delete(row) {
    this.isLoading = true;
    deleteRecord(row.Id)
      .then(() => {
        this.showToast('Success', 'File deleted', 'success');
        return refreshApex(this.wiredRecords).then(() => {
          this.isLoading = false;
        });
      })
      .catch((error) => {
        this.showToast('Error deleting file', error?.body?.message, 'error');
      });
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title: title, message: message, variant: variant }));
  }

  formatSize(size) {
    return size && size / 1000000 >= 1 ? `${(size / 1000000).toFixed(1)} MB` : `${Number.parseInt(size / 1000, 10)} KB`;
  }
}
