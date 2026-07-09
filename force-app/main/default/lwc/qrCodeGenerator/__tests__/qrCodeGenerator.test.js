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

function errorText() {
  const box = element.shadowRoot.querySelector('.slds-theme_error p');
  return box ? box.textContent : null;
}

// Append the element with the QR library script resolving successfully.
async function renderAndLoad() {
  loadScript.mockResolvedValueOnce();
  document.body.appendChild(element);
  await flushPromises();
}

async function enterUrl(value) {
  const { urlInput } = getInputs();
  urlInput.value = value;
  urlInput.dispatchEvent(new CustomEvent('change'));
  await flushPromises();
}

// Install a mock FileReader so tests can drive its onload/onerror callbacks.
function mockFileReader() {
  const reader = { readAsDataURL: jest.fn(), onload: null, onerror: null };
  jest.spyOn(globalThis, 'FileReader').mockImplementation(() => reader);
  return reader;
}

// Provide the global QR library stub used by the generate step.
function mockQrLib(generate = jest.fn().mockResolvedValue('data:image/png;base64,qrcode')) {
  globalThis.QRCodeWithLogo = { CorrectLevel: { H: 2 }, generate };
  return generate;
}

async function uploadLogo(result = 'data:image/png;base64,abc') {
  const { fileInput } = getInputs();
  const reader = mockFileReader();
  fileInput.files = [new File(['logo'], 'logo.png', { type: 'image/png' })];
  fileInput.dispatchEvent(new CustomEvent('change'));
  reader.onload({ target: { result } });
  await flushPromises();
  return reader;
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
    loadScript.mockReset();
    jest.restoreAllMocks();
  });

  it('should show an error when the library fails to load', async () => {
    // given
    loadScript.mockRejectedValueOnce(new Error('Network error'));

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(errorText()).toBe('Failed to load QR code library: Network error');
  });

  it('should load the library only once across re-insertions', async () => {
    // given
    await renderAndLoad();

    // when
    document.body.removeChild(element);
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(loadScript).toHaveBeenCalledTimes(1);
  });

  it('should be accessible', async () => {
    // given
    loadScript.mockResolvedValueOnce();

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    await expect(element).toBeAccessible();
  });

  it('should read the file and show a logo preview after uploading a logo', async () => {
    // given
    await renderAndLoad();
    const { fileInput } = getInputs();
    const reader = mockFileReader();
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });

    // when
    fileInput.files = [file];
    fileInput.dispatchEvent(new CustomEvent('change'));
    reader.onload({ target: { result: 'data:image/png;base64,abc' } });
    await flushPromises();

    // then
    expect(reader.readAsDataURL).toHaveBeenCalledWith(file);
    expect(element.shadowRoot.querySelector('.logo-preview-image')).toBeTruthy();
  });

  it('should remove the logo preview when the remove button is clicked', async () => {
    // given
    await renderAndLoad();
    await uploadLogo();

    // when
    element.shadowRoot.querySelector('lightning-button-icon').click();
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.logo-preview-image')).toBeNull();
  });

  it('should not set a logo when no file is selected', async () => {
    // given
    await renderAndLoad();
    const { fileInput } = getInputs();

    // when
    fileInput.files = [];
    fileInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.logo-preview-image')).toBeNull();
  });

  it('should show an error when the logo file cannot be read', async () => {
    // given
    await renderAndLoad();
    const { fileInput } = getInputs();
    const reader = mockFileReader();

    // when
    fileInput.files = [new File(['x'], 'bad.png', { type: 'image/png' })];
    fileInput.dispatchEvent(new CustomEvent('change'));
    reader.onerror();
    await flushPromises();

    // then
    expect(errorText()).toBe('Failed to read the selected file.');
  });

  it('should enable the generate button once a url is entered', async () => {
    // given
    await renderAndLoad();
    const generateBtn = element.shadowRoot.querySelector('lightning-button');

    // when
    await enterUrl('https://example.com');

    // then
    expect(generateBtn.disabled).toBe(false);
  });

  it('should generate a QR code image when the generate button is clicked', async () => {
    // given
    await renderAndLoad();
    await enterUrl('https://example.com');
    const generate = mockQrLib();

    // when
    element.shadowRoot.querySelector('lightning-button').click();
    await flushPromises();

    // then
    expect(generate).toHaveBeenCalled();
    const qrImage = element.shadowRoot.querySelector('.qr-code-image');
    expect(qrImage).toBeTruthy();
    expect(qrImage.src).toBe('data:image/png;base64,qrcode');
  });

  it('should show an error when generating without a url', async () => {
    // given
    await renderAndLoad();

    // when
    element.shadowRoot.querySelector('lightning-button').click();
    await flushPromises();

    // then
    expect(errorText()).toBe('Please enter a URL.');
  });

  it('should show an error when the library is not available', async () => {
    // given
    await renderAndLoad();
    await enterUrl('https://example.com');

    // when
    element.shadowRoot.querySelector('lightning-button').click();
    await flushPromises();

    // then
    expect(errorText()).toBe('QR code library not loaded. Please try again.');
  });

  it('should show an error and hide the spinner when generation fails', async () => {
    // given
    await renderAndLoad();
    await enterUrl('https://example.com');
    mockQrLib(jest.fn().mockRejectedValue(new Error('Canvas error')));

    // when
    element.shadowRoot.querySelector('lightning-button').click();
    await flushPromises();

    // then
    expect(errorText()).toBe('Failed to generate QR code: Canvas error');
    expect(element.shadowRoot.querySelector('lightning-spinner')).toBeNull();
  });
});
