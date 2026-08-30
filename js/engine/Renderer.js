/**
 * Three.js 3D Engine Setup & Camera Follow Controller
 */
class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b14);
    this.scene.fog = new THREE.FogExp2(0x0a1424, 0.007);

    // Camera setup (Classic MOBA isometric perspective with HERO PERFECTLY CENTERED)
    const w = window.innerWidth || document.documentElement.clientWidth || 1920;
    const h = window.innerHeight || document.documentElement.clientHeight || 1080;
    const isPortrait = h > w;

    this.camera = new THREE.PerspectiveCamera(
      isPortrait ? 56 : 45,
      w / h,
      0.1,
      1000
    );
    this.cameraOffset = isPortrait ? new THREE.Vector3(0, 32, 20) : new THREE.Vector3(0, 28, 16);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);

    // WebGL Renderer with graceful fallback
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !this.isMobile,
        powerPreference: this.isMobile ? 'default' : 'high-performance',
        precision: this.isMobile ? 'mediump' : 'highp',
        alpha: false
      });
    } catch (e) {
      console.warn('Fallback WebGL initialization:', e);
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    }

    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 2));
    
    if (!this.isMobile) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
    } else {
      this.renderer.shadowMap.enabled = false;
      this.renderer.toneMapping = THREE.LinearToneMapping;
    }

    this.setupLighting();
    this.setupEventListeners();
  }

  setupLighting() {
    // Ambient & Hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x1f293d, 0.75);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0x334155, 0.5);
    this.scene.add(ambientLight);

    // Sunlight
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    this.sunLight.position.set(35, 60, 45);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
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
    const handleResize = () => {
      const w = window.innerWidth || document.documentElement.clientWidth;
      const h = window.innerHeight || document.documentElement.clientHeight;
      if (!w || !h) return;
      const isPortrait = h > w;
      this.camera.aspect = w / h;
      this.camera.fov = isPortrait ? 56 : 45;
      this.cameraOffset = isPortrait ? new THREE.Vector3(0, 32, 20) : new THREE.Vector3(0, 28, 16);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 150);
      setTimeout(handleResize, 350);
    });
  }

  updateCamera(targetPos, delta = 0.016) {
    if (!targetPos) return;
    
    // Smooth camera lerp - Target is EXACTLY at character position
    this.cameraTarget.lerp(targetPos, 0.15);
    
    this.camera.position.set(
      this.cameraTarget.x + this.cameraOffset.x,
      this.cameraTarget.y + this.cameraOffset.y,
      this.cameraTarget.z + this.cameraOffset.z
    );
    // Camera looks directly at player position with slight elevation to keep hero dead center
    this.camera.lookAt(this.cameraTarget.x, 0.6, this.cameraTarget.z);

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

