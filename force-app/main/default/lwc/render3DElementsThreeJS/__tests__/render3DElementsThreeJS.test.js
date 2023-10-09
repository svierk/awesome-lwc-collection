import Render3DElementsThreeJS from 'c/render3DElementsThreeJS';
import { loadScript } from 'lightning/platformResourceLoader';
import { createElement } from 'lwc';

jest.mock('lightning/platformResourceLoader', () => ({ loadScript: jest.fn() }), {
  virtual: true
});

describe('c-render3-d-elements-three-j-s', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create and be accessible', async () => {
    loadScript.mockResolvedValueOnce(
      new Promise((resolve) => {
        global.window.THREE = {
          Scene: jest.fn(),
          PerspectiveCamera: jest.fn(),
          WebGLRenderer: jest.fn(),
          BoxGeometry: jest.fn(),
          MeshBasicMaterial: jest.fn()
        };
        resolve();
      })
    );

    // given
    const element = createElement('c-render3-d-elements-three-j-s', {
      is: Render3DElementsThreeJS
    });

    // when
    document.body.appendChild(element);
    await Promise.resolve('loadScript promise');

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });
});
