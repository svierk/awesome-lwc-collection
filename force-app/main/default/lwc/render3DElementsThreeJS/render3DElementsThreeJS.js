/* eslint-disable no-undef */
import threejs from '@salesforce/resourceUrl/threejs';
import { loadScript } from 'lightning/platformResourceLoader';
import { LightningElement } from 'lwc';

/**
 * A simple demo for rendering 3D elements using three.js.
 * @alias Render3DElementsThreeJS
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-render3-d-elements-three-j-s></c-render3-d-elements-three-j-s>
 */
export default class Render3DElementsThreeJS extends LightningElement {
  connectedCallback() {
    loadScript(this, threejs)
      .then(() => {
        this.init();
      })
      .catch((error) => {
        this.error = error;
      });
  }

  init() {
    // initialize scene, camera and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    // add cube element with crate material texture to scene
    const geometry = new THREE.BoxGeometry();
    const texture = new THREE.TextureLoader().load(
      'https://raw.githubusercontent.com/svierk/awesome-lwc-collection/main/images/crate-material.gif'
    );
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // append canvas element after defining its size and camera position
    renderer.setSize(window.innerWidth, window.innerHeight, true);
    camera.position.z = 3;
    const container = this.template.querySelector('.container');
    container.appendChild(renderer.domElement);
    this.template.querySelector('canvas').style.width = '100%';
    this.template.querySelector('canvas').style.height = 'auto';

    // add animation loop to rotate the cube
    function animate() {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
    animate();
  }
}
