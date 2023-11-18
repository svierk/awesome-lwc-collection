import { LightningElement } from 'lwc';
import { base64 } from './example.js';

/**
 * A simple utility for Base64 encoded strings to decode and download them as PDF file.
 * @alias Base64ToPdf
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-base64-to-pdf></c-base64-to-pdf>
 */
export default class Base64ToPdf extends LightningElement {
  pdf = `data:application/pdf;base64,${base64}`;
  fileName = 'example.pdf';

  get pdfSrc() {
    return this.pdf;
  }
}
