import { api, LightningElement } from 'lwc';

/**
 * Component to forward to a record page from flow.
 * @alias OpenRecordPageFlowAction
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-open-record-page-flow-action record-id={recordId} target="_blank"></c-open-record-page-flow-action>
 */
export default class OpenRecordPageFlowAction extends LightningElement {
  /**
   * Record Id of the record page to which the action should forward.
   * @type {string}
   * @default ''
   */
  @api recordId;

  /**
   * Open the page in the same '_self' or in a new tab '_blank '.
   * @type {string}
   * @default ''
   */
  @api target = '_blank';

  connectedCallback() {
    const completeURL = `${globalThis.location.origin}/${this.recordId}`;
    globalThis.open(completeURL, this.target);
  }
}
