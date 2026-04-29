// =====================================================
// COMPONENTS.JS v6 - Navbar + Footer + Notifications
// Ngozistes du Royaume — optimisé, unifié, dark mode
// =====================================================
'use strict';
(function () {

// ── Helpers internes ──────────────────────────────
function basePath() {
  const p = window.location.pathname;
  return (p.includes('/admin/') || p.includes('/member/')) ? '../' : '';
}
function isDashboard() {
  const p = window.location.pathname;
  return p.includes('/admin/') || p.includes('/member/');
}
function activePage() {
  const p = window.location.pathname;
  if (p.includes('apropos'))   return 'apropos';
  if (p.includes('activites')) return 'activites';
  if (p.includes('evenements'))return 'evenements';
  if (p.includes('adhesion'))  return 'adhesion';
  if (p.includes('login'))     return 'login';
  return 'index';
}
function navLink(file, label, cls) {
  cls = cls || '';
  const active = file === activePage() ? ' active' : '';
  return `<li><a href="${basePath()}${file}.html" class="${cls}${active}">${label}</a></li>`;
}
function escH(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
function escAttr(s) {
  return (s || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}
function _trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }

// ── Sons ─────────────────────────────────────────
const ONLINE_SOUNDS = {
  default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  chime:   'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  pop:     'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3',
  ping:    'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
  soft:    'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3',
  message: 'https://assets.mixkit.co/active_storage/sfx/2355/2355-preview.mp3',
  event:   'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  none:    null
};
const _audioCache = {};
let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
  }
  if (_audioCtx?.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

const FALLBACK_SOUNDS = {
  default(ctx) {
    [0, 0.18].forEach(delay => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + delay + 0.15);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.32);
    });
  },
  event(ctx) {
    [0, 0.1, 0.2, 0.32].forEach((delay, i) => {
      const freqs = [523, 659, 784, 1047];
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.45);
    });
  },
  none() {}
};

function playFallbackSound(name) {
  const ctx = getAudioCtx(); if (!ctx) return;
  const fn = FALLBACK_SOUNDS[name] || FALLBACK_SOUNDS.default;
  try { fn(ctx); } catch (_) {}
}

function playSoundOnline(type) {
  let name;
  try { name = localStorage.getItem('ngozistes_notif_sound') || 'default'; } catch (_) { name = 'default'; }
  if (type === 'event') name = 'event';
  if (type === 'message') name = 'message';
  if (name === 'none') return;
  const url = ONLINE_SOUNDS[name] || ONLINE_SOUNDS.default;
  if (!url) { playFallbackSound(name); return; }
  if (_audioCache[name] && _audioCache[name].readyState >= 2) {
    _audioCache[name].currentTime = 0;
    _audioCache[name].volume = 0.7;
    _audioCache[name].play().catch(() => playFallbackSound(name));
    return;
  }
  const audio = new Audio(url);
  audio.preload = 'auto'; audio.volume = 0.7; audio.crossOrigin = 'anonymous';
  _audioCache[name] = audio;
  audio.play().catch(() => playFallbackSound(type || name));
}

function playSound(type) {
  if (_silenced) return;
  playSoundOnline(type || 'default');
}

window.NOTIF_SOUND_LABELS = {
  default: 'Ding (défaut)', chime: 'Carillon', pop: 'Pop',
  ping: 'Ping cristallin', soft: 'Doux', none: 'Aucun son'
};

// ── NAVBAR ───────────────────────────────────────
function renderNavbar() {
  const el = document.getElementById('main-navbar'); if (!el) return;
  const base = basePath(), onDash = isDashboard();

  if (onDash) {
    el.innerHTML = `
      <header class="header" style="position:fixed;top:0;left:0;width:100%;background:var(--nav-bg,white);z-index:500;
        box-shadow:0 2px 10px rgba(0,0,0,.1);transition:background .3s;">
        <nav class="navbar" style="display:flex;justify-content:space-between;align-items:center;
          padding:.5rem 5%;max-width:1400px;margin:0 auto;height:60px;">
          <div class="logo" style="display:flex;align-items:center;gap:10px;">
            <img src="${base}images/logo/logo.png" alt="Logo" style="height:40px;width:auto;"
              onerror="if(!this.dataset.e){this.dataset.e=1;this.style.display='none';}">
            <span style="font-size:1.2rem;font-weight:bold;">
              <span style="color:#ff0000;">Ngozistes</span><span style="color:var(--logo-color,#000);"> du Royaume</span>
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;" id="dash-nav-right"></div>
        </nav>
      </header>
      <div id="user-dropdown" style="display:none;" role="dialog" aria-modal="true"></div>`;
  } else {
    el.innerHTML = `
      <header class="header">
        <nav class="navbar">
          <div class="logo">
            <img src="${base}images/logo/logo.png" alt="Logo"
              onerror="if(!this.dataset.e){this.dataset.e=1;this.style.display='none';}">
            <span><span class="logo-ngozistes">Ngozistes</span> <span class="logo-royaume">du Royaume</span></span>
          </div>
          <ul class="nav-menu" id="nav-menu">
            ${navLink('index','Accueil')}
            ${navLink('apropos','À propos')}
            ${navLink('activites','Activités')}
            ${navLink('evenements','Événements')}
            ${navLink('adhesion','Adhérer','btn-adhesion')}
            <li id="auth-nav-item">
              <a href="${base}login.html" class="btn-login"><i class="fas fa-user"></i> Connexion</a>
            </li>
          </ul>
          <div style="display:flex;align-items:center;gap:8px;">
            <button id="dark-toggle-btn" title="Mode sombre" onclick="window.DarkMode&&window.DarkMode.toggle()"
              style="background:none;border:none;cursor:pointer;font-size:1.1rem;padding:6px;border-radius:50%;
                transition:all .2s;color:var(--text,#666);" aria-label="Basculer mode sombre">
              ${window.DarkMode?.isActive() ? '☀️' : '🌙'}
            </button>
            <button class="hamburger" id="hamburger" type="button" aria-label="Menu" aria-expanded="false">
              <span></span><span></span><span></span>
            </button>
          </div>
        </nav>
      </header>
      <div id="user-dropdown" style="display:none;" role="dialog" aria-modal="true"></div>`;
    initHamburger();
  }
  renderAuthMenu();
}

