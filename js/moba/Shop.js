/**
 * Equipment Shop System & Quick Buy
 */
const ITEM_DATABASE = [
  // Physical Attack Items
  { id: 'item_blade', name: '无尽战刃', icon: '🗡️', type: 'phys', price: 2140, stats: { ad: 110, critRate: 0.25, critDamage: 0.5 }, desc: '+110物理攻击, +25%暴击率, 暴击效果+50%' },
  { id: 'item_axe', name: '暗影战斧', icon: '🪓', type: 'phys', price: 2090, stats: { ad: 85, maxHp: 500, cdr: 0.15 }, desc: '+85物理攻击, +500最大生命, +15%冷却缩减' },
  { id: 'item_master', name: '宗师之力', icon: '⚔️', type: 'phys', price: 2100, stats: { ad: 80, critRate: 0.2, maxHp: 400 }, desc: '+80物理攻击, +20%暴击率, 强化普攻' },
  { id: 'item_blood', name: '泣血之刃', icon: '🩸', type: 'phys', price: 1740, stats: { ad: 100, lifesteal: 0.25 }, desc: '+100物理攻击, +25%物理吸血' },
  { id: 'item_doombringer', name: '破军', icon: '🔱', type: 'phys', price: 2950, stats: { ad: 180 }, desc: '+180物理攻击, 目标生命低于50%伤害提高30%' },

  // Magic Items
  { id: 'item_rabadon', name: '博学者之怒', icon: '👑', type: 'magic', price: 2300, stats: { ap: 240 }, desc: '+240法术攻击, 法术强度提升35%' },
  { id: 'item_echo', name: '回响之杖', icon: '🪄', type: 'magic', price: 2100, stats: { ap: 200, moveSpeed: 0.5 }, desc: '+200法术攻击, +7%移速, 技能触发小范围爆炸' },
  { id: 'item_mask', name: '痛苦面具', icon: '🎭', type: 'magic', price: 2040, stats: { ap: 120, maxHp: 800, cdr: 0.05 }, desc: '+120法术攻击, +800生命, 技能附带百分比灼烧' },
  { id: 'item_void', name: '虚无法杖', icon: '🔮', type: 'magic', price: 2110, stats: { ap: 240, maxHp: 300 }, desc: '+240法术攻击, +45%法术穿透' },

  // Defense Items
  { id: 'item_glacial', name: '极寒风暴', icon: '❄️', type: 'def', price: 2100, stats: { armor: 360, cdr: 0.2, maxMana: 500 }, desc: '+360物理防御, +20%冷却缩减, 受到单次高伤减速周围' },
  { id: 'item_ominous', name: '不祥征兆', icon: '🛡️', type: 'def', price: 2180, stats: { armor: 270, maxHp: 1200 }, desc: '+270物理防御, +1200最大生命, 攻击者降低攻速移速' },
  { id: 'item_witch', name: '魔女斗篷', icon: '🧙‍♀️', type: 'def', price: 2080, stats: { magicResist: 300, maxHp: 1000 }, desc: '+300法术防御, +1000最大生命, 获得法术护盾' },
  { id: 'item_overlord', name: '霸者重装', icon: '❤️', type: 'def', price: 2070, stats: { maxHp: 2000 }, desc: '+2000最大生命, 脱战后持续回复最大生命值' },

  // Boots
  { id: 'item_res_boots', name: '抵抗之靴', icon: '👢', type: 'boot', price: 710, stats: { magicResist: 110, moveSpeed: 1.0 }, desc: '+110法术防御, +60移速, +35%韧性' },
  { id: 'item_speed_boots', name: '急速战靴', icon: '🥾', type: 'boot', price: 710, stats: { attackSpeed: 0.25, moveSpeed: 1.0 }, desc: '+25%攻击速度, +60移速' }
];

class ShopManager {
  constructor(hero) {
    this.hero = hero;
    this.currentTab = 'phys';
    this.selectedItem = ITEM_DATABASE[0];
    this.initUI();
  }

  initUI() {
    this.renderShopItems(this.currentTab);
    this.updateQuickBuy();
  }

  renderShopItems(tab) {
    this.currentTab = tab;
    const grid = document.getElementById('shop-items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = ITEM_DATABASE.filter(i => tab === 'all' || i.type === tab);
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = `shop-item-card ${this.selectedItem && this.selectedItem.id === item.id ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-price">💰 ${item.price}</div>
      `;
      card.onclick = () => this.selectItem(item);
      grid.appendChild(card);
    });

