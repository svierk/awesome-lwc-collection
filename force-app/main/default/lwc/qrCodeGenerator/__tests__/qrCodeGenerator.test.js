import QrCodeGenerator from 'c/qrCodeGenerator';
import { FlowAttributeChangeEventName } from 'lightning/flowSupport';
import { loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEventName } from 'lightning/platformShowToastEvent';
import { createRecord, getRecord } from 'lightning/uiRecordApi';
import { createElement } from 'lwc';

jest.mock('lightning/platformResourceLoader', () => ({ loadScript: jest.fn() }), {
  virtual: true
});

const flushPromises = () => new Promise(process.nextTick);

let element;

function getInputs() {
  const input = (id) => element.shadowRoot.querySelector(`[data-id="${id}"]`);
  return {
    urlInput: input('url'),
    darkInput: input('color-dark'),
    lightInput: input('color-light'),
    fileInput: input('file-input')
  };
}

function errorText() {
  return element.shadowRoot.querySelector('c-error-alert')?.message ?? null;
}

// Append the element with the QR library script resolving successfully.
async function renderAndLoad() {
  loadScript.mockResolvedValueOnce();
  document.body.appendChild(element);
  await flushPromises();
}

async function enterUrl(value, valid = true) {
  const { urlInput } = getInputs();
  urlInput.value = value;
  urlInput.validity = { valid };
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

const RECORD_ID = '001000000000001AAA';
const VERSION_ID = '068000000000001AAA';
const DOC_ID = '069000000000001AAA';
const CODE = 'data:image/png;base64,qrcode';

const renderWith = async (properties, generate = mockQrLib()) => {
  Object.assign(element, properties);
  await renderAndLoad();
  return generate;
};

const lastOptions = (generate) => generate.mock.calls[generate.mock.calls.length - 1][0];
const saveButton = () => element.shadowRoot.querySelector('[data-id="save"]');
const flowChanges = (handler) => handler.mock.calls.map(([event]) => event.detail);

const listen = (eventName) => {
  const handler = jest.fn();
  element.addEventListener(eventName, handler);
  return handler;
};

const emitFile = async () => {
  getRecord.emit({ fields: { ContentDocumentId: { value: DOC_ID } } }, (config) => config.recordId === VERSION_ID);
  await flushPromises();
};

const generateFor = async (properties, generate = mockQrLib()) => {
  await renderWith(properties, generate);
  await enterUrl('https://example.com');
  element.shadowRoot.querySelector('lightning-button').click();
  await flushPromises();
  return generate;
};

const hint = () => element.shadowRoot.querySelector('[data-id="contrast-hint"]');

const pickColor = async (input, value) => {
  input.value = value;
  input.dispatchEvent(new CustomEvent('change'));
  await flushPromises();
};

describe('c-qr-code-generator', () => {
  beforeEach(() => {
    element = createElement('c-qr-code-generator', { is: QrCodeGenerator });
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

  it('should offer a url input without anything filled in or generated on its own', async () => {
    // when
    const generate = await renderWith({ recordId: RECORD_ID, saveToRecord: true });

    // then
    expect(getInputs().urlInput).toMatchObject({ type: 'url', label: 'Target URL' });
    expect(getInputs().urlInput.value).toBe('');
    expect(generate).not.toHaveBeenCalled();
    expect(element.shadowRoot.querySelector('.qr-code-image')).toBeNull();
    expect(element.shadowRoot.querySelector('lightning-button').disabled).toBe(true);
  });

  it('should block an invalid url and remove the message as soon as the url is valid', async () => {
    // given
    await renderWith({});
    await enterUrl('dfg.com', false);
    const report = jest.spyOn(getInputs().urlInput, 'reportValidity');
    expect(report).not.toHaveBeenCalled();
    expect(element.shadowRoot.querySelector('lightning-button').disabled).toBe(true);

    // when
    await enterUrl('https://dfg.com');

    // then
    expect(report).toHaveBeenCalledTimes(1);
    expect(element.shadowRoot.querySelector('lightning-button').disabled).toBe(false);
  });

  it('should publish a generated code and remove it when the url becomes invalid', async () => {
    // given
    const generateHandler = listen('qrcodegenerate');
    const flowHandler = listen(FlowAttributeChangeEventName);
    await generateFor({});

    // then
    expect(element.shadowRoot.querySelector('.qr-code-image').src).toBe(CODE);
    expect(element.qrCodeDataUrl).toBe(CODE);
    expect(generateHandler.mock.calls[0][0].detail).toEqual({ dataUrl: CODE, value: 'https://example.com' });
    expect(flowChanges(flowHandler)).toContainEqual({ attributeName: 'qrCodeDataUrl', attributeValue: CODE });

    // when
    await enterUrl('dfg.com', false);

    // then
    expect(element.shadowRoot.querySelector('.qr-code-image')).toBeNull();
    expect(element.qrCodeDataUrl).toBe('');
  });

  it('should use the given colors, logo and size', async () => {
    // given
    const design = { colorDark: '#112233', colorLight: '#eeeeee', logoUrl: '/resource/logo' };

    // when
    const generate = await generateFor({ size: 2048, ...design });

    // then
    expect(lastOptions(generate)).toMatchObject({ ...design, width: 2048, height: 2048 });
    expect(element.shadowRoot.querySelector('.qr-code-image').style.width).toBe('2048px');
    expect(element.logoUrl).toBe('/resource/logo');
  });

  it.each([
    ['no size', {}],
    ['an invalid size', { size: 'big' }]
  ])('should keep the defaults and a high resolution for %s', async (_label, properties) => {
    // when
    const generate = await generateFor(properties);

    // then
    expect(lastOptions(generate)).toMatchObject({ colorDark: '#000000', colorLight: '#ffffff', width: 1024 });
    expect(element.shadowRoot.querySelector('.qr-code-image').style).toMatchObject({ width: '256px', height: 'auto' });
  });

  it.each([
    ['without saveToRecord', { recordId: RECORD_ID }],
    ['without a record', { saveToRecord: true }]
  ])('should offer no save button %s', async (_label, properties) => {
    // when
    await generateFor(properties);

    // then
    expect(saveButton()).toBeNull();
  });

  it('should save the code as a linked png file, publish its id and forget it with a new code', async () => {
    // given
    createRecord.mockResolvedValue({ id: VERSION_ID });
    await generateFor({ recordId: RECORD_ID, saveToRecord: true });
    const saveHandler = listen('qrcodesave');
    const flowHandler = listen(FlowAttributeChangeEventName);
    const toastHandler = listen(ShowToastEventName);

    // when
    saveButton().click();
    await flushPromises();

    // then
    expect(createRecord.mock.calls[0][0]).toEqual({
      apiName: 'ContentVersion',
      fields: {
        Title: 'QR Code',
        PathOnClient: 'qr-code.png',
        VersionData: 'qrcode',
        FirstPublishLocationId: RECORD_ID
      }
    });
    expect(saveButton().disabled).toBe(true);

    // when
    await emitFile();

    // then
    expect(element.contentDocumentId).toBe(DOC_ID);
    expect(saveHandler.mock.calls[0][0].detail).toEqual({ contentDocumentId: DOC_ID });
    expect(flowChanges(flowHandler)).toContainEqual({
      attributeName: 'contentDocumentId',
      attributeValue: DOC_ID
    });
    expect(toastHandler.mock.calls[0][0].detail.variant).toBe('success');
    expect(saveButton().disabled).toBe(true);

    // when
    element.shadowRoot.querySelector('lightning-button').click();
    await flushPromises();

    // then
    expect(element.contentDocumentId).toBeUndefined();
    expect(flowChanges(flowHandler)).toContainEqual({ attributeName: 'contentDocumentId', attributeValue: undefined });
    expect(saveButton().disabled).toBe(false);
  });

  it.each([
    ['creating the file', () => createRecord.mockRejectedValue({ body: { message: 'No access' } }), false],
    ['reading its id', () => createRecord.mockResolvedValue({ id: VERSION_ID }), true]
  ])('should show an error toast when %s fails and allow another try', async (_label, prepare, failRead) => {
    // given
    prepare();
    await generateFor({ recordId: RECORD_ID, saveToRecord: true });
    const handler = listen(ShowToastEventName);

    // when
    saveButton().click();
    await flushPromises();
    if (failRead) getRecord.error();
    await flushPromises();

    // then
    expect(handler.mock.calls[0][0].detail).toMatchObject({ title: 'Error saving the QR code', variant: 'error' });
    expect(saveButton().disabled).toBe(false);
  });

  it.each([
    ['the default colors', {}, '#000000', '#ffffff'],
    ['the given colors', { colorDark: '#112233', colorLight: '#eeeeee' }, '#112233', '#eeeeee']
  ])('should start the color pickers with %s', async (_label, properties, dark, light) => {
    // when
    await renderWith(properties);

    // then
    expect(getInputs().darkInput).toMatchObject({ type: 'color', label: 'Dark Color', value: dark });
    expect(getInputs().lightInput).toMatchObject({ type: 'color', label: 'Light Color', value: light });
    expect([element.colorDark, element.colorLight]).toEqual([dark, light]);
    expect(hint()).toBeNull();
  });

  it('should use the picked colors only for the next code', async () => {
    // given
    const generate = await generateFor({});

    // when
    await pickColor(getInputs().darkInput, '#112233');
    await pickColor(getInputs().lightInput, '#eeeeee');

    // then
    expect(generate).toHaveBeenCalledTimes(1);
    expect(element.shadowRoot.querySelector('.qr-code-image')).toBeTruthy();

    // when
    element.shadowRoot.querySelector('lightning-button').click();
    await flushPromises();

    // then
    expect(lastOptions(generate)).toMatchObject({ colorDark: '#112233', colorLight: '#eeeeee' });
  });

  it.each([
    ['yellow on white', '#ffff00', '#ffffff', true],
    ['dark blue on black', '#000080', '#000000', true],
    ['white on black', '#ffffff', '#000000', true],
    ['the same color', '#808080', '#808080', true],
    ['a short hex value', '#ff0', '#fff', true],
    ['black on white', '#000000', '#ffffff', false],
    ['dark blue on white', '#000080', '#ffffff', false],
    ['dark blue on light grey', '#112233', '#eeeeee', false],
    ['a color without a hex value', 'red', '#ffffff', false]
  ])('should decide the hint for %s', async (_label, colorDark, colorLight, expected) => {
    // when
    await renderWith({ colorDark, colorLight });

    // then
    expect(Boolean(hint())).toBe(expected);
  });

  it('should show the hint while picking and not block generating', async () => {
    // given
    const generate = await renderWith({});
    await enterUrl('https://example.com');

    // when
    await pickColor(getInputs().darkInput, '#ffff00');

    // then
    expect(hint().textContent).toBe('These colors may be hard to scan.');
    expect(element.shadowRoot.querySelector('[role="status"]')).toBeTruthy();
    expect(element.shadowRoot.querySelector('lightning-button').disabled).toBe(false);
    await expect(element).toBeAccessible();

    // when
    element.shadowRoot.querySelector('lightning-button').click();
    await flushPromises();

    // then
    expect(lastOptions(generate).colorDark).toBe('#ffff00');

    // when
    await pickColor(getInputs().darkInput, '#000000');

    // then
    expect(hint()).toBeNull();
  });
});