// ── FOOTER (avec cache settings) ─────────────────
async function renderFooter() {
  const el = document.getElementById('main-footer'); if (!el) return;
  let email = 'ngozisteduroyaume@gmail.com', phone = 'XXXXXXXXXXX';
  let fb = 'https://www.facebook.com/share/17vqMhXRjk/', tt = 'https://www.tiktok.com/@ngozisteduroyaume';
  let footerText = 'Ensemble, construisons un avenir meilleur';

  if (window.supabase) {
    // Utiliser le cache pour les settings
    let settings = window.AppCache?.get('footer_settings');
    if (!settings) {
      try {
        const res = await window.supabase.from('settings').select('*').eq('id', 1).single();
        if (res.data) {
          settings = res.data;
          window.AppCache?.set('footer_settings', settings);
        }
      } catch (_) {}
    }
    if (settings) {
      email = settings.email || email;
      phone = settings.phone || phone;
      fb = settings.facebook_url || fb;
      tt = settings.tiktok_url || tt;
      footerText = settings.footer_text || footerText;
    }
  }

  el.innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-info">
            <h3><span class="footer-ngozistes">Ngozistes</span> <span class="footer-royaume">du Royaume</span></h3>
            <p>${escH(footerText)}</p>
          </div>
          <div class="footer-contact">
            <h4>Contact</h4>
            <p><i class="fas fa-envelope"></i> <a href="mailto:${escH(email)}">${escH(email)}</a></p>
            <p><i class="fas fa-phone"></i> ${escH(phone)}</p>
          </div>
          <div class="footer-social">
            <h4>Suivez-nous</h4>
            <div class="social-icons">
              <a href="${escH(fb)}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i class="fab fa-facebook"></i>
              </a>
              <a href="${escH(tt)}" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <i class="fab fa-tiktok"></i>
              </a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; ${new Date().getFullYear()} Ngozistes du Royaume. Tous droits réservés.</p>
        </div>
      </div>
    </footer>`;
}

// ── AUTH MENU ─────────────────────────────────────
function renderAuthMenu() {
  const user = window.Auth?.getCurrentUser();
  const onDash = isDashboard();

  if (onDash) {
    const rightEl = document.getElementById('dash-nav-right'); if (!rightEl) return;
    const photo  = escH(user ? (user.photo_url || user.photo || window.FALLBACK_AVATAR) : window.FALLBACK_AVATAR);
    const prenom = user ? escH(user.prenom || '') : '';
    const role   = user ? (user.role === 'admin' || user.role === 'super_admin' ? 'Admin' : 'Membre') : '';
    rightEl.innerHTML = `
      <button id="tb-notif-bell" title="Notifications"
        style="background:none;border:none;cursor:pointer;font-size:1.2rem;padding:6px 8px;border-radius:50%;
          transition:background .2s;position:relative;"
        onclick="window.Notif&&window.Notif.openPanel()">
        🔔
        <span id="notif-badge-global" style="display:none;position:absolute;top:-4px;right:-4px;
          background:#f44336;color:white;border-radius:50%;min-width:18px;height:18px;font-size:.6rem;
          font-weight:700;align-items:center;justify-content:center;border:2px solid white;z-index:10;
          padding:0 3px;box-sizing:border-box;">0</span>
      </button>
      <button id="tb-silence-btn" title="Mode silence"
        style="background:none;border:none;cursor:pointer;font-size:1rem;padding:6px 8px;border-radius:50%;
          transition:background .2s;color:#888;"
        onclick="window.toggleGlobalSilence(event)">
        <i class="fas fa-volume-up"></i>
      </button>
      <button id="dark-toggle-btn" title="Mode sombre"
        onclick="const a=window.DarkMode&&window.DarkMode.toggle();this.textContent=a?'☀️':'🌙';"
        style="background:none;border:none;cursor:pointer;font-size:1rem;padding:6px 8px;border-radius:50%;">
        ${window.DarkMode?.isActive() ? '☀️' : '🌙'}
      </button>
      <div id="user-profile-btn" style="display:flex;align-items:center;gap:8px;cursor:pointer;
        padding:5px 12px;border-radius:50px;background:var(--light,#f4f4f4);position:relative;"
        role="button" tabindex="0"
        onclick="window.toggleUserDropdown(event)"
        onkeydown="if(event.key==='Enter'){window.toggleUserDropdown(event);}">
        <img src="${photo}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;
          border:2px solid #4CAF50;" onerror="if(!this.dataset.e){this.dataset.e=1;this.src='${window.FALLBACK_AVATAR}';}">
        <span style="font-weight:500;color:var(--dark,#010101);font-size:.88rem;">${prenom}</span>
        <span style="font-size:.65rem;color:#4CAF50;background:#e8f5e9;padding:2px 7px;border-radius:10px;">${role}</span>
        <i class="fas fa-chevron-down" style="font-size:.65rem;color:#888;"></i>
      </div>`;
    if (user) startNotifications(user);
  } else {
    const item = document.getElementById('auth-nav-item'); if (!item || !user) return;
    const photo2  = escH(user.photo_url || user.photo || window.FALLBACK_AVATAR);
    const prenom2 = escH(user.prenom || '');
    item.innerHTML = `
      <div class="user-profile" id="user-profile-btn" role="button" tabindex="0"
        style="position:relative;display:inline-flex;align-items:center;gap:8px;cursor:pointer;
          padding:5px 12px;border-radius:50px;background:var(--light,#f4f4f4);"
        onclick="window.toggleUserDropdown(event)"
        onkeydown="if(event.key==='Enter'){window.toggleUserDropdown(event);}">
        <span style="position:relative;display:inline-flex;">
          <img src="${photo2}" alt="Avatar" class="nav-avatar"
            onerror="if(!this.dataset.e){this.dataset.e=1;this.src='${window.FALLBACK_AVATAR}';}">
          <span id="notif-badge-global" style="display:none;position:absolute;top:-5px;right:-5px;
            background:#f44336;color:white;border-radius:50%;min-width:18px;height:18px;font-size:.6rem;
            font-weight:700;align-items:center;justify-content:center;border:2px solid white;z-index:10;
            padding:0 3px;box-sizing:border-box;">0</span>
        </span>
        <span class="user-name" style="font-weight:500;color:var(--dark,#010101);">${prenom2}</span>
        <i class="fas fa-chevron-down" style="font-size:.7rem;color:#666;"></i>
      </div>`;
    startNotifications(user);
  }

  // Inject badge animation
  if (!document.getElementById('notif-badge-style')) {
    const style = document.createElement('style');
    style.id = 'notif-badge-style';
    style.textContent = `@keyframes notif-pop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
      #notif-badge-global[style*="flex"]{animation:notif-pop .3s ease;}`;
    document.head.appendChild(style);
  }
}

// ── DROPDOWN USER ─────────────────────────────────
window.toggleUserDropdown = function (evt) {
  evt.stopPropagation();
  const user = window.Auth?.getCurrentUser();
  const dd = document.getElementById('user-dropdown');
  if (!dd || !user) return;
  if (dd.style.display === 'block') { dd.style.display = 'none'; return; }

  const base = basePath();
  const dashPath = (user.role === 'admin' || user.role === 'super_admin')
    ? `${base}admin/dashboard.html` : `${base}member/dashboard.html`;
  const roleLabel = user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Membre';
  const photo = escH(user.photo_url || user.photo || window.FALLBACK_AVATAR);
  const isDark = window.DarkMode?.isActive();

  dd.innerHTML = `
    <div class="user-dropdown-header">
      <img src="${photo}" alt="Avatar"
        onerror="if(!this.dataset.e){this.dataset.e=1;this.src='${window.FALLBACK_AVATAR}';}">
      <div class="user-dropdown-info">
        <span>${escH((user.prenom || '') + ' ' + (user.nom || ''))}</span>
        <small>${escH(roleLabel)}</small>
      </div>
    </div>
    <div class="user-dropdown-menu">
      <a href="${dashPath}"><i class="fas fa-tachometer-alt"></i> Tableau de bord</a>
      <a href="#" onclick="window.Notif&&window.Notif.openPanel();document.getElementById('user-dropdown').style.display='none';return false;">
        <i class="fas fa-bell"></i> Notifications
        ${_notifCount > 0 ? `<span style="background:#f44336;color:white;border-radius:10px;padding:1px 7px;font-size:.7rem;margin-left:4px;">${_notifCount}</span>` : ''}
      </a>
      <a href="#" onclick="const a=window.DarkMode&&window.DarkMode.toggle();
        document.querySelectorAll('#dark-toggle-btn').forEach(b=>b.textContent=a?'☀️':'🌙');
        document.getElementById('user-dropdown').style.display='none';return false;">
        <i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i> ${isDark ? 'Mode clair' : 'Mode sombre'}
      </a>
      <a href="#" onclick="window.toggleGlobalSilence(event);return false;">
        <i class="fas fa-volume-${_silenced ? 'mute' : 'up'}"></i> ${_silenced ? 'Activer le son' : 'Mode silence'}
      </a>
      <div class="dropdown-divider"></div>
      <a href="#" onclick="window.Auth.logout();return false;">
        <i class="fas fa-sign-out-alt"></i> Déconnexion
      </a>
    </div>`;

  const trigger = evt.target.closest('#user-profile-btn, .user-profile');
  if (trigger) {
    const r = trigger.getBoundingClientRect();
    if (window.innerWidth <= 768) {
      dd.style.cssText = 'display:block;position:fixed;bottom:0;left:0;right:0;border-radius:16px 16px 0 0;z-index:2000;background:white;box-shadow:0 -4px 20px rgba(0,0,0,.2);';
    } else {
      dd.style.cssText = `display:block;position:fixed;top:${r.bottom + 8}px;right:${window.innerWidth - r.right}px;z-index:2000;background:white;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.2);min-width:260px;`;
    }
  }

  // Dark mode style du dropdown
  if (window.DarkMode?.isActive()) {
    dd.style.background = '#242526';
    dd.style.color = '#e4e6eb';
  }

  setTimeout(() => {
    function close(e) {
      if (!dd.contains(e.target) && !e.target.closest('#user-profile-btn')) {
        dd.style.display = 'none';
        document.removeEventListener('click', close);
      }
    }
    document.addEventListener('click', close);
  }, 60);
};

// ── NOTIFICATIONS ─────────────────────────────────
let _silenced = false, _notifCount = 0, _pollTimer = null;
let _lastMsgTs = 0, _lastNotifTs = 0, _lastEvTs = 0;
const SILENCE_KEY = 'ngozistes_silence', SOUND_KEY = 'ngozistes_notif_sound';
const LAST_MSG_KEY = 'ngozistes_last_msg', LAST_NOT_KEY = 'ngozistes_last_notif', LAST_EV_KEY = 'ngozistes_last_ev';

function startNotifications(user) {
  try {
    _silenced    = localStorage.getItem(SILENCE_KEY) === '1';
    _lastMsgTs   = parseInt(localStorage.getItem(LAST_MSG_KEY) || '0', 10);
    _lastNotifTs = parseInt(localStorage.getItem(LAST_NOT_KEY) || '0', 10);
    _lastEvTs    = parseInt(localStorage.getItem(LAST_EV_KEY)  || '0', 10);
  } catch (_) {}

  if (_lastEvTs === 0) {
    _lastEvTs = Date.now();
    try { localStorage.setItem(LAST_EV_KEY, String(_lastEvTs)); } catch (_) {}
  }

  window.Notif = {
    silence: toggleGlobalSilenceInternal,
    isSilenced: () => _silenced,
    setSound(n) {
      try { localStorage.setItem(SOUND_KEY, n); } catch (_) {}
      if (n !== 'none') playSound('default');
    },
    getSound() { try { return localStorage.getItem(SOUND_KEY) || 'default'; } catch (_) { return 'default'; } },
    getSoundLabels: () => window.NOTIF_SOUND_LABELS,
    playTest: () => playSound('default'),
    openPanel: () => openNotifPanel(user),
    refreshBadge: () => refreshBadge(user.id)
  };

  if ('Notification' in window && Notification.permission === 'default') {
    document.addEventListener('click', function askOnce() {
      Notification.requestPermission();
      document.removeEventListener('click', askOnce);
    }, { once: true });
  }

  poll(user);
  _pollTimer = setInterval(() => poll(user), 15000);
  window.addEventListener('beforeunload', () => { if (_pollTimer) clearInterval(_pollTimer); });

  // Repoll quand la page redevient visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') poll(user);
  });

  updateSilenceBtn();
}

