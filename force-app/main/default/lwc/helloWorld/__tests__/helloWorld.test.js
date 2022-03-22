import HelloWorld from 'c/helloWorld';
import { createElement } from 'lwc';

describe('c-hello-world', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should display greeting', () => {
    // given
    const element = createElement('c-hello-world', {
      is: HelloWorld
    });
    element.name = 'World';

    // when
    document.body.appendChild(element);

    // then
    return Promise.resolve().then(() => {
      const div = element.shadowRoot.querySelector('div');
      expect(div.textContent).toBe('Hello, World!');
    });
  });
});
