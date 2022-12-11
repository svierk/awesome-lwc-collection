import OpenRecordPageFlowAction from 'c/openRecordPageFlowAction';
import { createElement } from 'lwc';

describe('c-open-record-page-flow-action', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should redirect to record page', () => {
    // given
    window.open = jest.fn();
    const element = createElement('c-open-record-page-flow-action', {
      is: OpenRecordPageFlowAction
    });
    element.recorId = 123;
    element.target = '_blank';

    // when
    document.body.appendChild(element);

    // then
    expect(window.open).toHaveBeenCalledTimes(1);
  });
});