// Polling optimisé avec Promise.all
async function poll(user) {
  if (!window.supabase) return;
  try {
    const [msgsR, notifsR, eventsR] = await Promise.all([
      window.supabase.from('messages')
        .select('id,subject,content,sent_at,is_read,sender:sender_id(prenom,nom)')
        .eq('receiver_id', user.id).eq('is_read', false)
        .order('sent_at', { ascending: false }),
      window.supabase.from('notifications')
        .select('id,title,message,created_at,is_read')
        .eq('user_id', user.id).eq('is_read', false)
        .order('created_at', { ascending: false }),
      window.supabase.from('events')
        .select('id,title,date,location,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false }).limit(10)
    ]);

    const msgs   = msgsR.data   || [];
    const notifs = notifsR.data || [];
    const events = eventsR.data || [];

    const newMsgs   = msgs.filter(m  => new Date(m.sent_at).getTime()     > _lastMsgTs);
    const newNotifs = notifs.filter(n => new Date(n.created_at).getTime() > _lastNotifTs);
    const newEvs    = events.filter(e => new Date(e.created_at).getTime() > _lastEvTs);

    if (newMsgs.length > 0) {
      try { localStorage.setItem(LAST_MSG_KEY, String(Date.now())); } catch (_) {}
      _lastMsgTs = Date.now();
      newMsgs.forEach(m => {
        const sender = m.sender ? ((m.sender.prenom || '') + ' ' + (m.sender.nom || '')).trim() : 'Quelqu\'un';
        trigger('💬 Nouveau message', sender + ' : ' + _trunc(m.content || '', 60), 'message', user);
      });
    }
    if (newNotifs.length > 0) {
      try { localStorage.setItem(LAST_NOT_KEY, String(Date.now())); } catch (_) {}
      _lastNotifTs = Date.now();
      newNotifs.forEach(n => trigger('🔔 ' + (n.title || 'Notification'), _trunc(n.message || '', 70), 'notif', user));
    }
    if (newEvs.length > 0) {
      try { localStorage.setItem(LAST_EV_KEY, String(Date.now())); } catch (_) {}
      _lastEvTs = Date.now();
      newEvs.forEach(ev => {
        const d = ev.date ? new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
        trigger('📅 Nouvel événement : ' + (ev.title || ''), (ev.location ? ev.location + ' — ' : '') + (d ? 'Le ' + d : ''), 'event', user);
      });
    }

    const total = msgs.length + notifs.length;
    _notifCount = total;
    updateBadge(total);
  } catch (_) {}
}

async function refreshBadge(userId) {
  if (!window.supabase) return;
  try {
    const [r1, r2] = await Promise.all([
      window.supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', userId).eq('is_read', false),
      window.supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false)
    ]);
    _notifCount = (r1.count || 0) + (r2.count || 0);
    updateBadge(_notifCount);
  } catch (_) {}
}

