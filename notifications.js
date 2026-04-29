// =====================================================
// NOTIFICATIONS.JS v2 — Ngozistes du Royaume
// Push API + Service Worker + sons en ligne
// Restrictions d'accès côté client
// =====================================================
'use strict';

(function () {

    var SILENCE_KEY   = 'ngozistes_silence';
    var SOUND_KEY     = 'ngozistes_notif_sound';
    var LAST_MSG_KEY  = 'ngozistes_last_msg';
    var LAST_NOT_KEY  = 'ngozistes_last_notif';
    var LAST_EV_KEY   = 'ngozistes_last_ev';
    var LAST_BUR_KEY  = 'ngozistes_last_bureau';

    var SOUND_LABELS = {
        default: 'Ding (défaut)', chime: 'Carillon', pop: 'Pop',
        ping: 'Ping cristallin', soft: 'Doux', none: 'Aucun son'
    };

    var ONLINE_SOUNDS = {
        default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        chime:   'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        pop:     'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3',
        ping:    'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
        soft:    'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3',
        message: 'https://assets.mixkit.co/active_storage/sfx/2355/2355-preview.mp3',
        event:   'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        bureau:  'https://assets.mixkit.co/active_storage/sfx/2355/2355-preview.mp3',
        none:    null
    };

    var _audioElements = {};
    var _audioCtx = null;
    var silenced = false;
    var pollingTimer = null;
    var unreadCount = 0;
    var lastMsgTs = 0, lastNotifTs = 0, lastEvTs = 0, lastBurTs = 0;

    /* ── FALLBACK WebAudio ── */
    var FALLBACK = {
        default: function(ctx) {
            [0, 0.18].forEach(function(d) {
                var o=ctx.createOscillator(), g=ctx.createGain();
                o.connect(g); g.connect(ctx.destination); o.type='sine';
                o.frequency.setValueAtTime(880, ctx.currentTime+d);
                o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime+d+0.15);
                g.gain.setValueAtTime(0, ctx.currentTime+d);
                g.gain.linearRampToValueAtTime(0.35, ctx.currentTime+d+0.02);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+d+0.3);
                o.start(ctx.currentTime+d); o.stop(ctx.currentTime+d+0.32);
            });
        },
        event: function(ctx) {
            [0,0.1,0.2,0.32].forEach(function(d,i) {
                var f=[523,659,784,1047][i], o=ctx.createOscillator(), g=ctx.createGain();
                o.connect(g); g.connect(ctx.destination); o.type='triangle';
                o.frequency.setValueAtTime(f, ctx.currentTime+d);
                g.gain.setValueAtTime(0, ctx.currentTime+d);
                g.gain.linearRampToValueAtTime(0.28, ctx.currentTime+d+0.02);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+d+0.4);
                o.start(ctx.currentTime+d); o.stop(ctx.currentTime+d+0.45);
            });
        },
        bureau: function(ctx) {
            // Double ding pour le groupe bureau
            [0, 0.15, 0.3].forEach(function(d) {
                var o=ctx.createOscillator(), g=ctx.createGain();
                o.connect(g); g.connect(ctx.destination); o.type='triangle';
                o.frequency.setValueAtTime(d===0?700:900, ctx.currentTime+d);
                g.gain.setValueAtTime(0, ctx.currentTime+d);
                g.gain.linearRampToValueAtTime(0.3, ctx.currentTime+d+0.02);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+d+0.25);
                o.start(ctx.currentTime+d); o.stop(ctx.currentTime+d+0.28);
            });
        },
        none: function() {}
    };

    function getCtx() {
        if (!_audioCtx) {
            try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) { return null; }
        }
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        return _audioCtx;
    }

    function playFallback(name) {
        var ctx = getCtx(); if (!ctx) return;
        var fn = FALLBACK[name] || FALLBACK['default'];
        try { fn(ctx); } catch(_) {}
    }

    function playOnline(soundName, type) {
        if (silenced || soundName === 'none') return;
        var urlKey = (type === 'event' || type === 'bureau' || type === 'message') ? type : soundName;
        var url = ONLINE_SOUNDS[urlKey] || ONLINE_SOUNDS[soundName] || ONLINE_SOUNDS['default'];
        if (!url) { playFallback(soundName); return; }

        if (_audioElements[urlKey]) {
            _audioElements[urlKey].currentTime = 0;
            _audioElements[urlKey].play().catch(function() { playFallback(soundName); });
            return;
        }
        var a = new Audio(url);
        a.preload = 'auto'; a.volume = 0.7;
        _audioElements[urlKey] = a;
        a.play().catch(function() { playFallback(type || soundName); });
    }

    function playSound(type) {
        if (silenced) return;
        var name;
        try { name = localStorage.getItem(SOUND_KEY) || 'default'; } catch(_) { name = 'default'; }
        playOnline(name, type || 'default');
    }

    /* ── PUSH NOTIFICATIONS via Service Worker ── */
    async function registerPushSubscription(userId) {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            var reg = await navigator.serviceWorker.ready;
            var existing = await reg.pushManager.getSubscription();
            if (existing) {
                await savePushSub(userId, existing);
                return;
            }
            // Pour un vrai VAPID : remplacer urlBase64ToUint8Array par votre clé publique VAPID
            // Sans serveur : on utilise uniquement les notifications locales via SW message
        } catch (_) {}
    }

    async function savePushSub(userId, sub) {
        if (!sub || !userId) return;
        try {
            var subJson = sub.toJSON();
            await window.supabase.from('push_subscriptions').upsert([{
                user_id: userId,
                endpoint: subJson.endpoint,
                p256dh: (subJson.keys || {}).p256dh || '',
                auth_key: (subJson.keys || {}).auth || '',
                last_used: new Date().toISOString()
            }], { onConflict: 'endpoint' });
        } catch(_) {}
    }

    /* ── Notification forte via SW (fonctionne en arrière-plan) ── */
    async function showStrongNotif(title, body, type, url) {
        // 1. Notification navigateur native (si permise)
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                var icons = { message: '💬', event: '📅', bureau: '👥', announcement: '📢', info: '🔔' };
                var options = {
                    body: body,
                    icon: '/images/logo/logo.png',
                    badge: '/images/logo/logo.png',
                    tag: 'ngozistes-' + (type || 'info'),
                    renotify: true,
                    data: { url: url || '/' }
                };
                // Essayer via Service Worker d'abord (marche en arrière-plan)
                if ('serviceWorker' in navigator) {
                    var reg = await navigator.serviceWorker.ready;
                    await reg.showNotification((icons[type]||'🔔') + ' ' + title, options);
                } else {
                    new Notification((icons[type]||'🔔') + ' ' + title, options);
                }
            } catch(_) {
                try { new Notification(title, { body: body }); } catch(_) {}
            }
        }

        // 2. Si le SW est dispo, lui demander aussi (pour les cas hors focus)
        if ('serviceWorker' in navigator) {
            try {
                var reg2 = await navigator.serviceWorker.ready;
                reg2.active && reg2.active.postMessage({
                    type: 'SHOW_NOTIF',
                    title: title,
                    body: body,
                    tag: type || 'info',
                    url: url || '/'
                });
            } catch(_) {}
        }
    }

    /* ── Toast visuel ── */
    function showToastNotif(title, body, type, user) {
        var c = document.getElementById('notif-toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'notif-toast-container';
            c.style.cssText = 'position:fixed;top:80px;right:18px;z-index:9998;display:flex;flex-direction:column;gap:9px;max-width:320px;';
            document.body.appendChild(c);
        }

        var colors = { message: '#2196F3', notif: '#4CAF50', event: '#ff9800', bureau: '#9c27b0', urgent: '#f44336' };
        var icons  = { message: '💬', notif: '🔔', event: '📅', bureau: '👥', urgent: '🚨' };
        var color  = colors[type] || '#4CAF50';
        var icon   = icons[type]  || '🔔';

        var toast = document.createElement('div');
        toast.style.cssText = 'background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.18);'
            + 'padding:14px 16px;border-left:4px solid '+color+';'
            + 'display:flex;gap:10px;align-items:flex-start;opacity:0;transform:translateX(20px);transition:all .3s;'
            + 'cursor:pointer;max-width:320px;';

        toast.innerHTML = '<div style="font-size:1.3rem;flex-shrink:0;">' + icon + '</div>'
            + '<div style="flex:1;">'
            + '<div style="font-weight:700;color:#111;font-size:.88rem;margin-bottom:3px;">' + escH(title) + '</div>'
            + '<div style="font-size:.8rem;color:#555;line-height:1.4;">' + escH(body) + '</div>'
            + '</div>'
            + '<button style="background:none;border:none;cursor:pointer;color:#aaa;font-size:16px;line-height:1;padding:0;flex-shrink:0;" onclick="this.parentElement.remove()">×</button>';

        var base = (window.location.pathname.includes('/admin/') || window.location.pathname.includes('/member/')) ? '' : '';
        var dashPath = user && (user.role === 'admin' || user.role === 'super_admin')
            ? '/admin/dashboard.html' : '/member/dashboard.html';

        toast.addEventListener('click', function (e) {
            if (e.target.tagName === 'BUTTON') return;
            if (type === 'event') window.location.href = '/evenements.html';
            else if (type === 'bureau') window.location.href = '/member/groupe-bureau.html';
            else window.location.href = dashPath;
        });

        c.appendChild(toast);
        requestAnimationFrame(function () {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
        }, 7000);
    }

    /* ── Badge ── */
    function updateBadge(count) {
        var badge = document.getElementById('notif-badge-global');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
        ['tb-badge', 'sb-msg-badge', 'inbox-cnt', 'msg-badge'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            if (count > 0) { el.textContent = count > 99 ? '99+' : String(count); el.style.display = 'flex'; }
            else el.style.display = 'none';
        });
    }

    /* ── Trigger ── */
    function triggerNotif(title, body, type, user, url) {
        playSound(type);
        showToastNotif(title, body, type, user);
        showStrongNotif(title, body, type, url);
    }

    /* ── Polling ── */
    async function poll(user) {
        if (!window.supabase || !user) return;
        try {
            var results = await Promise.allSettled([
                window.supabase.from('messages').select('id,subject,content,sent_at,is_read,sender:sender_id(prenom,nom)')
                    .eq('receiver_id', user.id).eq('is_read', false).order('sent_at', { ascending: false }),
                window.supabase.from('notifications').select('id,title,message,created_at,is_read')
                    .eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false }),
                window.supabase.from('events').select('id,title,date,location,created_at')
                    .eq('status', 'published').order('created_at', { ascending: false }).limit(10)
            ]);

            var msgs   = (results[0].status === 'fulfilled' && results[0].value.data) || [];
            var notifs = (results[1].status === 'fulfilled' && results[1].value.data) || [];
            var events = (results[2].status === 'fulfilled' && results[2].value.data) || [];

            // Vérifier aussi les messages bureau si c'est un membre bureau
            if (user.is_bureau || user.role === 'super_admin') {
                try {
                    var burR = await window.supabase.from('bureau_messages')
                        .select('id,content,sent_at,sender:sender_id(prenom,nom)')
                        .neq('sender_id', user.id)
                        .order('sent_at', { ascending: false })
                        .limit(5);
                    var newBur = (burR.data || []).filter(function(m) {
                        return new Date(m.sent_at).getTime() > lastBurTs;
                    });
                    if (newBur.length > 0) {
                        try { localStorage.setItem(LAST_BUR_KEY, String(Date.now())); } catch(_) {}
                        lastBurTs = Date.now();
                        newBur.forEach(function(m) {
                            var s = m.sender ? ((m.sender.prenom||'')+' '+(m.sender.nom||'')).trim() : 'Bureau';
                            triggerNotif('👥 Groupe Bureau', s + ' : ' + trunc(m.content||'', 60), 'bureau', user, '/member/groupe-bureau.html');
                        });
                    }
                } catch(_) {}
            }

            var newMsgs   = msgs.filter(function (m)  { return new Date(m.sent_at).getTime()     > lastMsgTs; });
            var newNotifs = notifs.filter(function (n) { return new Date(n.created_at).getTime() > lastNotifTs; });
            var newEvs    = events.filter(function (e) { return new Date(e.created_at).getTime() > lastEvTs; });

            if (newMsgs.length > 0) {
                try { localStorage.setItem(LAST_MSG_KEY, String(Date.now())); } catch(_) {}
                lastMsgTs = Date.now();
                newMsgs.forEach(function (m) {
                    var s = m.sender ? ((m.sender.prenom||'')+' '+(m.sender.nom||'')).trim() : 'Quelqu\'un';
                    triggerNotif('💬 Nouveau message', s + ' : ' + trunc(m.content||'', 60), 'message', user);
                });
            }
            if (newNotifs.length > 0) {
                try { localStorage.setItem(LAST_NOT_KEY, String(Date.now())); } catch(_) {}
                lastNotifTs = Date.now();
                newNotifs.forEach(function (n) {
                    triggerNotif('🔔 ' + (n.title||'Notification'), trunc(n.message||'', 70), 'notif', user);
                });
            }
            if (newEvs.length > 0) {
                try { localStorage.setItem(LAST_EV_KEY, String(Date.now())); } catch(_) {}
                lastEvTs = Date.now();
                newEvs.forEach(function (ev) {
                    var d = ev.date ? new Date(ev.date).toLocaleDateString('fr-FR', {day:'numeric',month:'long'}) : '';
                    triggerNotif('📅 Nouvel événement', (ev.title||'') + (d ? ' — ' + d : ''), 'event', user, '/evenements.html');
                });
            }

            var total = msgs.length + notifs.length;
            unreadCount = total;
            updateBadge(total);

        } catch(_) {}
    }

    async function refreshBadge(userId) {
        if (!window.supabase || !userId) return;
        try {
            var r = await Promise.all([
                window.supabase.from('messages').select('*',{count:'exact',head:true}).eq('receiver_id',userId).eq('is_read',false),
                window.supabase.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('is_read',false)
            ]);
            unreadCount = (r[0].count||0) + (r[1].count||0);
            updateBadge(unreadCount);
        } catch(_) {}
    }

    /* ── Mode silence ── */
    function toggleSilence(v) {
        silenced = v !== undefined ? !!v : !silenced;
        try { localStorage.setItem(SILENCE_KEY, silenced ? '1' : '0'); } catch(_) {}
        return silenced;
    }

    /* ── Restrictions d'accès côté client ── */
    window.checkAccessAllowed = async function (page, panel) {
        var user = window.Auth ? window.Auth.getCurrentUser() : null;
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'super_admin') return true;

        try {
            var q = window.supabase.from('access_rules').select('allowed')
                .eq('role', user.role || 'member')
                .eq('page', page);
            if (panel) q = q.eq('panel', panel);
            else q = q.is('panel', null);
            var r = await q.maybeSingle();
            if (!r.data) return true; // Pas de règle = autorisé par défaut
            return r.data.allowed !== false;
        } catch(_) {
            return true; // En cas d'erreur, autoriser
        }
    };

    /* ── Initialisation ── */
    function init() {
        try {
            silenced    = localStorage.getItem(SILENCE_KEY) === '1';
            lastMsgTs   = parseInt(localStorage.getItem(LAST_MSG_KEY) || '0', 10);
            lastNotifTs = parseInt(localStorage.getItem(LAST_NOT_KEY) || '0', 10);
            lastEvTs    = parseInt(localStorage.getItem(LAST_EV_KEY)  || '0', 10);
            lastBurTs   = parseInt(localStorage.getItem(LAST_BUR_KEY) || '0', 10);
        } catch(_) {}

        if (lastEvTs === 0) {
            lastEvTs = Date.now();
            try { localStorage.setItem(LAST_EV_KEY, String(lastEvTs)); } catch(_) {}
        }
        if (lastBurTs === 0) {
            lastBurTs = Date.now();
            try { localStorage.setItem(LAST_BUR_KEY, String(lastBurTs)); } catch(_) {}
        }

        var user = window.Auth ? window.Auth.getCurrentUser() : null;
        if (!user) return;

        // API publique
        window.Notif = {
            silence:        function (v) { return toggleSilence(v); },
            isSilenced:     function () { return silenced; },
            setSound:       function (n) {
                try { localStorage.setItem(SOUND_KEY, n); } catch(_) {}
                if (n !== 'none') playOnline(n, 'default');
            },
            getSound:       function () { try { return localStorage.getItem(SOUND_KEY) || 'default'; } catch(_) { return 'default'; } },
            getSoundLabels: function () { return SOUND_LABELS; },
            playTest:       function () { playSound('default'); },
            refreshBadge:   function () { refreshBadge(user.id); },
            stop:           function () { if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; } },
            openPanel:      function () {}
        };

        // Demander permission notifications navigateur
        if ('Notification' in window && Notification.permission === 'default') {
            // Attendre un geste utilisateur pour demander
            document.addEventListener('click', function askOnce() {
                Notification.requestPermission().then(function(p) {
                    if (p === 'granted') registerPushSubscription(user.id);
                });
                document.removeEventListener('click', askOnce);
            }, { once: true });
        } else if ('Notification' in window && Notification.permission === 'granted') {
            registerPushSubscription(user.id);
        }

        // Écouter les messages du Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', function (event) {
                if (event.data && event.data.type === 'NOTIF_CLICK') {
                    window.location.href = event.data.url || '/';
                }
                if (event.data && event.data.type === 'CHECK_NOTIFS') {
                    poll(user);
                }
            });
        }

        // Background Sync — enregistrer pour les vérifications périodiques
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(function (reg) {
                reg.sync.register('check-notifications').catch(function() {});
            });
        }

        // Polling
        poll(user);
        pollingTimer = setInterval(function () { poll(user); }, 15000);

        window.addEventListener('beforeunload', function () {
            if (pollingTimer) clearInterval(pollingTimer);
        });

        // Visibilité de page : repoll dès que la page redevient visible
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') poll(user);
        });
    }

    function trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }
    function escH(s) {
        if (!s) return '';
        var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML;
    }

    // Démarrage
    document.addEventListener('DOMContentLoaded', function () {
        var attempts = 0;
        var iv = setInterval(function () {
            attempts++;
            var user = window.Auth ? window.Auth.getCurrentUser() : null;
            if (user) { clearInterval(iv); init(); }
            else if (attempts > 30) clearInterval(iv);
        }, 200);
    });

    window.addEventListener('beforeunload', function () {
        if (pollingTimer) clearInterval(pollingTimer);
    });

})();