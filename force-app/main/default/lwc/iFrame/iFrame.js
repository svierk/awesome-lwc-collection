import { api, LightningElement } from 'lwc';

/**
 * A custom iFrame component with different configuration options.
 * @alias IFrame
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-i-frame
 *   url="https://example.com/"
 *   height="500px"
 *   width="100%"
 * ></c-i-frame>
 */
export default class IFrame extends LightningElement {
  /**
   * If show card option is active, the card icon is displayed in the header before the card title.
   * It should contain the SLDS name of the icon.
   * Specify the name in the format 'utility:down' where 'utility' is the category and 'down' the icon to be displayed.
   * @type {string}
   * @default 'utility:world'
   * @example 'utility:world'
   */
  @api cardIcon = 'utility:world';

  /**
   * If show card option is active, the card title can include text and is displayed in the header above the iframe.
   * @type {string}
   * @default ''
   */
  @api cardTitle = '';

  /**
   * Specifies the height of the iframe. Default height is 500 pixels.
   * @type {string}
   * @default '500px'
   */
  @api height = '500px';

  /**
   * Enables an extra set of restrictions for the content in an iframe.
   * @type {string}
   * @default ''
   */
  @api sandbox = '';

  /**
   * If present, the iframe is wrapped in a lightning card to fit better into the overall page layout.
   * @type {boolean}
   * @default false
   */
  @api showCard = false;

  /**
   * Specifies the address of the document to embed in the iframe.
   * @type {string}
   * @default ''
   */
  @api url = '';

  /**
   * Specifies the width of an iframe. Default width is 100 percent.
   * @type {string}
   * @default '100%'
   */
  @api width = '100%';

  renderedCallback() {
    if (this.sandbox) {
      const element = this.template.querySelector('iframe');
      element.sandbox = this.sandbox;
    }
  }
}
