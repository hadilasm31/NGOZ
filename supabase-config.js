'use strict';

// ================================================================
// SUPABASE CONFIG v6 — Ngozistes du Royaume
// Correction : register passe p_metadata à la RPC
// ================================================================

const _SUPA_URL  = 'https://vzdqmxjifgyzirpeqfjc.supabase.co';
const _SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6ZHFteGppZmd5emlycGVxZmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTA4MzMsImV4cCI6MjA4OTY4NjgzM30.Jh-ecnw6_rKkguE21kZYdEpMTXK3AlOvtD3T9zLbLsM';

if (!window._sbInit) {
  window.supabase = window.supabase.createClient(_SUPA_URL, _SUPA_ANON, {
    auth: { persistSession: false }
  });
  window._sbInit = true;
}

// ================================================================
// STORAGE BUCKETS CONFIG
// ================================================================
window.STORAGE_BUCKETS = {
  avatars:    'avatars',
  events:     'events',
  gallery:    'gallery',
  activities: 'activities',
  team:       'team',
  documents:  'documents',
  logos:      'logos',
  bureau:     'bureau'
};

// ================================================================
// FALLBACK IMAGES
// ================================================================
window.FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='18' font-family='sans-serif'%3EImage indisponible%3C/text%3E%3C/svg%3E";
window.FALLBACK_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='40' cy='40' r='40' fill='%23e0e0e0'/%3E%3Ccircle cx='40' cy='32' r='14' fill='%239e9e9e'/%3E%3Cpath d='M8 74c0-18 14-30 32-30s32 12 32 30' fill='%239e9e9e'/%3E%3C/svg%3E";

// ================================================================
// UPLOAD FICHIER VERS STORAGE
// ================================================================
window.uploadFile = async function(file, bucket, folder) {
  if (!file) throw new Error('Fichier manquant');
  if (!bucket) throw new Error('Bucket manquant');

  const ext      = file.name.split('.').pop().toLowerCase();
  const safeName = Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
  const filePath = folder ? (folder.replace(/\/$/, '') + '/' + safeName) : safeName;

  const { error: uploadError } = await window.supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream'
    });

  if (uploadError) {
    if (uploadError.message && uploadError.message.includes('already exists')) {
      const { error: upsertError } = await window.supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (upsertError) throw upsertError;
    } else {
      throw uploadError;
    }
  }

  const { data } = window.supabase.storage.from(bucket).getPublicUrl(filePath);
  if (!data || !data.publicUrl) throw new Error('Impossible de récupérer l\'URL publique');
  return data.publicUrl;
};

window.uploadImage = async function(file, bucket, folder, maxMb) {
  const check = window.validateImageFile(file, maxMb || 5);
  if (!check.ok) throw new Error(check.msg);
  return window.uploadFile(file, bucket, folder);
};

window.uploadFileWithFallback = async function(file, bucket, folder) {
  if (!file) return null;
  try {
    return await window.uploadFile(file, bucket, folder);
  } catch (storageErr) {
    console.warn('[Storage] Fallback base64:', storageErr.message);
    if (file.size > 3 * 1024 * 1024) throw new Error('Fichier trop grand pour le fallback (max 3Mo)');
    return await window.fileToBase64(file);
  }
};

window.deleteStorageFile = async function(url, bucket) {
  if (!url || !bucket) return;
  try {
    const urlObj  = new URL(url);
    const parts   = urlObj.pathname.split('/storage/v1/object/public/' + bucket + '/');
    if (parts.length < 2) return;
    const filePath = decodeURIComponent(parts[1]);
    await window.supabase.storage.from(bucket).remove([filePath]);
  } catch (e) {
    console.warn('[Storage] deleteStorageFile error:', e.message);
  }
};

// ================================================================
// HELPERS FICHIERS
// ================================================================
window.fileToBase64 = function(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = () => reject(new Error('Lecture échouée'));
    r.readAsDataURL(file);
  });
};

window.validateImageFile = function(file, maxMb) {
  if (!file) return { ok: false, msg: 'Aucun fichier sélectionné' };
  maxMb = maxMb || 5;
  const valid = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
  if (!valid.includes(file.type)) return { ok: false, msg: 'Format non supporté. Utilisez JPG, PNG, GIF ou WEBP.' };
  if (file.size > maxMb * 1024 * 1024) return { ok: false, msg: `Image trop grande (max ${maxMb} Mo).` };
  return { ok: true };
};

