import { api, LightningElement } from 'lwc';
import { base64 } from './example.js';

/**
 * A simple utility for Base64 encoded strings to decode them into PDF files.
 * @alias Base64ToPdf
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-base64-to-pdf height="500px" width="100%"></c-base64-to-pdf>
 */
export default class Base64ToPdf extends LightningElement {
  /**
   * Specifies the height of the pdf iframe. Default height is 500 pixels.
   * @type {string}
   * @default '500px'
   */
  @api height = '500px';

  /**
   * Specifies the width of the pdf iframe. Default width is 100 percent.
   * @type {string}
   * @default '100%'
   */
  @api width = '100%';

  pdf = `data:application/pdf;base64,${base64}`;
  fileName = 'example.pdf';

  get pdfSrc() {
    return this.pdf;
  }
}
