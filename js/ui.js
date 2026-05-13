// =============================================
//  ICHOR — UI rendering
// =============================================

let catFilter  = 'All';
let activeItem = null; // currently selected slot item id

// ---- Tooltip ----
const tooltip = document.createElement('div');
tooltip.className = 'mc-tooltip';
tooltip.innerHTML = '<div class="mc-tooltip-inner" id="tt-inner"></div>';
document.body.appendChild(tooltip);

function showTooltip(item, x, y) {
  const inner = document.getElementById('tt-inner');
  const rc    = rarityColor(item.rarity);
  const rar   = item.rarity[0].toUpperCase() + item.rarity.slice(1);
  const entry = inventory[item.id];
  const enchNames = entry ? entry.enchants.map(eid => getEnchant(eid)?.name).filter(Boolean) : [];

  inner.innerHTML = `
    <div class="tt-name" style="color:${rc}">${item.name}</div>
    <div class="tt-rarity" style="color:${rc}">${rar}</div>
    <div class="tt-divider"></div>
    <div class="tt-value">${fmt(item.value_tainted)} per unit</div>
    <div class="tt-value-sub">${fmtDiamonds(item.value_tainted)}</div>
    ${item.is_enchable ? '<div class="tt-enchantable">✦ Enchantable</div>' : ''}
    ${enchNames.length ? `<div class="tt-enchants">Enchants: ${enchNames.join(', ')}</div>` : ''}
    ${item.note ? `<div class="tt-note">${item.note}</div>` : ''}
  `;

  tooltip.classList.add('visible');
  positionTooltip(x, y);
}

