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
    // Golden Heavy Knight Armor
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.8,
      roughness: 0.25
    });
    const blueClothMat = new THREE.MeshStandardMaterial({
      color: this.team === 'blue' ? 0x1e3a8a : 0x991b1b,
      roughness: 0.6
    });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.4, 0.9);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.position.y = 1.6;
    torso.castShadow = true;
    this.group.add(torso);

    // Helmet & Head
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const head = new THREE.Mesh(headGeo, armorMat);
    head.position.y = 2.7;
    head.castShadow = true;
    this.group.add(head);

    // Cape
    const capeGeo = new THREE.BoxGeometry(1.1, 1.8, 0.1);
    const cape = new THREE.Mesh(capeGeo, blueClothMat);
    cape.position.set(0, 1.4, -0.5);
    cape.rotation.x = 0.1;
    this.group.add(cape);

    // Holy Broadsword
    const swordGeo = new THREE.BoxGeometry(0.2, 2.2, 0.5);
    const swordMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      metalness: 0.9,
      roughness: 0.1
    });
    this.swordMesh = new THREE.Mesh(swordGeo, swordMat);
    this.swordMesh.position.set(0.8, 1.6, 0.4);
    this.swordMesh.rotation.x = Math.PI / 4;
    this.group.add(this.swordMesh);

    // Heavy Shield
    const shieldGeo = new THREE.BoxGeometry(0.25, 1.6, 1.1);
    const shield = new THREE.Mesh(shieldGeo, armorMat);
    shield.position.set(-0.8, 1.5, 0.3);
    this.group.add(shield);
  }

  // S1: 誓约之盾
  castSkill1() {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[0] > 0) return;
    this.skillCds[0] = this.skillMaxCds[0] * (1 - this.cdr);
    this.s1Active = true;
    this.s1Timer = 3.5;
    this.moveSpeed = 9.5; // +35% Move Speed boost

    Sound.playArthurS1();
    this.vfx.createFloatingText("誓约之盾!", this.position, "physical");
    this.vfx.createHitSparks(this.position, 0xffd700, 15);
  }

  // S2: 回旋打击
  castSkill2() {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[1] > 0) return;
    this.skillCds[1] = this.skillMaxCds[1] * (1 - this.cdr);
    this.s2Active = true;
    this.s2Timer = 5.0;

    if (!this.s2ShieldGroup) {
      this.s2ShieldGroup = this.vfx.createArthurShields(this);
    }
    Sound.playArthurS2();
  }

  // S3: 圣剑裁决 (Ultimate Ground Slam)
  castSkill3(targetHero) {
    if (this.isDead || this.silenceDuration > 0 || this.skillCds[2] > 0 || !targetHero) return;
    this.skillCds[2] = this.skillMaxCds[2] * (1 - this.cdr);

    Sound.playArthurS3();
    this.applyKnockup(0.6); // Arthur leap airtime

    // Leap onto target position
    setTimeout(() => {
      this.position.copy(targetHero.position);
      this.group.position.copy(this.position);

      // Deal 16% Max HP Magic Damage + 0.8s Knockup
      const ultDmg = targetHero.maxHp * 0.16 + 350 + this.ad * 0.5;
      targetHero.takeDamage(ultDmg, this, 'magic');
      targetHero.applyKnockup(0.8);

      this.vfx.createArthurUltDecal(this.position);
      this.vfx.createHitSparks(this.position, 0xf59e0b, 35);
    }, 300);
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
