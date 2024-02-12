import updateProfilePicture from '@salesforce/apex/UserProfilePictureController.updateProfilePicture';
import TakeUserProfilePicture from 'c/takeUserProfilePicture';
import { createElement } from 'lwc';

const mockGetUserMedia = jest.fn(async () => {
  return new Promise((resolve) => {
    resolve();
  });
});

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia
  }
});

jest.mock(
  '@salesforce/apex/UserProfilePictureController.updateProfilePicture',
  () => {
    return {
      default: jest.fn()
    };
  },
  { virtual: true }
);

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
  });

  it('should allow taking and updating user profile picture', () => {
    // when
    updateProfilePicture.mockResolvedValue();
    document.body.appendChild(element);

    const buttonStartCamera = element.shadowRoot.querySelector('lightning-button[data-id="start"]');
    const buttonCapturePhoto = element.shadowRoot.querySelector('lightning-button[data-id="capture"]');
    const buttonUpdatePhoto = element.shadowRoot.querySelector('lightning-button[data-id="update"]');
    buttonStartCamera.click();
    buttonCapturePhoto.click();
    buttonUpdatePhoto.click();

    // then
    expect(updateProfilePicture).toHaveBeenCalledTimes(1);
  });

  it('should handle error when updating user profile picture', () => {
    // when
    updateProfilePicture.mockRejectedValue();
    document.body.appendChild(element);

    const buttonStartCamera = element.shadowRoot.querySelector('lightning-button[data-id="start"]');
    const buttonCapturePhoto = element.shadowRoot.querySelector('lightning-button[data-id="capture"]');
    const buttonUpdatePhoto = element.shadowRoot.querySelector('lightning-button[data-id="update"]');
    buttonStartCamera.click();
    buttonCapturePhoto.click();
    buttonUpdatePhoto.click();

    // then
    expect(updateProfilePicture).toHaveBeenCalledTimes(1);
  });
});
