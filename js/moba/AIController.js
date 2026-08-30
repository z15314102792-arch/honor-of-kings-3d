/**
 * Smart Bot Behavior Tree AI for Allied and Enemy Bots
 */
class AIController {
  constructor(hero) {
    this.hero = hero;
    this.decisionTimer = 0;
    this.decisionInterval = 0.15; // Decisions every 150ms
    this.state = 'laning'; // 'laning', 'combat', 'retreat', 'recall'
  }

  update(delta, map, allHeroes, minions, towers, monsters) {
    if (this.hero.isDead) return;

    this.decisionTimer -= delta;
    if (this.decisionTimer > 0) return;
    this.decisionTimer = this.decisionInterval;

    const enemies = allHeroes.filter(h => h.team !== this.hero.team && !h.isDead);
    const allies = allHeroes.filter(h => h.team === this.hero.team && !h.isDead);
    const enemyTowers = towers.filter(t => t.team !== this.hero.team && !t.isDead);
    const friendlyTowers = towers.filter(t => t.team === this.hero.team && !t.isDead);

    // 1. Health Evaluation (Retreat & Recall)
    if (this.hero.hp / this.hero.maxHp < 0.22) {
      this.state = 'retreat';
    } else if (this.state === 'retreat' && this.hero.hp / this.hero.maxHp > 0.85) {
      this.state = 'laning';
    }

    if (this.state === 'retreat') {
      this.handleRetreat(friendlyTowers);
      return;
    }

    // 2. Combat Target Acquisition (Prioritize low HP hero)
    let bestTarget = null;
    let lowestHp = Infinity;

    for (const e of enemies) {
      const d = this.hero.position.distanceTo(e.position);
      if (d < 16) {
        if (e.hp < lowestHp) {
          lowestHp = e.hp;
          bestTarget = e;
        }
      }
    }

    if (bestTarget) {
      this.state = 'combat';
      this.handleCombat(bestTarget, enemyTowers);
    } else {
      this.state = 'laning';
      this.handleLaning(minions, enemyTowers);
    }
  }

  handleCombat(target, enemyTowers) {
    const dist = this.hero.position.distanceTo(target.position);

    // Check if target is deep under enemy tower
    let underDangerousTower = false;
    for (const t of enemyTowers) {
      if (t.position.distanceTo(target.position) < t.attackRange && target.hp > 400) {
        underDangerousTower = true;
        break;
      }
    }

    if (underDangerousTower && this.hero.hp / this.hero.maxHp < 0.6) {
      // Don't dive tower, back off
      const backDir = this.hero.position.clone().sub(target.position).normalize();
      this.hero.velocity.copy(backDir);
      return;
    }

    // Move towards attack range
    if (dist > this.hero.attackRange) {
      const moveDir = target.position.clone().sub(this.hero.position).normalize();
      this.hero.velocity.copy(moveDir);
    } else {
      this.hero.velocity.set(0, 0, 0);
      this.hero.performBasicAttack(target);
    }

    // Smart Skill Combos
    if (this.hero instanceof HeroArthur) {
      // Arthur: S1 Speed/Silence Leap -> S2 Spin -> S3 Execute
      if (dist < 10 && this.hero.skillCds[0] <= 0) {
        this.hero.castSkill1();
      }
      if (dist < 4.5 && this.hero.skillCds[1] <= 0) {
        this.hero.castSkill2();
      }
      if (dist < 8.0 && target.hp / target.maxHp < 0.45 && this.hero.skillCds[2] <= 0) {
        this.hero.castSkill3(target);
      }
    } else if (this.hero instanceof HeroHouyi) {
      // Houyi: S2 Solar Slow -> S1 Multi Shot -> S3 Ult Snipe
      if (dist < 12 && this.hero.skillCds[1] <= 0) {
        this.hero.castSkill2(target.position);
      }
      if (dist <= this.hero.attackRange && this.hero.skillCds[0] <= 0) {
        this.hero.castSkill1();
      }
      if (dist > 8 && this.hero.skillCds[2] <= 0) {
        const aimDir = target.position.clone().sub(this.hero.position).normalize();
        this.hero.castSkill3(aimDir);
      }
    } else if (this.hero instanceof HeroDaji) {
      // Daji: S2 Charm Stun -> S1 Shockwave -> S3 Fox fire burst
      if (dist < 9 && this.hero.skillCds[1] <= 0) {
        this.hero.castSkill2(target);
      }
      if (dist < 11 && this.hero.skillCds[0] <= 0) {
        const aimDir = target.position.clone().sub(this.hero.position).normalize();
        this.hero.castSkill1(aimDir);
      }
      if (dist < 8.5 && this.hero.skillCds[2] <= 0) {
        this.hero.castSkill3(target);
      }
    }
  }

  handleLaning(minions, enemyTowers) {
    // Find closest enemy minion
    let targetMinion = null;
    let minDist = Infinity;

    for (const m of minions) {
      if (!m.isDead && m.team !== this.hero.team) {
        const d = this.hero.position.distanceTo(m.position);
        if (d < minDist) {
          minDist = d;
          targetMinion = m;
        }
      }
    }

    if (targetMinion) {
      const dist = this.hero.position.distanceTo(targetMinion.position);
      if (dist > this.hero.attackRange) {
        const dir = targetMinion.position.clone().sub(this.hero.position).normalize();
        this.hero.velocity.copy(dir);
      } else {
        this.hero.velocity.set(0, 0, 0);
        this.hero.performBasicAttack(targetMinion);
      }
    } else {
      // Push towards enemy base
      const enemyBasePos = new THREE.Vector3(
        this.hero.team === 'blue' ? 45 : -45,
        0,
        this.hero.team === 'blue' ? -45 : 45
      );
      const dir = enemyBasePos.clone().sub(this.hero.position).normalize();
      this.hero.velocity.copy(dir);
    }
  }

  handleRetreat(friendlyTowers) {
    const homePos = new THREE.Vector3(
      this.hero.team === 'blue' ? -52 : 52,
      0,
      this.hero.team === 'blue' ? 52 : -52
    );

    // If near friendly fountain, stay to heal
    if (this.hero.position.distanceTo(homePos) < 8) {
      this.hero.velocity.set(0, 0, 0);
      return;
    }

    // Run back to base
    const dir = homePos.clone().sub(this.hero.position).normalize();
    this.hero.velocity.copy(dir);
  }
}