function updateBadge(count) {
  const badge = document.getElementById('notif-badge-global');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = 'flex';
    badge.style.animation = 'none';
    void badge.offsetWidth;
    badge.style.animation = 'notif-pop .3s ease';
  } else {
    badge.style.display = 'none';
  }
  ['tb-badge','sb-msg-badge','inbox-cnt','msg-badge'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    if (count > 0) { el.textContent = count > 99 ? '99+' : String(count); el.style.display = 'flex'; }
    else el.style.display = 'none';
  });
}

function trigger(title, body, type, user) {
  playSound(type);
  showToastNotif(title, body, type, user);
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: basePath() + 'images/logo/logo.png', tag: 'ngozistes-' + type });
    } catch (_) {}
  }
}

function showToastNotif(title, body, type, user) {
  let c = document.getElementById('notif-toast-area');
  if (!c) {
    c = document.createElement('div');
    c.id = 'notif-toast-area';
    c.style.cssText = 'position:fixed;top:75px;right:18px;z-index:8000;display:flex;flex-direction:column;gap:9px;max-width:320px;pointer-events:none;';
    document.body.appendChild(c);
  }
  const base = basePath();
  const dashPath = user && (user.role === 'admin' || user.role === 'super_admin')
    ? base + 'admin/dashboard.html' : base + 'member/dashboard.html';
  const colors = { message: '#2196F3', notif: '#4CAF50', event: '#ff9800' };
  const icons  = { message: '💬', notif: '🔔', event: '📅' };
  const color = colors[type] || '#4CAF50', icon = icons[type] || '🔔';
  const toast = document.createElement('div');
  toast.style.cssText = `background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.18);
    padding:13px 14px;border-left:4px solid ${color};display:flex;gap:10px;align-items:flex-start;
    opacity:0;transform:translateX(20px);transition:all .3s;pointer-events:all;cursor:pointer;
    position:relative;max-width:320px;`;
  toast.innerHTML = `
    <div style="font-size:1.2rem;flex-shrink:0;margin-top:1px;">${icon}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:700;color:#111;font-size:.85rem;margin-bottom:3px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escH(title)}</div>
      <div style="font-size:.78rem;color:#555;line-height:1.4;display:-webkit-box;
        -webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escH(body)}</div>
    </div>
    <button style="background:none;border:none;cursor:pointer;color:#bbb;font-size:16px;
      line-height:1;padding:0;flex-shrink:0;align-self:flex-start;" onclick="this.parentElement.remove()">×</button>`;
  toast.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') return;
    window.location.href = type === 'event' ? basePath() + 'evenements.html' : dashPath;
  });
  c.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)';
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
  }, 7000);
}

