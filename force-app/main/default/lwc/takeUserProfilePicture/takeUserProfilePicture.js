import CAPTURE_PHOTO from '@salesforce/label/c.TakeUserProfilePicture_CapturePhoto';
import ERROR_SAVING from '@salesforce/label/c.TakeUserProfilePicture_ErrorSaving';
import NEW_PROFILE_PREVIEW from '@salesforce/label/c.TakeUserProfilePicture_NewProfilePreview';
import START_CAMERA from '@salesforce/label/c.TakeUserProfilePicture_StartCamera';
import STOP_CAMERA from '@salesforce/label/c.TakeUserProfilePicture_StopCamera';
import SUCCESS from '@salesforce/label/c.TakeUserProfilePicture_Success';
import TITLE from '@salesforce/label/c.TakeUserProfilePicture_Title';
import UPDATED from '@salesforce/label/c.TakeUserProfilePicture_Updated';
import UPDATE_PROFILE from '@salesforce/label/c.TakeUserProfilePicture_UpdateProfile';
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
  labels = {
    title: TITLE,
    newProfilePreview: NEW_PROFILE_PREVIEW,
    startCamera: START_CAMERA,
    stopCamera: STOP_CAMERA,
    capturePhoto: CAPTURE_PHOTO,
    updateProfile: UPDATE_PROFILE
  };

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

  async startCamera() {
    await this.camera.start();
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
        this.showToast(SUCCESS, UPDATED, 'success');
      })
      .catch((error) => {
        showErrorToast(this, ERROR_SAVING, error);
      });
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title: title, message: message, variant: variant }));
  }
}
