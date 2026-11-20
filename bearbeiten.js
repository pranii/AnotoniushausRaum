/* Bearbeiten-Modus: nur aktiv mit ?bearbeiten in der Adresse.
   Texte direkt auf der Seite ändern und mit "Speichern" in das GitHub-Repo schreiben.
   GitHub Pages stellt die neue Version danach automatisch online (ca. 1 Minute).
   Zum Speichern braucht es einen GitHub-Schlüssel (fine-grained token, nur dieses Repo,
   Berechtigung "Contents: Read and write"). Er bleibt nur im Browser dieses Geräts. */
(function(){
  var REPO = 'pranii/AnotoniushausRaum', BRANCH = 'main', FILE = 'index.html';
  var TOKEN_KEY = 'antoniushaus-gh-token';
  var API = 'https://api.github.com/repos/' + REPO + '/contents/' + FILE;
  var changes = {};          // pfad -> { vorher (innerHTML), nachher (innerHTML), text }
  var editable = [];

  function store(k, v){ try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch(e){ return null; } }
  function path(el){
    var parts = [];
    while (el && el.nodeType === 1 && el.tagName !== 'BODY'){
      if (el.id){ parts.unshift('#' + el.id); break; }
      var i = 1, s = el; while ((s = s.previousElementSibling)) if (s.tagName === el.tagName) i++;
      parts.unshift(el.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    if (el && el.tagName === 'BODY') parts.unshift('body');
    return parts.join(' > ');
  }
  function norm(t){ return (t || '').replace(/\s+/g, ' ').trim(); }
  function b64decode(s){ return decodeURIComponent(escape(atob(s.replace(/\n/g, '')))); }
  function b64encode(s){ return btoa(unescape(encodeURIComponent(s))); }

  /* ---------- Stile ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#bx-ui{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;background:#1d2b23;color:#fff;border-radius:16px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;box-shadow:0 8px 30px rgba(0,0,0,.35);font:600 14px/1.2 system-ui,sans-serif;max-width:calc(100vw - 24px)}' +
    '#bx-ui button{border:0;border-radius:10px;padding:10px 12px;background:#2F4A3A;color:#fff;font:inherit;cursor:pointer}' +
    '#bx-ui button:disabled{opacity:.45;cursor:default}' +
    '#bx-ui .bx-save{background:#25D366;color:#0b3d1f}' +
    '#bx-ui .bx-info{width:100%;text-align:center;font-weight:400;font-size:12px;opacity:.9;padding:2px 4px}' +
    '[data-bx-edit]{outline:1.5px dashed rgba(176,141,87,.9);outline-offset:2px;cursor:text}' +
    '[data-bx-edit]:focus{outline:2px solid #B08D57;background:rgba(176,141,87,.12)}' +
    '.bx-changed{background:rgba(37,211,102,.16)!important}' +
    '#bx-modal{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '#bx-modal>div{background:#fff;color:#1d2b23;border-radius:14px;padding:18px;width:min(560px,100%);max-height:90vh;overflow:auto;font:15px/1.5 system-ui,sans-serif}' +
    '#bx-modal ol{padding-left:20px;margin:8px 0}#bx-modal li{margin:4px 0}' +
    '#bx-modal input{width:100%;font:14px ui-monospace,monospace;padding:10px;border:1px solid #bbb;border-radius:8px;margin:8px 0}' +
    '#bx-modal .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}' +
    '#bx-modal button{border:0;border-radius:10px;padding:10px 14px;background:#2F4A3A;color:#fff;font:600 14px system-ui;cursor:pointer}' +
    '#bx-modal .ok{background:#25D366;color:#0b3d1f}';
  document.head.appendChild(css);

  /* ---------- Leiste ---------- */
  var ui = document.createElement('div'); ui.id = 'bx-ui';
  ui.innerHTML =
    '<button data-a="save" class="bx-save" disabled>💾 Speichern</button>' +
    '<button data-a="undo" disabled>↺ Verwerfen</button>' +
    '<button data-a="key">🔑 Schlüssel</button>' +
    '<button data-a="exit">✕ Beenden</button>' +
    '<div class="bx-info" id="bx-info">Lade Seite …</div>';
  document.body.appendChild(ui);
  var info = function(t){ document.getElementById('bx-info').textContent = t; };
  function refresh(){
    var n = Object.keys(changes).length;
    ui.querySelector('[data-a=save]').disabled = !n;
    ui.querySelector('[data-a=undo]').disabled = !n;
    info(n ? n + (n === 1 ? ' Text geändert' : ' Texte geändert') + ' · Mit „Speichern“ live stellen'
           : 'Gestrichelte Texte antippen und umschreiben');
  }

  /* ---------- Bearbeitbare Texte bestimmen ----------
     Nur Texte, die genau so in der index.html stehen. Was per Programm erzeugt wird
     (Preisrechner, Grafik, Pakete), lässt sich hier nicht ändern. */
  var SEL = 'h1,h2,h3,h4,p,li,summary,dt,dd,td,th,figcaption,blockquote,a,button,span,b,strong,small';
  function setup(srcDoc){
    var cand = document.querySelectorAll(SEL);
    Array.prototype.forEach.call(cand, function(el){
      if (el.closest('#bx-ui,#bx-modal,svg,script,style,[contenteditable]')) return;
      var own = Array.prototype.some.call(el.childNodes, function(n){ return n.nodeType === 3 && n.textContent.trim(); });
      if (!own) return;
      var src = srcDoc.querySelector(path(el));
      if (!src || norm(src.textContent) !== norm(el.textContent) || !norm(el.textContent)) return;
      el.setAttribute('contenteditable', 'true'); el.setAttribute('data-bx-edit', ''); el.spellcheck = true;
      el.dataset.bxOrig = el.innerHTML;
      editable.push(el);
    });
    refresh();
    if (!store(TOKEN_KEY)) info('Texte antippen und umschreiben · Zum Speichern einmal 🔑 Schlüssel eingeben');
  }
  fetch(FILE + '?t=' + Date.now(), { cache:'no-store' })
    .then(function(r){ return r.text(); })
    .then(function(html){ setup(new DOMParser().parseFromString(html, 'text/html')); })
    .catch(function(){ info('Seite konnte nicht geladen werden. Bitte neu laden.'); });

  /* Links/Buttons nicht auslösen, Zeilenumbrüche verhindern, nur reinen Text einfügen */
  document.addEventListener('click', function(e){
    var el = e.target.closest && e.target.closest('[data-bx-edit]');
    if (el || (e.target.closest && e.target.closest('a[href]') && !e.target.closest('#bx-ui,#bx-modal'))){ e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && e.target.hasAttribute && e.target.hasAttribute('data-bx-edit')){ e.preventDefault(); e.target.blur(); }
  });
  document.addEventListener('paste', function(e){
    if (!e.target.closest || !e.target.closest('[data-bx-edit]')) return;
    e.preventDefault();
    var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, t);
  });
  document.addEventListener('input', function(e){
    var el = e.target.closest && e.target.closest('[data-bx-edit]'); if (!el) return;
    var p = path(el);
    if (norm(el.textContent) === norm(new DOMParser().parseFromString('<p>' + el.dataset.bxOrig + '</p>', 'text/html').body.textContent)){ delete changes[p]; el.classList.remove('bx-changed'); }
    else { changes[p] = { vorher: el.dataset.bxOrig, nachher: clean(el.innerHTML), text: norm(el.textContent) }; el.classList.add('bx-changed'); }
    refresh();
  });
  function clean(h){ return h.replace(/<br\s*\/?>/gi, ' ').replace(/&nbsp;/g, ' ').replace(/\s+$/,''); }

  /* ---------- Verwerfen / Beenden ---------- */
  ui.querySelector('[data-a=undo]').onclick = function(){
    if (!confirm('Alle ungespeicherten Änderungen verwerfen?')) return;
    editable.forEach(function(el){ el.innerHTML = el.dataset.bxOrig; el.classList.remove('bx-changed'); });
    changes = {}; refresh();
  };
  ui.querySelector('[data-a=exit]').onclick = function(){
    if (Object.keys(changes).length && !confirm('Es gibt ungespeicherte Änderungen. Trotzdem beenden?')) return;
    location.href = location.pathname;
  };
  window.addEventListener('beforeunload', function(e){ if (Object.keys(changes).length){ e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Schlüssel ---------- */
  function modal(html){
    var m = document.createElement('div'); m.id = 'bx-modal'; m.innerHTML = '<div>' + html + '</div>';
    m.onclick = function(e){ if (e.target === m) m.remove(); };
    document.body.appendChild(m); return m;
  }
  function askKey(then){
    var has = !!store(TOKEN_KEY);
    var m = modal(
      '<b>GitHub-Schlüssel</b>' +
      '<p>Damit die Seite deine Änderungen speichern darf, braucht sie einmalig einen Schlüssel von GitHub. Er bleibt nur auf diesem Gerät.</p>' +
      '<ol><li>Auf github.com einloggen, oben rechts Profilbild → <b>Settings</b></li>' +
      '<li>Ganz unten links <b>Developer settings</b> → <b>Personal access tokens</b> → <b>Fine-grained tokens</b> → <b>Generate new token</b></li>' +
      '<li>Name z. B. „Webseite bearbeiten“, Ablauf nach Wunsch</li>' +
      '<li><b>Repository access</b>: „Only select repositories“ → <b>AnotoniushausRaum</b></li>' +
      '<li><b>Permissions</b> → Repository permissions → <b>Contents</b>: „Read and write“</li>' +
      '<li><b>Generate token</b>, den Schlüssel kopieren und hier einfügen</li></ol>' +
      '<input type="password" placeholder="github_pat_…" autocomplete="off">' +
      '<div class="row"><button class="ok" data-x="ok">Übernehmen</button>' + (has ? '<button data-x="del">Schlüssel entfernen</button>' : '') + '<button data-x="no">Abbrechen</button></div>');
    var inp = m.querySelector('input');
    m.querySelector('[data-x=ok]').onclick = function(){
      var v = inp.value.trim(); if (!v) return;
      fetch('https://api.github.com/repos/' + REPO, { headers: { Authorization: 'Bearer ' + v, Accept: 'application/vnd.github+json' } })
        .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
        .then(function(r){
          if (!r.ok){ alert('Der Schlüssel funktioniert nicht: ' + (r.j.message || 'unbekannter Fehler')); return; }
          if (r.j.permissions && !r.j.permissions.push){ alert('Der Schlüssel darf nicht schreiben. Bitte bei „Contents“ „Read and write“ wählen.'); return; }
          store(TOKEN_KEY, v); m.remove(); refresh(); if (then) then();
        })
        .catch(function(){ alert('Keine Verbindung zu GitHub.'); });
    };
    var del = m.querySelector('[data-x=del]'); if (del) del.onclick = function(){ store(TOKEN_KEY, null); m.remove(); refresh(); };
    m.querySelector('[data-x=no]').onclick = function(){ m.remove(); };
    setTimeout(function(){ inp.focus(); }, 50);
  }
  ui.querySelector('[data-a=key]').onclick = function(){ askKey(); };

  /* ---------- Speichern ---------- */
  function applyTo(raw, doc, p, c){
    // 1. Bevorzugt: genau diese Stelle im Quelltext ersetzen, damit der Rest unverändert bleibt
    var el = doc.querySelector(p); if (!el) return null;
    var before = el.innerHTML, tag = el.tagName.toLowerCase();
    // Gleiche Texte kommen mehrfach vor (z. B. Menü und Überschrift): das n-te Vorkommen in Dokument-Reihenfolge nehmen
    var same = Array.prototype.filter.call(doc.getElementsByTagName(tag), function(x){ return x.innerHTML === before; });
    var nth = same.indexOf(el), needle = '>' + before + '</' + tag + '>', pos = [], i = -1;
    while ((i = raw.indexOf(needle, i + 1)) >= 0) pos.push(i);
    if (before && nth >= 0 && pos.length === same.length){
      var at = pos[nth] + 1;
      return raw.slice(0, at) + c.nachher + raw.slice(at + before.length);
    }
    // 2. Sonst über das geparste Dokument
    el.innerHTML = c.nachher; return '';
  }
  ui.querySelector('[data-a=save]').onclick = function save(){
    var token = store(TOKEN_KEY);
    if (!token){ askKey(save); return; }
    var btn = this; btn.disabled = true; info('Speichere …');
    var H = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
    fetch(API + '?ref=' + BRANCH + '&t=' + Date.now(), { headers: H, cache:'no-store' })
      .then(function(r){ if (!r.ok) throw new Error(r.status === 401 ? 'Schlüssel ungültig oder abgelaufen' : 'GitHub-Fehler ' + r.status); return r.json(); })
      .then(function(f){
        var raw = b64decode(f.content), doc = new DOMParser().parseFromString(raw, 'text/html'), viaDoc = false, missing = [];
        Object.keys(changes).forEach(function(p){
          var res = applyTo(raw, doc, p, changes[p]);
          if (res === null) missing.push(changes[p].text);
          else if (res === '') viaDoc = true;
          else { raw = res; doc = new DOMParser().parseFromString(raw, 'text/html'); }
        });
        if (viaDoc) raw = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML + '\n';
        if (missing.length) throw new Error('Diese Stelle wurde inzwischen geändert, bitte Seite neu laden: „' + missing[0].slice(0, 40) + '“');
        var n = Object.keys(changes).length;
        return fetch(API, { method:'PUT', headers: H, body: JSON.stringify({
          message: 'Text auf der Seite geändert (' + n + (n === 1 ? ' Stelle' : ' Stellen') + ')',
          content: b64encode(raw), sha: f.sha, branch: BRANCH }) });
      })
      .then(function(r){ if (!r.ok) return r.json().then(function(j){ throw new Error(r.status === 403 || r.status === 404 ? 'Der Schlüssel darf nicht speichern (Contents: Read and write nötig)' : (j.message || 'GitHub-Fehler ' + r.status)); }); })
      .then(function(){
        editable.forEach(function(el){ el.dataset.bxOrig = el.innerHTML; el.classList.remove('bx-changed'); });
        changes = {}; refresh();
        info('✓ Gespeichert. In ca. 1 Minute ist die Änderung für alle sichtbar.');
      })
      .catch(function(err){ btn.disabled = false; info('Nicht gespeichert'); alert('Speichern hat nicht geklappt: ' + err.message); });
  };
})();