// ── PANEL NOTIFICATIONS ───────────────────────────
async function openNotifPanel(user) {
  const existing = document.getElementById('notif-panel-popup');
  if (existing) { existing.remove(); return; }

  const trigger2 = document.getElementById('user-profile-btn') || document.getElementById('tb-notif-bell');
  const rect = trigger2 ? trigger2.getBoundingClientRect() : { bottom: 70, right: window.innerWidth - 20 };
  const panel = document.createElement('div');
  panel.id = 'notif-panel-popup';
  const isMobile = window.innerWidth <= 768;
  const isDark = window.DarkMode?.isActive();
  const bg = isDark ? '#242526' : 'white';
  const borderColor = isDark ? '#3a3b3c' : '#eee';

  panel.style.cssText = isMobile
    ? `position:fixed;z-index:7000;width:100%;left:0;bottom:0;max-height:85vh;background:${bg};
       border-radius:18px 18px 0 0;box-shadow:0 -4px 30px rgba(0,0,0,.25);overflow:hidden;
       display:flex;flex-direction:column;animation:notif-pop .2s ease;`
    : `position:fixed;z-index:7000;width:360px;max-height:540px;background:${bg};border-radius:14px;
       box-shadow:0 8px 30px rgba(0,0,0,.2);overflow:hidden;display:flex;flex-direction:column;
       top:${rect.bottom + 8}px;right:${Math.max(10, window.innerWidth - rect.right)}px;animation:notif-pop .2s ease;`;

  if (!document.getElementById('np-style')) {
    const st = document.createElement('style');
    st.id = 'np-style';
    st.textContent = `.np-del-btn{background:rgba(244,67,54,.1);border:none;cursor:pointer;width:28px;height:28px;
      border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;
      transition:all .2s;color:#f44336;font-size:.75rem;}
      .np-del-btn:hover{background:#f44336!important;color:white!important;}`;
    document.head.appendChild(st);
  }

  panel.innerHTML = `
    <div style="padding:13px 15px;background:linear-gradient(135deg,#4CAF50,#2196F3);color:white;
      display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
      <span style="font-weight:700;font-size:.95rem;">🔔 Notifications</span>
      <div style="display:flex;gap:6px;align-items:center;">
        <button id="panel-sil-btn" onclick="window.toggleGlobalSilence(event)" title="${_silenced ? 'Activer le son' : 'Mode silence'}"
          style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:28px;height:28px;
            cursor:pointer;font-size:.82rem;color:white;display:flex;align-items:center;justify-content:center;">
          ${_silenced ? '🔇' : '🔔'}
        </button>
        <button id="panel-mark-all" title="Tout marquer comme lu"
          style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:28px;height:28px;
            cursor:pointer;font-size:.8rem;color:white;font-weight:700;display:flex;align-items:center;justify-content:center;">
          ✓
        </button>
        <button id="panel-del-all" title="Tout supprimer"
          style="background:rgba(244,67,54,.4);border:none;border-radius:50%;width:28px;height:28px;
            cursor:pointer;font-size:.75rem;color:white;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-trash-alt"></i>
        </button>
        <button onclick="document.getElementById('notif-panel-popup').remove()"
          style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:28px;height:28px;
            cursor:pointer;font-size:1.1rem;color:white;display:flex;align-items:center;justify-content:center;line-height:1;">
          ×
        </button>
      </div>
    </div>
    <div id="notif-panel-list" style="overflow-y:auto;flex:1;color:${isDark ? '#e4e6eb' : 'inherit'};">
      <div style="padding:28px;text-align:center;color:#aaa;font-size:.85rem;">Chargement…</div>
    </div>`;

  document.body.appendChild(panel);

  setTimeout(() => {
    function closePnl(e) {
      const p2 = document.getElementById('notif-panel-popup');
      if (p2 && !p2.contains(e.target) && !e.target.closest('#user-profile-btn') && !e.target.closest('#tb-notif-bell')) {
        p2.remove(); document.removeEventListener('click', closePnl);
      }
    }
    document.addEventListener('click', closePnl);
  }, 80);

  document.getElementById('panel-mark-all').addEventListener('click', () => window.markAllNotifsRead?.(user.id));
  document.getElementById('panel-del-all').addEventListener('click', async () => {
    if (!confirm('Supprimer toutes vos notifications ?')) return;
    try {
      await window.supabase.from('notifications').delete().eq('user_id', user.id);
      const list = document.getElementById('notif-panel-list');
      if (list) list.innerHTML = `<div style="padding:40px 20px;text-align:center;color:#aaa;">
        <div style="font-size:2.5rem;margin-bottom:10px;">🔕</div>
        <div style="font-size:.88rem;">Aucune notification</div></div>`;
      _notifCount = 0; updateBadge(0);
      window.showToast?.('Notifications supprimées', 'success', 2000);
    } catch (err) { window.showToast?.('Erreur : ' + err.message, 'error'); }
  });

  const base = basePath();
  const dashPath = (user.role === 'admin' || user.role === 'super_admin')
    ? base + 'admin/dashboard.html' : base + 'member/dashboard.html';

  function getNavUrl(type, link) {
    if (link && (link.startsWith('http') || link.startsWith('/'))) return link;
    const map = {
      message: dashPath + '#messages', inbox: dashPath + '#messages',
      event: base + 'evenements.html', announcement: dashPath + '#announcements',
      bureau: (user.role === 'admin' || user.role === 'super_admin') ? dashPath + '#bureau-groups' : base + 'member/groupe-bureau.html',
      approval: dashPath + '#overview', pending: dashPath + '#pending',
      member: dashPath + '#members', access_update: dashPath + '#overview', info: dashPath + '#overview'
    };
    return map[type] || dashPath + '#overview';
  }

  try {
    const [msgsR, notifsR] = await Promise.all([
      window.supabase.from('messages')
        .select('id,subject,content,sent_at,is_read,sender:sender_id(prenom,nom)')
        .eq('receiver_id', user.id).order('sent_at', { ascending: false }).limit(20),
      window.supabase.from('notifications')
        .select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    ]);

    const msgs = msgsR.data || [], notifs = notifsR.data || [];
    const items = [];

    msgs.forEach(m => {
      const sender = m.sender ? ((m.sender.prenom || '') + ' ' + (m.sender.nom || '')).trim() : 'Admin';
      items.push({
        id: m.id, kind: 'message', type: 'message', icon: '💬',
        title: 'Message de ' + sender, body: _trunc(m.subject || m.content || '', 80),
        ts: m.sent_at, read: !!m.is_read, navUrl: getNavUrl('message')
      });
    });
    notifs.forEach(n => {
      const ti = { message: '💬', event: '📅', announcement: '📢', bureau: '👥', approval: '🎉', pending: '⏳', member: '👤', access_update: '🔒', info: '🔔' };
      items.push({
        id: n.id, kind: 'notif', type: n.type || 'info', icon: ti[n.type] || '🔔',
        title: n.title || 'Notification', body: _trunc(n.message || '', 80),
        ts: n.created_at, read: !!n.is_read, navUrl: getNavUrl(n.type, n.link)
      });
    });
    items.sort((a, b) => new Date(b.ts) - new Date(a.ts));

    const list = document.getElementById('notif-panel-list');
    if (!list) return;

    const itemBg = isDark ? '#2d2e2f' : '#f0f9f0';
    const readBg = isDark ? '#242526' : 'white';

    if (!items.length) {
      list.innerHTML = `<div style="padding:40px 20px;text-align:center;color:#aaa;">
        <div style="font-size:2.5rem;margin-bottom:10px;">🔕</div>
        <div style="font-size:.88rem;">Aucune notification</div></div>`;
      return;
    }

    list.innerHTML = items.map(it => {
      const d = new Date(it.ts);
      const ds = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const ts = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const bg = !it.read ? itemBg : readBg;
      const safeUrl = escAttr(it.navUrl), safeId = String(it.id);
      return `<div id="np-item-${it.kind}-${safeId}"
        style="display:flex;align-items:flex-start;gap:9px;padding:11px 13px;
          border-bottom:1px solid ${borderColor};background:${bg};transition:background .15s;"
        onmouseover="this.dataset.bg=this.dataset.bg||this.style.background;this.style.background='${isDark ? '#3a3b3c' : '#f0f0f0'}';"
        onmouseout="this.style.background=this.dataset.bg||'${readBg}';">
        <div onclick="window._npNavigate('${it.kind}','${safeId}','${safeUrl}','${user.id}')"
          style="font-size:1.2rem;flex-shrink:0;margin-top:2px;cursor:pointer;">${it.icon}</div>
        <div onclick="window._npNavigate('${it.kind}','${safeId}','${safeUrl}','${user.id}')"
          style="flex:1;min-width:0;cursor:pointer;">
          <div style="font-weight:${it.read ? '400' : '700'};font-size:.84rem;
            color:${isDark ? '#e4e6eb' : '#111'};margin-bottom:2px;display:-webkit-box;
            -webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            ${escH(it.title)}
            ${!it.read ? '<span style="display:inline-block;width:7px;height:7px;background:#f44336;border-radius:50%;margin-left:3px;vertical-align:middle;"></span>' : ''}
          </div>
          <div style="font-size:.77rem;color:${isDark ? '#b0b3b8' : '#666'};line-height:1.4;display:-webkit-box;
            -webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escH(it.body)}</div>
          <div style="font-size:.67rem;color:#aaa;margin-top:3px;">${ds} à ${ts}</div>
        </div>
        <button class="np-del-btn" onclick="window._npDelete('${it.kind}','${safeId}')" title="Supprimer">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>`;
    }).join('');
  } catch (_) {
    const list2 = document.getElementById('notif-panel-list');
    if (list2) list2.innerHTML = `<div style="padding:28px;text-align:center;color:#f44336;font-size:.85rem;">Erreur de chargement</div>`;
  }
}

