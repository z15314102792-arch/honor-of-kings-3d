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
