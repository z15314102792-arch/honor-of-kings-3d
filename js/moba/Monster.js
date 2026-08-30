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