window._npNavigate = async function (kind, id, navUrl, userId) {
  try {
    if (kind === 'message') await window.supabase.from('messages').update({ is_read: true }).eq('id', id);
    else await window.supabase.from('notifications').update({ is_read: true }).eq('id', id);
    const el = document.getElementById(`np-item-${kind}-${id}`);
    if (el) {
      el.style.background = 'white';
      el.dataset.bg = 'white';
      el.querySelectorAll('div').forEach(d => { if (d.style.fontWeight === '700') d.style.fontWeight = '400'; });
      const dot = el.querySelector('span[style*="f44336"][style*="border-radius:50%"]');
      if (dot) dot.remove();
    }
  } catch (_) {}
  const panel = document.getElementById('notif-panel-popup');
  if (panel) panel.remove();
  if (!navUrl || navUrl === 'undefined') return;
  const hash = navUrl.includes('#') ? navUrl.split('#')[1] : null;
  const targetFilename = navUrl.split('#')[0].split('/').pop();
  if (hash && targetFilename && window.location.pathname.endsWith(targetFilename)) {
    if (window.switchToPanel) { window.switchToPanel(hash); return; }
  }
  window.location.href = navUrl;
  setTimeout(() => window.Notif?.refreshBadge?.(), 500);
};

window._npDelete = async function (kind, id) {
  try {
    if (kind === 'message') {
      const u = window.Auth?.getCurrentUser();
      if (u) {
        await window.supabase.from('message_deletions').upsert([{
          message_id: id, user_id: u.id, delete_for_all: false, deleted_at: new Date().toISOString()
        }], { onConflict: 'message_id,user_id' });
      }
    } else {
      await window.supabase.from('notifications').delete().eq('id', id);
    }
    const el = document.getElementById(`np-item-${kind}-${id}`);
    if (el) {
      const h = el.offsetHeight;
      el.style.transition = 'opacity .2s ease, max-height .3s ease, padding .3s ease';
      el.style.maxHeight = h + 'px'; el.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        el.style.opacity = '0'; el.style.maxHeight = '0';
        el.style.paddingTop = '0'; el.style.paddingBottom = '0'; el.style.borderBottomWidth = '0';
      });
      setTimeout(() => {
        if (el.parentNode) el.remove();
        const list = document.getElementById('notif-panel-list');
        if (list && !list.querySelector('[id^="np-item-"]')) {
          list.innerHTML = `<div style="padding:40px 20px;text-align:center;color:#aaa;">
            <div style="font-size:2.5rem;margin-bottom:10px;">🔕</div>
            <div style="font-size:.88rem;">Aucune notification</div></div>`;
        }
      }, 320);
    }
    setTimeout(() => window.Notif?.refreshBadge?.(), 300);
  } catch (err) { window.showToast?.('Erreur : ' + err.message, 'error'); }
};

