import updateProfilePicture from '@salesforce/apex/UserProfilePictureController.updateProfilePicture';
import { showErrorToast } from 'c/errorUtils';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { api, LightningElement } from 'lwc';

/**
 * Create a photo using the device's camera and use it to update the user profile.
 * @alias TakeUserProfilePicture
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-take-user-profile-picture default-camera="front"></c-take-user-profile-picture>
 */
export default class TakeUserProfilePicture extends LightningElement {
  /**
   * The camera to start with, front or back. Devices with only one camera use that one.
   * @type {string}
   * @default 'front'
   */
  @api defaultCamera = 'front';

  photoDataUrl;

  get camera() {
    return this.template.querySelector('c-camera-capture');
  }

  get isUpdateDisabled() {
    return !this.photoDataUrl;
  }

  startCamera() {
    this.camera.start();
  }

  stopCamera() {
    this.camera.stop();
    this.photoDataUrl = undefined;
  }

  capturePhoto() {
    this.camera.capture();
  }

  handleCapture(event) {
    this.photoDataUrl = event.detail.dataUrl;
  }

  updatePhoto() {
    const base64 = this.photoDataUrl.split(',')[1];

    updateProfilePicture({ base64: base64 })
      .then(() => {
        this.showToast(
          'Success',
          'Profile picture has been updated, it takes some time until the change is visible',
          'success'
        );
      })
      .catch((error) => {
        showErrorToast(this, 'Error saving the profile picture', error);
      });
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title: title, message: message, variant: variant }));
  }
}
