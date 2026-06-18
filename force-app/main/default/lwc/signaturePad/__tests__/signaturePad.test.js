import SignaturePad from 'c/signaturePad';
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
    await flushPromises();

    expect(getCanvas(element)).toBeTruthy();
    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
    expect(element.shadowRoot.querySelector('[data-id="undo"]').disabled).toBe(true);
    expect(element.shadowRoot.querySelector('[data-id="clear"]').disabled).toBe(true);
    expect(element.shadowRoot.querySelector('[data-id="download"]').disabled).toBe(true);
    await expect(element).toBeAccessible();
  });

  it('should hide placeholder and enable buttons after drawing', async () => {
    await flushPromises();
    drawStroke(getCanvas(element));
    await flushPromises();

    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
    expect(element.shadowRoot.querySelector('[data-id="undo"]').disabled).toBe(false);
    expect(element.shadowRoot.querySelector('[data-id="clear"]').disabled).toBe(false);
    expect(element.shadowRoot.querySelector('[data-id="download"]').disabled).toBe(false);
  });

  it('should fire signaturechange event with dataUrl after drawing', async () => {
    await flushPromises();
    const handler = jest.fn();
    element.addEventListener('signaturechange', handler);

    drawStroke(getCanvas(element));
    await flushPromises();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ isEmpty: false, dataUrl: expect.any(String) })
      })
    );
  });

  it('should end stroke on mouseleave and mark as non-empty', async () => {
    await flushPromises();
    const canvas = getCanvas(element);

    canvas.dispatchEvent(mouseEvent('mousedown', 5, 5));
    canvas.dispatchEvent(mouseEvent('mousemove', 15, 15));
    canvas.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    await flushPromises();

    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
  });

  it('should not draw on mousemove without mousedown', async () => {
    await flushPromises();
    const canvas = getCanvas(element);

    canvas.dispatchEvent(mouseEvent('mousemove', 20, 20));
    await flushPromises();

    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
  });

  it('should support touch events for drawing', async () => {
    await flushPromises();
    const canvas = getCanvas(element);

    canvas.dispatchEvent(touchEvent('touchstart', 50, 50));
    canvas.dispatchEvent(touchEvent('touchmove', 70, 70));
    canvas.dispatchEvent(new CustomEvent('touchend', { bubbles: true }));
    await flushPromises();

    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
  });

  it('should undo last stroke and restore empty state', async () => {
    await flushPromises();
    const canvas = getCanvas(element);
    const handler = jest.fn();
    element.addEventListener('signaturechange', handler);

    drawStroke(canvas);
    await flushPromises();
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();

    element.shadowRoot.querySelector('[data-id="undo"]').click();
    await flushPromises();

    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ isEmpty: true }) })
    );
  });

  it('should undo multiple strokes independently', async () => {
    await flushPromises();
    const canvas = getCanvas(element);

    drawStroke(canvas, 10, 10, 20, 20);
    drawStroke(canvas, 30, 30, 40, 40);
    await flushPromises();

    element.shadowRoot.querySelector('[data-id="undo"]').click();
    await flushPromises();
    // one stroke remains — still not empty
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();

    element.shadowRoot.querySelector('[data-id="undo"]').click();
    await flushPromises();
    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
  });

  it('should clear canvas and fire signaturechange with isEmpty true', async () => {
    await flushPromises();
    const canvas = getCanvas(element);
    const handler = jest.fn();
    element.addEventListener('signaturechange', handler);

    drawStroke(canvas);
    await flushPromises();

    element.shadowRoot.querySelector('[data-id="clear"]').click();
    await flushPromises();

    expect(element.shadowRoot.querySelector('.placeholder')).toBeTruthy();
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ isEmpty: true, dataUrl: '' }) })
    );
  });

  it('should update pen color', async () => {
    await flushPromises();
    const colorInput = element.shadowRoot.querySelectorAll('lightning-input')[0];

    colorInput.value = '#ff0000';
    colorInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // Draw and verify the component handles the new color without error
    drawStroke(getCanvas(element));
    await flushPromises();
    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
  });

  it('should update stroke width and label', async () => {
    await flushPromises();
    const rangeInput = element.shadowRoot.querySelectorAll('lightning-input')[1];

    rangeInput.value = '7';
    rangeInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    expect(rangeInput.label).toBe('Stroke Width (7px)');
  });

  it('should download signature as PNG', async () => {
    await flushPromises();
    drawStroke(getCanvas(element));
    await flushPromises();

    const mockLink = { href: '', download: '', click: jest.fn() };
    jest.spyOn(document, 'createElement').mockReturnValueOnce(mockLink);

    element.shadowRoot.querySelector('[data-id="download"]').click();
    await flushPromises();

    expect(mockLink.download).toBe('signature.png');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('should register a single-point dot as a non-empty stroke', async () => {
    await flushPromises();
    const canvas = getCanvas(element);

    canvas.dispatchEvent(mouseEvent('mousedown', 20, 20));
    canvas.dispatchEvent(mouseEvent('mouseup'));
    await flushPromises();

    expect(element.shadowRoot.querySelector('.placeholder')).toBeNull();
    expect(element.shadowRoot.querySelector('[data-id="undo"]').disabled).toBe(false);
  });
});
