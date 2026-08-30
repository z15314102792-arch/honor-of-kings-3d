
// --- js/engine/Renderer.js ---
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



// --- js/engine/Audio.js ---
/**
 * Web Audio API Sound Synthesizer for MOBA sound effects & announcer
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, gainStart = 0.3, gainEnd = 0.001) {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(gainStart, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainEnd, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoise(duration, filterFreq = 1000, gainStart = 0.2) {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainStart, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  playAttackSound() {
    this.playNoise(0.12, 2500, 0.25);
    this.playTone(220, 'sawtooth', 0.1, 0.15);
  }

  playHitSound() {
    this.playNoise(0.15, 1200, 0.35);
    this.playTone(110, 'triangle', 0.15, 0.3);
  }

  playCritSound() {
    this.playNoise(0.25, 4000, 0.45);
    this.playTone(440, 'sawtooth', 0.2, 0.4);
    setTimeout(() => this.playTone(880, 'square', 0.15, 0.3), 50);
  }

  playArthurS1() {
    // Holy dash & sword glow charge
    this.playTone(330, 'sine', 0.25, 0.3);
    setTimeout(() => this.playTone(495, 'triangle', 0.3, 0.35), 80);
    setTimeout(() => this.playTone(660, 'sine', 0.35, 0.4), 160);
  }

  playArthurS2() {
    // Holy sword spinning whoosh
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playNoise(0.12, 1800, 0.15);
        this.playTone(350 + i * 40, 'sine', 0.1, 0.15);
      }, i * 200);
    }
  }

  playArthurS3() {
    // Thunderous leap slam ult
    this.playTone(150, 'sawtooth', 0.4, 0.5);
    this.playNoise(0.6, 800, 0.6);
    setTimeout(() => {
      this.playTone(80, 'triangle', 0.8, 0.8);
      this.playNoise(0.8, 500, 0.8);
    }, 200);
  }

  playArrowSound() {
    this.playTone(800, 'sine', 0.1, 0.2);
    this.playNoise(0.1, 3000, 0.2);
  }

  playHouyiS2() {
    // Solar beam strike
    this.playTone(600, 'triangle', 0.4, 0.3);
    setTimeout(() => {
      this.playNoise(0.35, 1500, 0.5);
      this.playTone(180, 'sawtooth', 0.35, 0.4);
    }, 150);
  }

  playHouyiS3() {
    // Phoenix ult launch & fly
    this.playTone(440, 'sawtooth', 0.5, 0.4);
    this.playTone(880, 'sine', 0.6, 0.4);
    this.playNoise(0.4, 2500, 0.35);
  }

  playDajiS1() {
    // Soul wave
    this.playTone(520, 'sine', 0.3, 0.35);
    this.playNoise(0.2, 1600, 0.25);
  }

  playDajiS2() {
    // Charm heart
    this.playTone(700, 'sine', 0.2, 0.3);
    setTimeout(() => this.playTone(900, 'sine', 0.25, 0.35), 80);
    setTimeout(() => this.playTone(1100, 'sine', 0.3, 0.4), 160);
  }

  playDajiS3() {
    // Multi fox orbs
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(600 + i * 80, 'triangle', 0.15, 0.25);
        this.playNoise(0.08, 2200, 0.2);
      }, i * 90);
    }
  }

  playTowerLaser() {
    this.playTone(750, 'sawtooth', 0.25, 0.35);
    this.playNoise(0.2, 2000, 0.3);
  }

  playGold() {
    this.playTone(987.77, 'sine', 0.1, 0.25);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.2, 0.3), 70);
  }

  playLevelUp() {
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.25, 0.35), i * 90);
    });
  }

  playRecall() {
    this.playTone(392, 'sine', 0.4, 0.25);
    setTimeout(() => this.playTone(523.25, 'sine', 0.5, 0.3), 200);
    setTimeout(() => this.playTone(659.25, 'sine', 0.6, 0.35), 400);
  }

  playAnnouncer(type) {
    if (!this.enabled) return;
    this.ensureContext();
    if (type === 'FIRST_BLOOD') {
      this.playTone(300, 'sawtooth', 0.3, 0.5);
      setTimeout(() => this.playTone(450, 'sawtooth', 0.4, 0.5), 150);
      setTimeout(() => this.playTone(600, 'triangle', 0.6, 0.6), 350);
    } else if (type === 'DOUBLE_KILL') {
      this.playTone(400, 'sawtooth', 0.2, 0.5);
      setTimeout(() => this.playTone(600, 'sawtooth', 0.4, 0.6), 120);
    } else if (type === 'TRIPLE_KILL') {
      this.playTone(450, 'sawtooth', 0.2, 0.5);
      setTimeout(() => this.playTone(650, 'sawtooth', 0.2, 0.55), 100);
      setTimeout(() => this.playTone(900, 'triangle', 0.5, 0.65), 220);
    } else if (type === 'GODLIKE' || type === 'LEGENDARY') {
      [400, 500, 650, 850, 1100].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 'square', 0.25, 0.45), idx * 80);
      });
    } else if (type === 'VICTORY') {
      [523, 659, 783, 1046].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 'triangle', 0.6, 0.6), idx * 150);
      });
    } else if (type === 'DEFEAT') {
      [400, 350, 300, 220].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 'sawtooth', 0.6, 0.6), idx * 180);
      });
    }
  }
}

const Sound = new SoundEngine();


// --- js/engine/VFX.js ---
/**
 * Particle and Visual Effects System
 */
class VFXManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.effects = [];
    this.laserBeams = [];
    this.projectiles = [];
    this.particles = [];
  }

  // Floating damage number on 2D Screen
  createFloatingText(text, pos3D, type = 'physical') {
    const screenPos = this.toScreenPosition(pos3D);
    const elem = document.createElement('div');
    elem.className = `damage-number dmg-${type}`;
    elem.innerText = text;
    elem.style.left = `${screenPos.x}px`;
    elem.style.top = `${screenPos.y - 20}px`;

    const hud = document.getElementById('hud-overlay');
    if (hud) hud.appendChild(elem);

    setTimeout(() => {
      if (elem.parentNode) elem.parentNode.removeChild(elem);
    }, 850);
  }

  toScreenPosition(pos3D) {
    const v = pos3D.clone();
    v.project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
    return { x, y };
  }

  // Hit Sparkles
  createHitSparks(pos, color = 0xffd700, count = 12) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.12, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8
      );

      this.particles.push({
        mesh,
        vel,
        life: 0.35,
        maxLife: 0.35
      });
    }
  }

  // Arthur S2 Spinning Shields
  createArthurShields(hero) {
    const group = new THREE.Group();
    const count = 3;
    const radius = 2.5;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const shieldGeo = new THREE.BoxGeometry(0.3, 1.2, 0.8);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.8,
        metalness: 0.8,
        roughness: 0.2
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(Math.cos(angle) * radius, 1.0, Math.sin(angle) * radius);
      shield.rotation.y = -angle + Math.PI / 2;
      group.add(shield);
    }

    this.scene.add(group);
    return group;
  }

  // Arthur S3 Leap Ground Slam Holy Decal & Pillars
  createArthurUltDecal(pos) {
    // Holy circle on ground
    const circleGeo = new THREE.RingGeometry(0.1, 4.5, 32);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(pos.x, 0.08, pos.z);
    this.scene.add(circle);

    // Rising holy sword light pillars
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.4, 8, 16);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.7
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(pos.x, 4, pos.z);
    this.scene.add(pillar);

    this.effects.push({
      update: (delta, time) => {
        circle.rotation.z += delta * 2;
        pillarMat.opacity -= delta * 0.4;
        circleMat.opacity -= delta * 0.16;
        if (circleMat.opacity <= 0) {
          this.scene.remove(circle);
          this.scene.remove(pillar);
          return true; // remove effect
        }
        return false;
      }
    });
  }

  // Houyi S2 Solar Beam Cylinder from Sky
  createHouyiSolarBeam(pos) {
    const beamGeo = new THREE.CylinderGeometry(2.5, 2.5, 30, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(pos.x, 15, pos.z);
    this.scene.add(beam);

    const ringGeo = new THREE.RingGeometry(0.5, 3.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffa500,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.08, pos.z);
    this.scene.add(ring);

    this.effects.push({
      update: (delta) => {
        beamMat.opacity -= delta * 1.5;
        ringMat.opacity -= delta * 1.5;
        if (beamMat.opacity <= 0) {
          this.scene.remove(beam);
          this.scene.remove(ring);
          return true;
        }
        return false;
      }
    });
  }

  // Houyi S3 Giant Flaming Bird / Arrow
  createHouyiBirdProjectile(startPos, dir, onHit) {
    const group = new THREE.Group();
    
    // Core Arrow
    const bodyGeo = new THREE.ConeGeometry(0.6, 2.8, 8);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Wings
    const wingGeo = new THREE.BoxGeometry(3.0, 0.1, 1.2);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.85 });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    group.add(wing);

    group.position.copy(startPos);
    group.position.y = 1.2;
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.scene.add(group);

    this.projectiles.push({
      mesh: group,
      dir: dir.clone().normalize(),
      speed: 22,
      maxDist: 180,
      traveled: 0,
      radius: 1.8,
      onHit: onHit,
      type: 'houyi_ult'
    });
  }

  // Daji S2 Spinning Love Heart Projectile
  createDajiHeartProjectile(startPos, target, onHit) {
    const shape = new THREE.Shape();
    const x = 0, y = 0;
    shape.moveTo(x + 0.25, y + 0.25);
    shape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
    shape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
    shape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.15, y + 0.77, x + 0.25, y + 0.95);
    shape.bezierCurveTo(x + 0.65, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
    shape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
    shape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

    const extrudeSettings = { depth: 0.15, bevelEnabled: false };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    const mat = new THREE.MeshBasicMaterial({ color: 0xff1493 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(0.9, 0.9, 0.9);
    mesh.position.copy(startPos);
    mesh.position.y = 1.3;
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      target,
      speed: 16,
      homing: true,
      onHit,
      type: 'daji_heart'
    });
  }

  // Daji S3 Fox Fire Orb Projectile
  createDajiFoxOrb(startPos, target, onHit) {
    const geo = new THREE.SphereGeometry(0.35, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    mesh.position.y = 1.2;
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      target,
      speed: 20,
      homing: true,
      onHit,
      type: 'daji_orb'
    });
  }

  // Generic Arrow / Minion Magic Bullet
  createBullet(startPos, target, color = 0x60a5fa, speed = 18, onHit) {
    const geo = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    mesh.position.y = 1.0;
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      target,
      speed: speed,
      homing: true,
      onHit,
      type: 'bullet'
    });
  }

  // Tower Laser Beam Lock-On
  createTowerLaser(towerPos, target) {
    const points = [
      new THREE.Vector3(towerPos.x, towerPos.y + 4.8, towerPos.z),
      new THREE.Vector3(target.position.x, target.position.y + 1.0, target.position.z)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      linewidth: 3,
      transparent: true,
      opacity: 0.9
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    return {
      line,
      update: (newTargetPos) => {
        if (!newTargetPos) return;
        const pts = [
          new THREE.Vector3(towerPos.x, towerPos.y + 4.8, towerPos.z),
          new THREE.Vector3(newTargetPos.x, newTargetPos.y + 1.0, newTargetPos.z)
        ];
        line.geometry.setFromPoints(pts);
      },
      destroy: () => {
        this.scene.remove(line);
      }
    };
  }

  update(delta) {
    // 1. Update general effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (this.effects[i].update(delta, performance.now())) {
        this.effects.splice(i, 1);
      }
    }

    // 2. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.scale.setScalar(p.life / p.maxLife);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // 3. Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (p.homing && p.target) {
        if (p.target.isDead) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }

        const targetPos = p.target.position.clone();
        targetPos.y = 1.0;
        const dir = targetPos.clone().sub(p.mesh.position);
        const dist = dir.length();

        if (dist <= p.speed * delta || dist < 0.6) {
          if (p.onHit) p.onHit(p.target);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        } else {
          dir.normalize();
          p.mesh.position.addScaledVector(dir, p.speed * delta);
          p.mesh.rotation.y += delta * 12;
        }
      } else if (p.dir) {
        // Directional projectile (e.g. Houyi ult)
        const moveDist = p.speed * delta;
        p.mesh.position.addScaledVector(p.dir, moveDist);
        p.traveled += moveDist;

        // Check collision against heroes in onHit callback inside Game loop
        if (p.traveled >= p.maxDist) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }
}


// --- js/moba/Map.js ---
/**
 * 3D MOBA Canyon Map with Lanes, River, Bushes, and Obstacles
 */
class MobaMap {
  constructor(scene) {
    this.scene = scene;
    this.bushes = [];
    this.obstacles = [];
    this.waypoints = {
      blueMid: [
        new THREE.Vector3(-45, 0, 45),
        new THREE.Vector3(-20, 0, 20),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(20, 0, -20),
        new THREE.Vector3(45, 0, -45)
      ],
      redMid: [
        new THREE.Vector3(45, 0, -45),
        new THREE.Vector3(20, 0, -20),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-20, 0, 20),
        new THREE.Vector3(-45, 0, 45)
      ]
    };

