// =====================================================
// EMAIL SERVICE — Ngozistes du Royaume
// Envoi d'emails via EmailJS (Gmail) sans serveur
// https://www.emailjs.com — Gratuit jusqu'à 200 emails/mois
//
// ⚙️  CONFIGURATION REQUISE :
//   1. Créez un compte sur https://www.emailjs.com
//   2. "Email Services" → Add New Service → Gmail
//      → Connectez ngozisteduroyaume@gmail.com
//      → Notez le Service ID → remplacez EMAILJS_SERVICE_ID
//   3. "Email Templates" → Create New Template
//      → Collez le template HTML ci-dessous dans le champ "Content"
//      → Notez le Template ID → remplacez EMAILJS_TEMPLATE_ID
//   4. "Account" → API Keys → Public Key
//      → Remplacez EMAILJS_PUBLIC_KEY
//
// 📧  TEMPLATE EMAILJS À COLLER (champ "Content") :
// ─────────────────────────────────────────────────
// Subject : APROBATION D'ADHESION !
//
// Bonjour {{prenom}} {{nom}},
//
// Votre demande d'adhésion aux Ngozistes du Royaume a été approuvée !
//
// Vous pouvez maintenant vous connecter avec :
//   Email    : {{email}}
//   Mot de passe : {{password}}
//
// 👉 Connectez-vous ici : https://hadilasm31.github.io/NGOZISTEDUROYAUMETEST1/login.html
//
// Bienvenue parmi nous !
// L'équipe des Ngozistes du Royaume
// ─────────────────────────────────────────────────
// =====================================================

'use strict';

(function () {

    // ══════════════════════════════════════════════
    // 🔧 REMPLACEZ CES 3 VALEURS PAR LES VÔTRES
    // ══════════════════════════════════════════════
    var EMAILJS_PUBLIC_KEY   = 'WBbZlbbCO2Glk5Quh';
    var EMAILJS_SERVICE_ID   = 'administratif';
    var EMAILJS_TEMPLATE_ID  = 'template_hvsxnxp';
    // ══════════════════════════════════════════════

    var SITE_URL = window.location.origin;
    var LOGIN_URL = SITE_URL + '/login.html';

    var _initialized = false;

    // Charger le SDK EmailJS depuis CDN si pas encore chargé
    function loadEmailJS() {
        return new Promise(function (resolve, reject) {
            if (window.emailjs) {
                if (!_initialized) {
                    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
                    _initialized = true;
                }
                resolve();
                return;
            }
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
            script.onload = function () {
                window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
                _initialized = true;
                resolve();
            };
            script.onerror = function () {
                reject(new Error('Impossible de charger EmailJS'));
            };
            document.head.appendChild(script);
        });
    }

    // ──────────────────────────────────────────────
    // Envoyer l'email de confirmation d'adhésion
    // ──────────────────────────────────────────────
    window.sendApprovalEmail = async function (userData) {
        /*
         * userData doit contenir :
         *   { prenom, nom, email, password_plain }
         */
        if (!userData || !userData.email) {
            console.warn('sendApprovalEmail : données manquantes');
            return { success: false, error: 'Données utilisateur manquantes' };
        }

        try {
            await loadEmailJS();

            var templateParams = {
                to_email:  userData.email,
                to_name:   (userData.prenom || '') + ' ' + (userData.nom || ''),
                prenom:    userData.prenom    || '',
                nom:       userData.nom       || '',
                email:     userData.email     || '',
                password:  userData.password_plain || '(voir avec un administrateur)',
                login_url: LOGIN_URL,
                site_name: 'Ngozistes du Royaume',
                from_name: 'Ngozistes du Royaume',
                reply_to:  'ngozisteduroyaume@gmail.com'
            };

            var response = await window.emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                templateParams
            );

            console.log('✅ Email envoyé à', userData.email, '— Status:', response.status);
            return { success: true, response: response };

        } catch (err) {
            console.error('❌ Erreur envoi email :', err);
            return { success: false, error: err.message || String(err) };
        }
    };

    // ──────────────────────────────────────────────
    // Envoyer un email de rejet (optionnel)
    // ──────────────────────────────────────────────
    window.sendRejectionEmail = async function (userData) {
        if (!userData || !userData.email) return { success: false };

        try {
            await loadEmailJS();
            var templateParams = {
                to_email:  userData.email,
                to_name:   (userData.prenom || '') + ' ' + (userData.nom || ''),
                prenom:    userData.prenom || '',
                nom:       userData.nom    || '',
                email:     userData.email  || '',
                password:  '',
                login_url: LOGIN_URL,
                site_name: 'Ngozistes du Royaume',
                from_name: 'Ngozistes du Royaume',
                reply_to:  'ngozisteduroyaume@gmail.com',
                statut:    'rejeté',
                message_custom: 'Votre demande d\'adhésion n\'a pas pu être acceptée cette fois-ci. N\'hésitez pas à nous contacter pour plus d\'informations.'
            };

            var response = await window.emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                templateParams
            );

            return { success: true, response: response };
        } catch (err) {
            console.error('Erreur envoi email rejet :', err);
            return { success: false, error: err.message };
        }
    };

    console.log('📧 Email service chargé — EmailJS');

})();
