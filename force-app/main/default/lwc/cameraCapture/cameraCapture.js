import { showErrorToast } from 'c/errorUtils';
import { api, LightningElement } from 'lwc';

const FACING_MODES = { front: 'user', back: 'environment' };

/**
 * A live camera view that takes photos with the Media Capture and Streams API.
 * @alias CameraCapture
 * @extends LightningElement
 * @hideconstructor
 *
 * @fires CameraCapture#capture
 *
 * @example
 * <c-camera-capture camera="back" oncapture={handleCapture}></c-camera-capture>
 */
export default class CameraCapture extends LightningElement {
  /**
   * The camera to ask for, front or back. Devices with only one camera use that one.
   * @type {string}
   * @default 'front'
   */
  @api camera = 'front';

  /**
   * If present, the buttons are hidden, so that a parent can use its own with the start, stop and capture methods.
   * @type {boolean}
   * @default false
   */
  @api hideControls = false;

  /**
   * Starts the camera. A running camera is stopped first.
   * @returns {Promise<void>} Resolves when the camera has started or failed
   */
  @api
  async start() {
    if (!navigator.mediaDevices) {
      showErrorToast(this, 'Error', 'getUserMedia is not supported in this browser');
      return;
    }
    this.stop();
    const facingMode = FACING_MODES[this.camera] ?? FACING_MODES.front;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      if (this.isConnected) {
        this.video.srcObject = stream;
      } else {
        this.stopTracks(stream);
      }
    } catch (error) {
      showErrorToast(this, 'Error accessing camera', error);
    }
  }

  /**
   * Stops the camera. Does nothing if it isn't running.
   */
  @api
  stop() {
    const stream = this.video?.srcObject;
    if (stream) {
      this.stopTracks(stream);
      this.video.srcObject = null;
    }
  }

  /**
   * Takes a photo and fires the capture event. Does nothing if the camera isn't running.
   */
  @api
  capture() {
    if (!this.video?.srcObject) return;
    const canvas = this.template.querySelector('.canvas');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    canvas.getContext('2d').drawImage(this.video, 0, 0, canvas.width, canvas.height);

    /**
     * Fired when a photo was taken.
     * @event CameraCapture#capture
     * @type {CustomEvent}
     * @property {Object} detail - The photo as dataUrl, a PNG data URL
     */
    this.dispatchEvent(new CustomEvent('capture', { detail: { dataUrl: canvas.toDataURL('image/png') } }));
  }

  resizeObserver;

  get video() {
    return this.template.querySelector('.video');
  }

  get showControls() {
    return !this.hideControls;
  }

  renderedCallback() {
    if (this.resizeObserver) return;
    // Lightning keeps visited pages in the DOM and only hides them, so a removed component isn't the only way out:
    // the size drops to zero when the page is hidden, while scrolling away doesn't change it
    this.resizeObserver = new ResizeObserver(([{ contentRect }]) => {
      if (contentRect.width === 0 && contentRect.height === 0) this.stop();
    });
    this.resizeObserver.observe(this.video);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.stop();
  }

  stopTracks(stream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  async handleStart() {
    await this.start();
  }

  handleStop() {
    this.stop();
  }

  handleCapture() {
    this.capture();
  }
}