    this.createTerrain();
    this.createBushes();
    this.createBaseFountains();
    this.createJungleCampDecorations();
  }

  createTerrain() {
    // 1. Base Ground (160x160)
    const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2e22, // Rich dark forest green
      roughness: 0.85,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Stone Lane paths
    const laneGeo = new THREE.PlaneGeometry(14, 150);
    const laneMat = new THREE.MeshStandardMaterial({
      color: 0x3d4349, // Slate stone
      roughness: 0.9,
      metalness: 0.05
    });

    // Diagonal Mid Lane
    const midLane = new THREE.Mesh(laneGeo, laneMat);
    midLane.rotation.x = -Math.PI / 2;
    midLane.rotation.z = Math.PI / 4;
    midLane.position.y = 0.02;
    midLane.receiveShadow = true;
    this.scene.add(midLane);

    // 3. River (Traversing perpendicular to Mid Lane)
    const riverGeo = new THREE.PlaneGeometry(18, 150);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x0f4c81,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = -Math.PI / 4;
    river.position.y = 0.01;
    river.receiveShadow = true;
    this.scene.add(river);

    // 4. Boundary Cliff Walls
    this.createCliffWalls();
  }

  createCliffWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x222a35,
      roughness: 0.9
    });

    // Outer boundary walls
    const wallConfigs = [
      { w: 160, h: 8, d: 4, x: 0, y: 4, z: -80 },
      { w: 160, h: 8, d: 4, x: 0, y: 4, z: 80 },
      { w: 4, h: 8, d: 160, x: -80, y: 4, z: 0 },
      { w: 4, h: 8, d: 160, x: 80, y: 4, z: 0 },
      // Mid lane rock obstacles
      { w: 10, h: 5, d: 6, x: -14, y: 2.5, z: 2 },
      { w: 10, h: 5, d: 6, x: 14, y: 2.5, z: -2 },
      // Jungle camp rock backings
      { w: 14, h: 6, d: 4, x: -30, y: 3, z: 0 },
      { w: 14, h: 6, d: 4, x: 30, y: 3, z: 0 },
      { w: 4, h: 6, d: 14, x: 0, y: 3, z: -30 },
      { w: 4, h: 6, d: 14, x: 0, y: 3, z: 30 }
    ];

    wallConfigs.forEach(c => {
      const geo = new THREE.BoxGeometry(c.w, c.h, c.d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(c.x, c.y, c.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.obstacles.push({
        minX: c.x - c.w / 2 - 1.0,
        maxX: c.x + c.w / 2 + 1.0,
        minZ: c.z - c.d / 2 - 1.0,
        maxZ: c.z + c.d / 2 + 1.0
      });
    });
  }

  createBushes() {
    // 6 strategic bushes: River bushes, jungle bushes, lane entrance bushes
    const bushPositions = [
      { x: -8, z: 12, radius: 4.2 },   // River Blue-side
      { x: 8, z: -12, radius: 4.2 },   // River Red-side
      { x: -22, z: 6, radius: 4.0 },   // Blue Blue-buff bush
      { x: 22, z: -6, radius: 4.0 },   // Red Red-buff bush
      { x: 6, z: 22, radius: 4.0 },    // Blue Red-buff bush
      { x: -6, z: -22, radius: 4.0 }   // Red Blue-buff bush
    ];

    bushPositions.forEach((b, idx) => {
      const bushGroup = new THREE.Group();
      const grassCount = 45;

      const grassMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide
      });

      for (let i = 0; i < grassCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (b.radius - 0.5);
        const gx = Math.cos(angle) * dist;
        const gz = Math.sin(angle) * dist;

        const bladeGeo = new THREE.ConeGeometry(0.25, 1.8 + Math.random() * 0.6, 4);
        const blade = new THREE.Mesh(bladeGeo, grassMat);
        blade.position.set(gx, 0.9, gz);
        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        blade.castShadow = true;
        bushGroup.add(blade);
      }

      bushGroup.position.set(b.x, 0, b.z);
      this.scene.add(bushGroup);

      this.bushes.push({
        id: `bush_${idx}`,
        center: new THREE.Vector2(b.x, b.z),
        radius: b.radius,
        group: bushGroup
      });
    });
  }

  createBaseFountains() {
    // Blue Base Fountain ([-52, 0, 52])
    const fountainMatBlue = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    const blueGeo = new THREE.CylinderGeometry(8, 9, 0.4, 32);
    const blueFountain = new THREE.Mesh(blueGeo, fountainMatBlue);
    blueFountain.position.set(-52, 0.2, 52);
    this.scene.add(blueFountain);

    // Red Base Fountain ([52, 0, -52])
    const fountainMatRed = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    const redGeo = new THREE.CylinderGeometry(8, 9, 0.4, 32);
    const redFountain = new THREE.Mesh(redGeo, fountainMatRed);
    redFountain.position.set(52, 0.2, -52);
    this.scene.add(redFountain);
  }

  createJungleCampDecorations() {
    // Altar rings for Red & Blue buff
    const camps = [
      { x: -28, z: 10, color: 0x3b82f6 }, // Blue Buff
      { x: 10, z: 28, color: 0xef4444 },  // Red Buff
      { x: -10, z: -28, color: 0x3b82f6 },// Enemy Blue Buff
      { x: 28, z: -10, color: 0xef4444 }  // Enemy Red Buff
    ];

    camps.forEach(c => {
      const ringGeo = new THREE.RingGeometry(2.2, 2.6, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: c.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(c.x, 0.04, c.z);
      this.scene.add(ring);
    });
  }

  // Check if a 3D position is inside any bush
  getBushAt(pos) {
    const p2d = new THREE.Vector2(pos.x, pos.z);
    for (const b of this.bushes) {
      if (p2d.distanceTo(b.center) <= b.radius) {
        return b;
      }
    }
    return null;
  }

  // Check wall obstacle collision
  checkCollision(pos, radius = 0.8) {
    for (const obs of this.obstacles) {
      if (
        pos.x + radius > obs.minX &&
        pos.x - radius < obs.maxX &&
        pos.z + radius > obs.minZ &&
        pos.z - radius < obs.maxZ
      ) {
        return true;
      }
    }
    return false;
  }
}


// --- js/moba/Monster.js ---
/**
 * Jungle Monster Camps: Red Buff, Blue Buff, Small Monsters
 */
class JungleMonster {
  constructor(scene, vfx, type, position) {
    this.scene = scene;
    this.vfx = vfx;
    this.type = type; // 'red_buff', 'blue_buff', 'small_boar'
    this.spawnPos = position.clone();
    this.position = position.clone();

    this.maxHp = type.includes('buff') ? 3500 : 1800;
    this.hp = this.maxHp;
    this.ad = type.includes('buff') ? 95 : 60;
    this.armor = 30;
    this.attackRange = 2.2;
    this.attackSpeed = 1.0;
    this.attackCooldown = 0;
    this.moveSpeed = 4.5;
    this.leashRadius = 14;

    this.target = null;
    this.isDead = false;
    this.respawnTimer = 0;
    this.respawnDuration = 40;

    this.createMesh();
  }

  createMesh() {
    this.group = new THREE.Group();

    let bodyColor = 0xef4444;
    let scale = 1.3;

    if (this.type === 'blue_buff') {
      bodyColor = 0x3b82f6;
    } else if (this.type === 'small_boar') {
      bodyColor = 0x8b5cf6;
      scale = 0.9;
    }

    // Golem Body
    const bodyGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.4,
      metalness: 0.5,
      emissive: bodyColor,
      emissiveIntensity: 0.3
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 1.4;
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Crystal Shards
    for (let i = 0; i < 4; i++) {
      const shardGeo = new THREE.ConeGeometry(0.3, 1.0, 4);
      const shardMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.set(
        (Math.random() - 0.5) * 1.5,
        1.6 + Math.random() * 0.8,
        (Math.random() - 0.5) * 1.5
      );
      shard.rotation.set(Math.random(), Math.random(), Math.random());
      this.group.add(shard);
    }

    // 3D Monster Health Bar
    this.hpBarGroup = new THREE.Group();
    this.hpBarGroup.position.set(0, 2.6, 0);

    const bgGeo = new THREE.PlaneGeometry(1.6, 0.18);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    const hpBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarGroup.add(hpBg);

    const hpGeo = new THREE.PlaneGeometry(1.54, 0.12);
    const hpMat = new THREE.MeshBasicMaterial({
      color: this.type.includes('buff') ? 0xf59e0b : 0xa855f7,
      side: THREE.DoubleSide
    });
    this.hpFillMesh = new THREE.Mesh(hpGeo, hpMat);
    this.hpFillMesh.position.set(0, 0, 0.01);
    this.hpBarGroup.add(this.hpFillMesh);

    this.group.add(this.hpBarGroup);

    this.group.scale.setScalar(scale);
    this.group.position.copy(this.position);
    this.scene.add(this.group);
  }

  takeDamage(amount, attacker, type = 'physical') {
    if (this.isDead) return;

    let actualDamage = amount;
    if (type === 'physical') {
      actualDamage = amount * (100 / (100 + this.armor));
    }
    actualDamage = Math.round(actualDamage);

    this.hp -= actualDamage;
    this.vfx.createFloatingText(actualDamage.toString(), this.position, type);
    this.vfx.createHitSparks(this.position, 0xffd700, 8);

    // Switch aggro to attacker
    if (attacker && !this.target) {
      this.target = attacker;
    }

    if (this.hp <= 0) {
      this.die(attacker);
    }
  }

  die(killer) {
    this.isDead = true;
    this.hp = 0;
    this.scene.remove(this.group);
    this.respawnTimer = this.respawnDuration;

    if (killer && killer.gainGoldAndExp) {
      const goldReward = this.type.includes('buff') ? 90 : 55;
      const expReward = this.type.includes('buff') ? 140 : 80;
      killer.gainGoldAndExp(goldReward, expReward);

      // Grant Buff
      if (this.type === 'red_buff') {
        killer.applyBuff('red_buff', 30);
        this.vfx.createFloatingText("获得猩红石像之力!", killer.position, "true");
      } else if (this.type === 'blue_buff') {
        killer.applyBuff('blue_buff', 30);
        this.vfx.createFloatingText("获得蔚蓝石像之力!", killer.position, "true");
      }
    }
  }

  update(delta, heroes) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.attackCooldown -= delta;

    // Check distance to spawn point (Leash behavior)
    const distToSpawn = this.position.distanceTo(this.spawnPos);
    if (distToSpawn > this.leashRadius) {
      // Leash back home
      this.target = null;
      const returnDir = this.spawnPos.clone().sub(this.position).normalize();
      this.position.addScaledVector(returnDir, this.moveSpeed * 1.5 * delta);
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3 * delta); // Rapid heal
      this.group.position.copy(this.position);
      return;
    }

    // Acquire nearby hero target if not aggressive
    if (!this.target) {
      for (const h of heroes) {
        if (!h.isDead && this.position.distanceTo(h.position) < 4.5) {
          this.target = h;
          break;
        }
      }
    }

    if (this.target) {
      if (this.target.isDead || this.position.distanceTo(this.target.position) > this.leashRadius + 2) {
        this.target = null;
        return;
      }

      const dist = this.position.distanceTo(this.target.position);
      if (dist <= this.attackRange) {
        // Attack
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 1 / this.attackSpeed;
          this.target.takeDamage(this.ad, this, 'physical');
          this.vfx.createHitSparks(this.target.position, 0xff4444, 6);
        }
      } else {
        // Move towards target
        const dir = this.target.position.clone().sub(this.position).normalize();
        this.position.addScaledVector(dir, this.moveSpeed * delta);
        this.group.lookAt(this.target.position.x, this.position.y, this.target.position.z);
      }
    } else {
      // Return to exact spawn pos if idle
      if (distToSpawn > 0.3) {
        const dir = this.spawnPos.clone().sub(this.position).normalize();
        this.position.addScaledVector(dir, this.moveSpeed * delta);
      }
    }

    // Update Monster HP Bar
    if (this.hpFillMesh) {
      const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
      this.hpFillMesh.scale.x = ratio;
      this.hpFillMesh.position.x = (ratio - 1) * 0.77;
    }
    if (this.hpBarGroup && window.gameInstance && window.gameInstance.renderer) {
      this.hpBarGroup.quaternion.copy(window.gameInstance.renderer.camera.quaternion);
    }

    this.group.position.copy(this.position);
  }

  respawn() {
    this.isDead = false;
    this.hp = this.maxHp;
    this.position.copy(this.spawnPos);
    this.group.position.copy(this.position);
    this.scene.add(this.group);
  }
}


// --- js/moba/Minion.js ---
/**
 * Lane Minion Waves (Melee Vanguard, Caster Mage, Siege Cannon)
 */
class Minion {
  constructor(scene, vfx, team, type, waypoints) {
    this.scene = scene;
    this.vfx = vfx;
    this.team = team; // 'blue' or 'red'
    this.type = type; // 'melee', 'caster', 'cannon'
    this.waypoints = waypoints;
    this.currentWpIndex = 0;

    this.isDead = false;
    this.target = null;
    this.attackCooldown = 0;

    // Attributes
    if (type === 'melee') {
      this.maxHp = 1100;
      this.ad = 45;
      this.attackRange = 1.8;
      this.attackSpeed = 0.9;
      this.moveSpeed = 5.2;
      this.goldReward = 42;
      this.expReward = 50;
    } else if (type === 'caster') {
      this.maxHp = 750;
      this.ad = 60;
      this.attackRange = 7.5;
      this.attackSpeed = 0.85;
      this.moveSpeed = 5.2;
      this.goldReward = 36;
      this.expReward = 45;
    } else { // 'cannon'
      this.maxHp = 2200;
      this.ad = 95;
      this.attackRange = 8.5;
      this.attackSpeed = 0.75;
      this.moveSpeed = 4.8;
      this.goldReward = 85;
      this.expReward = 90;
    }

    this.hp = this.maxHp;
    this.position = waypoints[0].clone();

    this.createMesh();
  }

  createMesh() {
    this.group = new THREE.Group();
    const teamColor = this.team === 'blue' ? 0x3b82f6 : 0xef4444;

    if (this.type === 'melee') {
      const geo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
      const mat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.4 });
      const body = new THREE.Mesh(geo, mat);
      body.position.y = 0.6;
      body.castShadow = true;
      this.group.add(body);

