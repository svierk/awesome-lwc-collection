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
const MIN_SCAN_CONTRAST = 3;

/** Returns the WCAG relative luminance of a hex color, or null for any other color format. */
function getLuminance(color) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return null;
  const full = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex;
  const [r, g, b] = [0, 2, 4].map((start) => {
    const channel = Number.parseInt(full.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * A QR Code Generator for URLs with optional logo overlay using the QRCode.js library.
 * @alias QrCodeGenerator
 * @extends LightningElement
 * @hideconstructor
 *
 * @fires QrCodeGenerator#qrcodegenerate
 * @fires QrCodeGenerator#qrcodesave
 *
 * @example
 * <c-qr-code-generator size="300" onqrcodegenerate={handleGenerate}></c-qr-code-generator>
 */
export default class QrCodeGenerator extends LightningElement {
  /**
   * The initial color of the dark modules of the code. Users can change it.
   * @type {string}
   * @default '#000000'
   */
  @api
  get colorDark() {
    return this._colorDark;
  }

  set colorDark(value) {
    this._colorDark = value;
  }

  /**
   * The initial color of the light modules of the code. Users can change it.
   * @type {string}
   * @default '#ffffff'
   */
  @api
  get colorLight() {
    return this._colorLight;
  }

  set colorLight(value) {
    this._colorLight = value;
  }

  /**
   * The record to save the code to. Set automatically on record pages.
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
  isUrlValid = true;
  _colorDark = '#000000';
  _colorLight = '#ffffff';
  errorMessage;
  qrLibLoaded = false;
  _logoUrl;
  _qrCodeDataUrl = '';
  _contentDocumentId;
  _contentVersionId;

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
      })
      .catch((err) => {
        this.errorMessage = `Failed to load QR code library: ${getErrorMessage(err)}`;
      });
  }

  handleUrlChange(event) {
    const input = event.target;
    this.url = input.value;
    this.isUrlValid = input.validity.valid;
    if (this.isUrlValid) {
      // the input only updates its message when it loses the focus, so a corrected url has to clear it here
      input.reportValidity();
    } else {
      this.setCode('');
    }
  }

  handleColorDarkChange(event) {
    this._colorDark = event.target.value;
  }

  handleColorLightChange(event) {
    this._colorLight = event.target.value;
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

  async generateCode() {
    if (!this.url) {
      this.errorMessage = 'Please enter a URL.';
      return;
    }

    if (!this.qrLibLoaded || globalThis.QRCodeWithLogo === undefined) {
      this.errorMessage = 'QR code library not loaded. Please try again.';
      return;
    }

    this.errorMessage = undefined;
    this.isLoading = true;
    this.setCode('');

    try {
      const dataUrl = await globalThis.QRCodeWithLogo.generate(this.codeOptions);
      this.setCode(dataUrl);
      this.dispatchEvent(new CustomEvent('qrcodegenerate', { detail: { dataUrl, value: this.url } }));
    } catch (err) {
      this.errorMessage = `Failed to generate QR code: ${getErrorMessage(err)}`;
    } finally {
      this.isLoading = false;
    }
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

  get isHardToScan() {
    const dark = getLuminance(this.colorDark);
    const light = getLuminance(this.colorLight);
    if (dark === null || light === null) return false;
    return dark >= light || (light + 0.05) / (dark + 0.05) < MIN_SCAN_CONTRAST;
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

  get showSave() {
    return this.saveToRecord && Boolean(this.recordId) && this.hasQRCode;
  }

  get isSaveDisabled() {
    return this.isSaving || Boolean(this.contentDocumentId);
  }

  get isGenerateDisabled() {
    return !this.url || !this.isUrlValid || this.isLoading;
  }
}
