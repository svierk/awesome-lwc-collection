import SignaturePad from 'c/signaturePad';
import { FlowAttributeChangeEventName } from 'lightning/flowSupport';
import { ShowToastEventName } from 'lightning/platformShowToastEvent';
import { createRecord, getRecord } from 'lightning/uiRecordApi';
import { createElement } from 'lwc';

const flushPromises = () => new Promise(process.nextTick);

function getCanvas(el) {
  return el.shadowRoot.querySelector('canvas');
}

function mouseEvent(type, x = 0, y = 0) {
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
}

function touchEvent(type, x = 0, y = 0) {
  return Object.assign(new CustomEvent(type, { bubbles: true, cancelable: true }), {
    touches: [{ clientX: x, clientY: y }]
  });
}

function drawStroke(canvas, x1 = 10, y1 = 10, x2 = 30, y2 = 30) {
  canvas.dispatchEvent(mouseEvent('mousedown', x1, y1));
  canvas.dispatchEvent(mouseEvent('mousemove', x2, y2));
  canvas.dispatchEvent(mouseEvent('mouseup'));
}

const SAVE_PROPS = { recordId: '001000000000001AAA', saveToRecord: true };

const createPad = async (properties = {}) => {
  const pad = createElement('c-signature-pad', { is: SignaturePad });
  Object.assign(pad, properties);
  document.body.appendChild(pad);
  await flushPromises();
  return pad;
};

const button = (pad, id) => pad.shadowRoot.querySelector(`[data-id="${id}"]`);

const flowChanges = (handler) => handler.mock.calls.map(([event]) => event.detail);

const savedPad = async (properties = SAVE_PROPS) => {
  createRecord.mockResolvedValue({ id: '068000000000001AAA' });
  const pad = await createPad(properties);
  drawStroke(getCanvas(pad));
  await flushPromises();
  button(pad, 'save').click();
  await flushPromises();
  return pad;
};

