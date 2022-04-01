import { api, LightningElement } from 'lwc';

/**
 * An example LWC that adds a classic greeting to any page.
 * @alias HelloWorld
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-hello-world name="World"></c-hello-world>
 */
export default class HelloWorld extends LightningElement {
  /**
   * Enter the name of the person to greet.
   * @type {string}
   * @default 'World'
   */
  @api name = 'World';
}
