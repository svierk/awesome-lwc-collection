import qrcodejs from '@salesforce/resourceUrl/qrcodejs';
import { loadScript } from 'lightning/platformResourceLoader';
import { LightningElement } from 'lwc';

/**
 * A basic QR Code Generator with optional logo overlay using the QRCode.js library.
 * @alias QrCodeGenerator
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-qr-code-generator></c-qr-code-generator>
 */
export default class QrCodeGenerator extends LightningElement {
  url = '';
  logoDataUrl = null;
  logoFileName = '';
  qrCodeDataUrl = '';
  isLoading = false;
  error;
  qrLibLoaded = false;

  connectedCallback() {
    this.loadQRCodeLibrary();
  }

  async loadQRCodeLibrary() {
    if (this.qrLibLoaded) {
      return;
    }
    try {
      await loadScript(this, qrcodejs);
      this.qrLibLoaded = true;
    } catch (err) {
      this.error = `Failed to load QR code library: ${err.message || String(err)}`;
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
      this.error = 'Failed to read the selected file.';
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
      this.error = 'Please enter a URL.';
      return;
    }

    if (!this.qrLibLoaded || globalThis.QRCodeWithLogo === undefined) {
      this.error = 'QR code library not loaded. Please try again.';
      return;
    }

    this.error = undefined;
    this.isLoading = true;
    this.qrCodeDataUrl = '';

    try {
      const options = {
        text: this.url,
        width: 1024,
        height: 1024,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: globalThis.QRCodeWithLogo.CorrectLevel.H,
        logoUrl: this.logoDataUrl,
        logoSize: 0.25,
        logoRound: true,
        logoBackgroundColor: '#ffffff'
      };

      this.qrCodeDataUrl = await globalThis.QRCodeWithLogo.generate(options);
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
      this.error = `Failed to generate QR code: ${err.message || String(err)}`;
    }
  }

  get hasQRCode() {
    return this.qrCodeDataUrl !== '';
  }

  get hasLogo() {
    return this.logoDataUrl !== null;
  }

  get isGenerateDisabled() {
    return !this.url || this.isLoading;
  }
}