describe('c-signature-pad', () => {
  let element;

  beforeEach(() => {
    element = createElement('c-signature-pad', { is: SignaturePad });
    document.body.appendChild(element);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should render canvas and placeholder when empty', async () => {
    // given
    await flushPromises();

    // then
    expect(getCanvas(element)).toBeTruthy();
    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
    expect(element.shadowRoot.querySelector('[data-id="undo"]').disabled).toBe(true);
    expect(element.shadowRoot.querySelector('[data-id="clear"]').disabled).toBe(true);
    expect(element.shadowRoot.querySelector('[data-id="download"]').disabled).toBe(true);
    await expect(element).toBeAccessible();
  });

  it('should hide placeholder and enable buttons after drawing', async () => {
    // given
    await flushPromises();

    // when
    drawStroke(getCanvas(element));
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
    expect(element.shadowRoot.querySelector('[data-id="undo"]').disabled).toBe(false);
    expect(element.shadowRoot.querySelector('[data-id="clear"]').disabled).toBe(false);
    expect(element.shadowRoot.querySelector('[data-id="download"]').disabled).toBe(false);
  });

  it('should fire signaturechange event with dataUrl after drawing', async () => {
    // given
    await flushPromises();
    const handler = jest.fn();
    element.addEventListener('signaturechange', handler);

    // when
    drawStroke(getCanvas(element));
    await flushPromises();

    // then
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ isEmpty: false, dataUrl: expect.any(String) })
      })
    );
  });

  it('should end stroke on mouseleave and mark as non-empty', async () => {
    // given
    await flushPromises();
    const canvas = getCanvas(element);

    // when
    canvas.dispatchEvent(mouseEvent('mousedown', 5, 5));
    canvas.dispatchEvent(mouseEvent('mousemove', 15, 15));
    canvas.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
  });

  it('should not draw on mousemove without mousedown', async () => {
    // given
    await flushPromises();
    const canvas = getCanvas(element);

    // when
    canvas.dispatchEvent(mouseEvent('mousemove', 20, 20));
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
  });

  it('should support touch events for drawing', async () => {
    // given
    await flushPromises();
    const canvas = getCanvas(element);

    // when
    canvas.dispatchEvent(touchEvent('touchstart', 50, 50));
    canvas.dispatchEvent(touchEvent('touchmove', 70, 70));
    canvas.dispatchEvent(new CustomEvent('touchend', { bubbles: true }));
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
  });

  it('should undo last stroke and restore empty state', async () => {
    // given
    await flushPromises();
    const canvas = getCanvas(element);
    const handler = jest.fn();
    element.addEventListener('signaturechange', handler);

    // when
    drawStroke(canvas);
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();

    // when
    element.shadowRoot.querySelector('[data-id="undo"]').click();
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ isEmpty: true }) })
    );
  });

  it('should undo multiple strokes independently', async () => {
    // given
    await flushPromises();
    const canvas = getCanvas(element);
    drawStroke(canvas, 10, 10, 20, 20);
    drawStroke(canvas, 30, 30, 40, 40);
    await flushPromises();

    // when
    element.shadowRoot.querySelector('[data-id="undo"]').click();
    await flushPromises();

    // then
    // one stroke remains - still not empty
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();

    // when
    element.shadowRoot.querySelector('[data-id="undo"]').click();
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
  });

  it('should clear canvas and fire signaturechange with isEmpty true', async () => {
    // given
    await flushPromises();
    const canvas = getCanvas(element);
    const handler = jest.fn();
    element.addEventListener('signaturechange', handler);
    drawStroke(canvas);
    await flushPromises();

    // when
    element.shadowRoot.querySelector('[data-id="clear"]').click();
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ isEmpty: true, dataUrl: '' }) })
    );
  });

  it('should update pen color', async () => {
    // given
    await flushPromises();
    const colorInput = element.shadowRoot.querySelectorAll('lightning-input')[0];

    // when
    colorInput.value = '#ff0000';
    colorInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    // Draw and verify the component handles the new color without error
    drawStroke(getCanvas(element));
    await flushPromises();
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
  });

  it('should update stroke width and label', async () => {
    // given
    await flushPromises();
    const rangeInput = element.shadowRoot.querySelectorAll('lightning-input')[1];

    // when
    rangeInput.value = '7';
    rangeInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    expect(rangeInput.label).toBe('Stroke Width (7px)');
  });

  it('should download signature as PNG', async () => {
    // given
    await flushPromises();
    drawStroke(getCanvas(element));
    await flushPromises();

    const mockLink = { href: '', download: '', click: jest.fn() };
    jest.spyOn(document, 'createElement').mockReturnValueOnce(mockLink);

    // when
    element.shadowRoot.querySelector('[data-id="download"]').click();
    await flushPromises();

    // then
    expect(mockLink.download).toBe('signature.png');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('should register a single-point dot as a non-empty stroke', async () => {
    // given
    await flushPromises();
    const canvas = getCanvas(element);

    // when
    canvas.dispatchEvent(mouseEvent('mousedown', 20, 20));
    canvas.dispatchEvent(mouseEvent('mouseup'));
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
    expect(element.shadowRoot.querySelector('[data-id="undo"]').disabled).toBe(false);
  });

  it('should draw with the given pen color and stroke width and show them in the controls', async () => {
    // when
    const pad = await createPad({ penColor: '#ff0000', strokeWidth: 5 });
    drawStroke(getCanvas(pad));

    // then
    const context = getCanvas(pad).getContext('2d');
    expect(context.strokeStyle).toBe('#ff0000');
    expect(context.lineWidth).toBe(5);
    expect(pad.penColor).toBe('#ff0000');
    expect(pad.strokeWidth).toBe(5);
    expect(pad.shadowRoot.querySelectorAll('lightning-input')[1].label).toBe('Stroke Width (5px)');
  });

  it('should keep the defaults for pen color, stroke width and height', async () => {
    // when
    const pad = await createPad();

    // then
    expect(pad.penColor).toBe('#000000');
    expect(pad.strokeWidth).toBe(2);
    expect(pad.shadowRoot.querySelector('.canvas-wrapper').style.height).toBe('');
  });

  it('should apply the given height and keep the drawing when it changes', async () => {
    // given
    const pad = await createPad({ height: '400px' });
    const wrapper = pad.shadowRoot.querySelector('.canvas-wrapper');
    drawStroke(getCanvas(pad));
    const context = getCanvas(pad).getContext('2d');
    const strokes = jest.spyOn(context, 'stroke');

    // when
    pad.height = '500px';
    await flushPromises();

    // then
    expect(wrapper.style.height).toBe('500px');
    expect(strokes).toHaveBeenCalled();
  });

  it.each([
    ['without saveToRecord', { recordId: SAVE_PROPS.recordId }],
    ['without a record', { saveToRecord: true }]
  ])('should offer no save button %s', async (_label, properties) => {
    // when
    const pad = await createPad(properties);

    // then
    expect(button(pad, 'save')).toBeNull();
    expect(button(pad, 'download').variant).toBe('brand');
  });

  it('should offer a save button that needs a signature', async () => {
    // given
    const pad = await createPad(SAVE_PROPS);
    expect(button(pad, 'save').disabled).toBe(true);
    expect(button(pad, 'download').variant).toBe('neutral');

    // when
    drawStroke(getCanvas(pad));
    await flushPromises();

    // then
    expect(button(pad, 'save').disabled).toBe(false);
    await expect(pad).toBeAccessible();
  });

  it('should create a linked png file when saving', async () => {
    // when
    const pad = await savedPad();

    // then
    const { apiName, fields } = createRecord.mock.calls[0][0];
    expect(apiName).toBe('ContentVersion');
    expect(fields).toMatchObject({
      Title: 'Signature',
      PathOnClient: 'signature.png',
      FirstPublishLocationId: SAVE_PROPS.recordId
    });
    expect(fields.VersionData).toBeTruthy();
    expect(fields.VersionData).not.toContain('data:');
    expect(pad.shadowRoot.querySelector('lightning-spinner')).toBeTruthy();
  });

  it('should publish the file id once it is known', async () => {
    // given
    const saveHandler = jest.fn();
    const flowHandler = jest.fn();
    const toastHandler = jest.fn();
    const pad = await savedPad({ required: true, ...SAVE_PROPS });
    pad.addEventListener('signaturesave', saveHandler);
    pad.addEventListener(FlowAttributeChangeEventName, flowHandler);
    pad.addEventListener(ShowToastEventName, toastHandler);

    // when
    getRecord.emit({ fields: { ContentDocumentId: { value: '069000000000001AAA' } } });
    await flushPromises();

    // then
    expect(pad.contentDocumentId).toBe('069000000000001AAA');
    expect(pad.validate()).toEqual({ isValid: true });
    expect(saveHandler.mock.calls[0][0].detail).toEqual({ contentDocumentId: '069000000000001AAA' });
    expect(flowChanges(flowHandler)).toContainEqual({
      attributeName: 'contentDocumentId',
      attributeValue: '069000000000001AAA'
    });
    expect(toastHandler.mock.calls[0][0].detail.variant).toBe('success');
    expect(pad.shadowRoot.querySelector('lightning-spinner')).toBeNull();
    expect(button(pad, 'save').disabled).toBe(true);
  });

  it('should show an error when creating the file fails and allow another try', async () => {
    // given
    createRecord.mockRejectedValue({ body: { message: 'No access' } });
    const handler = jest.fn();
    const pad = await createPad(SAVE_PROPS);
    pad.addEventListener(ShowToastEventName, handler);
    drawStroke(getCanvas(pad));
    await flushPromises();

    // when
    button(pad, 'save').click();
    await flushPromises();

    // then
    expect(handler.mock.calls[0][0].detail).toMatchObject({
      title: 'Error saving the signature',
      message: 'No access',
      variant: 'error'
    });
    expect(pad.shadowRoot.querySelector('lightning-spinner')).toBeNull();
    expect(button(pad, 'save').disabled).toBe(false);
  });

  it('should show an error when the file id cannot be read', async () => {
    // given
    const handler = jest.fn();
    const pad = await savedPad();
    pad.addEventListener(ShowToastEventName, handler);

    // when
    getRecord.error();
    await flushPromises();

    // then
    expect(handler.mock.calls[0][0].detail.title).toBe('Error saving the signature');
    expect(pad.shadowRoot.querySelector('lightning-spinner')).toBeNull();
    expect(pad.contentDocumentId).toBeUndefined();
  });

  it('should tell the flow about the signature and forget a saved file when it changes', async () => {
    // given
    const handler = jest.fn();
    const pad = await savedPad();
    getRecord.emit({ fields: { ContentDocumentId: { value: '069000000000001AAA' } } });
    await flushPromises();
    pad.addEventListener(FlowAttributeChangeEventName, handler);

    // when
    button(pad, 'clear').click();
    await flushPromises();

    // then
    expect(pad.signatureDataUrl).toBe('');
    expect(pad.contentDocumentId).toBeUndefined();
    expect(flowChanges(handler)).toEqual([
      { attributeName: 'signatureDataUrl', attributeValue: '' },
      { attributeName: 'contentDocumentId', attributeValue: undefined }
    ]);
  });

  it('should expose the drawn signature as a data url', async () => {
    // given
    const handler = jest.fn();
    const pad = await createPad();
    pad.addEventListener(FlowAttributeChangeEventName, handler);

    // when
    drawStroke(getCanvas(pad));

    // then
    expect(pad.signatureDataUrl).toContain('data:image/png');
    expect(flowChanges(handler)).toEqual([{ attributeName: 'signatureDataUrl', attributeValue: pad.signatureDataUrl }]);
  });

  it.each([
    ['optional and empty', {}, false, undefined],
    ['required and drawn', { required: true }, true, undefined],
    ['required and empty', { required: true }, false, 'Please provide a signature.'],
    ['required, drawn and not saved', { required: true, ...SAVE_PROPS }, true, 'Please save your signature.']
  ])('should validate when it is %s', async (_label, properties, draw, errorMessage) => {
    // given
    const pad = await createPad(properties);
    if (draw) drawStroke(getCanvas(pad));

    // when
    const result = pad.validate();

    // then
    expect(result).toEqual({ isValid: !errorMessage, errorMessage });
  });
});