window.validateDocFile = function(file, maxMb) {
  if (!file) return { ok: false, msg: 'Aucun fichier sélectionné' };
  maxMb = maxMb || 10;
  const valid = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  if (!valid.includes(file.type)) return { ok: false, msg: 'Format non supporté (PDF, Word, texte).' };
  if (file.size > maxMb * 1024 * 1024) return { ok: false, msg: `Fichier trop grand (max ${maxMb} Mo).` };
  return { ok: true };
};

// ================================================================
// AUTHENTIFICATION — CORRECTION : p_metadata passé à la RPC
// ================================================================
const SESSION_KEY = 'ngozistes_session';

window.Auth = {

  // ── REGISTER : correction passage metadata ──
  async register(email, password, userData) {
    const metaData = userData.metadata || {};

    const { data, error } = await window.supabase.rpc('register_member', {
      p_email:      email.toLowerCase().trim(),
      p_password:   password,
      p_nom:        userData.nom        || '',
      p_prenom:     userData.prenom     || '',
      p_telephone:  userData.telephone  || null,
      p_ville:      userData.ville      || null,
      p_motivation: userData.motivation || null,
      p_newsletter: userData.newsletter || false,
      // CORRECTION CLÉE : passer le metadata comme objet JSON
      p_metadata:   {
        lycee_technique: metaData.lycee_technique === true || metaData.lycee_technique === 'true' ? true : false,
        nom_lycee:       metaData.nom_lycee       || null,
        filiere:         metaData.filiere         || null,
        annee_depart:    metaData.annee_depart     || null
      }
    });

    if (error) throw new Error(error.message);
    if (!data.success) {
      const msg = data.error === 'email_exists' ? 'email_exists' : (data.error || 'Erreur inscription');
      throw new Error(msg);
    }
    return { success: true, user_id: data.user_id };
  },

  async login(email, password) {
    const { data, error } = await window.supabase.rpc('login_member', {
      p_email:    email.toLowerCase().trim(),
      p_password: password
    });
    if (error) throw new Error(error.message);
    if (!data.success) {
      if (data.error === 'pending')  throw new Error('pending');
      if (data.error === 'inactive') throw new Error('inactive');
      throw new Error('Email ou mot de passe incorrect.');
    }
    const user = data.user;
    if (!user.photo && user.photo_url) user.photo = user.photo_url;
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    window._currentUser = user;
    return user;
  },

  async logout() {
    localStorage.removeItem(SESSION_KEY);
    window.AppCache && window.AppCache.invalidateAll();
    window._currentUser = null;
    const base = (window.location.pathname.includes('/admin/') ||
                  window.location.pathname.includes('/member/')) ? '../' : '';
    window.location.href = base + 'index.html';
  },

  getCurrentUser() {
    if (window._currentUser) return window._currentUser;
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (s) {
        const u = JSON.parse(s);
        if (!u.photo && u.photo_url) u.photo = u.photo_url;
        window._currentUser = u;
        return u;
      }
    } catch (_) {}
    return null;
  },

  isAdmin() {
    const u = this.getCurrentUser();
    return u && (u.role === 'admin' || u.role === 'super_admin');
  },

  async validateSession() {
    const current = this.getCurrentUser();
    if (!current || !current.id) return false;
    try {
      const { data, error } = await window.supabase
        .from('users')
        .select('id, status, role')
        .eq('id', current.id)
        .single();
      if (error || !data) return false;
      return !['inactive', 'deleted', 'pending'].includes(data.status);
    } catch (_) { return false; }
  },

  async refreshUser() {
    const current = this.getCurrentUser();
    if (!current) return null;
    try {
      const { data, error } = await window.supabase
        .from('users')
        .select('id,email,nom,prenom,role,status,is_bureau,photo,photo_url,ville,phone,telephone,bio,metadata')
        .eq('id', current.id)
        .single();
      if (error) throw error;
      if (!data.photo && data.photo_url) data.photo = data.photo_url;
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      window._currentUser = data;
      return data;
    } catch (_) { return current; }
  },

  async changePassword(oldPassword, newPassword) {
    const current = this.getCurrentUser();
    if (!current) return false;
    try {
      const { data } = await window.supabase.rpc('login_member', {
        p_email: current.email, p_password: oldPassword
      });
      if (!data || !data.success) return false;
      const { data: upd } = await window.supabase.rpc('update_password', {
        p_user_id: current.id, p_new_password: newPassword
      });
      return upd && upd.success;
    } catch (_) { return false; }
  }
};

