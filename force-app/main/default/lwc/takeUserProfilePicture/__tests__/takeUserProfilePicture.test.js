import updateProfilePicture from '@salesforce/apex/UserProfilePictureController.updateProfilePicture';
import TakeUserProfilePicture from 'c/takeUserProfilePicture';
import { createElement } from 'lwc';

jest.mock('@salesforce/apex/UserProfilePictureController.updateProfilePicture', () => ({ default: jest.fn() }), {
  virtual: true
});

const mockGetUserMedia = jest.fn();
const mockTrack = { stop: jest.fn() };
const PHOTO = 'data:image/png;base64,testData';

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  configurable: true,
  value: { getUserMedia: mockGetUserMedia }
});

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

let element;

const camera = () => element.shadowRoot.querySelector('c-camera-capture');
const button = (id) => element.shadowRoot.querySelector(`lightning-button[data-id="${id}"]`);
const preview = () => element.shadowRoot.querySelector('.preview');

const takePhoto = async (dataUrl = PHOTO) => {
  camera().dispatchEvent(new CustomEvent('capture', { detail: { dataUrl } }));
  await flushPromises();
};

const listenForToast = () => {
  const handler = jest.fn();
  element.addEventListener('lightning__showtoast', handler);
  return handler;
};

describe('c-take-user-profile-picture', () => {
  beforeEach(() => {
    global.ResizeObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn() }));
    element = createElement('c-take-user-profile-picture', { is: TakeUserProfilePicture });
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [mockTrack] });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should be accessible and keep its four buttons in the footer', async () => {
    // when
    document.body.appendChild(element);

    // then
    expect(camera().hideControls).toBe(true);
    const labels = [...element.shadowRoot.querySelectorAll('[slot="footer"] lightning-button')].map((b) => b.label);
    expect(labels).toEqual(['Start Camera', 'Stop Camera', 'Capture Photo', 'Update Profile Picture']);
    await expect(element).toBeAccessible();
  });

  it.each([
    ['the front camera by default', {}, 'front', 'user'],
    ['the given camera', { defaultCamera: 'back' }, 'back', 'environment']
  ])('should start %s', async (_label, properties, cameraName, facingMode) => {
    // given
    Object.assign(element, properties);
    document.body.appendChild(element);

    // when
    button('start').click();
    await flushPromises();

    // then
    expect(camera().camera).toBe(cameraName);
    expect(mockGetUserMedia).toHaveBeenCalledWith({ video: { facingMode }, audio: false });
  });

  it('should capture through the camera and show the photo', async () => {
    // given
    const capture = jest.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(() => {});
    document.body.appendChild(element);
    button('start').click();
    await flushPromises();

    // when
    button('capture').click();
    await flushPromises();

    // then
    expect(capture).toHaveBeenCalledTimes(1);
    expect(preview().src).toContain('data:image/png');
    capture.mockRestore();
  });

  it('should only allow updating the profile with a photo', async () => {
    // given
    document.body.appendChild(element);
    expect(button('update').disabled).toBe(true);
    expect(preview()).toBeNull();

    // when
    await takePhoto();

    // then
    expect(button('update').disabled).toBe(false);
    expect(preview().src).toBe(PHOTO);
  });

  it('should stop the camera and remove the photo', async () => {
    // given
    document.body.appendChild(element);
    button('start').click();
    await flushPromises();
    await takePhoto();

    // when
    button('stop').click();
    await flushPromises();

    // then
    expect(mockTrack.stop).toHaveBeenCalledTimes(1);
    expect(preview()).toBeNull();
    expect(button('update').disabled).toBe(true);
  });

  it('should not fail when stopping before starting', async () => {
    // given
    document.body.appendChild(element);

    // when
    button('stop').click();
    await flushPromises();

    // then
    expect(mockTrack.stop).not.toHaveBeenCalled();
  });

  it('should update the profile picture with the photo', async () => {
    // given
    updateProfilePicture.mockResolvedValue();
    document.body.appendChild(element);
    await takePhoto();
    const handler = listenForToast();

    // when
    button('update').click();
    await flushPromises();

    // then
    expect(updateProfilePicture).toHaveBeenCalledWith({ base64: 'testData' });
    expect(handler.mock.calls[0][0].detail).toMatchObject({ title: 'Success', variant: 'success' });
  });

  it('should show an error when updating the profile picture fails', async () => {
    // given
    updateProfilePicture.mockRejectedValue({ body: { message: 'Update failed' } });
    document.body.appendChild(element);
    await takePhoto();
    const handler = listenForToast();

    // when
    button('update').click();
    await flushPromises();

    // then
    expect(handler.mock.calls[0][0].detail).toMatchObject({
      title: 'Error saving the profile picture',
      message: 'Update failed',
      variant: 'error'
    });
  });

  it('should show the reason when the browser denies the camera', async () => {
    // given
    mockGetUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    document.body.appendChild(element);
    const handler = listenForToast();

    // when
    button('start').click();
    await flushPromises();

    // then
    expect(handler.mock.calls[0][0].detail).toMatchObject({
      title: 'Error accessing camera',
      message: 'Permission denied'
    });
  });
});
