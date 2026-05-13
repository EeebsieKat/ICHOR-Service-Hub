// =============================================
//  ICHOR — Inventory state
// =============================================

// inventory = { itemId: { qty: number, enchants: [enchId, ...] } }
let inventory = {};

function invTotal() {
  let t = 0;
  for (const [id, entry] of Object.entries(inventory)) {
    const item = getItem(id);
    if (!item) continue;
    t += item.value_tainted * entry.qty;
    for (const eid of entry.enchants) {
      const en = getEnchant(eid);
      if (en) t += en.value_tainted;
    }
  }
  return t;
}

function invItemValue(id) {
  const item  = getItem(id);
  const entry = inventory[id];
  if (!item || !entry) return 0;
  let v = item.value_tainted * entry.qty;
  for (const eid of entry.enchants) {
    const en = getEnchant(eid);
    if (en) v += en.value_tainted;
  }
  return v;
}

function addItem(id) {
  if (!inventory[id]) inventory[id] = { qty: 1, enchants: [] };
  else inventory[id].qty++;
  afterInvChange();
}

function removeItem(id) {
  delete inventory[id];
  afterInvChange();
}

function changeQty(id, delta) {
  if (!inventory[id]) return;
  inventory[id].qty = Math.max(0, inventory[id].qty + delta);
  if (inventory[id].qty === 0) delete inventory[id];
  afterInvChange();
}

function addEnchant(itemId, enchId) {
  if (!enchId || !inventory[itemId]) return;
  if (!inventory[itemId].enchants.includes(enchId))
    inventory[itemId].enchants.push(enchId);
  afterInvChange();
}

function removeEnchant(itemId, enchId) {
  if (!inventory[itemId]) return;
  inventory[itemId].enchants = inventory[itemId].enchants.filter(e => e !== enchId);
  afterInvChange();
}

function clearInventory() {
  inventory = {};
  afterInvChange();
}

function afterInvChange() {
  markDirty();
  walletUpdate();
  refreshGrid();
  renderOfferingSlots();
}

function walletUpdate() {
  const t  = invTotal();
  const b  = Math.floor(t / TPB);
  const r  = Math.round(t % TPB * 10) / 10;
  const p  = (t / TPP).toFixed(2);

  // Topbar
  document.getElementById('tw-t').textContent = Math.round(t * 10) / 10 + 't';
  document.getElementById('tw-b').textContent = b + 'b';
  document.getElementById('tw-r').textContent = r + 't';

  // Wallet summary cards
  document.getElementById('ws-t').textContent = Math.round(t * 10) / 10;
  document.getElementById('ws-b').textContent = b;
  document.getElementById('ws-p').textContent = p;

  renderAfford(t);
}
