/* eslint-disable no-undef */
import crateMaterial from '@salesforce/resourceUrl/crateMaterial';
import threejs from '@salesforce/resourceUrl/threejs';
import { getErrorMessage } from 'c/errorUtils';
import { loadScript } from 'lightning/platformResourceLoader';
import { api, LightningElement } from 'lwc';

const ROTATION_SPEED = 0.01;

/**
 * A 3D viewer for glTF and GLB models, using three.js. Without a model, it shows a rotating crate.
 * @alias Render3DElementsThreeJS
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-render3-d-elements-three-j-s
 *   model-url="/resource/carModel"
 *   enable-controls
 *   background-color="#f3f3f3"
 *   height="500px"
 *   show-card
 * ></c-render3-d-elements-three-j-s>
 */
export default class Render3DElementsThreeJS extends LightningElement {
  /**
   * Background color of the scene as a CSS color, e.g. '#f3f3f3' or 'white'. Without it, the background is black.
   * @type {string}
   * @default ''
   */
  @api backgroundColor = '';

  /**
   * If show card option is active, the card icon is displayed in the header before the card title.
   * It should contain the SLDS name of the icon.
   * Specify the name in the format 'utility:down' where 'utility' is the category and 'down' the icon to be displayed.
   * @type {string}
   * @default 'custom:custom57'
   * @example 'custom:custom57'
   */
  @api cardIcon = 'custom:custom57';

  /**
   * If show card option is active, the card title can include text and is displayed in the header above the viewer.
   * @type {string}
   * @default '3D Viewer'
   */
  @api cardTitle = '3D Viewer';

  /**
   * If present, the model doesn't rotate on its own.
   * @type {boolean}
   * @default false
   */
  @api disableRotation = false;

  /**
   * If present, the model can be rotated with the mouse or touch, zoomed with the wheel and moved with the right
   * mouse button.
   * @type {boolean}
   * @default false
   */
  @api enableControls = false;

  /**
   * Height of the viewer, e.g. '400px'. The width follows the container.
   * @type {string}
   * @default '400px'
   */
  @api height = '400px';

  /**
   * URL of a glTF or GLB model, e.g. of a static resource: '/resource/carModel'. Without it, the viewer shows a crate.
   * @type {string}
   * @default ''
   */
  @api modelUrl = '';

  /**
   * If present, the viewer is wrapped in a lightning card to fit better into the overall page layout.
   * @type {boolean}
   * @default false
   */
  @api showCard = false;

  errorMessage = '';

  get containerStyle() {
    return `height: ${this.height}`;
  }

  get cardClass() {
    return this.showCard ? 'slds-card' : '';
  }

  get cardBodyClass() {
    return this.showCard ? 'slds-card__body slds-card__body_inner' : '';
  }

  connectedCallback() {
    loadScript(this, threejs)
      .then(() => {
        this.init();
      })
      .catch((error) => this.showError('The 3D scene could not be displayed', error));
  }

  disconnectedCallback() {
    // stop the animation loop and free the WebGL context once the component is removed
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  showError(prefix, error) {
    const reason = getErrorMessage(error, '');
    this.errorMessage = reason ? `${prefix}: ${reason}` : `${prefix}.`;
  }

  init() {
    const container = this.template.querySelector('.container');
    const scene = new THREE.Scene();
    if (this.backgroundColor) {
      scene.background = new THREE.Color(this.backgroundColor);
    }
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 3;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    container.replaceChildren(renderer.domElement);
    Object.assign(this, { scene, camera, renderer, container });

    if (this.enableControls) {
      this.controls = new THREE.OrbitControls(camera, renderer.domElement);
      // a hand shows that the model can be turned, and closes while it is dragged
      this.controls.cursorStyle = 'grab';
    }
    if (this.modelUrl) {
      this.loadModel();
    } else {
      this.subject = this.createCrate();
    }

    // the size comes from the container, so the viewer fits wherever it is placed
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);
      this.rotate();
      this.controls?.update();
      renderer.render(scene, camera);
    };
    animate();
  }

  createCrate() {
    const texture = new THREE.TextureLoader().load(crateMaterial);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ map: texture }));
    this.scene.add(crate);
    return crate;
  }

  loadModel() {
    new THREE.GLTFLoader().load(
      this.modelUrl,
      (gltf) => this.showModel(gltf.scene),
      undefined,
      (error) => this.showError('The 3D model could not be loaded', error)
    );
  }

  /** Lights the model, moves it to the center and the camera so far away that the whole model is visible. */
  showModel(model) {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 3));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(5, 10, 7);
    this.scene.add(light);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    model.position.sub(box.getCenter(new THREE.Vector3()));
    this.scene.add(model);

    this.camera.near = size / 100;
    this.camera.far = size * 100;
    this.camera.position.set(0, size * 0.25, size);
    this.camera.updateProjectionMatrix();
    this.controls?.target.set(0, 0, 0);
    this.subject = model;
  }

  rotate() {
    if (this.disableRotation || !this.subject) {
      return;
    }
    // the crate tumbles as before, a model turns around its vertical axis
    if (!this.modelUrl) {
      this.subject.rotation.x += ROTATION_SPEED;
    }
    this.subject.rotation.y += ROTATION_SPEED;
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) {
      return;
    }
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
