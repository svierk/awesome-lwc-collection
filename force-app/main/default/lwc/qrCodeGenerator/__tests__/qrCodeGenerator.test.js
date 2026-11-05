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
  const inputs = element.shadowRoot.querySelectorAll('lightning-input');
  return { urlInput: inputs[0], fileInput: inputs[1] };
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

const RECORD_ID = '001000000000001AAA';
const VERSION_ID = '068000000000001AAA';
const DOC_ID = '069000000000001AAA';
const CODE = 'data:image/png;base64,qrcode';

const renderWith = async (properties, generate = mockQrLib()) => {
  Object.assign(element, properties);
  await renderAndLoad();
  await flushPromises();
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

const emitField = async (value) => {
  const matches = (config) => config.recordId === RECORD_ID && config.fields[0] === 'Account.Website';
  getRecord.emit({ fields: { Website: { value } } }, matches);
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
    expect(errorText()).toBe('Please enter a text or URL.');
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

  it('should generate a code for a given value without a click and prefill the input', async () => {
    // given
    const handler = listen('qrcodegenerate');
    const flowHandler = listen(FlowAttributeChangeEventName);

    // when
    const generate = await renderWith({ value: 'https://salesforce.com' });

    // then
    expect(lastOptions(generate).text).toBe('https://salesforce.com');
    expect(getInputs().urlInput).toMatchObject({ value: 'https://salesforce.com', type: 'text', label: 'Text or URL' });
    expect(element.shadowRoot.querySelector('.qr-code-image').src).toContain(CODE);
    expect(element.qrCodeDataUrl).toBe(CODE);
    expect(handler.mock.calls[0][0].detail).toEqual({ dataUrl: CODE, value: 'https://salesforce.com' });
    expect(flowChanges(flowHandler)).toContainEqual({ attributeName: 'qrCodeDataUrl', attributeValue: CODE });
  });

  it('should clear the code when the value is emptied', async () => {
    // given
    await renderWith({ value: 'first' });

    // when
    element.value = '';
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.qr-code-image')).toBeNull();
    expect(element.qrCodeDataUrl).toBe('');
    expect(errorText()).toBeNull();
  });

  it.each([
    ['nothing given', {}],
    ['a record without a field name', { recordId: RECORD_ID }],
    ['an empty field', { recordId: RECORD_ID, fieldApiName: 'Account.Website' }]
  ])('should not generate anything on its own with %s', async (_label, properties) => {
    // given
    const generate = await renderWith(properties);

    // when
    await emitField(null);

    // then
    expect(generate).not.toHaveBeenCalled();
    expect(errorText()).toBeNull();
    expect(element.value).toBeUndefined();
  });

  it('should keep the result of the latest value when an older one finishes later', async () => {
    // given
    let finishFirst;
    const generate = jest
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValue('data:image/png;base64,second');
    await renderWith({ value: 'first' }, mockQrLib(generate));

    // when
    element.value = 'second';
    await flushPromises();
    finishFirst('data:image/png;base64,first');
    await flushPromises();

    // then
    expect(lastOptions(generate).text).toBe('second');
    expect(element.qrCodeDataUrl).toBe('data:image/png;base64,second');
  });

  it('should read the value from a field of the object of the page', async () => {
    // given
    const generate = await renderWith({ recordId: RECORD_ID, objectApiName: 'Account', fieldApiName: 'Website' });

    // when
    await emitField('https://record.example');

    // then
    expect(lastOptions(generate).text).toBe('https://record.example');
  });

  it('should prefer a given value over the record field and fall back when it is emptied', async () => {
    // given
    const generate = await renderWith({ recordId: RECORD_ID, fieldApiName: 'Account.Website', value: 'own' });

    // when
    await emitField('https://record.example');

    // then
    expect(lastOptions(generate).text).toBe('own');

    // when
    element.value = undefined;
    await flushPromises();

    // then
    expect(lastOptions(generate).text).toBe('https://record.example');
  });

  it('should show an error when the record field cannot be read', async () => {
    // given
    await renderWith({ recordId: RECORD_ID, fieldApiName: 'Account.Secret' });

    // when
    getRecord.error({ message: 'No access' });
    await flushPromises();

    // then
    expect(errorText()).toContain('The record field could not be read:');
    await expect(element).toBeAccessible();
  });

  it('should use the given colors, logo and size', async () => {
    // given
    const design = { colorDark: '#112233', colorLight: '#eeeeee', logoUrl: '/resource/logo' };

    // when
    const generate = await renderWith({ value: 'text', size: 2048, ...design });

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
    const generate = await renderWith({ value: 'text', ...properties });

    // then
    expect(lastOptions(generate)).toMatchObject({ colorDark: '#000000', colorLight: '#ffffff', width: 1024 });
    expect(element.shadowRoot.querySelector('.qr-code-image').style).toMatchObject({ width: '256px', height: 'auto' });
  });

  it('should hide the inputs and the button with hideInput and still show the code', async () => {
    // when
    await renderWith({ value: 'text', hideInput: true });

    // then
    expect(element.shadowRoot.querySelectorAll('lightning-input')).toHaveLength(0);
    expect(element.shadowRoot.querySelector('[data-id="generate"]')).toBeNull();
    expect(element.shadowRoot.querySelector('.qr-code-image')).toBeTruthy();
    await expect(element).toBeAccessible();
  });

  it.each([
    ['without saveToRecord', { recordId: RECORD_ID, value: 'text' }],
    ['without a record', { saveToRecord: true, value: 'text' }],
    ['without a code', { recordId: RECORD_ID, saveToRecord: true }]
  ])('should offer no save button %s', async (_label, properties) => {
    // when
    await renderWith(properties);

    // then
    expect(saveButton()).toBeNull();
  });

  it('should save the code as a linked png file, publish its id and forget it with a new code', async () => {
    // given
    createRecord.mockResolvedValue({ id: VERSION_ID });
    await renderWith({ recordId: RECORD_ID, saveToRecord: true, value: 'text' });
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
    element.value = 'other';
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
    await renderWith({ recordId: RECORD_ID, saveToRecord: true, value: 'text' });
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
});
