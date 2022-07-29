import IFrame from 'c/iFrame';
import { createElement } from 'lwc';

describe('c-i-frame', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create', () => {
    // given
    const element = createElement('c-i-frame', {
      is: IFrame
    });

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
  });
});
