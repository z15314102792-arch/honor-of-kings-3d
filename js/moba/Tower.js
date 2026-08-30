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
