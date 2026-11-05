import CONTENT_DOCUMENT_ID from '@salesforce/schema/ContentVersion.ContentDocumentId';
import qrcodejs from '@salesforce/resourceUrl/qrcodejs';
import { getErrorMessage, showErrorToast } from 'c/errorUtils';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord, getRecord } from 'lightning/uiRecordApi';
import { api, LightningElement, wire } from 'lwc';

const DEFAULT_SIZE = 256;
const MIN_RESOLUTION = 1024;

/**
 * A QR Code Generator with optional logo overlay using the QRCode.js library. The text comes from the user, from the
 * value attribute or from a record field.
 * @alias QrCodeGenerator
 * @extends LightningElement
 * @hideconstructor
 *
 * @fires QrCodeGenerator#qrcodegenerate
 * @fires QrCodeGenerator#qrcodesave
 *
 * @example
 * <c-qr-code-generator value="https://example.com" hide-input onqrcodegenerate={handleGenerate}></c-qr-code-generator>
 */
export default class QrCodeGenerator extends LightningElement {
  /**
   * The color of the dark modules of the code. Keep enough contrast to the light color, so that it stays scannable.
   * @type {string}
   * @default '#000000'
   */
  @api colorDark = '#000000';

  /**
   * The color of the light modules of the code.
   * @type {string}
   * @default '#ffffff'
   */
  @api colorLight = '#ffffff';

  /**
   * The field to read the text from, as 'Website' on record pages or as 'Account.Website' everywhere else.
   * @type {string}
   */
  @api fieldApiName;

  /**
   * If present, only the code is shown, without the inputs and the generate button.
   * @type {boolean}
   * @default false
   */
  @api hideInput = false;

  /**
   * The API name of the object of the record. Set automatically on record pages.
   * @type {string}
   */
  @api objectApiName;

  /**
   * The record to read the field from and to save the code to. Set automatically on record pages.
   * @type {string}
   */
  @api recordId;

  /**
   * If present, a button saves the code as a file on the record given by record-id.
   * @type {boolean}
   * @default false
   */
  @api saveToRecord = false;

  /**
   * The displayed size of the code in pixels. The image has at least a resolution of 1024 pixels.
   * @type {number}
   * @default 256
   */
  @api size = DEFAULT_SIZE;

  /**
   * The text of the code. It wins over a record field, and the code is generated without a click.
   * @type {string}
   */
  @api
  get value() {
    return this._value;
  }

  set value(text) {
    this._value = text;
    this.syncExternalText();
  }

  /**
   * The logo to show in the code. An image from another domain needs to allow this with CORS.
   * @type {string}
   */
  @api
  get logoUrl() {
    return this._logoUrl;
  }

  set logoUrl(url) {
    this._logoUrl = url;
    this.logoDataUrl = url || null;
  }

  /**
   * Read-only. The code as a PNG data URL, empty without a code. Also available as a Flow output.
   * @type {string}
   */
  @api
  get qrCodeDataUrl() {
    return this._qrCodeDataUrl;
  }

  /**
   * Read-only. The id of the saved file. Empties with a new code. Also available as a Flow output.
   * @type {string}
   */
  @api
  get contentDocumentId() {
    return this._contentDocumentId;
  }

  url = '';
  logoDataUrl = null;
  logoFileName = '';
  isLoading = false;
  isSaving = false;
  errorMessage;
  qrLibLoaded = false;
  _value;
  _logoUrl;
  _recordText = '';
  _qrCodeDataUrl = '';
  _contentDocumentId;
  _contentVersionId;
  _latestRun = 0;

  get fieldRecordId() {
    return this.fieldApiName ? this.recordId : undefined;
  }

  get recordFields() {
    if (!this.fieldApiName) return undefined;
    return [this.fieldApiName.includes('.') ? this.fieldApiName : `${this.objectApiName}.${this.fieldApiName}`];
  }

  @wire(getRecord, { recordId: '$fieldRecordId', fields: '$recordFields' })
  wiredField({ data, error }) {
    if (data) {
      const fieldName = this.fieldApiName.split('.').pop();
      this._recordText = String(data.fields[fieldName]?.value ?? '');
      this.syncExternalText();
    } else if (error) {
      this.errorMessage = `The record field could not be read: ${getErrorMessage(error)}`;
    }
  }

  @wire(getRecord, { recordId: '$_contentVersionId', fields: [CONTENT_DOCUMENT_ID] })
  wiredContentVersion({ data, error }) {
    if (data) {
      this.finishSave(data.fields.ContentDocumentId.value);
    } else if (error) {
      this.failSave(error);
    }
  }

  connectedCallback() {
    this.loadQRCodeLibrary();
  }

  loadQRCodeLibrary() {
    if (this.qrLibLoaded) {
      return;
    }
    loadScript(this, qrcodejs)
      .then(() => {
        this.qrLibLoaded = true;
        this.syncExternalText();
      })
      .catch((err) => {
        this.errorMessage = `Failed to load QR code library: ${getErrorMessage(err)}`;
      });
  }