      // Shield
      const shieldGeo = new THREE.BoxGeometry(0.2, 0.7, 0.6);
      const shieldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37 });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(0.5, 0.6, 0.2);
      this.group.add(shield);
    } else if (this.type === 'caster') {
      const geo = new THREE.ConeGeometry(0.6, 1.3, 8);
      const mat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.5 });
      const body = new THREE.Mesh(geo, mat);
      body.position.y = 0.65;
      body.castShadow = true;
      this.group.add(body);
    } else {
      // Cannon
      const geo = new THREE.BoxGeometry(1.2, 1.0, 1.4);
      const mat = new THREE.MeshStandardMaterial({ color: teamColor, metalness: 0.6 });
      const body = new THREE.Mesh(geo, mat);
      body.position.y = 0.5;
      body.castShadow = true;
      this.group.add(body);

      const barrelGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.0);
      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.7, 0.6);
      this.group.add(barrel);
    }

    // 3D Minion Health Bar
    this.hpBarGroup = new THREE.Group();
    this.hpBarGroup.position.set(0, 1.8, 0);

    const bgGeo = new THREE.PlaneGeometry(1.0, 0.12);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    const hpBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarGroup.add(hpBg);

    const hpGeo = new THREE.PlaneGeometry(0.96, 0.08);
    const hpMat = new THREE.MeshBasicMaterial({
      color: this.team === 'blue' ? 0x22c55e : 0xef4444,
      side: THREE.DoubleSide
    });
    this.hpFillMesh = new THREE.Mesh(hpGeo, hpMat);
    this.hpFillMesh.position.set(0, 0, 0.01);
    this.hpBarGroup.add(this.hpFillMesh);

    this.group.add(this.hpBarGroup);

    this.group.position.copy(this.position);
    this.scene.add(this.group);
  }

  takeDamage(amount, attacker, type = 'physical') {
    if (this.isDead) return;

    this.hp -= amount;
    this.vfx.createFloatingText(Math.round(amount).toString(), this.position, type);
    this.vfx.createHitSparks(this.position, 0xffffff, 5);

    if (this.hp <= 0) {
      this.die(attacker);
    }
  }

  die(killer) {
    this.isDead = true;
    this.scene.remove(this.group);

    if (killer && killer.gainGoldAndExp) {
      killer.gainGoldAndExp(this.goldReward, this.expReward);
    }
  }

  update(delta, enemies, enemyTowers) {
    if (this.isDead) return;

    this.attackCooldown -= delta;

    // 1. Acquire Target (Prioritize closest enemy minion/hero/tower)
    if (!this.target || this.target.isDead) {
      this.target = this.findBestTarget(enemies, enemyTowers);
    }

    if (this.target) {
      const dist = this.position.distanceTo(this.target.position);
      if (dist <= this.attackRange) {
        // Attack
        this.group.lookAt(this.target.position.x, this.position.y, this.target.position.z);
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 1 / this.attackSpeed;
          this.performAttack(this.target);
        }
      } else {
        // Move towards target
        const dir = this.target.position.clone().sub(this.position).normalize();
        this.position.addScaledVector(dir, this.moveSpeed * delta);
        this.group.lookAt(this.target.position.x, this.position.y, this.target.position.z);
      }
    } else {
      // 2. Follow Lane Waypoints
      if (this.currentWpIndex < this.waypoints.length) {
        const targetWp = this.waypoints[this.currentWpIndex];
        const distToWp = this.position.distanceTo(targetWp);

        if (distToWp < 1.5) {
          this.currentWpIndex++;
        } else {
          const dir = targetWp.clone().sub(this.position).normalize();
          this.position.addScaledVector(dir, this.moveSpeed * delta);
          this.group.lookAt(targetWp.x, this.position.y, targetWp.z);
        }
      }
    }

    // Update Minion HP bar
    if (this.hpFillMesh) {
      const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
      this.hpFillMesh.scale.x = ratio;
      this.hpFillMesh.position.x = (ratio - 1) * 0.48;
    }
    if (this.hpBarGroup && window.gameInstance && window.gameInstance.renderer) {
      this.hpBarGroup.quaternion.copy(window.gameInstance.renderer.camera.quaternion);
    }

    this.group.position.copy(this.position);
  }

  performAttack(target) {
    if (this.type === 'melee') {
      target.takeDamage(this.ad, this, 'physical');
    } else {
      // Ranged projectile
      const bulletColor = this.team === 'blue' ? 0x60a5fa : 0xf87171;
      this.vfx.createBullet(this.position, target, bulletColor, 16, () => {
        target.takeDamage(this.ad, this, 'physical');
      });
    }
  }

  findBestTarget(enemies, enemyTowers) {
    let closest = null;
    let minDist = 12; // Search radius

    // Enemy Minions & Heroes
    for (const e of enemies) {
      if (e.isDead || e.team === this.team) continue;
      const d = this.position.distanceTo(e.position);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    }

    // Towers
    if (!closest && enemyTowers) {
      for (const t of enemyTowers) {
        if (t.isDead || t.team === this.team) continue;
        const d = this.position.distanceTo(t.position);
        if (d < 14) {
          return t;
        }
      }
    }

    return closest;
  }
}


// --- js/moba/Tower.js ---
/**
 * Defensive Towers and Base Crystals with Laser Aggro & Escalating Damage
 */
class DefensiveTower {
  constructor(scene, vfx, team, type, position) {
    this.scene = scene;
    this.vfx = vfx;
    this.team = team; // 'blue' or 'red'
    this.type = type; // 'outer', 'inner', 'crystal'
    this.position = position.clone();

    this.isCrystal = (type === 'crystal');
    this.maxHp = this.isCrystal ? 10000 : (type === 'inner' ? 6500 : 5000);
    this.hp = this.maxHp;
    this.armor = 200;
    this.attackRange = this.isCrystal ? 15 : 13.5;
    this.baseAd = this.isCrystal ? 550 : 380;
    this.attackSpeed = 0.85;
    this.attackCooldown = 0;
    this.consecutiveHits = 0;

    this.currentTarget = null;
    this.laserEffect = null;
    this.isDead = false;

    this.createMesh();
    this.createRangeCircle();
  }

  createMesh() {
    this.group = new THREE.Group();
    const teamColor = this.team === 'blue' ? 0x3b82f6 : 0xef4444;

    if (!this.isCrystal) {
      // Tower Base
      const baseGeo = new THREE.CylinderGeometry(2.5, 3.2, 1.5, 8);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.75;
      base.castShadow = true;
      this.group.add(base);

      // Tower Pillar
      const pillarGeo = new THREE.CylinderGeometry(1.6, 2.2, 5.5, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = 4.25;
      pillar.castShadow = true;
      this.group.add(pillar);

      // Floating Energy Crystal
      const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: teamColor,
        emissive: teamColor,
        emissiveIntensity: 0.8,
        roughness: 0.1
      });
      this.crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
      this.crystalMesh.position.y = 8.2;
      this.group.add(this.crystalMesh);
    } else {
      // Base Crystal / Nexus
      const nexusGeo = new THREE.IcosahedronGeometry(2.8, 0);
      const nexusMat = new THREE.MeshStandardMaterial({
        color: teamColor,
        emissive: teamColor,
        emissiveIntensity: 0.9,
        roughness: 0.1
      });
      this.crystalMesh = new THREE.Mesh(nexusGeo, nexusMat);
      this.crystalMesh.position.y = 3.5;
    }

    // 3D Tower Health Bar
    this.hpBarGroup = new THREE.Group();
    this.hpBarGroup.position.set(0, this.isCrystal ? 6.5 : 10.2, 0);

    const bgGeo = new THREE.PlaneGeometry(2.8, 0.28);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    const hpBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarGroup.add(hpBg);

    const hpGeo = new THREE.PlaneGeometry(2.72, 0.20);
    const hpMat = new THREE.MeshBasicMaterial({
      color: this.team === 'blue' ? 0x22c55e : 0xef4444,
      side: THREE.DoubleSide
    });
    this.hpFillMesh = new THREE.Mesh(hpGeo, hpMat);
    this.hpFillMesh.position.set(0, 0, 0.01);
    this.hpBarGroup.add(this.hpFillMesh);

    this.group.add(this.hpBarGroup);

    this.group.position.copy(this.position);
    this.scene.add(this.group);
  }

  createRangeCircle() {
    const circleGeo = new THREE.RingGeometry(this.attackRange - 0.15, this.attackRange, 48);
    const circleMat = new THREE.MeshBasicMaterial({
      color: this.team === 'blue' ? 0x60a5fa : 0xf87171,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    this.rangeCircle = new THREE.Mesh(circleGeo, circleMat);
    this.rangeCircle.rotation.x = -Math.PI / 2;
    this.rangeCircle.position.set(this.position.x, 0.05, this.position.z);
    this.scene.add(this.rangeCircle);
  }

  takeDamage(amount, attacker, type = 'physical') {
    if (this.isDead) return;

    this.hp -= amount;
    this.vfx.createFloatingText(Math.round(amount).toString(), this.position, type);
    this.vfx.createHitSparks(this.position, 0xffd700, 10);

    if (this.hp <= 0) {
      this.die(attacker);
    }
  }

  die(killer) {
    this.isDead = true;
    this.scene.remove(this.group);
    this.scene.remove(this.rangeCircle);

    if (this.laserEffect) {
      this.laserEffect.destroy();
      this.laserEffect = null;
    }

    this.vfx.createHitSparks(this.position, 0xff4500, 30);

    if (killer && killer.gainGoldAndExp) {
      killer.gainGoldAndExp(200, 300);
    }
  }

  // Core Tower Aggro Transfer Logic: If enemy hero hits allied hero within tower range!
  notifyHeroAttackedHero(attacker, victim) {
    if (this.isDead) return;
    if (victim.team === this.team && attacker.team !== this.team) {
      if (this.position.distanceTo(attacker.position) <= this.attackRange) {
        // Immediate priority switch to attacking hero!
        this.currentTarget = attacker;
        this.consecutiveHits = 0;
      }
    }
  }

  update(delta, enemies, enemyHeroes) {
    if (this.isDead) return;

    // Spin crystal
    if (this.crystalMesh) {
      this.crystalMesh.rotation.y += delta * 1.5;
      this.crystalMesh.position.y += Math.sin(performance.now() * 0.003) * 0.003;
    }

    this.attackCooldown -= delta;

    // Validate current target
    if (this.currentTarget) {
      const dist = this.position.distanceTo(this.currentTarget.position);
      if (this.currentTarget.isDead || dist > this.attackRange) {
        this.currentTarget = null;
        this.consecutiveHits = 0;
        if (this.laserEffect) {
          this.laserEffect.destroy();
          this.laserEffect = null;
        }
      }
    }

    // Acquire new target if none (Priority: Minions > Heroes)
    if (!this.currentTarget) {
      this.currentTarget = this.acquireTarget(enemies, enemyHeroes);
    }

    if (this.currentTarget) {
      // Laser lock-on beam
      if (!this.laserEffect) {
        this.laserEffect = this.vfx.createTowerLaser(this.position, this.currentTarget);
      } else {
        this.laserEffect.update(this.currentTarget.position);
      }

      // Attack
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 1 / this.attackSpeed;
        this.fireTowerShot(this.currentTarget);
      }
    } else if (this.laserEffect) {
      this.laserEffect.destroy();
      this.laserEffect = null;
    }

    // Update 3D Tower Health Bar
    if (this.hpFillMesh) {
      const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
      this.hpFillMesh.scale.x = ratio;
      this.hpFillMesh.position.x = (ratio - 1) * 1.36;
    }
    if (this.hpBarGroup && window.gameInstance && window.gameInstance.renderer) {
      this.hpBarGroup.quaternion.copy(window.gameInstance.renderer.camera.quaternion);
    }
  }

  acquireTarget(minions, heroes) {
    // 1. Minions first
    for (const m of minions) {
      if (m.isDead || m.team === this.team) continue;
      if (this.position.distanceTo(m.position) <= this.attackRange) {
        return m;
      }
    }

    // 2. Enemy Heroes
    for (const h of heroes) {
      if (h.isDead || h.team === this.team) continue;
      if (this.position.distanceTo(h.position) <= this.attackRange) {
        return h;
      }
    }

    return null;
  }

  fireTowerShot(target) {
    // Consecutive shot damage escalation (+25% per shot)
    const multiplier = 1.0 + Math.min(1.0, this.consecutiveHits * 0.25);
    const dmg = this.baseAd * multiplier;
    this.consecutiveHits++;

    Sound.playTowerLaser();
    this.vfx.createBullet(
      new THREE.Vector3(this.position.x, this.position.y + 7.5, this.position.z),
      target,
      0xef4444,
      24,
      () => {
        target.takeDamage(dmg, this, 'physical');
      }
    );
  }
}


// --- js/moba/Hero.js ---
/**
 * Base Hero Class with Attributes, Leveling, Status Effects, and 3D Model
 */
class Hero {
  constructor(scene, vfx, team, name, isPlayer = false) {
    this.scene = scene;
    this.vfx = vfx;
    this.team = team; // 'blue' or 'red'
    this.name = name;
    this.isPlayer = isPlayer;

    // Progression
    this.level = 1;
    this.exp = 0;
    this.maxExp = 100;
    this.gold = 300;
    this.kills = 0;
    this.deaths = 0;
    this.assists = 0;
    this.cs = 0;

    // Skill Levels
    this.skillLevels = [1, 0, 0];
    this.skillPoints = 0;
    this.skillCds = [0, 0, 0];
    this.skillMaxCds = [8, 9, 24];

    // Sub Spells
    this.healCd = 0;
    this.flashCd = 0;
    this.isChannelingRecall = false;
    this.recallTimer = 0;

    // Combat Base Stats
    this.maxHp = 3400;
    this.hp = this.maxHp;
    this.maxMana = 450;
    this.mana = this.maxMana;
    this.ad = 165;
    this.ap = 0;
    this.armor = 90;
    this.magicResist = 50;
    this.attackRange = 2.5;
    this.attackSpeed = 1.0;
    this.moveSpeed = 7.0;
    this.critRate = 0.0;
    this.critDamage = 2.0;
    this.lifesteal = 0.0;
    this.cdr = 0.0;

    // State
    this.position = new THREE.Vector3(team === 'blue' ? -48 : 48, 0, team === 'blue' ? 48 : -48);
    this.velocity = new THREE.Vector3();
    this.moveTarget = null;
    this.attackTarget = null;
    this.attackCooldown = 0;
    this.isDead = false;
    this.respawnTimer = 0;
    this.respawnDuration = 10;

    // CC & Status
    this.stunDuration = 0;
    this.silenceDuration = 0;
    this.slowDuration = 0;
    this.slowFactor = 0;
    this.airborneDuration = 0;
    this.jumpY = 0;
    this.inBush = false;
    this.stealthOpacity = 1.0;

    // Buffs
    this.buffs = {
      red_buff: 0,
      blue_buff: 0
    };

    // Equipment items inventory
    this.inventory = [];

    this.createModel();
  }

