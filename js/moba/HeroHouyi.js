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
