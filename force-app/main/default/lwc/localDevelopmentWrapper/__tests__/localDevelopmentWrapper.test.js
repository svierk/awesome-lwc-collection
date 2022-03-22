import LocalDevelopmentWrapper from 'c/localDevelopmentWrapper';
import { createElement } from 'lwc';

describe('c-local-development-wrapper', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create', () => {
    // given
    const element = createElement('c-local-development-wrapper', {
      is: LocalDevelopmentWrapper
    });

    // when
    document.body.appendChild(element);

    // then
    return Promise.resolve().then(() => {
      expect(element).toBeTruthy();
    });
  });
});
