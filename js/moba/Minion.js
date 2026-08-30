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
