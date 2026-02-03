import updateProfilePicture from '@salesforce/apex/UserProfilePictureController.updateProfilePicture';
import TakeUserProfilePicture from 'c/takeUserProfilePicture';
import { createElement } from 'lwc';

jest.mock(
  '@salesforce/apex/UserProfilePictureController.updateProfilePicture',
  () => {
    return {
      default: jest.fn()
    };
  },
  { virtual: true }
);

// mock media devices
const mockGetUserMedia = jest.fn();
const mockTrack = {
  stop: jest.fn()
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  configurable: true,
  value: {
    getUserMedia: mockGetUserMedia
  }
});

// helper to wait for async dom updates
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

let element;

describe('c-take-user-profile-picture', () => {
  beforeEach(() => {
    element = createElement('c-take-user-profile-picture', {
      is: TakeUserProfilePicture
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
    mockTrack.stop.mockClear();

    // restore media devices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: mockGetUserMedia
      }
    });
  });

  it('should be accessible', async () => {
    // when
    document.body.appendChild(element);

    // then
    await expect(element).toBeAccessible();
  });

  it('should start camera successfully', async () => {
    // given
    const mockStream = {
      getTracks: jest.fn(() => [mockTrack])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);
    document.body.appendChild(element);

    // when
    const startButton = element.shadowRoot.querySelector('lightning-button[data-id="start"]');
    startButton.click();
    await flushPromises();

    // then
    expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true, audio: false });
    const video = element.shadowRoot.querySelector('.video');
    expect(video.srcObject).toBe(mockStream);
  });

  it('should handle camera access error', async () => {
    // given
    const mockError = {
      body: {
        message: 'Camera access denied'
      }
    };
    mockGetUserMedia.mockRejectedValue(mockError);
    document.body.appendChild(element);

    const handler = jest.fn();
    element.addEventListener('lightning__showtoast', handler);

    // when
    const startButton = element.shadowRoot.querySelector('lightning-button[data-id="start"]');
    startButton.click();
    await flushPromises();

    // then
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0];
    expect(event.detail.title).toBe('Error accessing camera');
    expect(event.detail.variant).toBe('error');
  });

  it('should handle missing user media support', async () => {
    // given
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: undefined
    });
    document.body.appendChild(element);

    const handler = jest.fn();
    element.addEventListener('lightning__showtoast', handler);

    // when
    const startButton = element.shadowRoot.querySelector('lightning-button[data-id="start"]');
    startButton.click();
    await flushPromises();

    // then
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0];
    expect(event.detail.title).toBe('Error');
    expect(event.detail.message).toBe('getUserMedia is not supported in this browser');
  });

  it('should stop camera and hide preview', async () => {
    // given
    const mockStream = {
      getTracks: jest.fn(() => [mockTrack])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);
    document.body.appendChild(element);

    const startButton = element.shadowRoot.querySelector('lightning-button[data-id="start"]');
    startButton.click();
    await flushPromises();

    // when
    const stopButton = element.shadowRoot.querySelector('lightning-button[data-id="stop"]');
    stopButton.click();

    // then
    expect(mockTrack.stop).toHaveBeenCalled();
    const video = element.shadowRoot.querySelector('.video');
    expect(video.srcObject).toBeNull();
  });

  it('should capture photo and show preview', async () => {
    // given
    const mockStream = {
      getTracks: jest.fn(() => [mockTrack])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);
    document.body.appendChild(element);

    const video = element.shadowRoot.querySelector('.video');
    const canvas = element.shadowRoot.querySelector('.canvas');

    Object.defineProperty(video, 'videoHeight', { value: 480, writable: true });
    Object.defineProperty(video, 'videoWidth', { value: 640, writable: true });
    Object.defineProperty(video, 'srcObject', { value: mockStream, writable: true });

    const mockContext = {
      drawImage: jest.fn()
    };
    canvas.getContext = jest.fn(() => mockContext);
    canvas.toDataURL = jest.fn(() => 'data:image/png;base64,mockData');

    const startButton = element.shadowRoot.querySelector('lightning-button[data-id="start"]');
    startButton.click();
    await flushPromises();

    // when
    const captureButton = element.shadowRoot.querySelector('lightning-button[data-id="capture"]');
    captureButton.click();

    // then
    expect(mockContext.drawImage).toHaveBeenCalled();
    const preview = element.shadowRoot.querySelector('.preview');
    expect(preview.classList.contains('slds-show')).toBe(true);
  });

  it('should not capture photo when video stream is null', () => {
    // given
    document.body.appendChild(element);
    const video = element.shadowRoot.querySelector('.video');
    Object.defineProperty(video, 'srcObject', { value: null, writable: true });

    const canvas = element.shadowRoot.querySelector('.canvas');
    const mockContext = {
      drawImage: jest.fn()
    };
    canvas.getContext = jest.fn(() => mockContext);

    // when
    const captureButton = element.shadowRoot.querySelector('lightning-button[data-id="capture"]');
    captureButton.click();

    // then
    expect(mockContext.drawImage).not.toHaveBeenCalled();
  });

  it('should update profile picture successfully', async () => {
    // given
    updateProfilePicture.mockResolvedValue();
    document.body.appendChild(element);

    const canvas = element.shadowRoot.querySelector('.canvas');
    canvas.toDataURL = jest.fn(() => 'data:image/png;base64,testData');

    const handler = jest.fn();
    element.addEventListener('lightning__showtoast', handler);

    // when
    const updateButton = element.shadowRoot.querySelector('lightning-button[data-id="update"]');
    updateButton.click();
    await flushPromises();

    // then
    expect(updateProfilePicture).toHaveBeenCalledWith({ base64: 'testData' });
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0];
    expect(event.detail.title).toBe('Success');
    expect(event.detail.variant).toBe('success');
  });

  it('should handle error when updating profile picture', async () => {
    // given
    const mockError = {
      body: {
        message: 'Update failed'
      }
    };
    updateProfilePicture.mockRejectedValue(mockError);
    document.body.appendChild(element);

    const canvas = element.shadowRoot.querySelector('.canvas');
    canvas.toDataURL = jest.fn(() => 'data:image/png;base64,testData');

    const handler = jest.fn();
    element.addEventListener('lightning__showtoast', handler);

    // when
    const updateButton = element.shadowRoot.querySelector('lightning-button[data-id="update"]');
    updateButton.click();
    await flushPromises();

    // then
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0];
    expect(event.detail.title).toBe('Error saving the profile picture');
    expect(event.detail.variant).toBe('error');
  });
});