  createModel() {
    this.group = new THREE.Group();
    const teamColor = this.team === 'blue' ? 0x3b82f6 : 0xef4444;

    // Selection ring
    const ringGeo = new THREE.RingGeometry(0.9, 1.05, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: teamColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.teamRing = new THREE.Mesh(ringGeo, ringMat);
    this.teamRing.rotation.x = -Math.PI / 2;
    this.teamRing.position.y = 0.05;
    this.group.add(this.teamRing);

    // 3D Overhead Health & Mana Bar Group
    this.hpBarGroup = new THREE.Group();
    this.hpBarGroup.position.set(0, 3.6, 0);

    // HP background
    const bgGeo = new THREE.PlaneGeometry(1.8, 0.22);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    const hpBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarGroup.add(hpBg);

    // HP foreground
    const hpGeo = new THREE.PlaneGeometry(1.72, 0.16);
    const hpMat = new THREE.MeshBasicMaterial({
      color: this.team === 'blue' ? 0x22c55e : 0xef4444,
      side: THREE.DoubleSide
    });
    this.hpFillMesh = new THREE.Mesh(hpGeo, hpMat);
    this.hpFillMesh.position.set(0, 0.02, 0.01);
    this.hpBarGroup.add(this.hpFillMesh);

    // Mana foreground
    const manaGeo = new THREE.PlaneGeometry(1.72, 0.05);
    const manaMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
    this.manaFillMesh = new THREE.Mesh(manaGeo, manaMat);
    this.manaFillMesh.position.set(0, -0.07, 0.01);
    this.hpBarGroup.add(this.manaFillMesh);

    this.group.add(this.hpBarGroup);

    this.group.position.copy(this.position);
    this.scene.add(this.group);
  }

  gainGoldAndExp(gold, exp) {
    this.gold += gold;
    this.exp += exp;
    if (this.isPlayer) {
      Sound.playGold();
    }

    while (this.exp >= this.maxExp && this.level < 15) {
      this.levelUp();
    }
  }

  levelUp() {
    this.exp -= this.maxExp;
    this.level++;
    this.maxExp = Math.round(this.maxExp * 1.35);
    this.skillPoints++;

    // Stat Growth
    this.maxHp += 260;
    this.hp += 260;
    this.ad += 12;
    this.armor += 15;
    this.magicResist += 8;

    if (this.isPlayer) {
      Sound.playLevelUp();
      this.vfx.createFloatingText("LEVEL UP!", this.position, "heal");
    }
  }

  applyBuff(buffName, duration) {
    this.buffs[buffName] = duration;
  }

  applyStun(duration) {
    this.stunDuration = Math.max(this.stunDuration, duration);
    this.vfx.createFloatingText("眩晕", this.position, "magic");
    this.cancelRecall();
  }

  applySilence(duration) {
    this.silenceDuration = Math.max(this.silenceDuration, duration);
    this.vfx.createFloatingText("沉默", this.position, "physical");
    this.cancelRecall();
  }

  applySlow(factor, duration) {
    this.slowFactor = factor;
    this.slowDuration = duration;
  }

  applyKnockup(duration) {
    this.airborneDuration = duration;
    this.applyStun(duration);
    this.cancelRecall();
  }

  cancelRecall() {
    if (this.isChannelingRecall) {
      this.isChannelingRecall = false;
      this.recallTimer = 0;
      const bar = document.getElementById('channeling-bar-container');
      if (bar && this.isPlayer) bar.style.display = 'none';
      if (this.isPlayer) this.vfx.createFloatingText("回城已打断", this.position, "physical");
    }
  }

  startRecall() {
    if (this.isDead || this.isChannelingRecall) return;
    this.isChannelingRecall = true;
    this.recallTimer = 7.0; // 7 seconds channel
    Sound.playRecall();
    const bar = document.getElementById('channeling-bar-container');
    if (bar && this.isPlayer) {
      bar.style.display = 'flex';
      const fill = document.getElementById('channeling-fill');
      if (fill) fill.style.width = '0%';
    }
    this.vfx.createHitSparks(this.position, 0x38bdf8, 20);
  }

  castFlash(direction) {
    if (this.isDead || this.stunDuration > 0 || this.flashCd > 0) return;
    this.flashCd = 120; // 120s CD
    this.cancelRecall();

    let dir = direction && direction.lengthSq() > 0.001 ? direction.clone().normalize() : null;
    if (!dir) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
      dir = forward.normalize();
    }
    this.position.addScaledVector(dir, 7.5);
    this.group.position.copy(this.position);
    this.vfx.createHitSparks(this.position, 0xfde047, 30);
    this.vfx.createFloatingText("闪现!", this.position, "heal");
    Sound.playArthurS1();
  }

  castHeal() {
    if (this.isDead || this.healCd > 0) return;
    this.healCd = 60; // 60s CD
    this.cancelRecall();
    const healAmount = this.maxHp * 0.25 + 250;
    this.hp = Math.min(this.maxHp, this.hp + healAmount);
    this.moveSpeed += 1.5;
    setTimeout(() => { this.moveSpeed = Math.max(7.0, this.moveSpeed - 1.5); }, 3000);

    this.vfx.createFloatingText(`+${Math.round(healAmount)} 治疗!`, this.position, "heal");
    this.vfx.createHitSparks(this.position, 0x10b981, 25);
    Sound.playTone(660, 'sine', 0.3, 0.4);
  }

  takeDamage(amount, attacker, type = 'physical') {
    if (this.isDead) return;
    this.cancelRecall();

    let finalDamage = amount;
    if (type === 'physical') {
      finalDamage = amount * (100 / (100 + this.armor));
    } else if (type === 'magic') {
      finalDamage = amount * (100 / (100 + this.magicResist));
    }
    finalDamage = Math.round(finalDamage);

    this.hp -= finalDamage;
    this.vfx.createFloatingText(finalDamage.toString(), this.position, type);
    this.vfx.createHitSparks(this.position, type === 'magic' ? 0xa855f7 : 0xffa500, 8);

    // Lifesteal for attacker
    if (attacker && attacker.lifesteal > 0 && type === 'physical') {
      const heal = finalDamage * attacker.lifesteal;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      this.vfx.createFloatingText(`+${Math.round(heal)}`, attacker.position, "heal");
    }

    if (this.hp <= 0) {
      this.die(attacker);
    }
  }

  die(killer) {
    this.isDead = true;
    this.cancelRecall();
    this.hp = 0;
    this.deaths++;
    this.group.visible = false;
    this.respawnTimer = this.respawnDuration + this.level * 2;

    if (killer && killer.kills !== undefined) {
      killer.kills++;
      killer.gainGoldAndExp(300, 400);

      // Trigger Game Kill Announcement
      if (window.gameInstance) {
        window.gameInstance.handleHeroKill(killer, this);
      }
    }
  }

  respawn() {
    this.isDead = false;
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.position.set(this.team === 'blue' ? -48 : 48, 0, this.team === 'blue' ? 48 : -48);
    this.group.position.copy(this.position);
    this.group.visible = true;
  }

  update(delta, map, enemies, towers) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    // Cooldown timers
    for (let i = 0; i < 3; i++) {
      if (this.skillCds[i] > 0) this.skillCds[i] -= delta;
    }
    if (this.healCd > 0) this.healCd -= delta;
    if (this.flashCd > 0) this.flashCd -= delta;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;

    // Status effect countdowns
    if (this.stunDuration > 0) this.stunDuration -= delta;
    if (this.silenceDuration > 0) this.silenceDuration -= delta;
    if (this.slowDuration > 0) {
      this.slowDuration -= delta;
    } else {
      this.slowFactor = 0;
    }

    // Airborne physics
    if (this.airborneDuration > 0) {
      this.airborneDuration -= delta;
      this.jumpY = Math.sin((1 - this.airborneDuration / 0.8) * Math.PI) * 3.5;
    } else {
      this.jumpY = 0;
    }

    // Buffs duration & Passive Regen
    if (this.buffs.red_buff > 0) this.buffs.red_buff -= delta;
    if (this.buffs.blue_buff > 0) {
      this.buffs.blue_buff -= delta;
      this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.03 * delta);
    }

    // Fountain Healing (if at home base)
    const homePos = new THREE.Vector3(this.team === 'blue' ? -50 : 50, 0, this.team === 'blue' ? 50 : -50);
    if (this.position.distanceTo(homePos) < 12) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.35 * delta);
      this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.45 * delta);
    }

    // Recall Channeling with movement interruption
    if (this.isChannelingRecall) {
      if (this.velocity.lengthSq() > 0.001) {
        this.cancelRecall();
      } else {
        this.recallTimer -= delta;
        if (this.isPlayer) {
          const fill = document.getElementById('channeling-fill');
          if (fill) {
            const progress = Math.min(100, Math.max(0, (1 - this.recallTimer / 7.0) * 100));
            fill.style.width = `${progress}%`;
          }
        }
        if (this.recallTimer <= 0) {
          this.isChannelingRecall = false;
          this.position.copy(homePos);
          this.group.position.copy(this.position);
          this.hp = this.maxHp;
          this.mana = this.maxMana;
          this.vfx.createHitSparks(this.position, 0x38bdf8, 40);
          this.vfx.createFloatingText("满状态传送!", this.position, "heal");
          Sound.playRecall();
          const bar = document.getElementById('channeling-bar-container');
          if (bar && this.isPlayer) bar.style.display = 'none';
        }
      }
    }

    // Bush Stealth detection
    const bush = map.getBushAt(this.position);
    this.inBush = !!bush;
    this.stealthOpacity = this.inBush ? 0.45 : 1.0;

    // Movement execution
    if (this.stunDuration <= 0 && this.airborneDuration <= 0 && !this.isChannelingRecall) {
      if (this.velocity.lengthSq() > 0.001) {
        let curSpeed = this.moveSpeed * (1 - this.slowFactor);
        const moveVec = this.velocity.clone().multiplyScalar(curSpeed * delta);
        const nextPos = this.position.clone().add(moveVec);

        if (!map.checkCollision(nextPos)) {
          this.position.copy(nextPos);
        }

        // Face movement direction
        const lookTarget = this.position.clone().add(this.velocity);
        this.group.lookAt(lookTarget.x, this.position.y, lookTarget.z);
      }
    }

    // Update 3D Health & Mana Bars
    if (this.hpFillMesh) {
      const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
      this.hpFillMesh.scale.x = hpRatio;
      this.hpFillMesh.position.x = (hpRatio - 1) * 0.86;
    }
    if (this.manaFillMesh) {
      const manaRatio = Math.max(0, Math.min(1, this.mana / this.maxMana));
      this.manaFillMesh.scale.x = manaRatio;
      this.manaFillMesh.position.x = (manaRatio - 1) * 0.86;
    }
    if (this.hpBarGroup && window.gameInstance && window.gameInstance.renderer) {
      this.hpBarGroup.quaternion.copy(window.gameInstance.renderer.camera.quaternion);
    }

    this.group.position.set(this.position.x, this.position.y + this.jumpY, this.position.z);
  }

  performBasicAttack(target) {
    if (this.isDead || this.stunDuration > 0 || this.attackCooldown > 0) return;
    this.cancelRecall();

    const isCrit = Math.random() < this.critRate;
    let dmg = this.ad * (isCrit ? this.critDamage : 1.0);
    this.attackCooldown = 1 / this.attackSpeed;

    if (target) {
      this.group.lookAt(target.position.x, this.position.y, target.position.z);

      if (this.attackRange > 3.0) {
        Sound.playShoot ? Sound.playShoot() : Sound.playArrowSound();
        this.vfx.createBullet(this.position, target, 0xfacc15, 22, () => {
          target.takeDamage(dmg, this, isCrit ? 'crit' : 'physical');
          if (this.buffs.red_buff > 0 && target.applySlow) {
            target.applySlow(0.25, 2.0);
            target.takeDamage(40 + this.level * 5, this, 'true');
          }
        });
      } else {
        Sound.playHitSound ? Sound.playHitSound() : Sound.playAttackSound();
        target.takeDamage(dmg, this, isCrit ? 'crit' : 'physical');
        this.vfx.createHitSparks(target.position, isCrit ? 0xef4444 : 0xf59e0b, isCrit ? 22 : 12);
        if (isCrit) {
          this.vfx.createFloatingText(`暴击 ${Math.round(dmg)}!`, target.position, "physical");
        }
        if (this.buffs.red_buff > 0 && target.applySlow) {
          target.applySlow(0.25, 2.0);
          target.takeDamage(40 + this.level * 5, this, 'true');
        }
      }
    } else {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
      const strikePos = this.position.clone().addScaledVector(forward, 2.0);
      this.vfx.createHitSparks(strikePos, 0x60a5fa, 8);
      Sound.playShoot ? Sound.playShoot() : Sound.playAttackSound();
    }
  }
}



// --- js/moba/HeroArthur.js ---
/**
 * 亚瑟 (Arthur) - 圣骑士 Warrior/Tank
 * Passive: 圣光守护 (Regen)
 * S1: 誓约之盾 (Silence + Speed + Leap Strike)
 * S2: 回旋打击 (Spinning Holy Shields AoE)
 * S3: 圣剑裁决 (Leap Ground Slam Ult Execute & Knockup)
 */
class HeroArthur extends Hero {
  constructor(scene, vfx, team, isPlayer = false) {
    super(scene, vfx, team, "亚瑟", isPlayer);
    this.avatar = "🛡️";
    this.maxHp = 3850;
    this.hp = this.maxHp;
    this.ad = 175;
    this.armor = 110;
    this.attackRange = 2.4;
    this.moveSpeed = 7.0;

    this.passiveRegenTimer = 0;
    this.s1Active = false;
    this.s1Timer = 0;
    this.s2Active = false;
    this.s2Timer = 0;
    this.s2ShieldGroup = null;

    this.buildArthurModel();
  }

