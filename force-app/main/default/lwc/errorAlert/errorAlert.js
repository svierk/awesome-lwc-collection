import { api, LightningElement } from 'lwc';

/**
 * An inline alert that shows an error message to the user.
 * @alias ErrorAlert
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-error-alert lwc:if={errorMessage} message={errorMessage}></c-error-alert>
 */
export default class ErrorAlert extends LightningElement {
  /**
   * The message to show.
   * @type {string}
   */
  @api message;
}