window.markAllNotifsRead = async function (userId) {
  if (!userId) { const u = window.Auth?.getCurrentUser(); if (!u) return; userId = u.id; }
  try {
    await Promise.all([
      window.supabase.from('messages').update({ is_read: true }).eq('receiver_id', userId).eq('is_read', false),
      window.supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    ]);
    _notifCount = 0; updateBadge(0);
    const list = document.getElementById('notif-panel-list');
    if (list) {
      list.querySelectorAll('[id^="np-item-"]').forEach(el => {
        el.style.background = 'white'; el.dataset.bg = 'white';
        el.querySelectorAll('div').forEach(d => { if (d.style.fontWeight === '700') d.style.fontWeight = '400'; });
        const dot = el.querySelector('span[style*="f44336"][style*="border-radius:50%"]'); if (dot) dot.remove();
      });
    }
    const panel = document.getElementById('notif-panel-popup'); if (panel) panel.remove();
    window.showToast?.('Tout marqué comme lu', 'success', 2000);
  } catch (_) {}
};

function toggleGlobalSilenceInternal(force) {
  _silenced = force !== undefined ? !!force : !_silenced;
  try { localStorage.setItem(SILENCE_KEY, _silenced ? '1' : '0'); } catch (_) {}
  updateSilenceBtn();
  return _silenced;
}

window.toggleGlobalSilence = function (evt) {
  if (evt) evt.stopPropagation();
  toggleGlobalSilenceInternal();
  const dd = document.getElementById('user-dropdown');
  if (dd && dd.style.display === 'block') dd.style.display = 'none';
  window.showToast?.(_silenced ? '🔇 Silence activé' : '🔔 Son activé', 'info', 2000);
  return _silenced;
};

function updateSilenceBtn() {
  const btn = document.getElementById('tb-silence-btn');
  if (btn) {
    btn.title = _silenced ? 'Activer le son' : 'Mode silence';
    btn.innerHTML = `<i class="fas fa-volume-${_silenced ? 'mute' : 'up'}"></i>`;
    btn.style.color = _silenced ? '#f44336' : '#888';
  }
  ['silence-toggle','admin-silence-toggle','member-silence-toggle'].forEach(id => {
    const el = document.getElementById(id); if (el) el.checked = _silenced;
  });
}