  buildArthurModel() {
    // Premium Golden Heavy Knight Armor
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.85,
      roughness: 0.2
    });
    const blueArmorMat = new THREE.MeshStandardMaterial({
      color: this.team === 'blue' ? 0x1d4ed8 : 0xb91c1c,
      metalness: 0.6,
      roughness: 0.35
    });
    const glowVisorMat = new THREE.MeshBasicMaterial({
      color: this.team === 'blue' ? 0x38bdf8 : 0xf87171
    });

    // 1. Torso & Chestplate
    const torsoGeo = new THREE.CylinderGeometry(0.7, 0.55, 1.4, 8);
    const torso = new THREE.Mesh(torsoGeo, blueArmorMat);
    torso.position.y = 1.6;
    torso.castShadow = true;
    this.group.add(torso);

    const breastplate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.7), goldMat);
    breastplate.position.set(0, 1.7, 0.15);
    this.group.add(breastplate);

    // 2. Helmet & Glowing Visor
    const helmGeo = new THREE.CylinderGeometry(0.45, 0.4, 0.75, 8);
    const helm = new THREE.Mesh(helmGeo, goldMat);
    helm.position.y = 2.65;
    helm.castShadow = true;
    this.group.add(helm);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.2), glowVisorMat);
    visor.position.set(0, 2.65, 0.35);
    this.group.add(visor);

    // Helmet Crest
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.8), blueArmorMat);
    crest.position.set(0, 3.0, 0);
    this.group.add(crest);

    // 3. Dual Winged Pauldrons (Shoulders)
    const leftPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), goldMat);
    leftPauldron.position.set(-0.85, 2.1, 0);
    this.group.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), goldMat);
    rightPauldron.position.set(0.85, 2.1, 0);
    this.group.add(rightPauldron);

    // 4. Flowing Cape
    const capeGeo = new THREE.BoxGeometry(1.2, 1.8, 0.08);
    const cape = new THREE.Mesh(capeGeo, blueArmorMat);
    cape.position.set(0, 1.4, -0.45);
    cape.rotation.x = 0.15;
    this.group.add(cape);

    // 5. Holy Runic Broadsword
    const swordGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.22, 2.2, 0.4);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35
    });
    this.swordMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.swordMesh.position.y = 1.1;
    swordGroup.add(this.swordMesh);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.9), goldMat);
    guard.position.y = 0.05;
    swordGroup.add(guard);

    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6), goldMat);
    hilt.position.y = -0.3;
    swordGroup.add(hilt);

    swordGroup.position.set(0.85, 1.2, 0.4);
    swordGroup.rotation.x = Math.PI / 4;
    swordGroup.rotation.z = -0.2;
    this.group.add(swordGroup);

    // 6. Royal Tower Shield
    const shieldGeo = new THREE.BoxGeometry(0.2, 1.6, 1.0);
    const shield = new THREE.Mesh(shieldGeo, goldMat);
    shield.position.set(-0.85, 1.5, 0.35);
    const shieldCrest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.5), blueArmorMat);
    shieldCrest.position.set(-0.85, 1.5, 0.35);
    this.group.add(shield);
    this.group.add(shieldCrest);
  }

  // S1: 誓约之盾
  castSkill1() {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[0] > 0) return;
    this.cancelRecall();
    this.skillCds[0] = this.skillMaxCds[0] * (1 - this.cdr);
    this.s1Active = true;
    this.s1Timer = 4.0;
    this.moveSpeed = 9.8; // +40% Move Speed boost

    Sound.playArthurS1 ? Sound.playArthurS1() : Sound.playTone(520, 'triangle', 0.2, 0.3);
    this.vfx.createFloatingText("誓约之盾!", this.position, "heal");
    this.vfx.createHitSparks(this.position, 0xfde047, 25);
  }

  // S2: 回旋打击
  castSkill2() {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[1] > 0) return;
    this.cancelRecall();
    this.skillCds[1] = this.skillMaxCds[1] * (1 - this.cdr);
    this.s2Active = true;
    this.s2Timer = 5.0;

    if (!this.s2ShieldGroup) {
      this.s2ShieldGroup = this.vfx.createArthurShields(this);
    }
    Sound.playArthurS2 ? Sound.playArthurS2() : Sound.playTone(440, 'sine', 0.3, 0.4);
    this.vfx.createFloatingText("回旋圣盾!", this.position, "heal");
  }

  // S3: 圣剑裁决 (Ultimate Ground Slam)
  castSkill3(targetHero) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[2] > 0) return;
    this.cancelRecall();
    this.skillCds[2] = this.skillMaxCds[2] * (1 - this.cdr);

    Sound.playArthurS3 ? Sound.playArthurS3() : Sound.playTone(330, 'sawtooth', 0.4, 0.5);
    this.applyKnockup(0.6); // Arthur leap airtime

    const slamPos = targetHero ? targetHero.position.clone() : this.position.clone().add(new THREE.Vector3(0, 0, -5).applyQuaternion(this.group.quaternion));

    // Leap onto target position
    setTimeout(() => {
      this.position.copy(slamPos);
      this.group.position.copy(this.position);

      const ultDmg = (targetHero ? targetHero.maxHp * 0.16 : 400) + 400 + this.ad * 0.6;
      if (targetHero) {
        targetHero.takeDamage(ultDmg, this, 'magic');
        targetHero.applyKnockup(0.8);
      }

      this.vfx.createArthurUltDecal(this.position);
      this.vfx.createHitSparks(this.position, 0xf59e0b, 40);
      this.vfx.createFloatingText("圣剑裁决·斩杀!", this.position, "physical");
    }, 280);
  }


  performBasicAttack(target) {
    if (this.s1Active) {
      // Leap Strike with S1 Empowered Attack + Silence
      this.s1Active = false;
      this.moveSpeed = 7.0;

      // Leap forward to target
      this.position.lerp(target.position, 0.7);
      this.group.position.copy(this.position);

      const s1Dmg = this.ad * 1.8 + 280;
      target.takeDamage(s1Dmg, this, 'physical');
      target.applySilence(1.2); // 1.2s Silence!

      Sound.playHitSound();
      this.vfx.createHitSparks(target.position, 0xffd700, 25);
      this.vfx.createFloatingText("跃斩·沉默!", target.position, "physical");
    } else {
      super.performBasicAttack(target);
    }
  }

  update(delta, map, enemies, towers) {
    super.update(delta, map, enemies, towers);
    if (this.isDead) return;

    // Passive 圣光守护 (Regens 2% Max HP every 2s)
    this.passiveRegenTimer += delta;
    if (this.passiveRegenTimer >= 2.0) {
      this.passiveRegenTimer = 0;
      const regen = this.maxHp * 0.02;
      this.hp = Math.min(this.maxHp, this.hp + regen);
    }

    // S1 Timer
    if (this.s1Active) {
      this.s1Timer -= delta;
      if (this.s1Timer <= 0) {
        this.s1Active = false;
        this.moveSpeed = 7.0;
      }
    }

    // S2 Spinning Shield AoE
    if (this.s2Active) {
      this.s2Timer -= delta;
      if (this.s2ShieldGroup) {
        this.s2ShieldGroup.position.copy(this.position);
        this.s2ShieldGroup.rotation.y += delta * 8; // Fast spin

        // Continuous AoE tick damage
        if (Math.random() < delta * 4) {
          for (const e of enemies) {
            if (!e.isDead && this.position.distanceTo(e.position) < 3.8) {
              e.takeDamage(95 + this.ad * 0.35, this, 'physical');
            }
          }
        }
      }

      if (this.s2Timer <= 0) {
        this.s2Active = false;
        if (this.s2ShieldGroup) {
          this.scene.remove(this.s2ShieldGroup);
          this.s2ShieldGroup = null;
        }
      }
    }
  }
}


// --- js/moba/HeroHouyi.js ---
/**
 * 后羿 (Hou Yi) - 射手 Marksman/ADC
 * Passive: 惩戒射击 (Attack Speed Ramp & Arrow Split)
 * S1: 多重箭矢 (Multi-target Empowered Arrows)
 * S2: 落日余晖 (Solar Strike Beam from Sky + Slow)
 * S3: 惩戒射箭 (Global Flaming Phoenix Arrow Stun)
 */
class HeroHouyi extends Hero {
  constructor(scene, vfx, team, isPlayer = false) {
    super(scene, vfx, team, "后羿", isPlayer);
    this.avatar = "🏹";
    this.maxHp = 2950;
    this.hp = this.maxHp;
    this.ad = 185;
    this.armor = 65;
    this.attackRange = 8.8; // Long Range ADC
    this.attackSpeed = 1.25;

    this.passiveStacks = 0;
    this.passiveTimer = 0;
    this.s1Active = false;
    this.s1Timer = 0;

    this.buildHouyiModel();
  }

  buildHouyiModel() {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2
    });
    const robeMat = new THREE.MeshStandardMaterial({
      color: this.team === 'blue' ? 0x2563eb : 0xdc2626,
      roughness: 0.4
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3
    });
    const glowStringMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a
    });

    // 1. Tunic & Solar Armor
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.4, 1.5, 8);
    const body = new THREE.Mesh(bodyGeo, robeMat);
    body.position.y = 1.5;
    body.castShadow = true;
    this.group.add(body);

    const chestGold = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.5), goldMat);
    chestGold.position.set(0, 1.7, 0.1);
    this.group.add(chestGold);

    // 2. Head & Solar Feather Tiara
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), whiteMat);
    head.position.y = 2.55;
    this.group.add(head);

    const tiara = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 4), goldMat);
    tiara.position.set(0, 2.9, 0.1);
    this.group.add(tiara);

    // 3. Quiver on Back
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 1.2, 6), goldMat);
    quiver.position.set(0.3, 1.6, -0.45);
    quiver.rotation.z = -0.3;
    quiver.rotation.x = 0.2;
    this.group.add(quiver);

    // 4. Glowing Recurve Solar Bow
    const bowGroup = new THREE.Group();
    const bowUpper = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 6, 12, Math.PI / 1.5), goldMat);
    bowUpper.position.set(0, 0.4, 0);
    bowUpper.rotation.z = -Math.PI / 4;
    bowGroup.add(bowUpper);

    const bowLower = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 6, 12, Math.PI / 1.5), goldMat);
    bowLower.position.set(0, -0.4, 0);
    bowLower.rotation.z = Math.PI / 1.3;
    bowGroup.add(bowLower);

    const bowstring = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6), glowStringMat);
    bowstring.position.set(-0.25, 0, 0);
    bowGroup.add(bowstring);

    bowGroup.position.set(0.7, 1.5, 0.35);
    bowGroup.rotation.y = Math.PI / 2;
    this.group.add(bowGroup);
  }


  // S1: 多重箭矢
  castSkill1() {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[0] > 0) return;
    this.skillCds[0] = this.skillMaxCds[0] * (1 - this.cdr);
    this.s1Active = true;
    this.s1Timer = 5.0;

    Sound.playArthurS1();
    this.vfx.createFloatingText("多重箭矢!", this.position, "physical");
  }

  // S2: 落日余晖 (Solar Strike)
  castSkill2(targetPos) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[1] > 0) return;
    this.skillCds[1] = this.skillMaxCds[1] * (1 - this.cdr);

    const pos = targetPos ? targetPos.clone() : this.position.clone().add(new THREE.Vector3(0, 0, -6));
    Sound.playHouyiS2();
    this.vfx.createHouyiSolarBeam(pos);

    // AoE Damage & Slow
    setTimeout(() => {
      if (window.gameInstance) {
        const enemies = window.gameInstance.getEnemiesFor(this.team);
        for (const e of enemies) {
          if (!e.isDead && e.position.distanceTo(pos) < 3.2) {
            e.takeDamage(320 + this.ad * 0.8, this, 'magic');
            if (e.applySlow) e.applySlow(0.5, 2.0); // 50% slow
          }
        }
      }
    }, 200);
  }

  // S3: 惩戒射箭 (Global Flaming Phoenix Arrow)
  castSkill3(direction) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[2] > 0) return;
    this.skillCds[2] = this.skillMaxCds[2] * (1 - this.cdr);

    const dir = direction ? direction.clone().normalize() : new THREE.Vector3(0, 0, -1);
    Sound.playHouyiS3();

    this.vfx.createHouyiBirdProjectile(this.position, dir, (hitTarget) => {
      if (hitTarget && !hitTarget.isDead) {
        hitTarget.takeDamage(650 + this.ad * 1.2, this, 'magic');
        hitTarget.applyStun(2.2); // Big Stun
        this.vfx.createHitSparks(hitTarget.position, 0xff4500, 40);
      }
    });
  }

  performBasicAttack(target) {
    if (this.isDead || this.stunDuration > 0 || this.attackCooldown > 0) return;
    super.performBasicAttack(target);

    // Passive Stacking
    this.passiveStacks = Math.min(3, this.passiveStacks + 1);
    this.passiveTimer = 3.0;

    // S1 Multi-target arrows
    if (this.s1Active && window.gameInstance) {
      const enemies = window.gameInstance.getEnemiesFor(this.team);
      let extraHits = 0;
      for (const e of enemies) {
        if (e !== target && !e.isDead && this.position.distanceTo(e.position) <= this.attackRange && extraHits < 2) {
          extraHits++;
          this.vfx.createBullet(this.position, e, 0xffa500, 22, () => {
            e.takeDamage(this.ad * 0.6, this, 'physical');
          });
        }
      }
    }
  }

  update(delta, map, enemies, towers) {
    super.update(delta, map, enemies, towers);
    if (this.isDead) return;

    if (this.passiveStacks > 0) {
      this.passiveTimer -= delta;
      if (this.passiveTimer <= 0) {
        this.passiveStacks = 0;
      }
    }

    if (this.s1Active) {
      this.s1Timer -= delta;
      if (this.s1Timer <= 0) this.s1Active = false;
    }
  }
}


// --- js/moba/HeroDaji.js ---
/**
 * 妲己 (Daji) - 法师 Mage
 * Passive: 失心 (MR Shred)
 * S1: 灵魂冲击 (Soul Fox Shockwave)
 * S2: 偶像魅力 (Lock-On Homing Charm Stun)
 * S3: 女王崇拜 (5 Fox Fire Homing Burst Ult)
 */
class HeroDaji extends Hero {
  constructor(scene, vfx, team, isPlayer = false) {
    super(scene, vfx, team, "妲己", isPlayer);
    this.avatar = "🦊";
    this.maxHp = 2800;
    this.hp = this.maxHp;
    this.ad = 120;
    this.ap = 240;
    this.armor = 60;
    this.attackRange = 7.5;
    this.moveSpeed = 6.8;

    this.buildDajiModel();
  }

