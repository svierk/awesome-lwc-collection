import CameraCapture from 'c/cameraCapture';
import { createElement } from 'lwc';

const mockGetUserMedia = jest.fn();
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const createStream = () => {
  const track = { stop: jest.fn() };
  return { track, getTracks: () => [track] };
};

const setMediaDevices = (value) => {
  Object.defineProperty(global.navigator, 'mediaDevices', { writable: true, configurable: true, value });
};

let element;
let resizeCallback;
const observer = { observe: jest.fn(), disconnect: jest.fn() };

const video = () => element.shadowRoot.querySelector('.video');
const button = (id) => element.shadowRoot.querySelector(`lightning-button[data-id="${id}"]`);

const render = (properties = {}) => {
  Object.assign(element, properties);
  document.body.appendChild(element);
};

const listen = (eventName) => {
  const handler = jest.fn();
  element.addEventListener(eventName, handler);
  return handler;
};

describe('c-camera-capture', () => {
  beforeEach(() => {
    setMediaDevices({ getUserMedia: mockGetUserMedia });
    global.ResizeObserver = jest.fn((callback) => {
      resizeCallback = callback;
      return observer;
    });
    element = createElement('c-camera-capture', { is: CameraCapture });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be accessible and show its controls', async () => {
    // when
    render();

    // then
    expect(element.shadowRoot.querySelectorAll('lightning-button')).toHaveLength(3);
    await expect(element).toBeAccessible();
  });

  it('should hide its controls and still work through its methods', async () => {
    // given
    const stream = createStream();
    mockGetUserMedia.mockResolvedValue(stream);
    render({ hideControls: true });

    // when
    await element.start();

    // then
    expect(element.shadowRoot.querySelectorAll('lightning-button')).toHaveLength(0);
    expect(video().srcObject).toBe(stream);

    // when
    element.stop();

    // then
    expect(stream.track.stop).toHaveBeenCalledTimes(1);
    expect(video().srcObject).toBeNull();
  });

  it.each([
    ['the front camera by default', {}, 'user'],
    ['the back camera', { camera: 'back' }, 'environment'],
    ['the front camera for an unknown value', { camera: 'side' }, 'user']
  ])('should ask for %s without audio', async (_label, properties, facingMode) => {
    // given
    const stream = createStream();
    mockGetUserMedia.mockResolvedValue(stream);
    render(properties);

    // when
    button('start').click();
    await flushPromises();

    // then
    expect(mockGetUserMedia).toHaveBeenCalledWith({ video: { facingMode }, audio: false });
    expect(video().srcObject).toBe(stream);
  });

  it('should show the reason when the browser denies the camera', async () => {
    // given
    mockGetUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    const handler = listen('lightning__showtoast');
    render();

    // when
    button('start').click();
    await flushPromises();

    // then
    expect(handler.mock.calls[0][0].detail).toMatchObject({
      title: 'Error accessing camera',
      message: 'Permission denied',
      variant: 'error'
    });
  });

  it('should tell when the browser has no camera support', async () => {
    // given
    setMediaDevices(undefined);
    const handler = listen('lightning__showtoast');
    render();

    // when
    button('start').click();
    await flushPromises();

    // then
    expect(handler.mock.calls[0][0].detail).toMatchObject({
      title: 'Error',
      message: 'getUserMedia is not supported in this browser',
      variant: 'error'
    });
  });

  it('should stop the running camera when it starts again', async () => {
    // given
    const first = createStream();
    const second = createStream();
    mockGetUserMedia.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    render();
    await element.start();

    // when
    await element.start();

    // then
    expect(first.track.stop).toHaveBeenCalledTimes(1);
    expect(second.track.stop).not.toHaveBeenCalled();
    expect(video().srcObject).toBe(second);
  });

  it('should not fail when stopping a camera that never started', () => {
    // given
    render();

    // when / then
    expect(() => element.stop()).not.toThrow();
    expect(video().srcObject ?? null).toBeNull();
  });

  it('should stop the camera when it is removed from the page', async () => {
    // given
    const stream = createStream();
    mockGetUserMedia.mockResolvedValue(stream);
    render();
    await element.start();

    // when
    document.body.removeChild(element);

    // then
    expect(stream.track.stop).toHaveBeenCalledTimes(1);
  });

  it('should stop a camera that only arrives after it was removed from the page', async () => {
    // given
    const stream = createStream();
    let resolveStream;
    mockGetUserMedia.mockReturnValue(new Promise((resolve) => (resolveStream = resolve)));
    render();
    const started = element.start();

    // when
    document.body.removeChild(element);
    resolveStream(stream);
    await started;

    // then
    expect(stream.track.stop).toHaveBeenCalledTimes(1);
  });

  it('should fire capture with the photo in the size of the video', async () => {
    // given
    const handler = listen('capture');
    mockGetUserMedia.mockResolvedValue(createStream());
    render();
    await element.start();
    Object.defineProperty(video(), 'videoWidth', { value: 640 });
    Object.defineProperty(video(), 'videoHeight', { value: 480 });
    const canvas = element.shadowRoot.querySelector('.canvas');
    const drawImage = jest.spyOn(canvas.getContext('2d'), 'drawImage').mockImplementation(() => {});

    // when
    button('capture').click();

    // then
    expect(drawImage).toHaveBeenCalledWith(video(), 0, 0, 640, 480);
    expect([canvas.width, canvas.height]).toEqual([640, 480]);
    expect(handler.mock.calls[0][0].detail.dataUrl).toContain('data:image/png');
  });

  it('should not fire capture without a running camera', () => {
    // given
    const handler = listen('capture');
    render();

    // when
    element.capture();

    // then
    expect(handler).not.toHaveBeenCalled();
  });

  it('should stop the camera when the page hides it and not when it only changes its size', async () => {
    // given
    const stream = createStream();
    mockGetUserMedia.mockResolvedValue(stream);
    render();
    await element.start();

    // when
    resizeCallback([{ contentRect: { width: 400, height: 300 } }]);

    // then
    expect(observer.observe).toHaveBeenCalledWith(video());
    expect(stream.track.stop).not.toHaveBeenCalled();

    // when
    resizeCallback([{ contentRect: { width: 0, height: 0 } }]);

    // then
    expect(stream.track.stop).toHaveBeenCalledTimes(1);
    expect(video().srcObject).toBeNull();
  });

  it('should observe once and stop observing when it is removed from the page', async () => {
    // given
    render();
    element.hideControls = true;
    await flushPromises();

    // when
    document.body.removeChild(element);

    // then
    expect(global.ResizeObserver).toHaveBeenCalledTimes(1);
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should stop the camera with its stop button', async () => {
    // given
    const stream = createStream();
    mockGetUserMedia.mockResolvedValue(stream);
    render();
    await element.start();

    // when
    button('stop').click();

    // then
    expect(stream.track.stop).toHaveBeenCalledTimes(1);
    expect(video().srcObject).toBeNull();
  });
});
