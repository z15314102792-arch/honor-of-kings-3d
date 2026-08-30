/**
 * Main MOBA Game Engine & Match Loop Orchestrator
 */
class MobaGame {
  constructor() {
    window.gameInstance = this;
    this.canvas = document.getElementById('webgl-canvas');
    this.renderer = new GameRenderer(this.canvas);
    this.vfx = new VFXManager(this.renderer.scene, this.renderer.camera);
    this.map = new MobaMap(this.renderer.scene);

    this.heroes = [];
    this.minions = [];
    this.towers = [];
    this.monsters = [];
    this.aiControllers = [];

    this.playerHero = null;
    this.shop = null;
    this.ui = new UIController(this);

    this.matchTime = 0;
    this.waveTimer = 5.0;
    this.waveInterval = 28.0;
    this.blueKills = 0;
    this.redKills = 0;
    this.isGameOver = false;

    this.initTowers();
    this.initJungleMonsters();
  }

  initTowers() {
    // Blue Towers
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'blue', 'outer', new THREE.Vector3(-18, 0, 18)));
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'blue', 'inner', new THREE.Vector3(-32, 0, 32)));
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'blue', 'crystal', new THREE.Vector3(-48, 0, 48)));

    // Red Towers
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'red', 'outer', new THREE.Vector3(18, 0, -18)));
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'red', 'inner', new THREE.Vector3(32, 0, -32)));
    this.towers.push(new DefensiveTower(this.renderer.scene, this.vfx, 'red', 'crystal', new THREE.Vector3(48, 0, -48)));
  }

  initJungleMonsters() {
    this.monsters.push(new JungleMonster(this.renderer.scene, this.vfx, 'blue_buff', new THREE.Vector3(-28, 0, 10)));
    this.monsters.push(new JungleMonster(this.renderer.scene, this.vfx, 'red_buff', new THREE.Vector3(10, 0, 28)));
    this.monsters.push(new JungleMonster(this.renderer.scene, this.vfx, 'blue_buff', new THREE.Vector3(-10, 0, -28)));
    this.monsters.push(new JungleMonster(this.renderer.scene, this.vfx, 'red_buff', new THREE.Vector3(28, 0, -10)));
  }

  startMatch(selectedHeroType) {
    // 1. Create Player Hero
    if (selectedHeroType === 'arthur') {
      this.playerHero = new HeroArthur(this.renderer.scene, this.vfx, 'blue', true);
    } else if (selectedHeroType === 'houyi') {
      this.playerHero = new HeroHouyi(this.renderer.scene, this.vfx, 'blue', true);
    } else {
      this.playerHero = new HeroDaji(this.renderer.scene, this.vfx, 'blue', true);
    }
    this.heroes.push(this.playerHero);

    // 2. Create Allied Bot Heroes (Blue Team)
    if (selectedHeroType !== 'houyi') {
      const allyHouyi = new HeroHouyi(this.renderer.scene, this.vfx, 'blue', false);
      this.heroes.push(allyHouyi);
      this.aiControllers.push(new AIController(allyHouyi));
    } else {
      const allyArthur = new HeroArthur(this.renderer.scene, this.vfx, 'blue', false);
      this.heroes.push(allyArthur);
      this.aiControllers.push(new AIController(allyArthur));
    }

    const allyDaji = new HeroDaji(this.renderer.scene, this.vfx, 'blue', false);
    this.heroes.push(allyDaji);
    this.aiControllers.push(new AIController(allyDaji));

    // 3. Create Enemy Bot Heroes (Red Team)
    const enemyArthur = new HeroArthur(this.renderer.scene, this.vfx, 'red', false);
    const enemyHouyi = new HeroHouyi(this.renderer.scene, this.vfx, 'red', false);
    const enemyDaji = new HeroDaji(this.renderer.scene, this.vfx, 'red', false);

    this.heroes.push(enemyArthur, enemyHouyi, enemyDaji);
    this.aiControllers.push(new AIController(enemyArthur), new AIController(enemyHouyi), new AIController(enemyDaji));

    // Setup Shop & UI
    this.shop = new ShopManager(this.playerHero);
    this.ui.setPlayer(this.playerHero);

    // Play welcome announcer
    Sound.init();
    Sound.playTone(520, 'triangle', 0.5, 0.4);

    // Start Game Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  spawnMinionWave() {
    // Blue Minions
    this.minions.push(new Minion(this.renderer.scene, this.vfx, 'blue', 'melee', this.map.waypoints.blueMid));
    this.minions.push(new Minion(this.renderer.scene, this.vfx, 'blue', 'caster', this.map.waypoints.blueMid));
    if (this.matchTime > 120) {
      this.minions.push(new Minion(this.renderer.scene, this.vfx, 'blue', 'cannon', this.map.waypoints.blueMid));
    }

    // Red Minions
    this.minions.push(new Minion(this.renderer.scene, this.vfx, 'red', 'melee', this.map.waypoints.redMid));
    this.minions.push(new Minion(this.renderer.scene, this.vfx, 'red', 'caster', this.map.waypoints.redMid));
    if (this.matchTime > 120) {
      this.minions.push(new Minion(this.renderer.scene, this.vfx, 'red', 'cannon', this.map.waypoints.redMid));
    }
  }

  handleHeroKill(killer, victim) {
    if (killer.team === 'blue') {
      this.blueKills++;
      document.getElementById('blue-score').innerText = this.blueKills;
    } else {
      this.redKills++;
      document.getElementById('red-score').innerText = this.redKills;
    }

    let title = `${killer.name} 击杀了 ${victim.name}!`;
    if (killer.kills === 1 && this.blueKills + this.redKills === 1) {
      title = "FIRST BLOOD! 第一滴血!";
      Sound.playAnnouncer('FIRST_BLOOD');
    } else if (killer.kills === 2) {
      title = "DOUBLE KILL! 二连击破!";
      Sound.playAnnouncer('DOUBLE_KILL');
    } else if (killer.kills >= 3) {
      title = "TRIPLE KILL! 三连决胜!";
      Sound.playAnnouncer('TRIPLE_KILL');
    }

    this.ui.showAnnouncement(title);
  }

  getEnemiesFor(team) {
    const enemies = [];
    for (const h of this.heroes) {
      if (h.team !== team && !h.isDead) enemies.push(h);
    }
    for (const m of this.minions) {
      if (m.team !== team && !m.isDead) enemies.push(m);
    }
    for (const t of this.towers) {
      if (t.team !== team && !t.isDead) enemies.push(t);
    }
    for (const mon of this.monsters) {
      if (!mon.isDead) enemies.push(mon);
    }
    return enemies;
  }

  getBestAttackTarget(hero, filter = 'any') {
    const enemies = this.getEnemiesFor(hero.team);
    let best = null;
    let minDist = hero.attackRange + 1.5;

    for (const e of enemies) {
      if (filter === 'tower' && !(e instanceof DefensiveTower)) continue;
      if (filter === 'minion' && !(e instanceof Minion)) continue;

      const d = hero.position.distanceTo(e.position);
      if (d <= minDist) {
        minDist = d;
        best = e;
      }
    }
    return best;
  }

  gameLoop(now) {
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (!this.isGameOver) {
      this.matchTime += delta;

      // Minion Wave Spawning
      this.waveTimer -= delta;
      if (this.waveTimer <= 0) {
        this.waveTimer = this.waveInterval;
        this.spawnMinionWave();
      }

      // 1. Update Map & VFX
      this.vfx.update(delta);

      // 2. Update Heroes
      for (const h of this.heroes) {
        h.update(delta, this.map, this.getEnemiesFor(h.team), this.towers);
      }

      // 3. Update AI Bots
      for (const ai of this.aiControllers) {
        ai.update(delta, this.map, this.heroes, this.minions, this.towers, this.monsters);
      }

      // 4. Update Minions
      for (let i = this.minions.length - 1; i >= 0; i--) {
        const m = this.minions[i];
        if (m.isDead) {
          this.minions.splice(i, 1);
        } else {
          m.update(delta, this.heroes.concat(this.minions), this.towers);
        }
      }

      // 5. Update Defensive Towers
      for (const t of this.towers) {
        t.update(delta, this.minions, this.heroes);
      }

      // 6. Update Jungle Monsters
      for (const mon of this.monsters) {
        mon.update(delta, this.heroes);
      }

      // 7. Check Victory / Defeat Conditions (Crystal Destroyed)
      const blueCrystal = this.towers.find(t => t.team === 'blue' && t.isCrystal);
      const redCrystal = this.towers.find(t => t.team === 'red' && t.isCrystal);

      if (redCrystal && redCrystal.isDead) {
        this.endGame(true);
      } else if (blueCrystal && blueCrystal.isDead) {
        this.endGame(false);
      }

      // 8. Update Camera & UI
      this.renderer.updateCamera(this.playerHero ? this.playerHero.position : null, delta);
      this.ui.update(delta);
    }

    // Render 3D Scene
    this.renderer.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  endGame(isVictory) {
    this.isGameOver = true;
    Sound.playAnnouncer(isVictory ? 'VICTORY' : 'DEFEAT');

    const modal = document.getElementById('game-over-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="game-over-title ${isVictory ? 'victory' : 'defeat'}">
        ${isVictory ? 'VICTORY · 胜利' : 'DEFEAT · 失败'}
      </div>
      <div class="game-over-stats-card">
        <div class="stats-row">
          <span>玩家英雄:</span>
          <span>${this.playerHero.name}</span>
        </div>
        <div class="stats-row">
          <span>最终战绩 (K/D/A):</span>
          <span>${this.playerHero.kills} / ${this.playerHero.deaths} / ${this.playerHero.assists}</span>
        </div>
        <div class="stats-row">
          <span>总经济:</span>
          <span>💰 ${this.playerHero.gold}</span>
        </div>
        <div class="stats-row">
          <span>对局时长:</span>
          <span>${Math.floor(this.matchTime / 60)}分${Math.floor(this.matchTime % 60)}秒</span>
        </div>
        <div class="stats-row">
          <span>比分:</span>
          <span>蓝方 ${this.blueKills} : ${this.redKills} 红方</span>
        </div>
      </div>
      <button class="btn-restart" onclick="location.reload()">再来一局</button>
    `;
  }
}
