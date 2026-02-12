import { LightningElement, api } from 'lwc';

/**
 * Reusable pagination navigation bar with first, previous, next, and last buttons.
 * @alias DatatablePagination
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-datatable-pagination
 *   pagination-label={paginationLabel}
 *   is-first-page={isFirstPage}
 *   is-last-page={isLastPage}
 * ></c-datatable-pagination>
 */
export default class DatatablePagination extends LightningElement {
  @api paginationLabel = '';
  @api isFirstPage = false;
  @api isLastPage = false;

  handleFirst() {
    this.dispatchEvent(new CustomEvent('first'));
  }

  handlePrevious() {
    this.dispatchEvent(new CustomEvent('previous'));
  }

  handleNext() {
    this.dispatchEvent(new CustomEvent('next'));
  }

  handleLast() {
    this.dispatchEvent(new CustomEvent('last'));
  }
}
