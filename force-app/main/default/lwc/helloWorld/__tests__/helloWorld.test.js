import HelloWorld from 'c/helloWorld';
import { createElement } from 'lwc';

describe('c-hello-world', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('displays greeting', () => {
    // given
    const element = createElement('c-hello-world', {
      is: HelloWorld
    });
    document.body.appendChild(element);

    // when
    element.name = 'World';

    // then
    return Promise.resolve().then(() => {
      const div = element.shadowRoot.querySelector('div');
      expect(div.textContent).toBe('Hello, World!');
    });
  });
});
