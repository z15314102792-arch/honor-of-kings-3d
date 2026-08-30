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
    }
  }

  startRecall() {
    if (this.isDead || this.isChannelingRecall) return;
    this.isChannelingRecall = true;
    this.recallTimer = 7.0; // 7 seconds channel
    Sound.playRecall();
  }

  castFlash(direction) {
    if (this.isDead || this.stunDuration > 0 || this.flashCd > 0) return;
    this.flashCd = 120; // 120s CD
    this.cancelRecall();

    const dir = direction ? direction.clone().normalize() : new THREE.Vector3(0, 0, -1);
    this.position.addScaledVector(dir, 7.0);
    this.group.position.copy(this.position);
    this.vfx.createHitSparks(this.position, 0xffd700, 20);
    Sound.playArthurS1();
  }

  castHeal() {
    if (this.isDead || this.healCd > 0) return;
    this.healCd = 60; // 60s CD
    const healAmount = this.maxHp * 0.15 + 200;
    this.hp = Math.min(this.maxHp, this.hp + healAmount);
    this.vfx.createFloatingText(`+${Math.round(healAmount)}`, this.position, "heal");
    this.vfx.createHitSparks(this.position, 0x10b981, 15);
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
    const homePos = new THREE.Vector3(this.team === 'blue' ? -52 : 52, 0, this.team === 'blue' ? 52 : -52);
    if (this.position.distanceTo(homePos) < 9) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.25 * delta);
      this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.35 * delta);
    }

    // Recall Channeling
    if (this.isChannelingRecall) {
      this.recallTimer -= delta;
      if (this.recallTimer <= 0) {
        this.isChannelingRecall = false;
        this.position.copy(homePos);
        this.group.position.copy(this.position);
        this.vfx.createHitSparks(this.position, 0x38bdf8, 30);
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
    this.group.lookAt(target.position.x, this.position.y, target.position.z);

    if (this.attackRange <= 3.0) {
      // Melee strike
      Sound.playAttackSound();
      target.takeDamage(dmg, this, isCrit ? 'crit' : 'physical');

      // Red buff burn & slow
      if (this.buffs.red_buff > 0 && target.applySlow) {
        target.applySlow(0.25, 2.0);
        target.takeDamage(40 + this.level * 5, this, 'true');
      }
    } else {
      // Ranged projectile
      Sound.playArrowSound();
      this.vfx.createBullet(this.position, target, 0xfacc15, 22, () => {
        target.takeDamage(dmg, this, isCrit ? 'crit' : 'physical');
        if (this.buffs.red_buff > 0 && target.applySlow) {
          target.applySlow(0.25, 2.0);
          target.takeDamage(40 + this.level * 5, this, 'true');
        }
      });
    }
  }
}