  buildDajiModel() {
    const pinkMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.35
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.85
    });
    const glowOrbMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e
    });

    // 1. Mage Kimono Body
    const bodyGeo = new THREE.ConeGeometry(0.55, 1.5, 8);
    const body = new THREE.Mesh(bodyGeo, pinkMat);
    body.position.y = 1.35;
    body.castShadow = true;
    this.group.add(body);

    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.25, 8), goldMat);
    sash.position.set(0, 1.3, 0);
    this.group.add(sash);

    // 2. Head & Furry Fox Ears
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), whiteMat);
    head.position.y = 2.45;
    this.group.add(head);

    for (let i = -1; i <= 1; i += 2) {
      const earGroup = new THREE.Group();
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 4), pinkMat);
      const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), whiteMat);
      earInner.position.z = 0.04;
      earGroup.add(ear);
      earGroup.add(earInner);

      earGroup.position.set(i * 0.3, 2.75, 0);
      earGroup.rotation.z = -i * 0.35;
      this.group.add(earGroup);
    }

    // 3. Fluffy Fox Tails
    for (let i = -1; i <= 1; i++) {
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.35, 1.6, 8), pinkMat);
      tail.position.set(i * 0.3, 1.0, -0.65);
      tail.rotation.x = -Math.PI / 3.5;
      tail.rotation.y = i * 0.25;
      this.group.add(tail);
    }

    // 4. Floating Glowing Magic Orb
    const orbGroup = new THREE.Group();
    this.orbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), glowOrbMat);
    orbGroup.add(this.orbMesh);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 16), goldMat);
    ring.rotation.x = Math.PI / 3;
    orbGroup.add(ring);

    orbGroup.position.set(0.65, 1.8, 0.45);
    this.group.add(orbGroup);
  }

  // S1: 灵魂冲击 (Soul Fox Shockwave)
  castSkill1(direction) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[0] > 0) return;
    this.cancelRecall();
    this.skillCds[0] = this.skillMaxCds[0] * (1 - this.cdr);

    let dir = direction && direction.lengthSq() > 0.001 ? direction.clone().normalize() : null;
    if (!dir) {
      dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    }
    Sound.playDajiS1 ? Sound.playDajiS1() : Sound.playTone(600, 'sine', 0.2, 0.3);

    // Shockwave forward
    const startPos = this.position.clone();
    const endPos = startPos.clone().addScaledVector(dir, 14);
    this.vfx.createBullet(startPos, { position: endPos }, 0xf472b6, 22, () => {});
    this.vfx.createHitSparks(startPos, 0xf472b6, 20);

    // Linear AoE Damage
    setTimeout(() => {
      if (window.gameInstance) {
        const enemies = window.gameInstance.getEnemiesFor(this.team);
        for (const e of enemies) {
          if (!e.isDead && e.position.distanceTo(startPos) < 14) {
            e.takeDamage(520 + this.ap * 1.2, this, 'magic');
          }
        }
      }
    }, 150);
  }

  // S2: 偶像魅力 (Charm Stun)
  castSkill2(targetHero) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[1] > 0) return;
    this.cancelRecall();
    this.skillCds[1] = this.skillMaxCds[1] * (1 - this.cdr);

    Sound.playDajiS2 ? Sound.playDajiS2() : Sound.playTone(800, 'sine', 0.3, 0.4);

    let target = targetHero;
    if (!target && window.gameInstance) {
      const enemies = window.gameInstance.getEnemiesFor(this.team);
      target = enemies.find(e => !e.isDead && this.position.distanceTo(e.position) < 12);
    }

    if (target) {
      this.vfx.createDajiCharmHeart(this.position, target, () => {
        target.takeDamage(350 + this.ap * 0.7, this, 'magic');
        if (target.applyStun) target.applyStun(1.5);
        this.vfx.createFloatingText("魅惑·眩晕 1.5s!", target.position, "magic");
      });
    } else {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
      this.vfx.createBullet(this.position, { position: this.position.clone().addScaledVector(fwd, 10) }, 0xf43f5e, 18, () => {});
    }
  }

  // S3: 女王崇拜 (5 Fox Fire Homing Burst Ult)
  castSkill3(targetHero) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[2] > 0) return;
    this.cancelRecall();
    this.skillCds[2] = this.skillMaxCds[2] * (1 - this.cdr);

    Sound.playDajiS3 ? Sound.playDajiS3() : Sound.playTone(900, 'triangle', 0.4, 0.5);

    let target = targetHero;
    if (!target && window.gameInstance) {
      const enemies = window.gameInstance.getEnemiesFor(this.team);
      target = enemies.find(e => !e.isDead && this.position.distanceTo(e.position) < 14);
    }

    // 5 consecutive rapid homing fox fires
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (this.isDead) return;
        const shootTarget = target || { position: this.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 0, -10)) };
        this.vfx.createBullet(this.position, shootTarget, 0xf43f5e, 26, () => {
          if (shootTarget.takeDamage) {
            shootTarget.takeDamage(320 + this.ap * 0.65, this, 'magic');
            this.vfx.createHitSparks(shootTarget.position, 0xf43f5e, 12);
          }
        });
      }, i * 90);
    }
  }

  update(delta, map, enemies, towers) {
    super.update(delta, map, enemies, towers);
    if (this.isDead) return;

    if (this.orbMesh) {
      this.orbMesh.position.y = 1.8 + Math.sin(performance.now() * 0.005) * 0.15;
    }
  }
}


// --- js/moba/AIController.js ---
/**
 * Smart Bot Behavior Tree AI for Allied and Enemy Bots
 */
class AIController {
  constructor(hero) {
    this.hero = hero;
    this.decisionTimer = 0;
    this.decisionInterval = 0.15; // Decisions every 150ms
    this.state = 'laning'; // 'laning', 'combat', 'retreat', 'recall'
  }

  update(delta, map, allHeroes, minions, towers, monsters) {
    if (this.hero.isDead) return;

    this.decisionTimer -= delta;
    if (this.decisionTimer > 0) return;
    this.decisionTimer = this.decisionInterval;

    const enemies = allHeroes.filter(h => h.team !== this.hero.team && !h.isDead);
    const allies = allHeroes.filter(h => h.team === this.hero.team && !h.isDead);
    const enemyTowers = towers.filter(t => t.team !== this.hero.team && !t.isDead);
    const friendlyTowers = towers.filter(t => t.team === this.hero.team && !t.isDead);

    // 1. Health Evaluation (Retreat & Recall)
    if (this.hero.hp / this.hero.maxHp < 0.22) {
      this.state = 'retreat';
    } else if (this.state === 'retreat' && this.hero.hp / this.hero.maxHp > 0.85) {
      this.state = 'laning';
    }

    if (this.state === 'retreat') {
      this.handleRetreat(friendlyTowers);
      return;
    }

    // 2. Combat Target Acquisition (Prioritize low HP hero)
    let bestTarget = null;
    let lowestHp = Infinity;

    for (const e of enemies) {
      const d = this.hero.position.distanceTo(e.position);
      if (d < 16) {
        if (e.hp < lowestHp) {
          lowestHp = e.hp;
          bestTarget = e;
        }
      }
    }

    if (bestTarget) {
      this.state = 'combat';
      this.handleCombat(bestTarget, enemyTowers);
    } else {
      this.state = 'laning';
      this.handleLaning(minions, enemyTowers);
    }
  }

  handleCombat(target, enemyTowers) {
    const dist = this.hero.position.distanceTo(target.position);

    // Check if target is deep under enemy tower
    let underDangerousTower = false;
    for (const t of enemyTowers) {
      if (t.position.distanceTo(target.position) < t.attackRange && target.hp > 400) {
        underDangerousTower = true;
        break;
      }
    }

    if (underDangerousTower && this.hero.hp / this.hero.maxHp < 0.6) {
      // Don't dive tower, back off
      const backDir = this.hero.position.clone().sub(target.position).normalize();
      this.hero.velocity.copy(backDir);
      return;
    }

    // Move towards attack range
    if (dist > this.hero.attackRange) {
      const moveDir = target.position.clone().sub(this.hero.position).normalize();
      this.hero.velocity.copy(moveDir);
    } else {
      this.hero.velocity.set(0, 0, 0);
      this.hero.performBasicAttack(target);
    }

    // Smart Skill Combos
    if (this.hero instanceof HeroArthur) {
      // Arthur: S1 Speed/Silence Leap -> S2 Spin -> S3 Execute
      if (dist < 10 && this.hero.skillCds[0] <= 0) {
        this.hero.castSkill1();
      }
      if (dist < 4.5 && this.hero.skillCds[1] <= 0) {
        this.hero.castSkill2();
      }
      if (dist < 8.0 && target.hp / target.maxHp < 0.45 && this.hero.skillCds[2] <= 0) {
        this.hero.castSkill3(target);
      }
    } else if (this.hero instanceof HeroHouyi) {
      // Houyi: S2 Solar Slow -> S1 Multi Shot -> S3 Ult Snipe
      if (dist < 12 && this.hero.skillCds[1] <= 0) {
        this.hero.castSkill2(target.position);
      }
      if (dist <= this.hero.attackRange && this.hero.skillCds[0] <= 0) {
        this.hero.castSkill1();
      }
      if (dist > 8 && this.hero.skillCds[2] <= 0) {
        const aimDir = target.position.clone().sub(this.hero.position).normalize();
        this.hero.castSkill3(aimDir);
      }
    } else if (this.hero instanceof HeroDaji) {
      // Daji: S2 Charm Stun -> S1 Shockwave -> S3 Fox fire burst
      if (dist < 9 && this.hero.skillCds[1] <= 0) {
        this.hero.castSkill2(target);
      }
      if (dist < 11 && this.hero.skillCds[0] <= 0) {
        const aimDir = target.position.clone().sub(this.hero.position).normalize();
        this.hero.castSkill1(aimDir);
      }
      if (dist < 8.5 && this.hero.skillCds[2] <= 0) {
        this.hero.castSkill3(target);
      }
    }
  }

  handleLaning(minions, enemyTowers) {
    // Find closest enemy minion
    let targetMinion = null;
    let minDist = Infinity;

    for (const m of minions) {
      if (!m.isDead && m.team !== this.hero.team) {
        const d = this.hero.position.distanceTo(m.position);
        if (d < minDist) {
          minDist = d;
          targetMinion = m;
        }
      }
    }

    if (targetMinion) {
      const dist = this.hero.position.distanceTo(targetMinion.position);
      if (dist > this.hero.attackRange) {
        const dir = targetMinion.position.clone().sub(this.hero.position).normalize();
        this.hero.velocity.copy(dir);
      } else {
        this.hero.velocity.set(0, 0, 0);
        this.hero.performBasicAttack(targetMinion);
      }
    } else {
      // Push towards enemy base
      const enemyBasePos = new THREE.Vector3(
        this.hero.team === 'blue' ? 45 : -45,
        0,
        this.hero.team === 'blue' ? -45 : 45
      );
      const dir = enemyBasePos.clone().sub(this.hero.position).normalize();
      this.hero.velocity.copy(dir);
    }
  }

  handleRetreat(friendlyTowers) {
    const homePos = new THREE.Vector3(
      this.hero.team === 'blue' ? -52 : 52,
      0,
      this.hero.team === 'blue' ? 52 : -52
    );

    // If near friendly fountain, stay to heal
    if (this.hero.position.distanceTo(homePos) < 8) {
      this.hero.velocity.set(0, 0, 0);
      return;
    }

    // Run back to base
    const dir = homePos.clone().sub(this.hero.position).normalize();
    this.hero.velocity.copy(dir);
  }
}


// --- js/moba/Shop.js ---
/**
 * Equipment Shop System & Quick Buy
 */
const ITEM_DATABASE = [
  // Physical Attack Items
  { id: 'item_blade', name: '无尽战刃', icon: '🗡️', type: 'phys', price: 2140, stats: { ad: 110, critRate: 0.25, critDamage: 0.5 }, desc: '+110物理攻击, +25%暴击率, 暴击效果+50%' },
  { id: 'item_axe', name: '暗影战斧', icon: '🪓', type: 'phys', price: 2090, stats: { ad: 85, maxHp: 500, cdr: 0.15 }, desc: '+85物理攻击, +500最大生命, +15%冷却缩减' },
  { id: 'item_master', name: '宗师之力', icon: '⚔️', type: 'phys', price: 2100, stats: { ad: 80, critRate: 0.2, maxHp: 400 }, desc: '+80物理攻击, +20%暴击率, 强化普攻' },
  { id: 'item_blood', name: '泣血之刃', icon: '🩸', type: 'phys', price: 1740, stats: { ad: 100, lifesteal: 0.25 }, desc: '+100物理攻击, +25%物理吸血' },
  { id: 'item_doombringer', name: '破军', icon: '🔱', type: 'phys', price: 2950, stats: { ad: 180 }, desc: '+180物理攻击, 目标生命低于50%伤害提高30%' },

  // Magic Items
  { id: 'item_rabadon', name: '博学者之怒', icon: '👑', type: 'magic', price: 2300, stats: { ap: 240 }, desc: '+240法术攻击, 法术强度提升35%' },
  { id: 'item_echo', name: '回响之杖', icon: '🪄', type: 'magic', price: 2100, stats: { ap: 200, moveSpeed: 0.5 }, desc: '+200法术攻击, +7%移速, 技能触发小范围爆炸' },
  { id: 'item_mask', name: '痛苦面具', icon: '🎭', type: 'magic', price: 2040, stats: { ap: 120, maxHp: 800, cdr: 0.05 }, desc: '+120法术攻击, +800生命, 技能附带百分比灼烧' },
  { id: 'item_void', name: '虚无法杖', icon: '🔮', type: 'magic', price: 2110, stats: { ap: 240, maxHp: 300 }, desc: '+240法术攻击, +45%法术穿透' },

  // Defense Items
  { id: 'item_glacial', name: '极寒风暴', icon: '❄️', type: 'def', price: 2100, stats: { armor: 360, cdr: 0.2, maxMana: 500 }, desc: '+360物理防御, +20%冷却缩减, 受到单次高伤减速周围' },
  { id: 'item_ominous', name: '不祥征兆', icon: '🛡️', type: 'def', price: 2180, stats: { armor: 270, maxHp: 1200 }, desc: '+270物理防御, +1200最大生命, 攻击者降低攻速移速' },
  { id: 'item_witch', name: '魔女斗篷', icon: '🧙‍♀️', type: 'def', price: 2080, stats: { magicResist: 300, maxHp: 1000 }, desc: '+300法术防御, +1000最大生命, 获得法术护盾' },
  { id: 'item_overlord', name: '霸者重装', icon: '❤️', type: 'def', price: 2070, stats: { maxHp: 2000 }, desc: '+2000最大生命, 脱战后持续回复最大生命值' },

  // Boots
  { id: 'item_res_boots', name: '抵抗之靴', icon: '👢', type: 'boot', price: 710, stats: { magicResist: 110, moveSpeed: 1.0 }, desc: '+110法术防御, +60移速, +35%韧性' },
  { id: 'item_speed_boots', name: '急速战靴', icon: '🥾', type: 'boot', price: 710, stats: { attackSpeed: 0.25, moveSpeed: 1.0 }, desc: '+25%攻击速度, +60移速' }
];

