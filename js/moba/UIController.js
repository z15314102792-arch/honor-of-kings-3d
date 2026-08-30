/**
 * UI Controller: Mini-map Canvas, Virtual Joystick, Skill Wheels & PC Hotkeys
 */
class UIController {
  constructor(game) {
    this.game = game;
    this.player = null;
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      curX: 0,
      curY: 0,
      radius: 50,
      dir: new THREE.Vector3()
    };

    this.keys = {};
    this.initHUD();
    this.initControls();
  }

  setPlayer(player) {
    this.player = player;
  }

  initHUD() {
    this.minimapCanvas = document.getElementById('minimap-canvas');
    if (this.minimapCanvas) {
      this.minimapCtx = this.minimapCanvas.getContext('2d');
      this.minimapCanvas.width = 140;
      this.minimapCanvas.height = 140;
    }
  }

  initControls() {
    // 1. Virtual Joystick with Multi-Touch tracking
    const joyZone = document.getElementById('joystick-zone');
    const joyThumb = document.getElementById('joystick-thumb');

    let joyTouchId = null;

    if (joyZone && joyThumb) {
      const updateJoystick = (clientX, clientY) => {
        const rect = joyZone.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const dx = clientX - startX;
        const dy = clientY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = rect.width * 0.38;

        const clampedDist = Math.min(dist, maxR);
        const angle = Math.atan2(dy, dx);

        const tx = Math.cos(angle) * clampedDist;
        const ty = Math.sin(angle) * clampedDist;

        joyThumb.style.transform = `translate(${tx}px, ${ty}px)`;

        // In 3D isometric view: X screen -> X world, Y screen -> Z world
        this.joystick.dir.set(Math.cos(angle), 0, Math.sin(angle));
        if (this.player) {
          this.player.velocity.copy(this.joystick.dir);
        }
      };

      const resetJoystick = () => {
        this.joystick.active = false;
        joyTouchId = null;
        joyThumb.style.transform = `translate(0px, 0px)`;
        this.joystick.dir.set(0, 0, 0);
        if (this.player && !this.keys.w && !this.keys.a && !this.keys.s && !this.keys.d) {
          this.player.velocity.set(0, 0, 0);
        }
      };

      // Mouse support
      joyZone.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.joystick.active = true;
        updateJoystick(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => {
        if (this.joystick.active && joyTouchId === null) {
          updateJoystick(e.clientX, e.clientY);
        }
      });
      window.addEventListener('mouseup', () => {
        if (this.joystick.active && joyTouchId === null) {
          resetJoystick();
        }
      });

      // Touch Multi-touch support (independent from right thumb taps)
      joyZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          joyTouchId = t.identifier;
          this.joystick.active = true;
          updateJoystick(t.clientX, t.clientY);
        }
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (!this.joystick.active || joyTouchId === null) return;
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === joyTouchId) {
            updateJoystick(e.touches[i].clientX, e.touches[i].clientY);
            break;
          }
        }
      }, { passive: false });

      window.addEventListener('touchend', (e) => {
        if (!this.joystick.active || joyTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joyTouchId) {
            resetJoystick();
            break;
          }
        }
      });
      window.addEventListener('touchcancel', resetJoystick);
    }

    // 2. Keyboard Controls (WASD + Hotkeys for PC)
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      this.handleKeyboardMovement();

      if (k === '1' || k === 'q') this.triggerSkill(0);
      if (k === '2' || k === 'w' && e.ctrlKey) this.triggerSkill(1);
      if (k === 'e' || k === '2') this.triggerSkill(1);
      if (k === '3' || k === 'r') this.triggerSkill(2);
      if (k === ' ' || k === 'j') this.triggerMainAttack();
      if (k === 'k') this.triggerPushTower();
      if (k === 'l') this.triggerLastHit();
      if (k === 'b') this.triggerRecall();
      if (k === 'd') this.triggerHeal();
      if (k === 'f') this.triggerFlash();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.handleKeyboardMovement();
    });

    // 3. Fast Touch & Click Bindings for All Buttons (Zero latency on mobile)
    const bindBtn = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
      }, { passive: false });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        fn();
      });
    };

    bindBtn('btn-main-attack', () => this.triggerMainAttack());
    bindBtn('btn-push-tower', () => this.triggerPushTower());
    bindBtn('btn-last-hit', () => this.triggerLastHit());
    bindBtn('btn-skill-1', () => this.triggerSkill(0));
    bindBtn('btn-skill-2', () => this.triggerSkill(1));
    bindBtn('btn-skill-3', () => this.triggerSkill(2));
    bindBtn('btn-up-1', () => this.upgradeSkill(0));
    bindBtn('btn-up-2', () => this.upgradeSkill(1));
    bindBtn('btn-up-3', () => this.upgradeSkill(2));
    bindBtn('btn-spell-heal', () => this.triggerHeal());
    bindBtn('btn-spell-flash', () => this.triggerFlash());
    bindBtn('btn-spell-recall', () => this.triggerRecall());
  }

  upgradeSkill(index) {
    if (!this.player || this.player.skillPoints <= 0) return;
    this.player.skillPoints--;
    this.player.skillLevels[index]++;
    this.player.vfx.createFloatingText(`升级技能 ${index + 1}!`, this.player.position, "heal");
    Sound.playLevelUp();
  }

  handleKeyboardMovement() {
    if (!this.player) return;
    const move = new THREE.Vector3();
    if (this.keys['w'] || this.keys['arrowup']) move.z -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) move.z += 1;
    if (this.keys['a'] || this.keys['arrowleft']) move.x -= 1;
    if (this.keys['d'] || this.keys['arrowright']) move.x += 1;

    if (move.lengthSq() > 0) {
      move.normalize();
      this.player.velocity.copy(move);
    } else if (!this.joystick.active) {
      this.player.velocity.set(0, 0, 0);
    }
  }

  triggerMainAttack() {
    if (!this.player || this.player.isDead) return;
    const target = this.game.getBestAttackTarget(this.player, 'any');
    if (target) {
      this.player.performBasicAttack(target);
    }
  }

  triggerPushTower() {
    if (!this.player || this.player.isDead) return;
    const target = this.game.getBestAttackTarget(this.player, 'tower');
    if (target) {
      this.player.performBasicAttack(target);
    }
  }

  triggerLastHit() {
    if (!this.player || this.player.isDead) return;
    const target = this.game.getBestAttackTarget(this.player, 'minion');
    if (target) {
      this.player.performBasicAttack(target);
    }
  }

  triggerSkill(index) {
    if (!this.player || this.player.isDead) return;
    const enemies = this.game.getEnemiesFor(this.player.team);
    const closestHero = enemies.find(e => e instanceof Hero && !e.isDead && this.player.position.distanceTo(e.position) < 14);

    if (index === 0) {
      if (this.player.castSkill1) this.player.castSkill1(this.player.velocity);
    } else if (index === 1) {
      if (this.player instanceof HeroHouyi) {
        const aimPos = closestHero ? closestHero.position : this.player.position.clone().add(new THREE.Vector3(0,0,-8));
        this.player.castSkill2(aimPos);
      } else if (this.player instanceof HeroDaji) {
        if (closestHero) this.player.castSkill2(closestHero);
      } else {
        this.player.castSkill2();
      }
    } else if (index === 2) {
      if (this.player instanceof HeroArthur) {
        if (closestHero) this.player.castSkill3(closestHero);
      } else if (this.player instanceof HeroHouyi) {
        const aimDir = closestHero ? closestHero.position.clone().sub(this.player.position).normalize() : new THREE.Vector3(0,0,-1);
        this.player.castSkill3(aimDir);
      } else if (this.player instanceof HeroDaji) {
        if (closestHero) this.player.castSkill3(closestHero);
      }
    }
  }

  triggerHeal() {
    if (this.player) this.player.castHeal();
  }

  triggerFlash() {
    if (this.player) this.player.castFlash(this.player.velocity);
  }

  triggerRecall() {
    if (this.player) this.player.startRecall();
  }

  update(delta) {
    this.updateHUD();
    this.renderMinimap();
  }

  updateHUD() {
    if (!this.player) return;

    // Timer & KDA
    const timerElem = document.getElementById('match-timer');
    if (timerElem) {
      const elapsed = Math.floor(this.game.matchTime);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      timerElem.innerText = `${m}:${s}`;
    }

    const kdaElem = document.getElementById('player-kda-display');
    if (kdaElem) {
      kdaElem.innerHTML = `<span>⚔️ <b>${this.player.kills}/${this.player.deaths}/${this.player.assists}</b></span> <span>💰 <b>${this.player.gold}</b></span> <span>🗡️ <b>${this.player.cs}</b></span>`;
    }

    // Cooldown Mask Overlays
    for (let i = 0; i < 3; i++) {
      const mask = document.getElementById(`skill-${i+1}-cd`);
      if (mask) {
        if (this.player.skillCds[i] > 0) {
          mask.style.display = 'flex';
          mask.innerText = Math.ceil(this.player.skillCds[i]);
        } else {
          mask.style.display = 'none';
        }
      }

      // Upgrade (+) button visibility
      const upBtn = document.getElementById(`btn-up-${i+1}`);
      if (upBtn) {
        upBtn.style.display = (this.player.skillPoints > 0) ? 'flex' : 'none';
      }
    }

    // Sub Spells CD
    const healCdMask = document.getElementById('heal-cd-mask');
    if (healCdMask) {
      if (this.player.healCd > 0) {
        healCdMask.style.display = 'flex';
        healCdMask.innerText = Math.ceil(this.player.healCd);
      } else healCdMask.style.display = 'none';
    }

    const flashCdMask = document.getElementById('flash-cd-mask');
    if (flashCdMask) {
      if (this.player.flashCd > 0) {
        flashCdMask.style.display = 'flex';
        flashCdMask.innerText = Math.ceil(this.player.flashCd);
      } else flashCdMask.style.display = 'none';
    }

    // Channeling Bar (Recall)
    const channelBarContainer = document.getElementById('channeling-bar-container');
    const channelBar = document.getElementById('channeling-bar');
    if (channelBarContainer && channelBar) {
      if (this.player.isChannelingRecall) {
        channelBarContainer.style.display = 'flex';
        const pct = ((7.0 - this.player.recallTimer) / 7.0) * 100;
        channelBar.style.width = `${pct}%`;
      } else {
        channelBarContainer.style.display = 'none';
      }
    }
  }

  renderMinimap() {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = 140, h = 140;
    const mapSize = 160;

    ctx.clearRect(0, 0, w, h);

    // Map background
    ctx.fillStyle = '#112218';
    ctx.fillRect(0, 0, w, h);

    // River
    ctx.strokeStyle = '#0f4c81';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.stroke();

    // Mid Lane
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();

    const worldToMap = (pos) => {
      const mx = ((pos.x + mapSize / 2) / mapSize) * w;
      const my = ((pos.z + mapSize / 2) / mapSize) * h;
      return { x: mx, y: my };
    };

    // 1. Draw Towers
    for (const t of this.game.towers) {
      if (t.isDead) continue;
      const mp = worldToMap(t.position);
      ctx.fillStyle = t.team === 'blue' ? '#3b82f6' : '#ef4444';
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, t.isCrystal ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Jungle Monsters
    for (const m of this.game.monsters) {
      if (m.isDead) continue;
      const mp = worldToMap(m.position);
      ctx.fillStyle = m.type.includes('buff') ? '#fbbf24' : '#a855f7';
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw Minions
    for (const minion of this.game.minions) {
      if (minion.isDead) continue;
      const mp = worldToMap(minion.position);
      ctx.fillStyle = minion.team === 'blue' ? '#60a5fa' : '#f87171';
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Heroes
    for (const hero of this.game.heroes) {
      if (hero.isDead) continue;
      // Stealth check on minimap: Hide enemy if in bush
      if (hero.inBush && hero.team !== this.player.team) continue;

      const mp = worldToMap(hero.position);
      ctx.fillStyle = hero.team === 'blue' ? '#3b82f6' : '#ef4444';
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, hero.isPlayer ? 5.5 : 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = hero.isPlayer ? 2 : 1;
      ctx.stroke();
    }
  }

  showAnnouncement(title) {
    const container = document.getElementById('kill-broadcast-container');
    if (!container) return;

    const banner = document.createElement('div');
    banner.className = 'kill-banner';
    banner.innerText = title;
    container.appendChild(banner);

    setTimeout(() => {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 2600);
  }
}