    this.updateDetailPane();
  }

  selectItem(item) {
    this.selectedItem = item;
    this.renderShopItems(this.currentTab);
  }

  updateDetailPane() {
    const pane = document.getElementById('shop-item-detail');
    if (!pane || !this.selectedItem) return;

    pane.innerHTML = `
      <div class="detail-content">
        <div class="detail-title">${this.selectedItem.icon} ${this.selectedItem.name}</div>
        <div class="detail-stats">价格: 💰 ${this.selectedItem.price}</div>
        <div class="detail-passive">${this.selectedItem.desc}</div>
      </div>
      <button class="btn-buy-item" id="btn-modal-buy" ${this.hero.gold >= this.selectedItem.price ? '' : 'disabled'}>
        购买 (💰 ${this.selectedItem.price})
      </button>
    `;

    const buyBtn = document.getElementById('btn-modal-buy');
    if (buyBtn) {
      buyBtn.onclick = (e) => { e.preventDefault(); this.buyItem(this.selectedItem); };
      buyBtn.ontouchstart = (e) => { e.preventDefault(); e.stopPropagation(); this.buyItem(this.selectedItem); };
    }
  }

  buyItem(item) {
    if (!item) return;
    if (this.hero.gold < item.price) {
      this.hero.vfx.createFloatingText("金币不足!", this.hero.position, "physical");
      return;
    }
    if (this.hero.inventory.length >= 6) {
      this.hero.vfx.createFloatingText("装备已满 (6件)!", this.hero.position, "physical");
      return;
    }

    this.hero.gold -= item.price;
    this.hero.inventory.push(item);

    // Apply Stats
    if (item.stats.ad) this.hero.ad += item.stats.ad;
    if (item.stats.ap) this.hero.ap += item.stats.ap;
    if (item.stats.armor) this.hero.armor += item.stats.armor;
    if (item.stats.magicResist) this.hero.magicResist += item.stats.magicResist;
    if (item.stats.maxHp) {
      this.hero.maxHp += item.stats.maxHp;
      this.hero.hp += item.stats.maxHp;
    }
    if (item.stats.critRate) this.hero.critRate += item.stats.critRate;
    if (item.stats.critDamage) this.hero.critDamage += item.stats.critDamage;
    if (item.stats.lifesteal) this.hero.lifesteal += item.stats.lifesteal;
    if (item.stats.cdr) this.hero.cdr = Math.min(0.4, this.hero.cdr + item.stats.cdr);
    if (item.stats.moveSpeed) this.hero.moveSpeed += item.stats.moveSpeed;
    if (item.stats.attackSpeed) this.hero.attackSpeed += item.stats.attackSpeed;

    Sound.playGold ? Sound.playGold() : Sound.playTone(880, 'sine', 0.2, 0.3);
    this.hero.vfx.createFloatingText(`+${item.name}`, this.hero.position, "heal");
    this.hero.vfx.createHitSparks(this.hero.position, 0xfacc15, 20);

    this.updateQuickBuy();
    this.updateDetailPane();
  }

  updateQuickBuy() {
    const container = document.getElementById('quick-buy-container');
    if (!container) return;

    // Find affordable items not in inventory
    const unbought = ITEM_DATABASE.filter(i => !this.hero.inventory.some(inv => inv.id === i.id));
    const affordable = unbought.filter(i => this.hero.gold >= i.price);
    const recItem = affordable[0] || unbought[0];

    if (!recItem || this.hero.inventory.length >= 6) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';

    container.innerHTML = `
      <div class="quick-buy-item hud-interactive" id="quick-buy-btn">
        <div class="item-icon">${recItem.icon}</div>
        <div class="quick-buy-info">
          <span class="item-name">${recItem.name}</span>
          <span class="item-price">💰 ${recItem.price}</span>
        </div>
      </div>
      <button id="btn-open-shop" class="hud-interactive">装备商店 🛒</button>
    `;

    const qBtn = document.getElementById('quick-buy-btn');
    if (qBtn) {
      qBtn.onclick = (e) => { e.preventDefault(); this.buyItem(recItem); };
      qBtn.ontouchstart = (e) => { e.preventDefault(); e.stopPropagation(); this.buyItem(recItem); };
    }
    const sBtn = document.getElementById('btn-open-shop');
    if (sBtn) {
      sBtn.onclick = (e) => {
        e.preventDefault();
        const modal = document.getElementById('shop-modal');
        if (modal) modal.style.display = 'flex';
      };
      sBtn.ontouchstart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const modal = document.getElementById('shop-modal');
        if (modal) modal.style.display = 'flex';
      };
    }
  }
}

