/* Bearbeiten-Modus: nur aktiv mit ?bearbeiten in der Adresse.
   Änderungen werden NICHT gespeichert, sondern als Liste zusammengefasst,
   die per Kopieren/WhatsApp weitergegeben und danach sauber programmiert wird. */
(function(){
  var KEY = 'antoniushaus-bearbeiten-v1';
  var mode = null;                 // 'text' | 'move' | 'hide' | 'note'
  var changes = { text:{}, move:{}, hide:{}, notes:[] };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) changes = saved; } catch(e){}
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(changes)); } catch(e){} renderCount(); }

  /* ---------- Hilfen ---------- */
  function path(el){
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body){
      if (el.id){ parts.unshift('#' + el.id); break; }
      var i = 1, s = el; while ((s = s.previousElementSibling)) if (s.tagName === el.tagName) i++;
      parts.unshift(el.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function find(p){ try { return document.querySelector(p); } catch(e){ return null; } }
  function area(el){
    var sec = el.closest('section, header, footer, nav');
    if (!sec) return 'Seite';
    var h = sec.querySelector('h1, h2');
    return (h ? '„' + h.textContent.trim().slice(0, 40) + '“' : '') + (sec.id ? ' (#' + sec.id + ')' : ' (' + sec.tagName.toLowerCase() + ')');
  }
  function snippet(t){ t = (t || '').replace(/\s+/g, ' ').trim(); return t.length > 60 ? t.slice(0, 57) + '…' : t; }
  function inUi(el){ return el && el.closest && el.closest('#bx-ui, .bx-note'); }
  var INLINE = /^(SPAN|B|I|EM|STRONG|A|SMALL|IMG|BR|OUTPUT|LABEL|INPUT)$/;
  function block(el){
    if (el.closest('svg')) el = el.closest('.stage') || el.closest('svg');
    var stage = el.closest('.stage'); if (stage) return stage;
    // Reine Inline-Elemente (Wort in einem Absatz) → umgebenden Block nehmen; Buttons/Links mit eigener Box bleiben einzeln
    while (el && el.parentElement && el.parentElement !== document.body && INLINE.test(el.tagName) && getComputedStyle(el).display === 'inline') el = el.parentElement;
    return el;
  }

  /* ---------- Stile ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#bx-ui{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;background:#1d2b23;color:#fff;border-radius:16px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;box-shadow:0 8px 30px rgba(0,0,0,.35);font:600 13px/1.2 system-ui,sans-serif;max-width:calc(100vw - 24px)}' +
    '#bx-ui button{border:0;border-radius:10px;padding:9px 11px;background:#2F4A3A;color:#fff;font:inherit;cursor:pointer}' +
    '#bx-ui button.on{background:#B08D57;color:#1d2b23}' +
    '#bx-ui .bx-go{background:#25D366;color:#0b3d1f}' +
    '#bx-ui .bx-info{width:100%;text-align:center;font-weight:400;font-size:12px;opacity:.85;padding:2px 4px}' +
    'body.bx-text [data-bx-edit]{outline:1.5px dashed #B08D57;outline-offset:2px;cursor:text}' +
    'body.bx-move .bx-hover{outline:2px solid #3b82f6!important;outline-offset:2px;cursor:grab}' +
    'body.bx-hide .bx-hover,body.bx-note .bx-hover{outline:2px solid #ef4444!important;outline-offset:2px;cursor:pointer}' +
    '.bx-moved{outline:2px dashed #3b82f6;outline-offset:2px;position:relative;z-index:50}' +
    '.bx-hidden{opacity:.18!important;outline:2px dashed #ef4444;outline-offset:2px}' +
    '.bx-changed{background:rgba(176,141,87,.18)}' +
    '.bx-note{position:absolute;z-index:9998;background:#fde68a;color:#3b2f0a;font:13px/1.3 system-ui,sans-serif;padding:6px 8px;border-radius:8px;box-shadow:0 3px 10px rgba(0,0,0,.25);max-width:220px;cursor:pointer}' +
    '#bx-modal{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '#bx-modal>div{background:#fff;color:#1d2b23;border-radius:14px;padding:16px;width:min(640px,100%);max-height:90vh;display:flex;flex-direction:column;gap:10px;font:14px/1.4 system-ui,sans-serif}' +
    '#bx-modal textarea{width:100%;min-height:260px;flex:1;font:12px/1.4 ui-monospace,monospace;border:1px solid #ccc;border-radius:8px;padding:8px}' +
    '#bx-modal .row{display:flex;flex-wrap:wrap;gap:8px}' +
    '#bx-modal button,#bx-modal a{border:0;border-radius:10px;padding:10px 14px;background:#2F4A3A;color:#fff;font:600 14px system-ui;cursor:pointer;text-decoration:none}' +
    '#bx-modal .wa{background:#25D366;color:#0b3d1f}';
  document.head.appendChild(css);

  /* ---------- Werkzeugleiste ---------- */
  var ui = document.createElement('div'); ui.id = 'bx-ui';
  ui.innerHTML =
    '<button data-m="text">✏️ Text</button>' +
    '<button data-m="move">✋ Verschieben</button>' +
    '<button data-m="hide">🚫 Weg damit</button>' +
    '<button data-m="note">📝 Notiz</button>' +
    '<button data-a="reset">↺ Alles zurück</button>' +
    '<button data-a="done" class="bx-go">✅ Fertig (<span id="bx-n">0</span>)</button>' +
    '<div class="bx-info" id="bx-info">Bearbeiten-Modus · Wähle ein Werkzeug</div>';
  document.body.appendChild(ui);
  var INFO = {
    text: 'Text antippen und einfach lostippen.',
    move: 'Element festhalten und an die neue Stelle ziehen.',
    hide: 'Element antippen, das weg soll. Nochmal antippen = zurück.',
    note: 'Stelle antippen und eine Notiz schreiben, z. B. „Hier ein Foto vom Balkon“.'
  };
  function setMode(m){
    mode = mode === m ? null : m;
    document.body.classList.remove('bx-text','bx-move','bx-hide','bx-note');
    if (mode) document.body.classList.add('bx-' + mode);
    ui.querySelectorAll('[data-m]').forEach(function(b){ b.classList.toggle('on', b.dataset.m === mode); });
    document.getElementById('bx-info').textContent = mode ? INFO[mode] : 'Bearbeiten-Modus · Wähle ein Werkzeug';
    toggleEditable(mode === 'text');
  }
  ui.querySelectorAll('[data-m]').forEach(function(b){ b.onclick = function(){ setMode(b.dataset.m); }; });
  ui.querySelector('[data-a=reset]').onclick = function(){
    if (!confirm('Alle Änderungen im Bearbeiten-Modus verwerfen?')) return;
    changes = { text:{}, move:{}, hide:{}, notes:[] }; save(); location.reload();
  };
  ui.querySelector('[data-a=done]').onclick = showReport;
  function count(){ return Object.keys(changes.text).length + Object.keys(changes.move).length + Object.keys(changes.hide).length + changes.notes.length; }
  function renderCount(){ var n = document.getElementById('bx-n'); if (n) n.textContent = count(); }

  /* ---------- Text ---------- */
  var TEXT_SEL = 'h1,h2,h3,h4,p,li,summary,dt,dd,td,th,figcaption,blockquote,label,button,a,.label,.tag,b,strong';
  function textTargets(){
    return Array.prototype.filter.call(document.querySelectorAll(TEXT_SEL), function(el){
      if (inUi(el) || el.closest('svg')) return false;
      // nur Elemente, die eigenen Text enthalten
      return Array.prototype.some.call(el.childNodes, function(n){ return n.nodeType === 3 && n.textContent.trim(); });
    });
  }
  function toggleEditable(on){
    textTargets().forEach(function(el){
      if (on){ el.setAttribute('contenteditable', 'true'); el.setAttribute('data-bx-edit', ''); }
      else { el.removeAttribute('contenteditable'); el.removeAttribute('data-bx-edit'); }
    });
  }
  document.addEventListener('focusin', function(e){
    var el = e.target; if (mode !== 'text' || !el.hasAttribute || !el.hasAttribute('data-bx-edit')) return;
    var p = path(el); if (!changes.text[p]) el.dataset.bxOrig = el.textContent;
  });
  document.addEventListener('input', function(e){
    var el = e.target; if (mode !== 'text' || !el.hasAttribute || !el.hasAttribute('data-bx-edit')) return;
    var p = path(el), orig = changes.text[p] ? changes.text[p].vorher : (el.dataset.bxOrig || '');
    if (el.textContent.trim() === orig.trim()) { delete changes.text[p]; el.classList.remove('bx-changed'); }
    else { changes.text[p] = { bereich: area(el), vorher: orig, nachher: el.textContent }; el.classList.add('bx-changed'); }
    save();
  });

  /* ---------- Klicks während der Bearbeitung abfangen (keine Links, keine Buttons) ---------- */
  document.addEventListener('click', function(e){
    if (!mode || inUi(e.target)) return;
    if (mode === 'text'){ if (e.target.closest('a,button,label,summary')){ e.preventDefault(); } return; }
    e.preventDefault(); e.stopPropagation();
    var el = block(e.target);
    if (mode === 'hide'){
      var p = path(el);
      if (changes.hide[p]){ delete changes.hide[p]; el.classList.remove('bx-hidden'); }
      else { changes.hide[p] = { bereich: area(el), element: snippet(el.textContent) || el.tagName.toLowerCase() }; el.classList.add('bx-hidden'); }
      save();
    }
    if (mode === 'note'){
      var t = prompt('Notiz zu dieser Stelle:'); if (!t) return;
      var r = el.getBoundingClientRect();
      var n = { pfad: path(el), bereich: area(el), element: snippet(el.textContent) || el.tagName.toLowerCase(), text: t,
                x: Math.round(e.clientX - r.left), y: Math.round(e.clientY - r.top) };
      changes.notes.push(n); save(); drawNote(n);
    }
  }, true);

  /* ---------- Hover-Rahmen ---------- */
  var hov = null;
  document.addEventListener('pointerover', function(e){
    if (!mode || mode === 'text' || inUi(e.target)) return;
    if (hov) hov.classList.remove('bx-hover');
    hov = block(e.target); if (hov) hov.classList.add('bx-hover');
  });

  /* ---------- Verschieben ---------- */
  var drag = null;
  function applyMove(el, m){ el.style.transform = 'translate(' + m.dx + 'px,' + m.dy + 'px)'; el.classList.add('bx-moved'); }
  document.addEventListener('pointerdown', function(e){
    if (mode !== 'move' || inUi(e.target)) return;
    var el = block(e.target); if (!el) return;
    e.preventDefault();
    var p = path(el), m = changes.move[p] || { dx:0, dy:0 };
    drag = { el: el, p: p, sx: e.clientX - m.dx, sy: e.clientY - m.dy };
    el.style.transition = 'none'; el.style.touchAction = 'none';
    try { el.setPointerCapture(e.pointerId); } catch(_){}
  }, true);
  document.addEventListener('pointermove', function(e){
    if (!drag) return; e.preventDefault();
    applyMove(drag.el, { dx: e.clientX - drag.sx, dy: e.clientY - drag.sy });
  }, { passive:false });
  document.addEventListener('pointerup', function(e){
    if (!drag) return;
    var dx = Math.round(e.clientX - drag.sx), dy = Math.round(e.clientY - drag.sy);
    if (Math.abs(dx) + Math.abs(dy) < 4){ drag = null; return; }
    var el = drag.el, r = el.getBoundingClientRect();
    // Was liegt jetzt an der Stelle? Hilft beim Beschreiben, wohin es soll.
    el.style.pointerEvents = 'none';
    var under = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    el.style.pointerEvents = '';
    changes.move[drag.p] = { bereich: area(el), element: snippet(el.textContent) || el.tagName.toLowerCase(), dx: dx, dy: dy,
                             neben: under && !inUi(under) ? snippet(block(under).textContent) || block(under).tagName.toLowerCase() : '' };
    save(); drag = null;
  });
  // Touch-Scrollen beim Ziehen verhindern
  document.addEventListener('touchmove', function(e){ if (drag) e.preventDefault(); }, { passive:false });

  /* ---------- Notizen zeichnen ---------- */
  function drawNote(n){
    var el = find(n.pfad); if (!el) return;
    var d = document.createElement('div'); d.className = 'bx-note'; d.textContent = '📝 ' + n.text;
    var r = el.getBoundingClientRect();
    d.style.left = (r.left + scrollX + n.x) + 'px'; d.style.top = (r.top + scrollY + n.y) + 'px';
    d.title = 'Antippen zum Löschen';
    d.onclick = function(ev){ ev.stopPropagation(); if (!confirm('Notiz löschen?')) return; changes.notes = changes.notes.filter(function(x){ return x !== n; }); d.remove(); save(); };
    document.body.appendChild(d);
  }

  /* ---------- Gespeicherten Stand wiederherstellen ---------- */
  function restore(){
    Object.keys(changes.text).forEach(function(p){ var el = find(p); if (el){ el.textContent = changes.text[p].nachher; el.classList.add('bx-changed'); } });
    Object.keys(changes.move).forEach(function(p){ var el = find(p); if (el) applyMove(el, changes.move[p]); });
    Object.keys(changes.hide).forEach(function(p){ var el = find(p); if (el) el.classList.add('bx-hidden'); });
    changes.notes.forEach(drawNote);
    renderCount();
  }

  /* ---------- Bericht ---------- */
  function report(){
    var L = ['Änderungswünsche für die Seite (' + location.origin + location.pathname + ')', ''];
    var t = Object.keys(changes.text), m = Object.keys(changes.move), h = Object.keys(changes.hide);
    if (t.length){ L.push('TEXTE ÄNDERN'); t.forEach(function(p, i){ var c = changes.text[p]; L.push((i+1) + '. Bereich ' + c.bereich, '   vorher:  ' + c.vorher.replace(/\s+/g,' ').trim(), '   nachher: ' + c.nachher.replace(/\s+/g,' ').trim(), '   [' + p + ']'); }); L.push(''); }
    if (m.length){ L.push('VERSCHIEBEN'); m.forEach(function(p, i){ var c = changes.move[p]; L.push((i+1) + '. „' + c.element + '“ im Bereich ' + c.bereich, '   ' + (c.dy < 0 ? Math.abs(c.dy) + ' px nach oben' : c.dy + ' px nach unten') + ', ' + (c.dx < 0 ? Math.abs(c.dx) + ' px nach links' : c.dx + ' px nach rechts') + (c.neben ? ', liegt jetzt bei „' + c.neben + '“' : ''), '   [' + p + ']'); }); L.push(''); }
    if (h.length){ L.push('ENTFERNEN'); h.forEach(function(p, i){ var c = changes.hide[p]; L.push((i+1) + '. „' + c.element + '“ im Bereich ' + c.bereich, '   [' + p + ']'); }); L.push(''); }
    if (changes.notes.length){ L.push('NOTIZEN'); changes.notes.forEach(function(n, i){ L.push((i+1) + '. ' + n.text, '   bei „' + n.element + '“ im Bereich ' + n.bereich, '   [' + n.pfad + ']'); }); L.push(''); }
    L.push('Bildschirmbreite beim Bearbeiten: ' + innerWidth + ' px');
    return L.join('\n');
  }
  function showReport(){
    if (!count()){ alert('Noch keine Änderungen. Wähle unten ein Werkzeug.'); return; }
    var txt = report();
    var m = document.createElement('div'); m.id = 'bx-modal';
    m.innerHTML = '<div><b>Deine Änderungen</b><span>Kopiere den Text und schick ihn an Claude. Dann wird alles sauber eingebaut.</span><textarea readonly></textarea>' +
      '<div class="row"><button data-x="copy">📋 Kopieren</button><a class="wa" target="_blank" rel="noopener">WhatsApp</a><button data-x="close">Schließen</button></div></div>';
    m.querySelector('textarea').value = txt;
    m.querySelector('.wa').href = 'https://wa.me/?text=' + encodeURIComponent(txt);
    m.querySelector('[data-x=copy]').onclick = function(){
      var ta = m.querySelector('textarea'); ta.select();
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).catch(function(){ document.execCommand('copy'); });
      this.textContent = '✓ Kopiert';
    };
    m.querySelector('[data-x=close]').onclick = function(){ m.remove(); };
    m.onclick = function(e){ if (e.target === m) m.remove(); };
    document.body.appendChild(m);
  }

  // Warten bis die Seite fertig aufgebaut ist (Konfigurator usw.)
  setTimeout(restore, 300);
})();
