/* eslint-disable no-undef */
import Render3DElementsThreeJS from 'c/render3DElementsThreeJS';
import { loadScript } from 'lightning/platformResourceLoader';
import { createElement } from 'lwc';

jest.mock('lightning/platformResourceLoader', () => ({ loadScript: jest.fn() }), {
  virtual: true
});

let element;
let mocks;
let resizeCallback;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const errorMessage = () => element.shadowRoot.querySelector('c-error-alert')?.message;

const container = () => element.shadowRoot.querySelector('.container');

const vector = (length = 0) => ({ length: () => length, set: jest.fn() });

function setContainerSize(width, height) {
  Object.defineProperty(container(), 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(container(), 'clientHeight', { value: height, configurable: true });
}

// mounts the component with the library load resolved and a container of 600 x 400 pixels
async function mount(props = {}) {
  Object.assign(element, props);
  loadScript.mockResolvedValue();
  document.body.appendChild(element);
  setContainerSize(600, 400);
  await flushPromises();
}

describe('c-render3-d-elements-three-j-s', () => {
  beforeEach(() => {
    mocks = {
      scene: { add: jest.fn() },
      camera: { position: { set: jest.fn() }, updateProjectionMatrix: jest.fn() },
      renderer: {
        setSize: jest.fn(),
        domElement: document.createElement('canvas'),
        render: jest.fn(),
        dispose: jest.fn()
      },
      crate: { rotation: { x: 0, y: 0 } },
      controls: { update: jest.fn(), dispose: jest.fn(), target: { set: jest.fn() } },
      model: { rotation: { x: 0, y: 0 }, position: { sub: jest.fn() } },
      load: jest.fn()
    };

    global.THREE = {
      Scene: jest.fn(() => mocks.scene),
      Color: jest.fn((value) => ({ value })),
      PerspectiveCamera: jest.fn(() => mocks.camera),
      WebGLRenderer: jest.fn(() => mocks.renderer),
      BoxGeometry: jest.fn(),
      TextureLoader: jest.fn(() => ({ load: jest.fn((url) => ({ url })) })),
      MeshBasicMaterial: jest.fn(),
      Mesh: jest.fn(() => mocks.crate),
      OrbitControls: jest.fn(() => mocks.controls),
      GLTFLoader: jest.fn(() => ({ load: mocks.load })),
      HemisphereLight: jest.fn(),
      DirectionalLight: jest.fn(() => ({ position: { set: jest.fn() } })),
      Vector3: jest.fn(() => vector()),
      Box3: jest.fn(() => ({ setFromObject: () => ({ getSize: () => vector(8), getCenter: () => vector() }) }))
    };

    global.ResizeObserver = jest.fn((callback) => {
      resizeCallback = callback;
      return { observe: jest.fn(), disconnect: jest.fn() };
    });

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

  it('should show the crate with its texture from a static resource and be accessible', async () => {
    // when
    await mount();

    // then
    expect(THREE.Scene).toHaveBeenCalled();
    expect(THREE.PerspectiveCamera).toHaveBeenCalledWith(75, 1, 0.1, 1000);
    expect(THREE.MeshBasicMaterial).toHaveBeenCalledWith({ map: { url: expect.stringContaining('crateMaterial') } });
    expect(mocks.scene.add).toHaveBeenCalledWith(mocks.crate);
    expect(mocks.scene.background).toBeUndefined();
    expect(mocks.camera.position.z).toBe(3);
    expect(container().getAttribute('style')).toBe('height: 400px');
    expect(container().querySelector('canvas')).toBe(mocks.renderer.domElement);
    expect(THREE.GLTFLoader).not.toHaveBeenCalled();
    expect(THREE.OrbitControls).not.toHaveBeenCalled();
    await expect(element).toBeAccessible();
  });

  it('should render a first frame that turns the crate and request the next one', async () => {
    // when
    await mount();

    // then
    expect(mocks.renderer.render).toHaveBeenCalledWith(mocks.scene, mocks.camera);
    expect(mocks.crate.rotation.x).toBeCloseTo(0.01);
    expect(mocks.crate.rotation.y).toBeCloseTo(0.01);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('should size the renderer and camera to the container and skip a container without size', async () => {
    // given
    await mount({ height: '250px' });
    mocks.renderer.setSize.mockClear();

    // when
    setContainerSize(800, 250);
    resizeCallback();
    setContainerSize(0, 0);
    resizeCallback();

    // then
    expect(container().getAttribute('style')).toBe('height: 250px');
    expect(mocks.renderer.setSize.mock.calls).toEqual([[800, 250]]);
    expect(mocks.camera.aspect).toBeCloseTo(800 / 250);
  });

  it('should apply the background color, the mouse controls and no rotation', async () => {
    // when
    await mount({ backgroundColor: '#f3f3f3', enableControls: true, disableRotation: true });

    // then
    expect(mocks.scene.background).toEqual({ value: '#f3f3f3' });
    expect(THREE.OrbitControls).toHaveBeenCalledWith(mocks.camera, mocks.renderer.domElement);
    expect(mocks.controls.update).toHaveBeenCalled();
    expect(mocks.crate.rotation).toEqual({ x: 0, y: 0 });
  });

  it.each([
    ['a model', 8, [0, 2, 8], [0.08, 800]],
    ['an empty model', 0, [0, 0.25, 1], [0.01, 100]]
  ])(
    'should load %s, light it, center it and turn it around its vertical axis',
    async (_label, size, camera, range) => {
      // given
      THREE.Box3.mockImplementation(() => ({
        setFromObject: () => ({ getSize: () => vector(size), getCenter: () => vector() })
      }));
      await mount({ modelUrl: '/resource/carModel', enableControls: true });
      const [url, onLoad] = mocks.load.mock.calls[0];

      // when
      onLoad({ scene: mocks.model });
      requestAnimationFrame.mock.calls[0][0]();

      // then
      expect(url).toBe('/resource/carModel');
      expect(THREE.Mesh).not.toHaveBeenCalled();
      expect(mocks.scene.add).toHaveBeenCalledWith(mocks.model);
      expect(THREE.HemisphereLight).toHaveBeenCalled();
      expect(mocks.model.position.sub).toHaveBeenCalled();
      expect(mocks.camera.position.set).toHaveBeenCalledWith(...camera);
      expect([mocks.camera.near, mocks.camera.far]).toEqual(range);
      expect(mocks.controls.target.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mocks.model.rotation).toEqual({ x: 0, y: 0.01 });
    }
  );

  it('should show an error when the model cannot be loaded', async () => {
    // given
    await mount({ modelUrl: '/resource/missing' });

    // when
    mocks.load.mock.calls[0][3](new Error('Not Found'));
    await flushPromises();

    // then
    expect(errorMessage()).toBe('The 3D model could not be loaded: Not Found');
    await expect(element).toBeAccessible();
  });

  it('should stop the animation and free the renderer, controls and observer when removed', async () => {
    // given
    await mount({ enableControls: true });
    const observer = ResizeObserver.mock.results[0].value;

    // when
    document.body.removeChild(element);

    // then
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(mocks.renderer.dispose).toHaveBeenCalled();
    expect(mocks.controls.dispose).toHaveBeenCalled();
    expect(observer.disconnect).toHaveBeenCalled();
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
    THREE.WebGLRenderer.mockImplementation(() => {
      throw new Error('Error creating WebGL context.');
    });

    // when
    await mount();

    // then
    expect(errorMessage()).toBe('The 3D scene could not be displayed: Error creating WebGL context.');
  });

  it('should show no error when the scene is rendered', async () => {
    // when
    await mount();

    // then
    expect(errorMessage()).toBeUndefined();
  });
});