function positionTooltip(x, y) {
  const tw = tooltip.offsetWidth  || 220;
  const th = tooltip.offsetHeight || 100;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  tooltip.style.left = (x + tw + 16 > vw ? x - tw - 8 : x + 16) + 'px';
  tooltip.style.top  = (y + th + 8 > vh ? y - th : y) + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

// ---- Slot image helper ----
function slotImg(item, size = 36) {
  if (item?.texture) {
    return `<img src="${item.texture}" width="${size}" height="${size}" alt="${item.name}" onerror="this.style.display='none'">`;
  }
  // Fallback: colored square with first letter
  const rc = rarityColor(item?.rarity || 'common');
  return `<div style="width:${size}px;height:${size}px;background:#333;border:1px solid ${rc};display:flex;align-items:center;justify-content:center;font-family:var(--font);font-size:${size * 0.5}px;color:${rc}">${(item?.name || '?')[0]}</div>`;
}

// ---- Category filter bar ----
function buildCatFilters() {
  const cats = ['All', ...(itemsData?.categories || [])];
  const bar  = document.getElementById('calc-tabs');
  bar.innerHTML = cats.map(c =>
    `<button class="cat-tab${c === 'All' ? ' active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');

  bar.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      catFilter = btn.dataset.cat;
      refreshGrid();
    });
  });
}

// ---- Main item grid (calculator) ----
function curSearch() {
  return document.getElementById('item-search')?.value || '';
}

function refreshGrid() {
  renderGrid(curSearch(), catFilter);
}

function renderGrid(search = '', cat = 'All') {
  const el = document.getElementById('item-grid');
  if (!itemsData) return;

  let items = itemsData.items;
  if (cat !== 'All') items = items.filter(i => i.category === cat);
  if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  if (!items.length) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No items match your search</div>';
    return;
  }

  el.innerHTML = items.map(item => buildSlot(item)).join('');

  // Attach events
  el.querySelectorAll('.slot').forEach(slot => {
    const id   = slot.dataset.id;
    const item = getItem(id);

    slot.addEventListener('mouseenter', e => showTooltip(item, e.clientX, e.clientY));
    slot.addEventListener('mousemove',  e => positionTooltip(e.clientX, e.clientY));
    slot.addEventListener('mouseleave', hideTooltip);

    slot.addEventListener('click', () => {
      hideTooltip();
      if (!inventory[id]) {
        addItem(id);
      }
      openDetailPanel(id);
    });
  });
}

function buildSlot(item) {
  const entry    = inventory[item.id];
  const inInv    = !!entry && entry.qty > 0;
  const qty      = entry?.qty || 0;
  const enchanted = entry?.enchants?.length > 0;
  const rar      = item.rarity;

  return `<div class="slot r-${rar}${inInv ? ' in-inv' : ''}${enchanted ? ' slot-enchanted' : ''}" data-id="${item.id}">
    ${slotImg(item, 36)}
    ${qty > 1 ? `<span class="slot-qty">${qty}</span>` : ''}
  </div>`;
}

// ---- Item detail panel ----
function openDetailPanel(id) {
  activeItem = id;
  const item  = getItem(id);
  const entry = inventory[id] || { qty: 0, enchants: [] };
  const panel = document.getElementById('detail-panel');
  const rc    = rarityColor(item.rarity);
  const rar   = item.rarity[0].toUpperCase() + item.rarity.slice(1);

  const enchNames = entry.enchants.map(eid => {
    const en = getEnchant(eid);
    return en ? `<span class="enchant-tag" onclick="removeEnchant('${id}','${eid}')" title="Click to remove">${en.name} ✕</span>` : '';
  }).join('');

  const enchSelect = item.is_enchable ? `
    <div class="detail-section-title">Enchantments</div>
    <select class="mc-select" onchange="addEnchant('${id}', this.value); this.value=''">
      <option value="">— Add enchant —</option>
      ${itemsData.enchants.map(en =>
        `<option value="${en.id}">${en.name} (+${en.value_tainted}t)</option>`
      ).join('')}
    </select>
    <div class="enchant-tags-row" id="enchant-tags">${enchNames}</div>
  ` : `<div style="font-family:var(--font);font-size:13px;color:#888;margin-top:4px">Not enchantable</div>`;

  panel.innerHTML = `
    <div class="detail-slot ${entry.enchants?.length ? 'slot-enchanted' : ''}">
      ${slotImg(item, 52)}
    </div>
    <div class="detail-name" style="color:${rc}">${item.name}</div>
    <div class="detail-rarity" style="color:${rc}">${rar}</div>
    <div class="detail-value">${fmt(item.value_tainted)} / unit &nbsp;·&nbsp; ${fmtDiamonds(item.value_tainted)}</div>
    ${item.note ? `<div style="font-family:var(--font);font-size:13px;color:#aaa;text-align:center;margin-top:2px">${item.note}</div>` : ''}

    <div style="margin-top:8px">
      <div class="detail-section-title">Quantity in inventory</div>
      <div class="qty-row">
        <button class="mc-btn small" onclick="changeQty('${id}', -1)">−</button>
        <span class="qty-display" id="detail-qty">${entry.qty}</span>
        <button class="mc-btn small" onclick="changeQty('${id}', 1)">+</button>
      </div>
      ${entry.qty > 0 ? `
        <div style="font-family:var(--font);font-size:14px;color:#aaffaa;text-align:center;margin-top:4px">
          Total: ${fmt(invItemValue(id))}
        </div>
      ` : ''}
    </div>

    <div style="margin-top:8px">${enchSelect}</div>

    ${entry.qty > 0 ? `
      <button class="mc-btn danger small" style="width:100%;margin-top:8px;justify-content:center" onclick="removeItem('${id}')">
        Remove from inventory
      </button>
    ` : ''}
  `;

  panel.style.display = 'flex';
}

// Called after inv changes to refresh detail panel if open
function refreshDetailPanel() {
  if (activeItem && inventory[activeItem]) {
    openDetailPanel(activeItem);
  } else if (activeItem) {
    // Item was removed
    const panel = document.getElementById('detail-panel');
    panel.style.display = 'none';
    activeItem = null;
  }
}

// ---- Offering slots (what you're paying with) ----
function renderOfferingSlots() {
  const el   = document.getElementById('offering-slots');
  const keys = Object.keys(inventory).filter(k => inventory[k].qty > 0);

  if (!keys.length) {
    el.innerHTML = '<div class="empty-state">Add items from the grid above — they appear here as payment</div>';
    return;
  }

  el.innerHTML = keys.map(id => {
    const item = getItem(id);
    if (!item) return '';
    const entry    = inventory[id];
    const enchanted = entry.enchants?.length > 0;
    return `<div class="offering-slot${enchanted ? ' slot-enchanted' : ''}" 
              onclick="removeItem('${id}')" 
              onmouseenter="showTooltip(getItem('${id}'), event.clientX, event.clientY)"
              onmousemove="positionTooltip(event.clientX, event.clientY)"
              onmouseleave="hideTooltip()"
              title="Click to remove">
      ${slotImg(item, 36)}
      ${entry.qty > 1 ? `<span class="slot-qty">${entry.qty}</span>` : ''}
    </div>`;
  }).join('');
}

// ---- Afford panel ----
function renderAfford(tTotal) {
  const el = document.getElementById('afford-body');
  const ct = document.getElementById('afford-ct');
  if (!servicesData || tTotal === 0) {
    el.innerHTML = '<div class="empty-state">Add items to see what commissions you can afford</div>';
    ct.textContent = 'Add items to see results';
    return;
  }

  const svcs = servicesData.services;
  const aff  = svcs.filter(s => !s.quote_required && s.cost_min_tainted <= tTotal);
  ct.textContent = `${aff.length} of ${svcs.length} services affordable`;

  el.innerHTML = `<div class="services-grid">${svcs.map(s => {
    const canMin = tTotal >= s.cost_min_tainted;
    const canMax = !s.quote_required && tTotal >= s.cost_max_tainted;
    const pct    = s.quote_required ? 0 : Math.min(100, Math.round(tTotal / s.cost_min_tainted * 100));
    const cls    = s.quote_required ? 'quote-only' : canMax ? 'can-afford-max' : canMin ? 'can-afford' : 'cannot-afford';
    const pr     = s.quote_required ? 'Quote required'
                 : s.cost_min_tainted === s.cost_max_tainted ? fmt(s.cost_min_tainted)
                 : `${fmt(s.cost_min_tainted)} – ${fmt(s.cost_max_tainted)}`;

    let badge = '';
    if (s.quote_required)   badge = '<span class="svc-badge quote">Quote</span>';
    else if (canMax)        badge = '<span class="svc-badge afford">✔ Affordable</span>';
    else if (s.popular)     badge = '<span class="svc-badge popular">Popular</span>';
    if (s.savings_note)     badge += `<span class="svc-badge saving" style="top:28px">${s.savings_note}</span>`;

    return `<div class="svc-card mc-panel ${cls}">
      ${badge}
      <div class="svc-cat">${s.category}</div>
      <div class="svc-name">${s.name}</div>
      <div class="svc-desc">${s.description}</div>
      <div class="svc-price">${pr}</div>
      <div class="svc-sub">${s.turnaround}</div>
      ${!s.quote_required ? `<div class="afford-bar-wrap"><div class="afford-bar-fill" style="width:${pct}%"></div></div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

// ---- Services page ----
function renderServicesPage(search = '') {
  const el = document.getElementById('svc-grid');
  if (!servicesData) return;
  let svcs = servicesData.services;
  if (search) svcs = svcs.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  el.innerHTML = svcs.map(s => {
    const pr = s.quote_required ? 'Quote required'
             : s.cost_min_tainted === s.cost_max_tainted ? fmt(s.cost_min_tainted)
             : `${fmt(s.cost_min_tainted)} – ${fmt(s.cost_max_tainted)}`;
    let badge = '';
    if (s.quote_required) badge = '<span class="svc-badge quote">Quote</span>';
    else if (s.popular)   badge = '<span class="svc-badge popular">Popular</span>';
    if (s.savings_note)   badge += `<span class="svc-badge saving" style="top:28px">${s.savings_note}</span>`;

    return `<div class="svc-card mc-panel${s.quote_required ? ' quote-only' : ''}">
      ${badge}
      <div class="svc-cat">${s.category}</div>
      <div class="svc-name">${s.name}</div>
      <div class="svc-desc">${s.description}</div>
      <div class="svc-price">${pr}</div>
      <div class="svc-sub">${s.turnaround}</div>
    </div>`;
  }).join('');
}

// ---- Library page ----
let libTab = 'items';

function renderLibraryGrid(search = '') {
  const el = document.getElementById('lib-grid');
  if (!itemsData) return;
  let items = itemsData.items;
  if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  items = [...items].sort((a, b) => rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity));

  document.getElementById('lib-count').textContent = `${items.length} items`;
  el.innerHTML = items.map(item => {
    const rc  = rarityColor(item.rarity);
    const rar = item.rarity[0].toUpperCase() + item.rarity.slice(1);
    return `<div class="slot r-${item.rarity}" style="width:64px;height:64px;cursor:default"
      onmouseenter="showTooltip(getItem('${item.id}'), event.clientX, event.clientY)"
      onmousemove="positionTooltip(event.clientX, event.clientY)"
      onmouseleave="hideTooltip()">
      ${slotImg(item, 48)}
    </div>`;
  }).join('');
}

function renderEnchantTable(search = '') {
  const tbody = document.querySelector('#ench-table tbody');
  if (!itemsData) return;
  let enchs = itemsData.enchants;
  if (search) enchs = enchs.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  enchs = [...enchs].sort((a, b) => rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity));
  tbody.innerHTML = enchs.map(e => {
    const rc  = rarityColor(e.rarity);
    const rar = e.rarity[0].toUpperCase() + e.rarity.slice(1);
    return `<tr>
      <td style="font-weight:500">${e.name}</td>
      <td style="color:#666">${e.category}</td>
      <td style="color:${rc}">${rar}</td>
      <td class="piece-t">${e.value_tainted}t</td>
      <td class="piece-t">${Math.round((e.value_tainted + e.book_bonus) * 10) / 10}t</td>
    </tr>`;
  }).join('');
}

// ---- Reference page ----
function renderRefTable() {
  const tbody = document.querySelector('#ref-table tbody');
  if (!itemsData) return;
  const sorted = [...itemsData.items].sort((a, b) => b.value_tainted - a.value_tainted);
  tbody.innerHTML = sorted.map(i => {
    const rc  = rarityColor(i.rarity);
    return `<tr>
      <td style="display:flex;align-items:center;gap:8px">${slotImg(i, 24)}<span>${i.name}</span></td>
      <td style="color:${rc}">${i.rarity[0].toUpperCase() + i.rarity.slice(1)}</td>
      <td style="color:#666">${i.category}</td>
      <td class="piece-t">${i.value_tainted}t</td>
      <td class="piece-b">${(i.value_tainted / TPB).toFixed(2)}b</td>
    </tr>`;
  }).join('');
}

// ---- Navigation ----
function initNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById('page-' + item.dataset.page).classList.add('active');
    });
  });

  document.getElementById('lib-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.cat-tab');
    if (!tab) return;
    document.querySelectorAll('#lib-tabs .cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    libTab = tab.dataset.tab;
    document.getElementById('lib-items').classList.toggle('hidden', libTab !== 'items');
    document.getElementById('lib-enchants').classList.toggle('hidden', libTab !== 'enchants');
  });

  document.getElementById('lib-search').addEventListener('input', e => {
    renderLibraryGrid(e.target.value);
    renderEnchantTable(e.target.value);
  });

  document.getElementById('svc-search').addEventListener('input', e => {
    renderServicesPage(e.target.value);
  });

  document.getElementById('item-search').addEventListener('input', e => {
    renderGrid(e.target.value, catFilter);
  });

  document.getElementById('clear-inv').addEventListener('click', () => {
    if (confirm('Clear entire inventory?')) clearInventory();
  });
}

// ---- Toast ----
let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast${type ? ' ' + type : ''} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// Patch afterInvChange to also refresh detail panel
const _afterInvChange = afterInvChange;
window.afterInvChange = function() {
  markDirty();
  walletUpdate();
  refreshGrid();
  renderOfferingSlots();
  refreshDetailPanel();
};
