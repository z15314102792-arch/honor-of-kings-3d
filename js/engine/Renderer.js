/**
 * Three.js 3D Engine Setup & Camera Follow Controller
 */
class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b14);
    this.scene.fog = new THREE.FogExp2(0x0a1424, 0.007);

    // Camera setup (Classic MOBA isometric perspective)
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.cameraOffset = new THREE.Vector3(0, 26, 20);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.setupLighting();
    this.setupEventListeners();
  }

  setupLighting() {
    // Ambient & Hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x1f293d, 0.65);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0x2d3748, 0.4);
    this.scene.add(ambientLight);

    // Sunlight (Directional with shadow casting)
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
    this.sunLight.position.set(35, 60, 45);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 160;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Blue base & Red base accent point lights
    const blueBaseLight = new THREE.PointLight(0x3b82f6, 2.5, 45);
    blueBaseLight.position.set(-50, 8, 50);
    this.scene.add(blueBaseLight);

    const redBaseLight = new THREE.PointLight(0xef4444, 2.5, 45);
    redBaseLight.position.set(50, 8, -50);
    this.scene.add(redBaseLight);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  updateCamera(targetPos, delta = 0.016) {
    if (!targetPos) return;
    
    // Smooth camera lerp
    this.cameraTarget.lerp(targetPos, 0.12);
    
    this.camera.position.set(
      this.cameraTarget.x + this.cameraOffset.x,
      this.cameraTarget.y + this.cameraOffset.y,
      this.cameraTarget.z + this.cameraOffset.z
    );
    this.camera.lookAt(this.cameraTarget.x, 0, this.cameraTarget.z - 2);

    // Update shadow camera target around player
    if (this.sunLight) {
      this.sunLight.position.set(
        this.cameraTarget.x + 35,
        60,
        this.cameraTarget.z + 45
      );
      this.sunLight.target.position.copy(this.cameraTarget);
      this.sunLight.target.updateMatrixWorld();
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
