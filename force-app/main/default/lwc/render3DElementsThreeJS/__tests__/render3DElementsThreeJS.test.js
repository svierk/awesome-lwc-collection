/* eslint-disable no-undef */
import Render3DElementsThreeJS from 'c/render3DElementsThreeJS';
import { loadScript } from 'lightning/platformResourceLoader';
import { createElement } from 'lwc';

jest.mock('lightning/platformResourceLoader', () => ({ loadScript: jest.fn() }), {
  virtual: true
});

let element;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const errorMessage = () => element.shadowRoot.querySelector('c-error-alert')?.message;

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
      render: jest.fn(),
      dispose: jest.fn()
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

    // the next frame is only requested, never run, so the loop does not recurse
    global.requestAnimationFrame = jest.fn(() => 42);
    global.cancelAnimationFrame = jest.fn();

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

  it('should render a first frame and request the next one', async () => {
    // given
    loadScript.mockResolvedValue();

    // when
    document.body.appendChild(element);
    await Promise.resolve();

    // then
    expect(mockRenderer.render).toHaveBeenCalledWith(mockScene, mockCamera);
    expect(mockCube.rotation.x).toBeCloseTo(0.01);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('should stop the animation and dispose the renderer when removed', async () => {
    // given
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    await Promise.resolve();

    // when
    document.body.removeChild(element);

    // then
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(mockRenderer.dispose).toHaveBeenCalled();
  });

  it('should show an error when the script cannot be loaded', async () => {
    // given
    loadScript.mockRejectedValue(new Error('Script loading failed'));

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(THREE.Scene).not.toHaveBeenCalled();
    expect(errorMessage()).toBe('The 3D scene could not be displayed: Script loading failed');
    await expect(element).toBeAccessible();
  });

  it('should show an error when the rejection has no message', async () => {
    // given
    loadScript.mockRejectedValue(undefined);

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(errorMessage()).toBe('The 3D scene could not be displayed.');
  });

  it('should show an error when the scene cannot be initialized', async () => {
    // given
    loadScript.mockResolvedValue();
    THREE.WebGLRenderer.mockImplementation(() => {
      throw new Error('Error creating WebGL context.');
    });

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(errorMessage()).toBe('The 3D scene could not be displayed: Error creating WebGL context.');
  });

  it('should show no error when the scene is rendered', async () => {
    // given
    loadScript.mockResolvedValue();

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(errorMessage()).toBeUndefined();
  });
});
