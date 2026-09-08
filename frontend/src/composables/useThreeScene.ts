// Fábrica de escena Three.js con manejo de ciclo de vida y LIBERACIÓN de recursos.
// No usa hooks de Vue (se llama en onMounted); el componente llama dispose() en onUnmounted.
// Optimizada para tablets: pixelRatio acotado, low-power, pausa cuando la pestaña no es visible.
import * as THREE from 'three';

export interface ThreeScene {
  THREE: typeof THREE;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  start: (update?: (dt: number) => void) => void;
  dispose: () => void;
}

export function webglDisponible(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { return false; }
}

export function createThreeScene(canvas: HTMLCanvasElement, width: number, height: number): ThreeScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
  camera.position.set(0, 2, 14);

  const clock = new THREE.Clock();
  let raf = 0;
  let running = false;
  let update: ((dt: number) => void) | undefined;

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;              // pausa el cómputo si no es visible
    const dt = Math.min(clock.getDelta(), 0.05);
    if (update) update(dt);
    renderer.render(scene, camera);
  }

  function start(cb?: (dt: number) => void) {
    update = cb;
    if (running) return;
    running = true;
    clock.start();
    loop();
  }

  function dispose() {
    running = false;
    cancelAnimationFrame(raf);
    scene.traverse((o: any) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
      if (o.texture) o.texture.dispose();
    });
    renderer.dispose();
  }

  return { THREE, scene, camera, renderer, start, dispose };
}
