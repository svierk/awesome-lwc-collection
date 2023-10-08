import Render3DElementsThreeJS from 'c/render3DElementsThreeJS';
import { createElement } from 'lwc';

jest.mock(
  'lightning/platformResourceLoader',
  () => {
    return {
      loadScript() {
        return new Promise((resolve) => {
          global.window.THREE = require('../../../staticresources/threejs');
          resolve();
        });
      }
    };
  },
  { virtual: true }
);

describe('c-render3-d-elements-three-j-s', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create and be accessible', async () => {
    // given
    const element = createElement('c-render3-d-elements-three-j-s', {
      is: Render3DElementsThreeJS
    });

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });
});