class ShopManager {
  constructor(hero) {
    this.hero = hero;
    this.currentTab = 'phys';
    this.selectedItem = ITEM_DATABASE[0];
    this.initUI();
  }

  initUI() {
    this.renderShopItems(this.currentTab);
    this.updateQuickBuy();
  }

  renderShopItems(tab) {
    this.currentTab = tab;
    const grid = document.getElementById('shop-items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = ITEM_DATABASE.filter(i => tab === 'all' || i.type === tab);
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = `shop-item-card ${this.selectedItem && this.selectedItem.id === item.id ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-price">💰 ${item.price}</div>
      `;
      card.onclick = () => this.selectItem(item);
      grid.appendChild(card);
    });

    this.updateDetailPane();
  }

  selectItem(item) {
    this.selectedItem = item;
    this.renderShopItems(this.currentTab);
  }

  updateDetailPane() {
    const pane = document.getElementById('shop-item-detail');
    if (!pane || !this.selectedItem) return;

    pane.innerHTML = `
      <div class="detail-content">
        <div class="detail-title">${this.selectedItem.icon} ${this.selectedItem.name}</div>
        <div class="detail-stats">价格: 💰 ${this.selectedItem.price}</div>
        <div class="detail-passive">${this.selectedItem.desc}</div>
      </div>
      <button class="btn-buy-item" id="btn-modal-buy" ${this.hero.gold >= this.selectedItem.price ? '' : 'disabled'}>
        购买 (💰 ${this.selectedItem.price})
      </button>
    `;

    const buyBtn = document.getElementById('btn-modal-buy');
    if (buyBtn) {
      buyBtn.onclick = (e) => { e.preventDefault(); this.buyItem(this.selectedItem); };
      buyBtn.ontouchstart = (e) => { e.preventDefault(); e.stopPropagation(); this.buyItem(this.selectedItem); };
    }
  }

  buyItem(item) {
    if (!item) return;
    if (this.hero.gold < item.price) {
      this.hero.vfx.createFloatingText("金币不足!", this.hero.position, "physical");
      return;
    }
    if (this.hero.inventory.length >= 6) {
      this.hero.vfx.createFloatingText("装备已满 (6件)!", this.hero.position, "physical");
      return;
    }

    this.hero.gold -= item.price;
    this.hero.inventory.push(item);

    // Apply Stats
    if (item.stats.ad) this.hero.ad += item.stats.ad;
    if (item.stats.ap) this.hero.ap += item.stats.ap;
    if (item.stats.armor) this.hero.armor += item.stats.armor;
    if (item.stats.magicResist) this.hero.magicResist += item.stats.magicResist;
    if (item.stats.maxHp) {
      this.hero.maxHp += item.stats.maxHp;
      this.hero.hp += item.stats.maxHp;
    }
    if (item.stats.critRate) this.hero.critRate += item.stats.critRate;
    if (item.stats.critDamage) this.hero.critDamage += item.stats.critDamage;
    if (item.stats.lifesteal) this.hero.lifesteal += item.stats.lifesteal;
    if (item.stats.cdr) this.hero.cdr = Math.min(0.4, this.hero.cdr + item.stats.cdr);
    if (item.stats.moveSpeed) this.hero.moveSpeed += item.stats.moveSpeed;
    if (item.stats.attackSpeed) this.hero.attackSpeed += item.stats.attackSpeed;

    Sound.playGold ? Sound.playGold() : Sound.playTone(880, 'sine', 0.2, 0.3);
    this.hero.vfx.createFloatingText(`+${item.name}`, this.hero.position, "heal");
    this.hero.vfx.createHitSparks(this.hero.position, 0xfacc15, 20);

    this.updateQuickBuy();
    this.updateDetailPane();
  }

  updateQuickBuy() {
    const container = document.getElementById('quick-buy-container');
    if (!container) return;

    // Find affordable items not in inventory
    const unbought = ITEM_DATABASE.filter(i => !this.hero.inventory.some(inv => inv.id === i.id));
    const affordable = unbought.filter(i => this.hero.gold >= i.price);
    const recItem = affordable[0] || unbought[0];

    if (!recItem || this.hero.inventory.length >= 6) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';

    container.innerHTML = `
      <div class="quick-buy-item hud-interactive" id="quick-buy-btn">
        <div class="item-icon">${recItem.icon}</div>
        <div class="quick-buy-info">
          <span class="item-name">${recItem.name}</span>
          <span class="item-price">💰 ${recItem.price}</span>
        </div>
      </div>
      <button id="btn-open-shop" class="hud-interactive">装备商店 🛒</button>
    `;

    const qBtn = document.getElementById('quick-buy-btn');
    if (qBtn) {
      qBtn.onclick = (e) => { e.preventDefault(); this.buyItem(recItem); };
      qBtn.ontouchstart = (e) => { e.preventDefault(); e.stopPropagation(); this.buyItem(recItem); };
    }
    const sBtn = document.getElementById('btn-open-shop');
    if (sBtn) {
      sBtn.onclick = (e) => {
        e.preventDefault();
        const modal = document.getElementById('shop-modal');
        if (modal) modal.style.display = 'flex';
      };
      sBtn.ontouchstart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const modal = document.getElementById('shop-modal');
        if (modal) modal.style.display = 'flex';
      };
    }
  }
}



// --- js/moba/UIController.js ---
/**
 * UI Controller: Mini-map Canvas, Virtual Joystick, Skill Wheels & PC Hotkeys
 */
class UIController {
  constructor(game) {
    this.game = game;
    this.player = null;
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      curX: 0,
      curY: 0,
      radius: 50,
      dir: new THREE.Vector3()
    };

