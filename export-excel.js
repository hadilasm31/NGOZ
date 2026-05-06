/**
 * export-excel.js — Ngozistes du Royaume
 * 2 feuilles : Membres complets | Inscriptions aux événements
 */
(function (window) {
  'use strict';

  /* ─── Couleurs ARGB ─────────────────────────────────────────── */
  var C = {
    pri:    'FF2196F3',
    priD:   'FF1565C0',
    priL:   'FFBBDEFB',
    priVL:  'FFE3F2FD',
    white:  'FFFFFFFF',
    alt:    'FFF0F7FF',
    grey:   'FFF5F5F5',
    dGrey:  'FF9E9E9E',
    bdr:    'FFD0E4F7',
    gold:   'FFFFD54F',
    hdr:    'FF0D47A1',
    green:  'FF2E7D32', lGreen: 'FFE8F5E9',
    orange: 'FFE65100', lOrang: 'FFFFF3E0',
    red:    'FFC62828', lRed:   'FFFFEBEE',
    purple: 'FF6A1B9A', lPurp:  'FFF3E5F5',
    teal:   'FF00695C', lTeal:  'FFE0F2F1',
    amber:  'FFF57F17', lAmber: 'FFFFF8E1',
    indigo: 'FF283593', lIndi:  'FFE8EAF6',
  };

  /* ─── Helpers ───────────────────────────────────────────────── */
  function fill(a) { return { type:'pattern', pattern:'solid', fgColor:{ argb:a } }; }
  function fnt(o)  { return Object.assign({ name:'Calibri', size:10 }, o||{}); }
  function aln(h,v,w) { return { horizontal:h||'left', vertical:v||'middle', wrapText:!!w }; }
  function bdrAll(a) {
    var b = { style:'thin', color:{ argb:a||C.bdr } };
    return { top:b, left:b, bottom:b, right:b };
  }
  function bdrHdr(a) {
    var m = { style:'medium', color:{ argb:a||C.priD } };
    var d = { style:'double', color:{ argb:a||C.priD } };
    return { top:m, left:m, right:m, bottom:d };
  }
  function bdrMed(a) {
    var b = { style:'medium', color:{ argb:a||C.priD } };
    return { top:b, left:b, bottom:b, right:b };
  }

  /* ─── Bandeau titre ─────────────────────────────────────────── */
  function banner(ws, nb, title, sub, logoId, wb) {
    var hh = [8, 8, 48, 18, 8];
    for (var r=1; r<=5; r++) {
      ws.getRow(r).height = hh[r-1];
      for (var c=1; c<=nb; c++) ws.getCell(r,c).fill = fill(C.hdr);
    }
    if (logoId !== null && wb) {
      try { wb.addImage(logoId, { tl:{col:0,row:1}, br:{col:1.8,row:4.8}, editAs:'oneCell' }); } catch(_) {}
    }
    ws.mergeCells(3,1,3,nb);
    var tc = ws.getCell(3,1);
    tc.value = title; tc.fill = fill(C.hdr);
    tc.font  = fnt({ bold:true, size:20, color:{argb:C.gold} });
    tc.alignment = aln('center','middle');

    ws.mergeCells(4,1,4,nb);
    var sc = ws.getCell(4,1);
    sc.value = sub; sc.fill = fill(C.hdr);
    sc.font  = fnt({ size:9, italic:true, color:{argb:C.priL} });
    sc.alignment = aln('center','middle');

    ws.mergeCells(5,1,5,nb);
    ws.getCell(5,1).fill = fill(C.pri);
    return 5;
  }

  /* ─── En-tête colonnes ──────────────────────────────────────── */
  function colHdr(ws, row, defs, bg) {
    ws.getRow(row).height = 28;
    defs.forEach(function(d, i) {
      var cell = ws.getCell(row, i+1);
      cell.value     = d.label;
      cell.fill      = fill(bg||C.pri);
      cell.font      = fnt({ bold:true, size:10, color:{argb:C.white} });
      cell.alignment = aln('center','middle',true);
      cell.border    = bdrHdr(bg||C.priD);
    });
  }

  /* ─── Chargement ExcelJS ────────────────────────────────────── */
  function loadExcelJS(cb) {
    if (window.ExcelJS) { cb(null); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload  = function() { cb(null); };
    s.onerror = function() { cb(new Error('Impossible de charger ExcelJS')); };
    document.head.appendChild(s);
  }

  function dlFile(buf, filename) {
    var blob = new Blob([buf], {
      type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    var url = URL.createObjectURL(blob);
    var a   = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
  }

  /* ═══════════════════════════════════════════════════════════════
     POINT D'ENTRÉE
  ═══════════════════════════════════════════════════════════════ */
  function exportAll(data, opts) {
    opts = opts || {};
    var filename = opts.filename || ('ngozistes_'+new Date().toISOString().slice(0,10)+'.xlsx');
    var org      = opts.orgName  || 'Ngozistes du Royaume';
    var logoB64  = opts.logoB64  || null;

    loadExcelJS(function(err) {
      if (err) {
        if (window.showToast) window.showToast('Erreur : '+err.message, 'error');
        return;
      }
      try {
        var wb = new window.ExcelJS.Workbook();
        wb.creator = 'Dashboard Admin — '+org;
        wb.created = wb.modified = new Date();

        var logoId = null;
        if (logoB64) {
          try {
            var d2 = logoB64.replace(/^data:image\/(png|jpeg|gif);base64,/,'');
            var t2 = logoB64.indexOf('jpeg') !== -1 ? 'jpeg' : 'png';
            logoId = wb.addImage({ base64:d2, extension:t2 });
          } catch(_) {}
        }
        var L = { id:logoId, wb:wb };

        buildMembers(wb, data.members||[], org, L);
        buildRegistrations(wb, data.registrations||[], org, L);

        wb.xlsx.writeBuffer().then(function(buf) {
          dlFile(buf, filename);
          if (window.showToast)
            window.showToast('✅ Export Excel téléchargé — '+(data.members||[]).length+' membres', 'success', 5000);
        }).catch(function(e) {
          if (window.showToast) window.showToast('Erreur génération : '+e.message, 'error');
          console.error(e);
        });
      } catch(e) {
        console.error(e);
        if (window.showToast) window.showToast('Erreur : '+e.message, 'error');
      }
    });
  }

  function exportMembres(members, opts) {
    exportAll({ members:members, registrations:[] }, opts);
  }

  /* ═══════════════════════════════════════════════════════════════
     FEUILLE 1 — MEMBRES COMPLETS
  ═══════════════════════════════════════════════════════════════ */
  function buildMembers(wb, members, org, L) {
    var ws = wb.addWorksheet('👥 Membres', {
      views:[{ showGridLines:false, state:'frozen', xSplit:0, ySplit:7 }],
      pageSetup:{ paperSize:9, orientation:'landscape', fitToPage:true, fitToWidth:1,
                  margins:{ left:.5, right:.5, top:.75, bottom:.75, header:.3, footer:.3 } }
    });

    var defs = [
      { w:5,  label:'N°'               },
      { w:14, label:'Prénom'           },
      { w:14, label:'Nom'              },
      { w:28, label:'Email'            },
      { w:16, label:'Téléphone'        },
      { w:14, label:'Ville'            },
      { w:13, label:'Rôle'             },
      { w:11, label:'Statut'           },
      { w:9,  label:'Bureau'           },
      { w:11, label:'Lycée tech.'      },
      { w:26, label:'Nom lycée'        },
      { w:18, label:'Filière'          },
      { w:12, label:'Année départ'     },
      { w:40, label:'Motivation'       },
      { w:16, label:'Date inscription' },
    ];
    var NB = defs.length; // 15
    ws.columns = defs.map(function(d){ return { width:d.w }; });

    var lastH = banner(ws, NB,
      org.toUpperCase()+' — REGISTRE DES MEMBRES',
      members.length+' membre(s) — Exporté le '+new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}),
      L.id, L.wb
    );

    colHdr(ws, lastH+1, defs, C.pri);

    var roleC = {
      super_admin: { f:C.lRed,   c:C.red,    lbl:'Super Admin'    },
      admin:       { f:C.lOrang, c:C.orange,  lbl:'Administrateur' },
      member:      { f:C.lGreen, c:C.green,   lbl:'Membre'         },
      pending:     { f:C.lAmber, c:C.amber,   lbl:'En attente'     },
      inactive:    { f:C.grey,   c:C.dGrey,   lbl:'Inactif'        },
    };
    var statC = {
      active:   { f:C.lGreen, c:C.green  },
      inactive: { f:C.lRed,   c:C.red    },
      pending:  { f:C.lAmber, c:C.amber  },
    };

    members.forEach(function(m, idx) {
      var rn  = lastH + 2 + idx;
      var bg  = idx % 2 === 0 ? C.white : C.alt;
      var md  = m.metadata || {};
      var rol = (m.role   || 'member').toLowerCase();
      var sta = (m.status || 'active').toLowerCase();
      var bur = m.bureau === true || m.bureau === 'true';
      var lyc = m.lycee_technique === true || m.lycee_technique === 'true';
      var rc  = roleC[rol] || { f:C.grey,   c:C.dGrey,  lbl:rol };
      var sc  = statC[sta] || { f:C.lGreen, c:C.green            };

      // Téléphone : chercher dans tous les champs possibles
      var tel      = m.telephone || m.phone || (md && md.telephone) || '';
      var nomLycee = m.nom_lycee   || (md && md.nom_lycee)   || '';
      var filiere  = m.filiere     || (md && md.filiere)     || '';
      var annee    = m.annee_depart || (md && md.annee_depart) || '';
      // Motivation
      var motiv    = m.motivation  || '';
      var dateI    = (m.date_inscription || '').slice(0,10);

      // Hauteur adaptée si motivation longue
      var row = ws.getRow(rn);
      row.height = motiv && motiv.length > 80 ? 52 : motiv && motiv.length > 40 ? 36 : 20;

      var vals = [
        idx+1,
        m.prenom || '',
        m.nom    || '',
        m.email  || '',
        tel,
        m.ville  || '',
        rc.lbl,
        sta.charAt(0).toUpperCase() + sta.slice(1),
        bur ? '✓ Oui' : 'Non',
        lyc ? '✓ Oui' : 'Non',
        nomLycee,
        filiere,
        annee ? String(annee) : '',
        motiv,
        dateI,
      ];

      vals.forEach(function(val, ci) {
        var cell = ws.getCell(rn, ci+1);

        var cellFill  = bg;
        var cellFont  = { size:9 };
        var centerCols = [0,4,5,6,7,8,9,12,14];
        var cellAlignH = centerCols.indexOf(ci) !== -1 ? 'center' : 'left';
        var wrap = ci === 13;

        if (ci === 6)  { cellFill = rc.f; cellFont = { size:9, bold:true, color:{argb:rc.c} }; }
        if (ci === 7)  { cellFill = sc.f; cellFont = { size:9, bold:true, color:{argb:sc.c} }; }
        if (ci === 8 && bur) { cellFill = C.lPurp; cellFont = { size:9, bold:true, color:{argb:C.purple} }; }
        if (ci === 9)  {
          cellFill = lyc ? C.lGreen : C.grey;
          cellFont = { size:9, bold:lyc, color:{argb: lyc ? C.green : C.dGrey} };
        }
        if (ci === 13 && motiv) { cellFont = { size:8, italic:true }; }

        cell.value     = (val === null || val === undefined || val === '') ? '—' : val;
        cell.fill      = fill(cellFill);
        cell.font      = fnt(cellFont);
        cell.alignment = aln(cellAlignH, 'middle', wrap);
        cell.border    = bdrAll(C.bdr);
      });
    });

    // ── RÉSUMÉ PROFESSIONNEL EN BAS ──────────────────────────────
    var dataRows = members.length;
    var totR     = lastH + 2 + dataRows;

    // Calculs
    var actifs    = members.filter(function(m){ return m.status==='active'; }).length;
    var inactifs  = members.filter(function(m){ return m.status==='inactive'; }).length;
    var enAttente = members.filter(function(m){ return m.status==='pending'||m.role==='pending'; }).length;
    var bureaux   = members.filter(function(m){ return m.bureau===true||m.bureau==='true'; }).length;
    var avecLyc   = members.filter(function(m){ return m.lycee_technique===true||m.lycee_technique==='true'; }).length;
    var sansLyc   = members.length - avecLyc;
    var lycSet    = {};
    members.forEach(function(m){ var md=m.metadata||{}; var nl=m.nom_lycee||md.nom_lycee||''; if(nl) lycSet[nl.toLowerCase().trim()]=true; });
    var nbLycUniq = Object.keys(lycSet).length;
    var villeSet  = {};
    members.forEach(function(m){ if(m.ville) villeSet[m.ville.toLowerCase().trim()]=true; });
    var nbVilles  = Object.keys(villeSet).length;

    // Séparateur
    ws.getRow(totR).height = 12;
    ws.mergeCells(totR,1,totR,NB);
    ws.getCell(totR,1).fill = fill(C.white);
    totR++;

    // Titre section
    ws.getRow(totR).height = 22;
    ws.mergeCells(totR,1,totR,NB);
    var titR = ws.getCell(totR,1);
    titR.value     = 'RÉCAPITULATIF';
    titR.fill      = fill(C.priD);
    titR.font      = fnt({ bold:true, size:11, color:{argb:C.white} });
    titR.alignment = aln('center','middle');
    titR.border    = bdrMed(C.priD);
    totR++;

    // En-têtes tableau résumé (6 colonnes fusionnées sur NB=15)
    // Col 1-3 : Indicateur | Col 4-6 : Valeur | Col 7-9 : Indicateur | Col 10-12 : Valeur | 13-15 vide
    ws.getRow(totR).height = 20;
    function resumeHdr(col, span, label, bg) {
      ws.mergeCells(totR, col, totR, col+span-1);
      var h = ws.getCell(totR, col);
      h.value = label; h.fill = fill(bg||C.priD);
      h.font  = fnt({ bold:true, size:9, color:{argb:C.white} });
      h.alignment = aln('center','middle');
      h.border = bdrHdr(bg||C.priD);
    }
    resumeHdr(1,  5, 'INDICATEUR',   C.priD);
    resumeHdr(6,  3, 'VALEUR',       C.priD);
    resumeHdr(9,  4, 'INDICATEUR',   C.priD);
    resumeHdr(13, 3, 'VALEUR',       C.priD);
    totR++;

    // Lignes du tableau résumé : 2 colonnes d'indicateurs côte à côte
    var lignes = [
      { lbl:'Nombre total de membres',          val:members.length,  lbl2:'Membres actifs',              val2:actifs         },
      { lbl:'Membres inactifs',                 val:inactifs,        lbl2:'Membres en attente',          val2:enAttente      },
      { lbl:'Membres du bureau',                val:bureaux,         lbl2:'Villes représentées',         val2:nbVilles       },
      { lbl:'Membres avec lycée technique',     val:avecLyc,         lbl2:'Membres sans lycée technique',val2:sansLyc        },
      { lbl:'Lycées distincts (sans doublon)',   val:nbLycUniq,       lbl2:'Date export',         val2:new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}) },
    ];

    // Couleurs valeurs
    var valColors = [C.pri, C.green, C.orange, C.teal, C.purple];

    lignes.forEach(function(lg, i) {
      var bg  = i%2===0 ? C.priVL : C.white;
      var vc  = valColors[i] || C.pri;
      ws.getRow(totR).height = 20;

      // Colonne libellé gauche
      ws.mergeCells(totR,1,totR,5);
      var lc = ws.getCell(totR,1);
      lc.value = lg.lbl; lc.fill = fill(bg);
      lc.font  = fnt({ size:9, color:{argb:C.priD} });
      lc.alignment = aln('left','middle');
      lc.border = bdrAll(C.bdr);

      // Valeur gauche
      ws.mergeCells(totR,6,totR,8);
      var vc1 = ws.getCell(totR,6);
      vc1.value = lg.val; vc1.fill = fill(bg);
      vc1.font  = fnt({ bold:true, size:11, color:{argb:vc} });
      vc1.alignment = aln('center','middle');
      vc1.border = bdrAll(C.bdr);

      // Colonne libellé droite
      ws.mergeCells(totR,9,totR,12);
      var lc2 = ws.getCell(totR,9);
      lc2.value = lg.lbl2; lc2.fill = fill(bg);
      lc2.font  = fnt({ size:9, color:{argb:C.priD} });
      lc2.alignment = aln('left','middle');
      lc2.border = bdrAll(C.bdr);

      // Valeur droite
      ws.mergeCells(totR,13,totR,15);
      var vc2 = ws.getCell(totR,13);
      vc2.value = lg.val2; vc2.fill = fill(bg);
      vc2.font  = fnt({ bold:true, size:11, color:{argb:vc} });
      vc2.alignment = aln('center','middle');
      vc2.border = bdrAll(C.bdr);

      totR++;
    });

    ws.autoFilter = {
      from:{ row:lastH+1, column:1 },
      to:  { row:lastH+1+dataRows-1, column:NB }
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     FEUILLE 2 — INSCRIPTIONS
  ═══════════════════════════════════════════════════════════════ */
  function buildRegistrations(wb, regs, org, L) {
    var ws = wb.addWorksheet('📋 Inscriptions', {
      views:[{ showGridLines:false, state:'frozen', xSplit:0, ySplit:7 }],
      pageSetup:{ paperSize:9, orientation:'landscape', fitToPage:true, fitToWidth:1 }
    });

    var defs = [
      { w:5,  label:'N°'             },
      { w:14, label:'Prénom'         },
      { w:14, label:'Nom'            },
      { w:26, label:'Email'          },
      { w:16, label:'Téléphone'      },
      { w:13, label:'Ville'          },
      { w:30, label:'Événement'      },
      { w:22, label:'Date événement' },
      { w:13, label:'Accompagnants'  },
      { w:18, label:'Inscrit le'     },
      { w:36, label:'Message'        },
    ];
    var NB = defs.length; // 11
    ws.columns = defs.map(function(d){ return { width:d.w }; });

    var lastH = banner(ws, NB,
      org.toUpperCase()+' — INSCRIPTIONS AUX ÉVÉNEMENTS',
      regs.length+' inscription(s) — Exporté le '+new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}),
      L.id, L.wb
    );
    colHdr(ws, lastH+1, defs, C.priD);

    var totalGuests = 0;

    regs.forEach(function(reg, idx) {
      var rn     = lastH + 2 + idx;
      var bg     = idx % 2 === 0 ? C.white : C.alt;
      var u      = reg.user  || {};
      var ev     = reg.event || {};
      var umd    = u.metadata || {};
      var guests = parseInt(reg.guests, 10) || 0;
      totalGuests += guests;

      // Téléphone depuis tous les champs possibles du user
      var tel     = u.telephone || u.phone || (umd && umd.telephone) || '';
      var evDate  = ev.date
        ? new Date(ev.date).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long',year:'numeric'})
        : '—';
      var regDate = reg.registered_at
        ? new Date(reg.registered_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})
        : '—';

      var row = ws.getRow(rn);
      row.height = (reg.message && reg.message.length > 60) ? 36 : 20;

      var vals = [
        idx+1,
        u.prenom || '', u.nom || '', u.email || '',
        tel,
        u.ville  || '',
        ev.title || '',
        evDate,
        guests,
        regDate,
        reg.message || '',
      ];

      vals.forEach(function(val, ci) {
        var cell = ws.getCell(rn, ci+1);
        var cellFill  = bg;
        var cellFont  = { size:9 };
        var centerCols = [0,4,5,7,8,9];
        var cellAlignH = centerCols.indexOf(ci) !== -1 ? 'center' : 'left';
        var wrap = ci === 10;

        if (ci === 8 && guests > 0) {
          cellFill = C.lAmber;
          cellFont = { size:9, bold:true, color:{argb:C.amber} };
        }
        if (ci === 10 && reg.message) { cellFont = { size:8, italic:true }; }

        cell.value     = (val===null||val===undefined||val==='') ? '—' : val;
        cell.fill      = fill(cellFill);
        cell.font      = fnt(cellFont);
        cell.alignment = aln(cellAlignH, 'middle', wrap);
        cell.border    = bdrAll(C.bdr);
      });
    });

    // ── RÉCAPITULATIF PROFESSIONNEL ───────────────────────────────
    var dataRows = regs.length;
    var totR     = lastH + 2 + dataRows;

    // Calculs
    var evMap = {};
    regs.forEach(function(reg){
      var ev  = reg.event || {};
      var key = ev.title || 'Événement inconnu';
      if (!evMap[key]) evMap[key] = { count:0, guests:0 };
      evMap[key].count++;
      evMap[key].guests += parseInt(reg.guests,10)||0;
    });
    var nbEvts = Object.keys(evMap).length;

    // Séparateur
    ws.getRow(totR).height = 12;
    ws.mergeCells(totR,1,totR,NB);
    ws.getCell(totR,1).fill = fill(C.white);
    totR++;

    // ── Titre récapitulatif global
    ws.getRow(totR).height = 22;
    ws.mergeCells(totR,1,totR,NB);
    var tR = ws.getCell(totR,1);
    tR.value = 'RÉCAPITULATIF'; tR.fill = fill(C.priD);
    tR.font  = fnt({ bold:true, size:11, color:{argb:C.white} });
    tR.alignment = aln('center','middle');
    tR.border = bdrMed(C.priD);
    totR++;

    // En-têtes tableau global
    ws.getRow(totR).height = 20;
    function hdr2(col, span, label) {
      ws.mergeCells(totR, col, totR, col+span-1);
      var h = ws.getCell(totR, col);
      h.value = label; h.fill = fill(C.priD);
      h.font  = fnt({ bold:true, size:9, color:{argb:C.white} });
      h.alignment = aln('center','middle');
      h.border = bdrHdr(C.priD);
    }
    hdr2(1,  4, 'INDICATEUR');
    hdr2(5,  3, 'VALEUR');
    hdr2(8,  4, 'INDICATEUR');
    hdr2(12, 3, 'VALEUR');   // NB=11 → col 12 dépasse, on cap à NB
    // Pour NB=11 : 1-4 | 5-7 | 8-10 | 11
    ws.unmergeCells && true; // no-op, juste pour lisibilité
    totR++;

    // Lignes récapitulatif global (2 colonnes côte à côte)
    var gLignes = [
      { lbl:'Total inscriptions',      val:regs.length,              lbl2:'Événements concernés',       val2:nbEvts              },
      { lbl:'Accompagnants déclarés',  val:totalGuests,              lbl2:'Total participants',          val2:regs.length+totalGuests },
      { lbl:'Date export',     val:new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}), lbl2:'', val2:'' },
    ];
    var gColors = [C.pri, C.teal, C.priD];
    gLignes.forEach(function(lg, i){
      var bg = i%2===0 ? C.priVL : C.white;
      var vc = gColors[i]||C.pri;
      ws.getRow(totR).height = 20;

      // Pour NB=11 : col 1-4 libellé, 5-7 val, 8-10 libellé2, 11 val2
      ws.mergeCells(totR,1,totR,4);
      var lc1 = ws.getCell(totR,1);
      lc1.value = lg.lbl; lc1.fill = fill(bg);
      lc1.font  = fnt({ size:9, color:{argb:C.priD} });
      lc1.alignment = aln('left','middle'); lc1.border = bdrAll(C.bdr);

      ws.mergeCells(totR,5,totR,7);
      var vc1 = ws.getCell(totR,5);
      vc1.value = lg.val; vc1.fill = fill(bg);
      vc1.font  = fnt({ bold:true, size:11, color:{argb:vc} });
      vc1.alignment = aln('center','middle'); vc1.border = bdrAll(C.bdr);

      ws.mergeCells(totR,8,totR,10);
      var lc2 = ws.getCell(totR,8);
      lc2.value = lg.lbl2; lc2.fill = fill(bg);
      lc2.font  = fnt({ size:9, color:{argb:C.priD} });
      lc2.alignment = aln('left','middle'); lc2.border = bdrAll(C.bdr);

      // col 11 seule (NB=11)
      var vc2 = ws.getCell(totR,11);
      vc2.value = lg.val2; vc2.fill = fill(bg);
      vc2.font  = fnt({ bold:true, size:11, color:{argb:vc} });
      vc2.alignment = aln('center','middle'); vc2.border = bdrAll(C.bdr);

      totR++;
    });

    // Espace
    ws.getRow(totR).height = 12;
    ws.mergeCells(totR,1,totR,NB);
    ws.getCell(totR,1).fill = fill(C.white);
    totR++;

    // ── Détail par événement
    if (nbEvts > 0) {
      // Titre
      ws.getRow(totR).height = 22;
      ws.mergeCells(totR,1,totR,NB);
      var evTit = ws.getCell(totR,1);
      evTit.value = 'DÉTAIL PAR ÉVÉNEMENT';
      evTit.fill  = fill(C.pri);
      evTit.font  = fnt({ bold:true, size:11, color:{argb:C.white} });
      evTit.alignment = aln('center','middle');
      evTit.border = bdrMed(C.pri);
      totR++;

      // En-têtes colonnes détail — adaptées à NB=11
      ws.getRow(totR).height = 22;
      var evHdrs = [
        { col:1, span:6, label:'Événement'                     },
        { col:7, span:2, label:'Inscrits'                      },
        { col:9, span:2, label:'Accompagnants'                 },
        { col:11,span:1, label:'Total participants'            },
      ];
      evHdrs.forEach(function(ec){
        ws.mergeCells(totR, ec.col, totR, ec.col+ec.span-1);
        var hc = ws.getCell(totR, ec.col);
        hc.value = ec.label; hc.fill = fill(C.priD);
        hc.font  = fnt({ bold:true, size:9, color:{argb:C.white} });
        hc.alignment = aln('center','middle',true);
        hc.border = bdrHdr(C.priD);
      });
      totR++;

      // Lignes détail
      Object.entries(evMap).sort(function(a,b){ return b[1].count-a[1].count; }).forEach(function(e, i){
        var bg      = i%2===0 ? C.white : C.alt;
        var ptotal  = e[1].count + e[1].guests;
        ws.getRow(totR).height = 19;

        ws.mergeCells(totR,1,totR,6);
        var nc = ws.getCell(totR,1);
        nc.value = e[0]; nc.fill = fill(bg);
        nc.font  = fnt({ size:9 });
        nc.alignment = aln('left','middle'); nc.border = bdrAll(C.bdr);

        ws.mergeCells(totR,7,totR,8);
        var ic = ws.getCell(totR,7);
        ic.value = e[1].count; ic.fill = fill(bg);
        ic.font  = fnt({ bold:true, size:10, color:{argb:C.pri} });
        ic.alignment = aln('center','middle'); ic.border = bdrAll(C.bdr);

        ws.mergeCells(totR,9,totR,10);
        var gc = ws.getCell(totR,9);
        gc.value = e[1].guests;
        gc.fill  = fill(e[1].guests>0 ? C.lAmber : bg);
        gc.font  = fnt({ bold:e[1].guests>0, size:10, color:{argb:e[1].guests>0 ? C.amber : C.dGrey} });
        gc.alignment = aln('center','middle'); gc.border = bdrAll(C.bdr);

        var pc = ws.getCell(totR,11);
        pc.value = ptotal; pc.fill = fill(bg);
        pc.font  = fnt({ bold:true, size:10, color:{argb:C.teal} });
        pc.alignment = aln('center','middle'); pc.border = bdrAll(C.bdr);

        totR++;
      });

      // Ligne de total détail
      ws.getRow(totR).height = 22;
      ws.mergeCells(totR,1,totR,6);
      var tl = ws.getCell(totR,1);
      tl.value = 'TOTAL GÉNÉRAL'; tl.fill = fill(C.priD);
      tl.font  = fnt({ bold:true, size:10, color:{argb:C.white} });
      tl.alignment = aln('right','middle'); tl.border = bdrMed(C.priD);

      ws.mergeCells(totR,7,totR,8);
      var ti = ws.getCell(totR,7);
      ti.value = regs.length; ti.fill = fill(C.pri);
      ti.font  = fnt({ bold:true, size:11, color:{argb:C.white} });
      ti.alignment = aln('center','middle'); ti.border = bdrMed(C.pri);

      ws.mergeCells(totR,9,totR,10);
      var tg = ws.getCell(totR,9);
      tg.value = totalGuests; tg.fill = fill(C.amber);
      tg.font  = fnt({ bold:true, size:11, color:{argb:C.white} });
      tg.alignment = aln('center','middle'); tg.border = bdrMed(C.amber);

      var tp = ws.getCell(totR,11);
      tp.value = regs.length+totalGuests; tp.fill = fill(C.teal);
      tp.font  = fnt({ bold:true, size:11, color:{argb:C.white} });
      tp.alignment = aln('center','middle'); tp.border = bdrMed(C.teal);
      totR++;
    }

    ws.autoFilter = {
      from:{ row:lastH+1, column:1 },
      to:  { row:lastH+1+dataRows-1, column:NB }
    };
  }

  /* ─── API publique ──────────────────────────────────────────── */
  window.NgozExport = {
    exportAll:     exportAll,
    exportMembres: exportMembres,
  };

})(window);