  syncExternalText() {
    if (this._value === undefined && !this._recordText) return;
    this.url = this._value || this._recordText;
    if (!this.url) {
      this.setCode('');
    } else if (this.qrLibLoaded) {
      this.generateCode();
    }
  }

  handleUrlChange(event) {
    this.url = event.target.value;
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
      this.logoDataUrl = null;
      this.logoFileName = '';
      return;
    }

    this.logoFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.logoDataUrl = e.target.result;
    };
    reader.onerror = () => {
      this.errorMessage = 'Failed to read the selected file.';
    };
    reader.readAsDataURL(file);
  }

  handleRemoveLogo() {
    this.logoDataUrl = null;
    this.logoFileName = '';
    const fileInput = this.template.querySelector('[data-id="file-input"]');
    if (fileInput) {
      fileInput.value = '';
    }
  }

  generateCode() {
    if (!this.url) {
      this.errorMessage = 'Please enter a text or URL.';
      return;
    }

    if (!this.qrLibLoaded || globalThis.QRCodeWithLogo === undefined) {
      this.errorMessage = 'QR code library not loaded. Please try again.';
      return;
    }

    this.errorMessage = undefined;
    this.isLoading = true;
    this.setCode('');
    this._latestRun += 1;
    const run = this._latestRun;

    Promise.resolve()
      .then(() => globalThis.QRCodeWithLogo.generate(this.codeOptions))
      .then((dataUrl) => this.finishGenerate(run, dataUrl))
      .catch((err) => this.failGenerate(run, err));
  }

  finishGenerate(run, dataUrl) {
    if (run !== this._latestRun) return;
    this.isLoading = false;
    this.setCode(dataUrl);
    this.dispatchEvent(new CustomEvent('qrcodegenerate', { detail: { dataUrl, value: this.url } }));
  }

  failGenerate(run, err) {
    if (run !== this._latestRun) return;
    this.isLoading = false;
    this.errorMessage = `Failed to generate QR code: ${getErrorMessage(err)}`;
  }

  get codeOptions() {
    const resolution = Math.max(this.displaySize, MIN_RESOLUTION);
    return {
      text: this.url,
      width: resolution,
      height: resolution,
      colorDark: this.colorDark,
      colorLight: this.colorLight,
      correctLevel: globalThis.QRCodeWithLogo.CorrectLevel.H,
      logoUrl: this.logoDataUrl,
      logoSize: 0.25,
      logoRound: true,
      logoBackgroundColor: '#ffffff'
    };
  }

  setCode(dataUrl) {
    if (dataUrl !== this._qrCodeDataUrl) {
      this._qrCodeDataUrl = dataUrl;
      this.dispatchEvent(new FlowAttributeChangeEvent('qrCodeDataUrl', dataUrl));
    }
    if (this._contentDocumentId) {
      this._contentDocumentId = undefined;
      this._contentVersionId = undefined;
      this.dispatchEvent(new FlowAttributeChangeEvent('contentDocumentId', undefined));
    }
  }

  async handleSave() {
    this.isSaving = true;
    try {
      const { id } = await createRecord({
        apiName: 'ContentVersion',
        fields: {
          Title: 'QR Code',
          PathOnClient: 'qr-code.png',
          VersionData: this._qrCodeDataUrl.split(',')[1],
          FirstPublishLocationId: this.recordId
        }
      });
      this._contentVersionId = id;
    } catch (error) {
      this.failSave(error);
    }
  }

  finishSave(contentDocumentId) {
    this.isSaving = false;
    this._contentDocumentId = contentDocumentId;
    this.dispatchEvent(new CustomEvent('qrcodesave', { detail: { contentDocumentId } }));
    this.dispatchEvent(new FlowAttributeChangeEvent('contentDocumentId', contentDocumentId));
    this.dispatchEvent(
      new ShowToastEvent({ title: 'Success', message: 'The QR code has been saved.', variant: 'success' })
    );
  }

  failSave(error) {
    this.isSaving = false;
    showErrorToast(this, 'Error saving the QR code', error);
  }

  get displaySize() {
    return Number(this.size) > 0 ? Number(this.size) : DEFAULT_SIZE;
  }

  get imageStyle() {
    return `width: ${this.displaySize}px; max-width: 100%; height: auto`;
  }

  get hasQRCode() {
    return this._qrCodeDataUrl !== '';
  }

  get hasLogo() {
    return this.logoDataUrl !== null;
  }

  get showInput() {
    return !this.hideInput;
  }

  get showSave() {
    return this.saveToRecord && Boolean(this.recordId) && this.hasQRCode;
  }

  get isSaveDisabled() {
    return this.isSaving || Boolean(this.contentDocumentId);
  }

  get isGenerateDisabled() {
    return !this.url || this.isLoading;
  }
}
