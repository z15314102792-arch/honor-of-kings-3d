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
