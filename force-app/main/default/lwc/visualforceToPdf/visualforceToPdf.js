import FRAME_TITLE from '@salesforce/label/c.VisualforceToPdf_FrameTitle';
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
  labels = { frameTitle: FRAME_TITLE };

  /**
   * If show card option is active, the card icon is displayed in the header before the card title.
   * It should contain the SLDS name of the icon.
   * Specify the name in the format 'utility:down' where 'utility' is the category and 'down' the icon to be displayed.
   * @type {string}
   * @default 'doctype:pdf'
   * @example 'doctype:pdf'
   */
  @api cardIcon = 'doctype:pdf';

  /**
   * If show card option is active, the card title can include text and is displayed in the header above the PDF viewer.
   * @type {string}
   * @default ''
   */
  @api cardTitle = '';

  /**
   * Specifies the height of the PFD viewer. Default height is 500 pixels.
   * @type {string}
   * @default '500px'
   */
  @api height = '500px';

  /**
   * If present, the PDF viewer is wrapped in a lightning card to fit better into the overall page layout.
   * @type {boolean}
   * @default false
   */
  @api showCard = false;

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