    this.keys = {};
    this.initHUD();
    this.initControls();
  }

  setPlayer(player) {
    this.player = player;
  }

  initHUD() {
    this.minimapCanvas = document.getElementById('minimap-canvas');
    if (this.minimapCanvas) {
      this.minimapCtx = this.minimapCanvas.getContext('2d');
      this.minimapCanvas.width = 140;
      this.minimapCanvas.height = 140;
    }
  }

  initControls() {
    // 1. Virtual Joystick with Multi-Touch tracking
    const joyZone = document.getElementById('joystick-zone');
    const joyThumb = document.getElementById('joystick-thumb');

    let joyTouchId = null;

    if (joyZone && joyThumb) {
      const updateJoystick = (clientX, clientY) => {
        const rect = joyZone.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const dx = clientX - startX;
        const dy = clientY - startY;

        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = rect.width * 0.38;

        const clampedDist = Math.min(dist, maxR);
        const angle = Math.atan2(dy, dx);

        const tx = Math.cos(angle) * clampedDist;
        const ty = Math.sin(angle) * clampedDist;

        joyThumb.style.transform = `translate(${tx}px, ${ty}px)`;

        // In 3D isometric view: X screen -> X world, Y screen -> Z world
        this.joystick.dir.set(Math.cos(angle), 0, Math.sin(angle));
        if (this.player) {
          this.player.velocity.copy(this.joystick.dir);
        }
      };

      const resetJoystick = () => {
        this.joystick.active = false;
        joyTouchId = null;
        joyThumb.style.transform = `translate(0px, 0px)`;
        this.joystick.dir.set(0, 0, 0);
        if (this.player && !this.keys.w && !this.keys.a && !this.keys.s && !this.keys.d) {
          this.player.velocity.set(0, 0, 0);
        }
      };

      // Mouse support
      joyZone.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.joystick.active = true;
        updateJoystick(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => {
        if (this.joystick.active && joyTouchId === null) {
          updateJoystick(e.clientX, e.clientY);
        }
      });
      window.addEventListener('mouseup', () => {
        if (this.joystick.active && joyTouchId === null) {
          resetJoystick();
        }
      });

      // Touch Multi-touch support (independent from right thumb taps)
      joyZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          joyTouchId = t.identifier;
          this.joystick.active = true;
          updateJoystick(t.clientX, t.clientY);
        }
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (!this.joystick.active || joyTouchId === null) return;
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === joyTouchId) {
            updateJoystick(e.touches[i].clientX, e.touches[i].clientY);
            break;
          }
        }
      }, { passive: false });

      window.addEventListener('touchend', (e) => {
        if (!this.joystick.active || joyTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joyTouchId) {
            resetJoystick();
            break;
          }
        }
      });
      window.addEventListener('touchcancel', resetJoystick);
    }

    // 2. Keyboard Controls (WASD + Hotkeys for PC)
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      this.handleKeyboardMovement();

      if (k === '1' || k === 'q') this.triggerSkill(0);
      if (k === '2' || (k === 'w' && e.ctrlKey)) this.triggerSkill(1);
      if (k === 'e' || k === '2') this.triggerSkill(1);
      if (k === '3' || k === 'r') this.triggerSkill(2);
      if (k === ' ' || k === 'j') this.triggerMainAttack();
      if (k === 'k') this.triggerPushTower();
      if (k === 'l') this.triggerLastHit();
      if (k === 'b') this.triggerRecall();
      if (k === 'd') this.triggerHeal();
      if (k === 'f') this.triggerFlash();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.handleKeyboardMovement();
    });

    // 3. Fast Touch & Click Bindings for All Buttons (Zero latency on mobile)
    const bindBtn = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
      }, { passive: false });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        fn();
      });
    };

    bindBtn('btn-main-attack', () => this.triggerMainAttack());
    bindBtn('btn-push-tower', () => this.triggerPushTower());
    bindBtn('btn-last-hit', () => this.triggerLastHit());
    bindBtn('btn-skill-1', () => this.triggerSkill(0));
    bindBtn('btn-skill-2', () => this.triggerSkill(1));
    bindBtn('btn-skill-3', () => this.triggerSkill(2));
    bindBtn('btn-up-1', () => this.upgradeSkill(0));
    bindBtn('btn-up-2', () => this.upgradeSkill(1));
    bindBtn('btn-up-3', () => this.upgradeSkill(2));
    bindBtn('btn-spell-heal', () => this.triggerHeal());
    bindBtn('btn-spell-flash', () => this.triggerFlash());
    bindBtn('btn-spell-recall', () => this.triggerRecall());
  }

  upgradeSkill(index) {
    if (!this.player || this.player.skillPoints <= 0) return;
    this.player.skillPoints--;
    this.player.skillLevels[index]++;
    this.player.vfx.createFloatingText(`升级技能 ${index + 1}!`, this.player.position, "heal");
    Sound.playLevelUp ? Sound.playLevelUp() : Sound.playTone(800, 'sine', 0.2, 0.3);
  }

  handleKeyboardMovement() {
    if (!this.player) return;
    const move = new THREE.Vector3();
    if (this.keys['w'] || this.keys['arrowup']) move.z -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) move.z += 1;
    if (this.keys['a'] || this.keys['arrowleft']) move.x -= 1;
    if (this.keys['d'] || this.keys['arrowright']) move.x += 1;

    if (move.lengthSq() > 0) {
      move.normalize();
      this.player.velocity.copy(move);
    } else if (!this.joystick.active) {
      this.player.velocity.set(0, 0, 0);
    }
  }

  triggerMainAttack() {
    if (!this.player || this.player.isDead) return;
    const target = this.game.getBestAttackTarget(this.player, 'any');
    this.player.performBasicAttack(target);
  }

  triggerPushTower() {
    if (!this.player || this.player.isDead) return;
    const target = this.game.getBestAttackTarget(this.player, 'tower') || this.game.getBestAttackTarget(this.player, 'any');
    this.player.performBasicAttack(target);
  }

  triggerLastHit() {
    if (!this.player || this.player.isDead) return;
    const target = this.game.getBestAttackTarget(this.player, 'minion') || this.game.getBestAttackTarget(this.player, 'any');
    this.player.performBasicAttack(target);
  }

  triggerSkill(index) {
    if (!this.player || this.player.isDead) return;
    const enemies = this.game.getEnemiesFor(this.player.team);
    const closestHero = enemies.find(e => !e.isDead && (e instanceof Hero || e.hp !== undefined) && this.player.position.distanceTo(e.position) < 14);

    if (index === 0) {
      if (this.player.castSkill1) this.player.castSkill1(this.player.velocity);
    } else if (index === 1) {
      if (this.player instanceof HeroHouyi) {
        const aimPos = closestHero ? closestHero.position.clone() : this.player.position.clone().add(new THREE.Vector3(0, 0, -8).applyQuaternion(this.player.group.quaternion));
        this.player.castSkill2(aimPos);
      } else if (this.player instanceof HeroDaji) {
        this.player.castSkill2(closestHero);
      } else if (this.player.castSkill2) {
        this.player.castSkill2();
      }
    } else if (index === 2) {
      if (this.player instanceof HeroArthur) {
        this.player.castSkill3(closestHero);
      } else if (this.player instanceof HeroHouyi) {
        const aimDir = closestHero ? closestHero.position.clone().sub(this.player.position).normalize() : new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.group.quaternion);
        this.player.castSkill3(aimDir);
      } else if (this.player instanceof HeroDaji) {
        this.player.castSkill3(closestHero);
      }
    }
  }

  triggerHeal() {
    if (this.player) this.player.castHeal();
  }

  triggerFlash() {
    if (this.player) this.player.castFlash(this.player.velocity);
  }

  triggerRecall() {
    if (this.player) this.player.startRecall();
  }


  update(delta) {
    this.updateHUD();
    this.renderMinimap();
  }

  updateHUD() {
    if (!this.player) return;

    // Timer & KDA
    const timerElem = document.getElementById('match-timer');
    if (timerElem) {
      const elapsed = Math.floor(this.game.matchTime);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      timerElem.innerText = `${m}:${s}`;
    }

    const kdaElem = document.getElementById('player-kda-display');
    if (kdaElem) {
      kdaElem.innerHTML = `<span>⚔️ <b>${this.player.kills}/${this.player.deaths}/${this.player.assists}</b></span> <span>💰 <b>${this.player.gold}</b></span> <span>🗡️ <b>${this.player.cs}</b></span>`;
    }

    // Cooldown Mask Overlays
    for (let i = 0; i < 3; i++) {
      const mask = document.getElementById(`skill-${i+1}-cd`);
      if (mask) {
        if (this.player.skillCds[i] > 0) {
          mask.style.display = 'flex';
          mask.innerText = Math.ceil(this.player.skillCds[i]);
        } else {
          mask.style.display = 'none';
        }
      }

      // Upgrade (+) button visibility
      const upBtn = document.getElementById(`btn-up-${i+1}`);
      if (upBtn) {
        upBtn.style.display = (this.player.skillPoints > 0) ? 'flex' : 'none';
      }
    }

    // Sub Spells CD
    const healCdMask = document.getElementById('heal-cd-mask');
    if (healCdMask) {
      if (this.player.healCd > 0) {
        healCdMask.style.display = 'flex';
        healCdMask.innerText = Math.ceil(this.player.healCd);
      } else healCdMask.style.display = 'none';
    }

    const flashCdMask = document.getElementById('flash-cd-mask');
    if (flashCdMask) {
      if (this.player.flashCd > 0) {
        flashCdMask.style.display = 'flex';
        flashCdMask.innerText = Math.ceil(this.player.flashCd);
      } else flashCdMask.style.display = 'none';
    }

    // Channeling Bar (Recall)
    const channelBarContainer = document.getElementById('channeling-bar-container');
    const channelBar = document.getElementById('channeling-bar');
    if (channelBarContainer && channelBar) {
      if (this.player.isChannelingRecall) {
        channelBarContainer.style.display = 'flex';
        const pct = ((7.0 - this.player.recallTimer) / 7.0) * 100;
        channelBar.style.width = `${pct}%`;
      } else {
        channelBarContainer.style.display = 'none';
      }
    }
  }

  renderMinimap() {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = 140, h = 140;
    const mapSize = 160;

    ctx.clearRect(0, 0, w, h);

    // Map background
    ctx.fillStyle = '#112218';
    ctx.fillRect(0, 0, w, h);

    // River
    ctx.strokeStyle = '#0f4c81';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.stroke();

    // Mid Lane
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();

    const worldToMap = (pos) => {
      const mx = ((pos.x + mapSize / 2) / mapSize) * w;
      const my = ((pos.z + mapSize / 2) / mapSize) * h;
      return { x: mx, y: my };
    };

    // 1. Draw Towers
    for (const t of this.game.towers) {
      if (t.isDead) continue;
      const mp = worldToMap(t.position);
      ctx.fillStyle = t.team === 'blue' ? '#3b82f6' : '#ef4444';
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, t.isCrystal ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Jungle Monsters
    for (const m of this.game.monsters) {
      if (m.isDead) continue;
      const mp = worldToMap(m.position);
      ctx.fillStyle = m.type.includes('buff') ? '#fbbf24' : '#a855f7';
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw Minions
    for (const minion of this.game.minions) {
      if (minion.isDead) continue;
      const mp = worldToMap(minion.position);
      ctx.fillStyle = minion.team === 'blue' ? '#60a5fa' : '#f87171';
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Heroes
    for (const hero of this.game.heroes) {
      if (hero.isDead) continue;
      // Stealth check on minimap: Hide enemy if in bush
      if (hero.inBush && hero.team !== this.player.team) continue;

      const mp = worldToMap(hero.position);
      ctx.fillStyle = hero.team === 'blue' ? '#3b82f6' : '#ef4444';
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, hero.isPlayer ? 5.5 : 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = hero.isPlayer ? 2 : 1;
      ctx.stroke();
    }
  }

  showAnnouncement(title) {
    const container = document.getElementById('kill-broadcast-container');
    if (!container) return;

    const banner = document.createElement('div');
    banner.className = 'kill-banner';
    banner.innerText = title;
    container.appendChild(banner);

    setTimeout(() => {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 2600);
  }
}


// --- js/moba/Game.js ---
/**
 * Main MOBA Game Engine & Match Loop Orchestrator
 */
class MobaGame {
  constructor() {
    window.gameInstance = this;
    this.canvas = document.getElementById('webgl-canvas');
    this.renderer = new GameRenderer(this.canvas);
    this.vfx = new VFXManager(this.renderer.scene, this.renderer.camera);
    this.map = new MobaMap(this.renderer.scene);

    this.heroes = [];
    this.minions = [];
    this.towers = [];
    this.monsters = [];
    this.aiControllers = [];

    this.playerHero = null;
    this.shop = null;
    this.ui = new UIController(this);

    this.matchTime = 0;
    this.waveTimer = 5.0;
    this.waveInterval = 28.0;
    this.blueKills = 0;
    this.redKills = 0;
    this.isGameOver = false;

    this.initTowers();
    this.initJungleMonsters();
  }

  initTowers() {
    // Blue Towers
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'blue', 'outer', new THREE.Vector3(-18, 0, 18)));
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'blue', 'inner', new THREE.Vector3(-32, 0, 32)));
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'blue', 'crystal', new THREE.Vector3(-48, 0, 48)));

    // Red Towers
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'red', 'outer', new THREE.Vector3(18, 0, -18)));
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'red', 'inner', new THREE.Vector3(32, 0, -32)));
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'red', 'crystal', new THREE.Vector3(48, 0, -48)));
  }

  initJungleMonsters() {
    this.monsters.push(new JungleMonster(this.renderer.scene, this.vfx, 'blue_buff', new THREE.Vector3(-28, 0, 10)));
    this.monsters.push(new JungleMonster(this.renderer.scene, this.vfx, 'red_buff', new THREE.Vector3(10, 0, 28)));
    this.monsters.push(new JungleMonster(this.renderer.scene, this.vfx, 'blue_buff', new THREE.Vector3(-10, 0, -28)));
    this.monsters.push(new JungleMonster(this.renderer.scene, this.vfx, 'red_buff', new THREE.Vector3(28, 0, -10)));
  }

  startMatch(selectedHeroType) {
    // 1. Create Player Hero
    if (selectedHeroType === 'arthur') {
      this.playerHero = new HeroArthur(this.renderer.scene, this.vfx, 'blue', true);
    } else if (selectedHeroType === 'houyi') {
      this.playerHero = new HeroHouyi(this.renderer.scene, this.vfx, 'blue', true);
    } else {
      this.playerHero = new HeroDaji(this.renderer.scene, this.vfx, 'blue', true);
    }
    this.heroes.push(this.playerHero);

    // 2. Create Allied Bot Heroes (Blue Team)
    if (selectedHeroType !== 'houyi') {
      const allyHouyi = new HeroHouyi(this.renderer.scene, this.vfx, 'blue', false);
      this.heroes.push(allyHouyi);
      this.aiControllers.push(new AIController(allyHouyi));
    } else {
      const allyArthur = new HeroArthur(this.renderer.scene, this.vfx, 'blue', false);
      this.heroes.push(allyArthur);
      this.aiControllers.push(new AIController(allyArthur));
    }

    const allyDaji = new HeroDaji(this.renderer.scene, this.vfx, 'blue', false);
    this.heroes.push(allyDaji);
    this.aiControllers.push(new AIController(allyDaji));

    // 3. Create Enemy Bot Heroes (Red Team)
    const enemyArthur = new HeroArthur(this.renderer.scene, this.vfx, 'red', false);
    const enemyHouyi = new HeroHouyi(this.renderer.scene, this.vfx, 'red', false);
    const enemyDaji = new HeroDaji(this.renderer.scene, this.vfx, 'red', false);

    this.heroes.push(enemyArthur, enemyHouyi, enemyDaji);
    this.aiControllers.push(new AIController(enemyArthur), new AIController(enemyHouyi), new AIController(enemyDaji));

    // Setup Shop & UI
    this.shop = new ShopManager(this.playerHero);
    this.ui.setPlayer(this.playerHero);

    // Play welcome announcer
    Sound.init();
    Sound.playTone(520, 'triangle', 0.5, 0.4);

    // Start Game Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  spawnMinionWave() {
    // Blue Minions
    this.minions.push(new Minion(this.renderer.scene, this.vfx, 'blue', 'melee', this.map.waypoints.blueMid));
    this.minions.push(new Minion(this.renderer.scene, this.vfx, 'blue', 'caster', this.map.waypoints.blueMid));
    if (this.matchTime > 120) {
      this.minions.push(new Minion(this.renderer.scene, this.vfx, 'blue', 'cannon', this.map.waypoints.blueMid));
    }

    // Red Minions
    this.minions.push(new Minion(this.renderer.scene, this.vfx, 'red', 'melee', this.map.waypoints.redMid));
    this.minions.push(new Minion(this.renderer.scene, this.vfx, 'red', 'caster', this.map.waypoints.redMid));
    if (this.matchTime > 120) {
      this.minions.push(new Minion(this.renderer.scene, this.vfx, 'red', 'cannon', this.map.waypoints.redMid));
    }
  }

  handleHeroKill(killer, victim) {
    if (killer.team === 'blue') {
      this.blueKills++;
      document.getElementById('blue-score').innerText = this.blueKills;
    } else {
      this.redKills++;
      document.getElementById('red-score').innerText = this.redKills;
    }

    let title = `${killer.name} 击杀了 ${victim.name}!`;
    if (killer.kills === 1 && this.blueKills + this.redKills === 1) {
      title = "FIRST BLOOD! 第一滴血!";
      Sound.playAnnouncer('FIRST_BLOOD');
    } else if (killer.kills === 2) {
      title = "DOUBLE KILL! 二连击破!";
      Sound.playAnnouncer('DOUBLE_KILL');
    } else if (killer.kills >= 3) {
      title = "TRIPLE KILL! 三连决胜!";
      Sound.playAnnouncer('TRIPLE_KILL');
    }

    this.ui.showAnnouncement(title);
  }

  getEnemiesFor(team) {
    const enemies = [];
    for (const h of this.heroes) {
      if (h.team !== team && !h.isDead) enemies.push(h);
    }
    for (const m of this.minions) {
      if (m.team !== team && !m.isDead) enemies.push(m);
    }
    for (const t of this.towers) {
      if (t.team !== team && !t.isDead) enemies.push(t);
    }
    for (const mon of this.monsters) {
      if (!mon.isDead) enemies.push(mon);
    }
    return enemies;
  }

  getBestAttackTarget(hero, filter = 'any') {
    const enemies = this.getEnemiesFor(hero.team);
    let best = null;
    let minDist = hero.attackRange + 1.5;

    for (const e of enemies) {
      if (filter === 'tower' && !(e instanceof DefensiveTower)) continue;
      if (filter === 'minion' && !(e instanceof Minion)) continue;

      const d = hero.position.distanceTo(e.position);
      if (d <= minDist) {
        minDist = d;
        best = e;
      }
    }
    return best;
  }

  gameLoop(now) {
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (!this.isGameOver) {
      this.matchTime += delta;

      // Minion Wave Spawning
      this.waveTimer -= delta;
      if (this.waveTimer <= 0) {
        this.waveTimer = this.waveInterval;
        this.spawnMinionWave();
      }

      // 1. Update Map & VFX
      this.vfx.update(delta);

      // 2. Update Heroes
      for (const h of this.heroes) {
        h.update(delta, this.map, this.getEnemiesFor(h.team), this.towers);
      }

      // 3. Update AI Bots
      for (const ai of this.aiControllers) {
        ai.update(delta, this.map, this.heroes, this.minions, this.towers, this.monsters);
      }

      // 4. Update Minions
      for (let i = this.minions.length - 1; i >= 0; i--) {
        const m = this.minions[i];
        if (m.isDead) {
          this.minions.splice(i, 1);
        } else {
          m.update(delta, this.heroes.concat(this.minions), this.towers);
        }
      }

      // 5. Update Defensive Towers
      for (const t of this.towers) {
        t.update(delta, this.minions, this.heroes);
      }

      // 6. Update Jungle Monsters
      for (const mon of this.monsters) {
        mon.update(delta, this.heroes);
      }

      // 7. Check Victory / Defeat Conditions (Crystal Destroyed)
      const blueCrystal = this.towers.find(t => t.team === 'blue' && t.isCrystal);
      const redCrystal = this.towers.find(t => t.team === 'red' && t.isCrystal);

      if (redCrystal && redCrystal.isDead) {
        this.endGame(true);
      } else if (blueCrystal && blueCrystal.isDead) {
        this.endGame(false);
      }

      // 8. Update Camera & UI
      this.renderer.updateCamera(this.playerHero ? this.playerHero.position : null, delta);
      this.ui.update(delta);
    }

    // Render 3D Scene
    this.renderer.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  endGame(isVictory) {
    this.isGameOver = true;
    Sound.playAnnouncer(isVictory ? 'VICTORY' : 'DEFEAT');

    const modal = document.getElementById('game-over-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="game-over-title ${isVictory ? 'victory' : 'defeat'}">
        ${isVictory ? 'VICTORY · 胜利' : 'DEFEAT · 失败'}
      </div>
      <div class="game-over-stats-card">
        <div class="stats-row">
          <span>玩家英雄:</span>
          <span>${this.playerHero.name}</span>
        </div>
        <div class="stats-row">
          <span>最终战绩 (K/D/A):</span>
          <span>${this.playerHero.kills} / ${this.playerHero.deaths} / ${this.playerHero.assists}</span>
        </div>
        <div class="stats-row">
          <span>总经济:</span>
          <span>💰 ${this.playerHero.gold}</span>
        </div>
        <div class="stats-row">
          <span>对局时长:</span>
          <span>${Math.floor(this.matchTime / 60)}分${Math.floor(this.matchTime % 60)}秒</span>
        </div>
        <div class="stats-row">
          <span>比分:</span>
          <span>蓝方 ${this.blueKills} : ${this.redKills} 红方</span>
        </div>
      </div>
      <button class="btn-restart" onclick="location.reload()">再来一局</button>
    `;
  }
}

