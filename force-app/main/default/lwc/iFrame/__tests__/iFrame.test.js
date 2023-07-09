import IFrame from 'c/iFrame';
import { createElement } from 'lwc';

describe('c-i-frame', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create and be accessible', async () => {
    // given
    const element = createElement('c-i-frame', {
      is: IFrame
    });
    element.sandbox = 'test';

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });
});
