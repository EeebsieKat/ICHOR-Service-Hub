// =============================================
//  ICHOR — Data loading
// =============================================

const TPB = 9;   // tainted per blemished
const BPP = 9;   // blemished per pure
const TPP = 81;  // tainted per pure

let itemsData    = null;
let servicesData = null;

const rarityOrder = ['common','uncommon','rare','epic','unique','legendary'];

function rarityColor(r) {
  return {
    common:    '#ffffff',
    uncommon:  '#55ff55',
    rare:      '#5555ff',
    epic:      '#ff55ff',
    unique:    '#ffaa00',
    legendary: '#ffff55',
  }[r] || '#ffffff';
}

function fmt(t) {
  t = Math.round(t * 100) / 100;
  if (t >= TPP) {
    const p   = Math.floor(t / TPP);
    const rem = t % TPP;
    const b   = Math.floor(rem / TPB);
    const tr  = Math.round(rem % TPB * 10) / 10;
    return `${p}p${b ? ' ' + b + 'b' : ''}${tr ? ' ' + tr + 't' : ''}`;
  }
  if (t >= TPB) {
    const b   = Math.floor(t / TPB);
    const rem = Math.round(t % TPB * 10) / 10;
    return rem ? `${b}b + ${rem}t` : `${b}b`;
  }
  return `${Math.round(t * 10) / 10}t`;
}

function fmtDiamonds(t) {
  return `${Math.round(t * 3 * 10) / 10} ◆`;
}

async function loadData() {
  const [ir, sr] = await Promise.all([
    fetch('./data/items.json'),
    fetch('./data/services.json'),
  ]);
  itemsData    = await ir.json();
  servicesData = await sr.json();
}

function getItem(id) {
  return itemsData?.items.find(i => i.id === id);
}

function getEnchant(id) {
  return itemsData?.enchants.find(e => e.id === id);
}

function itemTexturePath(item) {
  return item?.texture || null;
}
