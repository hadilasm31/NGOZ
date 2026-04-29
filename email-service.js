'use strict';
// ================================================================
// EMAIL-SERVICE.JS v2 — Ngozistes du Royaume
// ================================================================
(function () {
  const BASE = 'https://vzdqmxjifgyzirpeqfjc.supabase.co/functions/v1';

  async function call(fn, payload) {
    try {
      const key = (window.supabase && window.supabase.supabaseKey) || '';
      const res = await fetch(BASE + '/' + fn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify(payload || {})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { console.error('[Email]', fn, data); return { success: false, error: data.error || 'Erreur' }; }
      return { success: true, ...data };
    } catch (err) {
      console.error('[Email]', fn, err);
      return { success: false, error: err.message };
    }
  }

  window.sendApprovalEmail = async function(user) {
    if (!user || !user.email) return { success: false };
    return call('send-member-status-email', {
      action: 'approved',
      user: { id: user.id, email: user.email, prenom: user.prenom || '', nom: user.nom || '' }
    });
  };

  window.sendRejectionEmail = async function(user) {
    if (!user || !user.email) return { success: false };
    return call('send-member-status-email', {
      action: 'rejected',
      user: { id: user.id, email: user.email, prenom: user.prenom || '', nom: user.nom || '' }
    });
  };

  window.triggerReminderEmails = async function() {
    const r = await call('remind-event-emails', {});
    if (r.success) window.showToast('Rappels envoyés : ' + (r.totalSent || 0) + ' mail(s)', 'success', 4000);
    else window.showToast('Échec rappels : ' + (r.error || ''), 'error');
    return r;
  };

  window.loadEmailLogs = async function(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text);">Chargement…</div>';
    try {
      const { data, error } = await window.supabase
        .from('email_logs').select('*').order('sent_at', { ascending: false }).limit(50);
      if (error) throw error;
      if (!data || !data.length) {
        el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text);font-style:italic;">Aucun email envoyé</div>';
        return;
      }
      const labels = {
        event_published: '📅 Événement publié', event_reminder: '⏰ Rappel J-2',
        member_approved: '🎉 Approbation', member_rejected: '📋 Rejet'
      };
      const sc = { success: '#4CAF50', partial: '#ff9800', error: '#f44336' };
      el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:.85rem;">'
        + '<thead><tr style="background:var(--light);"><th style="padding:10px 12px;text-align:left;border-bottom:2px solid #eee;">Type</th>'
        + '<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #eee;">Envoyés</th>'
        + '<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #eee;">Statut</th>'
        + '<th style="padding:10px 12px;text-align:left;border-bottom:2px solid #eee;">Date</th></tr></thead><tbody>'
        + data.map(function(l) {
            const d = new Date(l.sent_at).toLocaleString('fr-FR', { day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' });
            const c = sc[l.status] || '#888';
            return '<tr>'
              + '<td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;">' + (labels[l.type] || l.type) + '</td>'
              + '<td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;"><strong>' + l.recipients_count + '</strong></td>'
              + '<td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;"><span style="background:' + c + '20;color:' + c + ';padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:600;">' + l.status + '</span></td>'
              + '<td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;color:var(--text);font-size:.8rem;">' + d + '</td>'
              + '</tr>';
          }).join('')
        + '</tbody></table>';
    } catch (err) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--danger);">Erreur : ' + err.message + '</div>';
    }
  };

  console.log('[EmailService] Chargé ✓');
})();