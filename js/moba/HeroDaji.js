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
      roughness: 0.4
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.7
    });

    // Body
    const bodyGeo = new THREE.ConeGeometry(0.5, 1.4, 8);
    const body = new THREE.Mesh(bodyGeo, pinkMat);
    body.position.y = 1.4;
    body.castShadow = true;
    this.group.add(body);

    // Fox Ears
    for (let i = -1; i <= 1; i += 2) {
      const earGeo = new THREE.ConeGeometry(0.2, 0.6, 4);
      const ear = new THREE.Mesh(earGeo, pinkMat);
      ear.position.set(i * 0.35, 2.5, 0);
      ear.rotation.z = -i * 0.3;
      this.group.add(ear);
    }

    // Fox Tail
    const tailGeo = new THREE.CylinderGeometry(0.1, 0.4, 1.6, 8);
    const tail = new THREE.Mesh(tailGeo, pinkMat);
    tail.position.set(0, 1.1, -0.6);
    tail.rotation.x = -Math.PI / 4;
    this.group.add(tail);

    // Floating Magic Fox Orb
    const orbGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xff1493 });
    this.orbMesh = new THREE.Mesh(orbGeo, orbMat);
    this.orbMesh.position.set(0.6, 1.8, 0.5);
    this.group.add(this.orbMesh);
  }

  // S1: 灵魂冲击 (Soul Fox Shockwave)
  castSkill1(direction) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[0] > 0) return;
    this.skillCds[0] = this.skillMaxCds[0] * (1 - this.cdr);

    const dir = direction ? direction.clone().normalize() : new THREE.Vector3(0, 0, -1);
    Sound.playDajiS1();

    // Linear projectile wave
    const wavePos = this.position.clone();
    this.vfx.createBullet(wavePos, { position: wavePos.clone().addScaledVector(dir, 12) }, 0xf472b6, 20, () => {});

    // Linear AoE Damage
    setTimeout(() => {
      if (window.gameInstance) {
        const enemies = window.gameInstance.getEnemiesFor(this.team);
        for (const e of enemies) {
          if (!e.isDead && this.position.distanceTo(e.position) <= 12) {
            e.takeDamage(480 + this.ap * 1.1, this, 'magic');
          }
        }
      }
    }, 150);
  }

  // S2: 偶像魅力 (Homing Heart Charm Stun)
  castSkill2(targetHero) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[1] > 0 || !targetHero) return;
    this.skillCds[1] = this.skillMaxCds[1] * (1 - this.cdr);

    Sound.playDajiS2();
    this.vfx.createDajiHeartProjectile(this.position, targetHero, () => {
      targetHero.takeDamage(260 + this.ap * 0.6, this, 'magic');
      targetHero.applyStun(1.5); // 1.5s Stun charm!
      this.vfx.createHitSparks(targetHero.position, 0xff1493, 20);
    });
  }

  // S3: 女王崇拜 (5 Fox Fire Homing Burst)
  castSkill3(targetHero) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[2] > 0 || !targetHero) return;
    this.skillCds[2] = this.skillMaxCds[2] * (1 - this.cdr);

    Sound.playDajiS3();
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (!this.isDead && targetHero && !targetHero.isDead) {
          this.vfx.createDajiFoxOrb(this.position, targetHero, () => {
            targetHero.takeDamage(280 + this.ap * 0.6, this, 'magic');
          });
        }
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
