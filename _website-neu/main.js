/* Kneitinger im Antoniushaus – Interaktion
   Ohne Bibliotheken. Alles läuft auch ohne JavaScript, nur ohne Bewegung. */

(function () {
  'use strict';

  var wurzel = document.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
  var klemm = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------------- Mobiles Menü ---------------- */
  (function () {
    var btn = document.querySelector('.menue-btn'), nav = document.getElementById('nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var offen = nav.classList.toggle('offen');
      btn.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('offen'); btn.setAttribute('aria-expanded', 'false'); }
    });
  })();

  /* ---------------- Speisekarten-Reiter ---------------- */
  (function () {
    var leiste = document.querySelector('.karten-tabs');
    if (!leiste) return;
    var reiter = [].slice.call(leiste.querySelectorAll('[role="tab"]'));

    function zeige(i, fokus) {
      reiter.forEach(function (r, j) {
        var aktiv = i === j;
        r.setAttribute('aria-selected', aktiv ? 'true' : 'false');
        r.tabIndex = aktiv ? 0 : -1;
        document.getElementById(r.getAttribute('aria-controls')).hidden = !aktiv;
      });
      if (fokus) reiter[i].focus();
    }

    reiter.forEach(function (r, i) {
      r.addEventListener('click', function () { zeige(i, false); });
      r.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1
              : e.key === 'Home' ? 0 : e.key === 'End' ? reiter.length - 1 : -1;
        if (n < 0 && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        zeige((n + reiter.length) % reiter.length, true);
      });
    });
  })();

  /* ---------------- Online-Reservierung (resmio) erst auf Klick ---------------- */
  (function () {
    var btn = document.getElementById('resmio-laden');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var box = document.getElementById('resmio-hinweis');
      if (box) box.remove();
      var js = document.createElement('script');
      js.src = 'https://static.resmio.com/static/de/widget.js#id=kneitinger-im-antoniushaus&height=400&width=275&fontSize=14px&backgroundColor=%23ffffff&color=%235a5f61&linkBackgroundColor=%23376721&facebookLogin=true&newsletterSignup=true&commentsDisabled=false';
      js.async = true;
      document.body.appendChild(js);
    });
  })();

  /* ---------------- Ab hier: Bewegung ----------------
     Wer „weniger Bewegung“ eingestellt hat, bekommt die fertige, ruhige Seite. */
  if (ruhig.matches) return;
  wurzel.classList.add('anim');
  ruhig.addEventListener('change', function (e) { if (e.matches) location.reload(); });

  /* ---- Einblenden beim Hochscrollen ---- */
  (function () {
    var ziele = document.querySelectorAll(
      '.stube-text, #karten .kopfzeile, .karten-tabs, .karte-blatt, .kueche .wrap > div, .reserv .wrap > div, .tagung .text, .jobs .wrap > div, .kontakt .wrap > div'
    );
    [].forEach.call(ziele, function (el) { el.classList.add('auf'); });
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('da'); beobachter.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    [].forEach.call(ziele, function (el) { beobachter.observe(el); });
  })();

  /* ---- Haus vom Antoniushaus: fünf Striche, fünf Silben ---- */
  var haus = (function () {
    var pfad = document.querySelector('.haus-linie');
    if (!pfad) return null;
    var silben = [].slice.call(document.querySelectorAll('.silben span'));
    var fuellung = document.querySelector('.haus-fuellung');

    // Striche aus dem d-Attribut lesen, damit Geometrie und Silben nie auseinanderlaufen
    var zahlen = pfad.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
    var punkte = [], i;
    for (i = 0; i + 1 < zahlen.length; i += 2) punkte.push([zahlen[i], zahlen[i + 1]]);

    var laengen = [], gesamt = 0;
    for (i = 1; i < punkte.length; i++) {
      var dx = punkte[i][0] - punkte[i - 1][0], dy = punkte[i][1] - punkte[i - 1][1];
      var l = Math.sqrt(dx * dx + dy * dy);
      gesamt += l; laengen.push(gesamt);
    }
    var enden = laengen.map(function (l) { return l / gesamt; });

    // In Nutzereinheiten rechnen: pathLength zusammen mit non-scaling-stroke
    // wird von Chrome nicht zuverlässig umgesetzt.
    var strecke = pfad.getTotalLength();
    pfad.style.strokeDasharray = strecke + ' ' + strecke;
    pfad.style.strokeDashoffset = String(strecke);
    if (fuellung) fuellung.style.opacity = '0';

    return function (p) {
      var zeichnen = klemm(p / 0.45, 0, 1);
      pfad.style.strokeDashoffset = String(strecke * (1 - zeichnen));
      silben.forEach(function (s, j) {
        s.classList.toggle('an', zeichnen >= (enden[j] || 1) - 0.004);
      });
      if (fuellung) fuellung.style.opacity = String(klemm((p - 0.44) / 0.1, 0, 1));
    };
  })();

  /* ---- Lage des festen Hauses: Bühnenmitte -> kleine Marke in der Mitte ---- */
  var hausLage = (function () {
    var feld = document.querySelector('.haus-feld');
    if (!feld) return null;
    var silben = feld.querySelector('.silben');
    var dunkel = [].slice.call(document.querySelectorAll('.infoleiste, .tagung, .fuss'));
    var mass = { w: 0, h: 0 };

    function messen() { mass.w = feld.offsetWidth; mass.h = feld.offsetHeight; }
    messen();
    addEventListener('resize', messen);

    return function (q) {
      var vw = innerWidth, vh = innerHeight, schmal = vw < 900;
      var klein = klemm((schmal ? 78 : 165) / Math.max(mass.h, 1), 0.12, 1);

      // Das Haus bleibt immer in der Bildschirmmitte und schrumpft nur.
      // Dadurch wandert es nie durch Überschrift oder Schaltflächen.
      var t = q * q * (3 - 2 * q);           // weich ein- und ausleitend
      var s = 1 + (klein - 1) * t;
      var x = (vw - mass.w * s) / 2;
      var y = (vh - mass.h * s) / 2;

      feld.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
      feld.classList.toggle('klein', t > 0.5);
      if (silben) silben.style.opacity = String(1 - t);

      // Auf dunklem Grund die Farben umdrehen
      var mitte = y + mass.h * s / 2;
      feld.classList.toggle('hell', dunkel.some(function (d) {
        var r = d.getBoundingClientRect();
        return mitte > r.top && mitte < r.bottom;
      }));
    };
  })();

  /* ---- Bühne: Ebenen und Speisen am Scrollfortschritt ---- */
  var buehne = (function () {
    var el = document.querySelector('.buehne');
    if (!el) return null;
    var ebenen = [].slice.call(el.querySelectorAll('.ebene[data-par]'));
    var speisen = [].slice.call(el.querySelectorAll('.speise'));
    var text = el.querySelector('.buehne-text');

    return function () {
      var k = el.getBoundingClientRect();
      var weg = el.offsetHeight - window.innerHeight;
      var p = weg > 0 ? klemm(-k.top / weg, 0, 1) : 0;
      // Gegen Ende der Bühne schrumpft das Haus zur Marke, und der
      // Bühneninhalt blendet aus. So scrollt nichts hinter dem Haus vorbei.
      var q = klemm((p - 0.80) / 0.20, 0, 1);   // Haus schrumpft früher
      var f = klemm((p - 0.90) / 0.10, 0, 1);   // Text bleibt länger stehen
      var ab = 1 - f * f * (3 - 2 * f);

      if (haus) haus(p);
      if (hausLage) hausLage(q);

      ebenen.forEach(function (e) {
        e.style.transform = 'translate3d(0,' + (p * parseFloat(e.dataset.par) * 220).toFixed(2) + 'px,0)';
      });

      speisen.forEach(function (s) {
        var von = parseFloat(s.dataset.ab);
        var lp = klemm((p - von) / 0.14, 0, 1);
        var drift = (p - von) * parseFloat(s.dataset.par) * -260;
        s.style.opacity = String(lp * ab);
        s.style.transform = 'translate3d(0,' + (drift + (1 - lp) * 70).toFixed(2) +
                            'px,0) scale(' + (0.82 + lp * 0.18).toFixed(3) + ')';
      });

      // Kein Versatz für den Textblock: er würde sonst in die Silbenzeile laufen.
      if (text) text.style.opacity = String(ab);
    };
  })();

  /* ---- Allgemeine Parallaxe außerhalb der Bühne ---- */
  var frei = (function () {
    var liste = [].slice.call(document.querySelectorAll('[data-par]')).filter(function (e) {
      return !e.closest('.buehne');
    });
    if (!liste.length) return null;

    return function () {
      var mitte = window.innerHeight / 2;
      liste.forEach(function (e) {
        var k = e.getBoundingClientRect();
        if (k.bottom < -200 || k.top > window.innerHeight + 200) return;
        var ab = (k.top + k.height / 2 - mitte) / window.innerHeight;
        e.style.transform = 'translate3d(0,' + (ab * parseFloat(e.dataset.par) * -120).toFixed(2) + 'px,0)';
      });
    };
  })();

  /* ---- Ein Takt pro Bild ---- */
  var offen = false;
  function takt() {
    offen = false;
    if (buehne) buehne();
    if (frei) frei();
  }
  function anstossen() {
    if (offen) return;
    offen = true;
    requestAnimationFrame(takt);
  }

  addEventListener('scroll', anstossen, { passive: true });
  addEventListener('resize', anstossen);
  addEventListener('load', anstossen);
  takt();
})();
