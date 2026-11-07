import DOWNLOAD from '@salesforce/label/c.Base64ToPdf_Download';
import TITLE from '@salesforce/label/c.Base64ToPdf_Title';
import { api, LightningElement } from 'lwc';
import { base64 as exampleBase64 } from './example.js';

/**
 * A simple utility for Base64 encoded strings to decode and download them as PDF file.
 * @alias Base64ToPdf
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-base64-to-pdf base64={pdfContent} file-name="invoice.pdf"></c-base64-to-pdf>
 */
export default class Base64ToPdf extends LightningElement {
  labels = { title: TITLE, download: DOWNLOAD };

  /**
   * The content of the PDF file as Base64 encoded string, without a data URL prefix.
   * An example file is used until this is set. An empty value offers no download.
   * @type {string}
   */
  @api base64 = exampleBase64;

  /**
   * The name of the downloaded file.
   * @type {string}
   * @default 'example.pdf'
   */
  @api fileName = 'example.pdf';

  get pdf() {
    return this.base64 ? `data:application/pdf;base64,${this.base64}` : undefined;
  }
}
