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
 *   referrerpolicy="no-referrer"
 * ></c-i-frame>
 */
export default class IFrame extends LightningElement {
  /**
   * Specifies the height of the iframe. Default height is 500 pixels.
   * @type {string}
   * @default '500px'
   */
  @api height = '500px';

  /**
   * Specifies which referrer information to send when fetching the iframe.
   * @type {string}
   * @default 'no-referrer'
   */
  @api referrerPolicy = 'no-referrer';

  /**
   * Enables an extra set of restrictions for the content in an iframe.
   * @type {string}
   * @default ''
   */
  @api sandbox = '';

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