window._currentUser = window.Auth.getCurrentUser();

// ================================================================
// CACHE LOCAL
// ================================================================
window.AppCache = {
  TTL: 5 * 60 * 1000,
  set(key, data) {
    try { localStorage.setItem('ngz_cache_' + key, JSON.stringify({ ts: Date.now(), data })); } catch (_) {}
  },
  get(key) {
    try {
      const raw = localStorage.getItem('ngz_cache_' + key);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > this.TTL) { localStorage.removeItem('ngz_cache_' + key); return null; }
      return data;
    } catch (_) { return null; }
  },
  invalidate(key) { try { localStorage.removeItem('ngz_cache_' + key); } catch (_) {} },
  invalidateAll() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('ngz_cache_'))
        .forEach(k => localStorage.removeItem(k));
    } catch (_) {}
  }
};

// ================================================================
// TOAST
// ================================================================
window.showToast = function(msg, type, ms) {
  type = type || 'info'; ms = ms || 3500;
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:340px;';
    document.body.appendChild(c);
  }
  const colors = { success:'#4CAF50', error:'#f44336', warning:'#ff9800', info:'#2196F3' };
  const icons  = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const t = document.createElement('div');
  t.style.cssText = `padding:12px 18px;border-radius:10px;color:white;font-size:.9rem;box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;transform:translateY(8px);transition:all .28s ease;background:${colors[type]||'#2196F3'};display:flex;align-items:center;gap:8px;pointer-events:all;cursor:pointer;word-break:break-word;`;
  t.innerHTML = `<span style="flex-shrink:0;">${icons[type]||'ℹ️'}</span><span>${window.escapeHtml(String(msg))}</span>`;
  t.onclick = () => t.remove();
  c.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
  const hide = () => { t.style.opacity='0'; t.style.transform='translateY(8px)'; setTimeout(()=>t.remove(),300); };
  const timer = setTimeout(hide, ms);
  t.onmouseenter = () => clearTimeout(timer);
  t.onmouseleave = () => setTimeout(hide, 1500);
};

// ================================================================
// UTILITAIRES GLOBAUX
// ================================================================
window.escapeHtml = function(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
};

window.truncateText = function(t, max) {
  if (!t) return '';
  return t.length > max ? t.slice(0, max) + '…' : t;
};

window.getCategoryLabel = function(cat) {
  const labels = {
    environnement: 'Environnement', social: 'Social',
    culture: 'Culture', education: 'Éducation',
    general: 'Général', autre: 'Autre'
  };
  return labels[cat] || (cat || 'Autre');
};

window.formatDate = function(iso, opts) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR',
    opts || { day: 'numeric', month: 'short', year: 'numeric' });
};

