/* eslint-disable no-undef */
import Render3DElementsThreeJS from 'c/render3DElementsThreeJS';
import { loadScript } from 'lightning/platformResourceLoader';
import { createElement } from 'lwc';

jest.mock('lightning/platformResourceLoader', () => ({ loadScript: jest.fn() }), {
  virtual: true
});

let element;

describe('c-render3-d-elements-three-j-s', () => {
  let mockScene;
  let mockCamera;
  let mockRenderer;
  let mockCube;

  beforeEach(() => {
    // mock window dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });

    // setup three.js mocks
    mockScene = { add: jest.fn() };
    mockCamera = { position: {} };
    mockRenderer = {
      setSize: jest.fn(),
      domElement: document.createElement('canvas'),
      render: jest.fn()
    };
    mockCube = { rotation: { x: 0, y: 0 } };

    global.THREE = {
      Scene: jest.fn(() => mockScene),
      PerspectiveCamera: jest.fn(() => mockCamera),
      WebGLRenderer: jest.fn(() => mockRenderer),
      BoxGeometry: jest.fn(),
      TextureLoader: jest.fn(() => ({
        load: jest.fn()
      })),
      MeshBasicMaterial: jest.fn(),
      Mesh: jest.fn(() => mockCube)
    };

    global.requestAnimationFrame = jest.fn((cb) => {
      cb();
      return 1;
    });

    element = createElement('c-render3-d-elements-three-j-s', {
      is: Render3DElementsThreeJS
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should create and be accessible', async () => {
    // given
    loadScript.mockResolvedValue();

    // when
    document.body.appendChild(element);
    await Promise.resolve();

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });

  it('should initialize three.js scene on successful script load', async () => {
    // given
    loadScript.mockResolvedValue();

    // when
    document.body.appendChild(element);
    await Promise.resolve();

    // then
    expect(THREE.Scene).toHaveBeenCalled();
    expect(THREE.PerspectiveCamera).toHaveBeenCalledWith(75, 1024 / 768, 0.1, 1000);
    expect(mockScene.add).toHaveBeenCalledWith(mockCube);
    expect(mockRenderer.setSize).toHaveBeenCalledWith(1024, 768, true);
    expect(mockCamera.position.z).toBe(3);
  });

  it('should handle script loading error', async () => {
    // given
    loadScript.mockRejectedValue(new Error('Script loading failed'));

    // when
    document.body.appendChild(element);
    await Promise.resolve();

    // then
    expect(THREE.Scene).not.toHaveBeenCalled();
  });
});
