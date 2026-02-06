import QrCodeGenerator from 'c/qrCodeGenerator';
import { loadScript } from 'lightning/platformResourceLoader';
import { createElement } from 'lwc';

jest.mock('lightning/platformResourceLoader', () => ({ loadScript: jest.fn() }), {
  virtual: true
});

const flushPromises = () => new Promise(process.nextTick);

let element;

function getInputs() {
  const inputs = element.shadowRoot.querySelectorAll('lightning-input');
  return { urlInput: inputs[0], fileInput: inputs[1] };
}

describe('c-qr-code-generator', () => {
  beforeEach(() => {
    element = createElement('c-qr-code-generator', {
      is: QrCodeGenerator
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    delete globalThis.QRCodeWithLogo;
    jest.restoreAllMocks();
  });

  it('should load lib, upload logo, generate QR code, remove logo, and skip reload on re-insert', async () => {
    // given
    loadScript.mockResolvedValueOnce();

    // when
    document.body.appendChild(element);
    await flushPromises();

    const { urlInput, fileInput } = getInputs();
    urlInput.value = 'https://example.com';
    urlInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    const generateBtn = element.shadowRoot.querySelector('lightning-button');
    expect(generateBtn.disabled).toBe(false);

    // when
    const mockFile = new File(['logo'], 'logo.png', { type: 'image/png' });
    const mockReader = { readAsDataURL: jest.fn(), onload: null, onerror: null };
    jest.spyOn(globalThis, 'FileReader').mockImplementation(() => mockReader);

    fileInput.files = [mockFile];
    fileInput.dispatchEvent(new CustomEvent('change'));
    expect(mockReader.readAsDataURL).toHaveBeenCalledWith(mockFile);

    mockReader.onload({ target: { result: 'data:image/png;base64,abc' } });
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.logo-preview-image')).toBeTruthy();

    // when
    globalThis.QRCodeWithLogo = {
      CorrectLevel: { H: 2 },
      generate: jest.fn().mockResolvedValue('data:image/png;base64,qrcode')
    };
    generateBtn.click();
    await flushPromises();

    // then
    expect(globalThis.QRCodeWithLogo.generate).toHaveBeenCalled();
    const qrImage = element.shadowRoot.querySelector('.qr-code-image');
    expect(qrImage).toBeTruthy();
    expect(qrImage.src).toBe('data:image/png;base64,qrcode');

    // when
    const removeBtn = element.shadowRoot.querySelector('lightning-button-icon');
    removeBtn.click();
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.logo-preview-image')).toBeNull();

    // when
    document.body.removeChild(element);
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(loadScript).toHaveBeenCalledTimes(1);
    await expect(element).toBeAccessible();
  });

  it('should handle library load failure properly', async () => {
    // given
    loadScript.mockRejectedValueOnce(new Error('Network error'));

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    const errorBox = element.shadowRoot.querySelector('.slds-theme_error p');
    expect(errorBox.textContent).toBe('Failed to load QR code library: Network error');
  });

  it('should handle generate errors: no url, lib not loaded, and generate failure', async () => {
    // given
    loadScript.mockResolvedValueOnce();

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    const generateBtn = element.shadowRoot.querySelector('lightning-button');
    expect(generateBtn.disabled).toBe(true);

    // when
    generateBtn.click();
    await flushPromises();

    // then
    let errorBox = element.shadowRoot.querySelector('.slds-theme_error p');
    expect(errorBox.textContent).toBe('Please enter a URL.');

    // when
    const { urlInput } = getInputs();
    urlInput.value = 'https://example.com';
    urlInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    generateBtn.click();
    await flushPromises();

    // then
    errorBox = element.shadowRoot.querySelector('.slds-theme_error p');
    expect(errorBox.textContent).toBe('QR code library not loaded. Please try again.');

    // when
    globalThis.QRCodeWithLogo = {
      CorrectLevel: { H: 2 },
      generate: jest.fn().mockRejectedValue(new Error('Canvas error'))
    };
    generateBtn.click();
    await flushPromises();

    // then
    errorBox = element.shadowRoot.querySelector('.slds-theme_error p');
    expect(errorBox.textContent).toBe('Failed to generate QR code: Canvas error');
    expect(element.shadowRoot.querySelector('lightning-spinner')).toBeNull();
  });

  it('should handle file upload with no file and file read error', async () => {
    // given
    loadScript.mockResolvedValueOnce();

    // when
    document.body.appendChild(element);
    await flushPromises();

    const { fileInput } = getInputs();
    fileInput.files = [];
    fileInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.logo-preview-image')).toBeNull();

    // when
    const mockFile = new File(['x'], 'bad.png', { type: 'image/png' });
    const mockReader = { readAsDataURL: jest.fn(), onload: null, onerror: null };
    jest.spyOn(globalThis, 'FileReader').mockImplementation(() => mockReader);

    fileInput.files = [mockFile];
    fileInput.dispatchEvent(new CustomEvent('change'));
    mockReader.onerror();
    await flushPromises();

    // then
    const errorBox = element.shadowRoot.querySelector('.slds-theme_error p');
    expect(errorBox.textContent).toBe('Failed to read the selected file.');
  });
});
