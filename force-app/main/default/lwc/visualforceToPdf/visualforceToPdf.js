import { api, LightningElement } from 'lwc';

/**
 * A simple utility for displaying Visualforce based PDF documents.
 * @alias VisualforceToPdf
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-visualforce-to-pdf url="/apex/AccountDetails" height="500px" width="100%"></c-visualforce-to-pdf>
 */
export default class VisualforceToPdf extends LightningElement {
  /**
   * Specifies the height of the PFD viewer. Default height is 500 pixels.
   * @type {string}
   * @default '500px'
   */
  @api height = '500px';

  /**
   * Specifies the Visualforce Page address of the document to be displayed.
   * @type {string}
   * @default ''
   */
  @api url = '';

  /**
   * Specifies the width of the PFD viewer. Default width is 100 percent.
   * @type {string}
   * @default '100%'
   */
  @api width = '100%';
}
