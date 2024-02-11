import updateProfilePicture from '@salesforce/apex/UserProfilePictureController.updateProfilePicture';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { LightningElement } from 'lwc';

/**
 * Create a photo using the device's camera and use it to update the user profile.
 * @alias TakeUserProfilePicture
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-take-user-profile-picture></c-take-user-profile-picture>
 */
export default class TakeUserProfilePicture extends LightningElement {
  video;
  canvas;

  renderedCallback() {
    this.video = this.template.querySelector('.video');
    this.canvas = this.template.querySelector('.canvas');
  }

  async startCamera() {
    if (navigator.mediaDevices) {
      try {
        this.video.srcObject = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (error) {
        this.showToast('Error accessing camera', error?.body?.message, 'error');
      }
    } else {
      this.showToast('Error', 'getUserMedia is not supported in this browser', 'error');
    }
  }

  stopCamera() {
    this.video.srcObject.getTracks().forEach((track) => track.stop());
    this.video.srcObject = null;
    this.hidePreview();
  }

  capturePhoto() {
    if (this.video && this.video.srcObject !== null) {
      this.canvas.height = this.video.videoHeight;
      this.canvas.width = this.video.videoWidth;
      const context = this.canvas.getContext('2d');
      context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      const dataUrl = this.canvas.toDataURL('image/png');
      const preview = this.template.querySelector('.preview');
      preview.setAttribute('src', dataUrl);
      preview.classList.add('slds-show');
      preview.classList.remove('slds-hide');
    }
  }

  updatePhoto() {
    const dataUrl = this.canvas.toDataURL('image/png');
    const base64 = dataUrl.replace('data:', '').replace(/^.+,/, '');

    updateProfilePicture({ base64: base64 })
      .then(() => {
        this.showToast(
          'Success',
          'Profile picture has been updated, it takes some time until the change is visible',
          'success'
        );
      })
      .catch((error) => {
        this.showToast('Error saving the profile picture', error?.body?.message, 'error');
      });
  }

  hidePreview() {
    const preview = this.template.querySelector('.preview');
    preview.setAttribute('src', '');
    preview.classList.add('slds-hide');
    preview.classList.remove('slds-show');
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title: title, message: message, variant: variant }));
  }
}