window.formatTime = function(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

window.formatFileSize = function(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
};

window.imgOnError = function(img) {
  if (!img.dataset.errHandled) { img.dataset.errHandled = '1'; img.src = window.FALLBACK_IMG; }
};
window.avatarOnError = function(img) {
  if (!img.dataset.errHandled) { img.dataset.errHandled = '1'; img.src = window.FALLBACK_AVATAR; }
};
window.logout = () => window.Auth.logout();

// ================================================================
// SKELETON LOADERS
// ================================================================
window.Skeleton = {
  tableRows(n, cols) {
    n = n || 5; cols = cols || 5;
    const pulse = 'animation:skeleton-pulse 1.5s ease-in-out infinite;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;border-radius:4px;';
    const cell = `<td><div style="height:14px;${pulse}margin:2px 0;"></div></td>`;
    return Array.from({ length: n }, () => `<tr>${Array(cols).fill(cell).join('')}</tr>`).join('');
  },
  inject() {
    if (document.getElementById('skeleton-style')) return;
    const s = document.createElement('style');
    s.id = 'skeleton-style';
    s.textContent = `@keyframes skeleton-pulse{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
    document.head.appendChild(s);
  }
};
window.Skeleton.inject();

// ================================================================
// DB HELPERS
// ================================================================
window.DB = {
  async parallel(queries) {
    const results = await Promise.allSettled(queries);
    return results.map(r => r.status === 'fulfilled' ? r.value : { data: null, error: r.reason });
  },
  debounce(fn, delay) {
    delay = delay || 300;
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }
};

// ================================================================
// DARK MODE
// ================================================================
window.DarkMode = {
  KEY: 'ngz_dark',
  isActive() { return localStorage.getItem(this.KEY) === '1'; },
  toggle() {
    const active = !this.isActive();
    localStorage.setItem(this.KEY, active ? '1' : '0');
    this.apply(active);
    return active;
  },
  apply(active) {
    document.documentElement.classList.toggle('dark', active);
    document.documentElement.setAttribute('data-theme', active ? 'dark' : 'light');
  },
  init() { this.apply(this.isActive()); }
};

// ================================================================
// RACCOURCIS CLAVIER
// ================================================================
window.Shortcuts = {
  _h: {},
  register(combo, fn, desc) { this._h[combo] = { fn, desc }; },
  init() {
    document.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      const combo = [e.ctrlKey||e.metaKey?'ctrl':'',e.shiftKey?'shift':'',e.altKey?'alt':'',e.key.toLowerCase()].filter(Boolean).join('+');
      if (this._h[combo]) { e.preventDefault(); this._h[combo].fn(e); }
    });
  }
};
window.Shortcuts.init();

// ================================================================
// GLOBAL SEARCH
// ================================================================
window.GlobalSearch = {
  _handlers: {},
  register(name, fn) { this._handlers[name] = fn; },
  async search(query) {
    if (!query || query.length < 2) return {};
    const results = {};
    await Promise.allSettled(
      Object.entries(this._handlers).map(async ([name, fn]) => {
        try { results[name] = await fn(query); } catch (_) { results[name] = []; }
      })
    );
    return results;
  }
};

// ================================================================
// DARK MODE CSS
// ================================================================
(function injectDarkCSS() {
  if (document.getElementById('dark-mode-css')) return;
  const style = document.createElement('style');
  style.id = 'dark-mode-css';
  style.textContent = `
    :root[data-theme="dark"]{--fb-bg:#18191a!important;--light:#242526!important;--text:#b0b3b8!important;color-scheme:dark;}
    [data-theme="dark"] body{background:#18191a;color:#e4e6eb;}
    [data-theme="dark"] .header,[data-theme="dark"] .top-navbar{background:#242526!important;border-color:#3a3b3c!important;}
    [data-theme="dark"] .sidebar{background:#242526!important;}
    [data-theme="dark"] .sb-item{color:#b0b3b8;}
    [data-theme="dark"] .sb-item:hover,[data-theme="dark"] .sb-item.active{background:rgba(255,255,255,.08);}
    [data-theme="dark"] .main{background:#18191a;}
    [data-theme="dark"] .card,[data-theme="dark"] .table-card,[data-theme="dark"] .settings-card,[data-theme="dark"] .stat-card{background:#242526!important;color:#e4e6eb;}
    [data-theme="dark"] table th{background:#3a3b3c!important;color:#e4e6eb;}
    [data-theme="dark"] table td{border-color:#3a3b3c;color:#b0b3b8;}
    [data-theme="dark"] table tr:hover td{background:#3a3b3c;}
    [data-theme="dark"] .fg input,[data-theme="dark"] .fg textarea,[data-theme="dark"] .fg select{background:#3a3b3c;border-color:#4a4b4c;color:#e4e6eb;}
    [data-theme="dark"] .modal-box{background:#242526;color:#e4e6eb;}
    [data-theme="dark"] .nav-menu{background:#242526;}
    [data-theme="dark"] .nav-menu a{color:#e4e6eb;}
    [data-theme="dark"] .act-card,[data-theme="dark"] .ev-card,[data-theme="dark"] .event-card,[data-theme="dark"] .rep-card{background:#242526!important;border-color:#3a3b3c;}
    [data-theme="dark"] .act-title,[data-theme="dark"] .ev-title,[data-theme="dark"] .event-title{color:#e4e6eb;}
    [data-theme="dark"] .user-profile{background:#3a3b3c;}
    [data-theme="dark"] .footer{background:#111!important;}
    [data-theme="dark"] .user-dropdown{background:#242526;}
    [data-theme="dark"] .user-dropdown-menu a{color:#b0b3b8;}
    [data-theme="dark"] .user-dropdown-menu a:hover{background:#3a3b3c;}
  `;
  document.head.appendChild(style);
})();

window.DarkMode.init();