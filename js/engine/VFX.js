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
