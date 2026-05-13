// =============================================
//  ICHOR — Vault (Supabase)
// =============================================

const SB_URL  = 'https://nclmtsekyqfwbdgfygpx.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbG10c2VreXFmd2JkZ2Z5Z3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTI5MTMsImV4cCI6MjA5NDEyODkxM30.mbhwrTu1ll0ZgMCeNHwJ7ZLhwZ18fCd618hJiiAsOWo';

let vaultUser = null;
let vaultDirty = false;

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey': SB_ANON,
      'Authorization': `Bearer ${SB_ANON}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

async function hashKey(key) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function markDirty() {
  vaultDirty = true;
  const el = document.getElementById('vbar-status');
  if (el) el.textContent = 'Unsaved changes';
}

function openModal() {
  document.getElementById('vault-modal').classList.add('open');
  setTimeout(() => document.getElementById('l-user')?.focus(), 50);
}

function closeModal() {
  document.getElementById('vault-modal').classList.remove('open');
  document.getElementById('l-err').textContent  = '';
  document.getElementById('r-err').textContent  = '';
}

async function loginVault() {
  const user = document.getElementById('l-user').value.trim();
  const key  = document.getElementById('l-key').value;
  const err  = document.getElementById('l-err');
  const btn  = document.getElementById('l-btn');
  if (!user || !key) { err.textContent = 'Fill in both fields.'; return; }
  btn.disabled = true; btn.textContent = 'Loading...';
  try {
    const h = await hashKey(key);
    const { ok, data } = await sbFetch(
      `vaults?username=eq.${encodeURIComponent(user)}&select=username,key_hash,inventory`
    );
    if (!ok || !data?.length) { err.textContent = 'No vault found for that username.'; return; }
    if (data[0].key_hash !== h) { err.textContent = 'Wrong secret key.'; return; }
    setVaultUser(user, data[0].inventory || {});
    closeModal();
    toast('Vault loaded! Welcome back, ' + user, 'success');
  } catch { err.textContent = 'Connection error. Try again.'; }
  finally { btn.disabled = false; btn.textContent = 'Load vault'; }
}

async function registerVault() {
  const user  = document.getElementById('r-user').value.trim();
  const key   = document.getElementById('r-key').value;
  const key2  = document.getElementById('r-key2').value;
  const err   = document.getElementById('r-err');
  const btn   = document.getElementById('r-btn');
  if (!user || !key)  { err.textContent = 'Fill in all fields.'; return; }
  if (key !== key2)   { err.textContent = "Keys don't match."; return; }
  if (key.length < 4) { err.textContent = 'Key must be 4+ characters.'; return; }
  btn.disabled = true; btn.textContent = 'Creating...';
  try {
    const h = await hashKey(key);
    const { ok, status, data } = await sbFetch('vaults', {
      method: 'POST',
      body: JSON.stringify({ username: user, key_hash: h, inventory: {} }),
    });
    if (!ok) {
      if (status === 409 || JSON.stringify(data).includes('unique')) {
        err.textContent = 'Username already taken.'; return;
      }
      err.textContent = 'Failed to create vault.'; return;
    }
    setVaultUser(user, {});
    closeModal();
    toast('Vault created! Welcome, ' + user, 'success');
  } catch { err.textContent = 'Connection error. Try again.'; }
  finally { btn.disabled = false; btn.textContent = 'Create vault'; }
}

function setVaultUser(user, savedInv) {
  vaultUser  = user;
  inventory  = savedInv;
  vaultDirty = false;

  // Update topbar
  document.getElementById('v-dot').classList.add('on');
  document.getElementById('v-label').textContent = user;
  document.getElementById('vault-btn').classList.add('vault-btn-active');

  // Show vault bar
  document.getElementById('vbar-panel').style.display = '';
  document.getElementById('vbar-name').textContent   = user + "'s vault";
  document.getElementById('vbar-status').textContent = 'Vault loaded';

  refreshGrid();
  walletUpdate();
}

async function saveVault() {
  if (!vaultUser) return;
  const btn = document.getElementById('vsave-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const { ok } = await sbFetch(
      `vaults?username=eq.${encodeURIComponent(vaultUser)}`,
      { method: 'PATCH', body: JSON.stringify({ inventory, updated_at: new Date().toISOString() }) }
    );
    if (!ok) { toast('Save failed.', 'error'); return; }
    vaultDirty = false;
    document.getElementById('vbar-status').textContent = 'Saved just now';
    toast('Vault saved!', 'success');
  } catch { toast('Connection error.', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Save vault'; }
}

function logoutVault() {
  if (vaultDirty && !confirm('Unsaved changes. Sign out anyway?')) return;
  vaultUser = null; inventory = {}; vaultDirty = false;
  document.getElementById('v-dot').classList.remove('on');
  document.getElementById('v-label').textContent = 'Sign into vault';
  document.getElementById('vault-btn').classList.remove('vault-btn-active');
  document.getElementById('vbar-panel').style.display = 'none';
  refreshGrid();
  walletUpdate();
  toast('Signed out.', '');
}

function initVaultModal() {
  document.getElementById('vault-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.querySelectorAll('.mc-modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mc-modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.mt === 'login';
      document.getElementById('mt-login').classList.toggle('hidden', !isLogin);
      document.getElementById('mt-register').classList.toggle('hidden', isLogin);
    });
  });

  window.addEventListener('beforeunload', e => {
    if (vaultDirty) { e.preventDefault(); e.returnValue = ''; }
  });
}