// ── HAMBURGER ─────────────────────────────────────
function initHamburger() {
  const btn = document.getElementById('hamburger'), menu = document.getElementById('nav-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('active');
    btn.classList.toggle('active', open);
    btn.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('active');
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('active')) {
      menu.classList.remove('active');
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── RECHERCHE GLOBALE (barre admin) ───────────────
function initGlobalSearch() {
  if (!window.Auth?.isAdmin()) return;

  // Raccourci Ctrl+K
  window.Shortcuts?.register('ctrl+k', () => toggleGlobalSearchBar(), 'Recherche globale');

  function toggleGlobalSearchBar() {
    let bar = document.getElementById('global-search-bar');
    if (bar) { bar.remove(); return; }

    // Enregistrer les handlers de recherche
    window.GlobalSearch?.register('membres', async q => {
      const r = await window.supabase.from('users')
        .select('id,prenom,nom,email,role').ilike('nom', `%${q}%`).limit(5);
      return (r.data || []).map(u => ({ type: 'membre', label: `${u.prenom} ${u.nom}`, sub: u.email, panel: 'members' }));
    });
    window.GlobalSearch?.register('événements', async q => {
      const r = await window.supabase.from('events').select('id,title,date').ilike('title', `%${q}%`).limit(5);
      return (r.data || []).map(e => ({ type: 'event', label: e.title, sub: window.formatDate?.(e.date) || '', panel: 'events' }));
    });
    window.GlobalSearch?.register('activités', async q => {
      const r = await window.supabase.from('activities').select('id,title,category').ilike('title', `%${q}%`).limit(5);
      return (r.data || []).map(a => ({ type: 'activité', label: a.title, sub: window.getCategoryLabel?.(a.category) || '', panel: 'activities' }));
    });

    bar = document.createElement('div');
    bar.id = 'global-search-bar';
    bar.style.cssText = `position:fixed;top:60px;left:50%;transform:translateX(-50%) translateY(-20px);
      background:white;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.25);
      width:min(90vw,560px);z-index:6000;overflow:hidden;
      animation:searchIn .2s ease forwards;`;

    bar.innerHTML = `
      <style>@keyframes searchIn{to{transform:translateX(-50%) translateY(0);opacity:1;}}
      #global-search-bar{opacity:0;}
      .gs-item{padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f0f0f0;}
      .gs-item:hover,.gs-item.active{background:#f0f9f0;}
      .gs-type{font-size:.65rem;font-weight:700;text-transform:uppercase;padding:2px 7px;border-radius:10px;background:#e8f5e9;color:#4CAF50;}
      </style>
      <div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #f0f0f0;gap:10px;">
        <i class="fas fa-search" style="color:#4CAF50;font-size:1rem;"></i>
        <input id="gs-input" type="text" placeholder="Rechercher membres, événements, activités…"
          style="flex:1;border:none;outline:none;font-size:.95rem;background:none;" autocomplete="off">
        <kbd style="font-size:.7rem;background:#f0f0f0;padding:2px 7px;border-radius:4px;color:#888;">Esc</kbd>
      </div>
      <div id="gs-results" style="max-height:360px;overflow-y:auto;"></div>`;

    document.body.appendChild(bar);
    document.getElementById('gs-input').focus();

    const debouncedSearch = window.DB?.debounce(async (q) => {
      const resultsEl = document.getElementById('gs-results');
      if (!resultsEl) return;
      if (!q) { resultsEl.innerHTML = ''; return; }
      resultsEl.innerHTML = `<div style="padding:16px;text-align:center;color:#aaa;font-size:.85rem;">Recherche…</div>`;
      const results = await window.GlobalSearch?.search(q);
      if (!results) return;
      const all = Object.values(results).flat();
      if (!all.length) {
        resultsEl.innerHTML = `<div style="padding:16px;text-align:center;color:#aaa;font-size:.85rem;">Aucun résultat</div>`;
        return;
      }
      resultsEl.innerHTML = all.map(r => `
        <div class="gs-item" onclick="window.switchToPanel&&window.switchToPanel('${escAttr(r.panel)}');document.getElementById('global-search-bar').remove();">
          <span class="gs-type">${escH(r.type)}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:.88rem;font-weight:600;color:#111;">${escH(r.label)}</div>
            ${r.sub ? `<div style="font-size:.76rem;color:#888;">${escH(r.sub)}</div>` : ''}
          </div>
          <i class="fas fa-arrow-right" style="color:#ddd;font-size:.75rem;"></i>
        </div>`).join('');
    }, 250);

    document.getElementById('gs-input').addEventListener('input', e => debouncedSearch(e.target.value));
    document.addEventListener('keydown', function closeSearch(e) {
      if (e.key === 'Escape') {
        bar.remove();
        document.removeEventListener('keydown', closeSearch);
      }
    });
    bar.addEventListener('click', e => e.stopPropagation());
    setTimeout(() => {
      document.addEventListener('click', function closeSB() {
        bar.remove(); document.removeEventListener('click', closeSB);
      }, { once: true });
    }, 50);
  }
}

// ── OFFLINE ───────────────────────────────────────
function initOffline() {
  function show() {
    if (document.getElementById('offline-banner')) return;
    const b = document.createElement('div');
    b.id = 'offline-banner';
    b.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:9999;background:#f44336;color:white;text-align:center;padding:10px;font-size:.9rem;';
    b.textContent = '⚠️ Vous êtes hors ligne. Certaines fonctionnalités peuvent être indisponibles.';
    document.body.prepend(b);
  }
  function hide() { document.getElementById('offline-banner')?.remove(); }
  window.addEventListener('offline', show);
  window.addEventListener('online', hide);
  if (!navigator.onLine) show();
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(basePath() + 'service-worker.js').catch(() => {});
  }
}

// ── INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
  initOffline();
  registerSW();
  initGlobalSearch();
  if (isDashboard()) document.body.style.paddingTop = '0';

  // Raccourci Escape global pour fermer modals
  window.Shortcuts?.register('escape', () => {
    document.querySelector('.modal-overlay.active')?.classList.remove('active');
    document.getElementById('global-search-bar')?.remove();
    document.getElementById('notif-panel-popup')?.remove();
    document.body.style.overflow = '';
  }, 'Fermer les modals');
});

})();