# Kneitinger im Antoniushaus – neue Website (statisch)

Öffnen: `index.html` im Browser. Kein Build nötig, keine externen Schriften, keine Bibliotheken
(Literata und Oswald liegen in `fonts/`, OFL-Lizenz). Die Animationen sind eigenes JavaScript,
rund 5 KB, ohne CDN – damit bleibt die Seite datenschutzfreundlich und offlinefähig.

## Seiten
- `index.html` – Startseite mit Haus-Animation, Speisekarten, Küche, Reservierung, Tagung, Jobs, Öffnungszeiten & Kontakt
- `impressum.html`
- `datenschutz.html` (alter Text übernommen, gelb markierte Stellen müssen angepasst werden)

„Tagung“ im Menü und der Button im Tagungs-Abschnitt führen zu https://pranii.github.io/AnotoniushausRaum/

## Die Haus-Animation
Beim Scrollen durch die Startbühne zeichnet sich das Haus in **fünf Strichen** – einer je Silbe von
„An-to-ni-us-haus“. Die Silbenzeile unter dem Haus leuchtet mit.

Das Haus ist ein **festes Element** (`position:fixed`, direkt vor `<main>`, nicht im Seitenfluss).
Es steht immer genau in der Bildschirmmitte und bewegt sich nie – gegen Ende der Bühne schrumpft es
nur auf etwa 165 px und bleibt dann als Marke stehen, über die ganze Seite hinweg. Lage und Größe
rechnet `main.js` (`hausLage`), nicht das Stylesheet.

### Der Korridor
Damit das Haus keinen Text verdeckt, lassen die Abschnitte die Bildschirmmitte frei: ein leerer
Korridor, links und rechts läuft der Inhalt vorbei. Breite steuert die Variable `--korridor`
(250 px ab 1100 px Fensterbreite, 200 px ab 900 px, 0 darunter). Wer einen Abschnitt hinzufügt,
muss ihm `column-gap:var(--korridor)` geben, sonst läuft sein Text unter das Haus.

Zwei Abschnitte mussten dafür umgebaut werden: die Karten laufen zweispaltig (`columns:2`) um die
Mitte herum, und „Tagung“ ist im Korridor-Betrieb kein randloser Abschnitt mehr, sondern ein
normales zweispaltiges Raster – sonst stünde das Haus auf der Naht zwischen Foto und Fläche.

Über dunklen Abschnitten (Infoleiste, Tagung, Fußzeile) dreht das Haus seine Farben um; das erkennt
`main.js` daran, wo die Bildschirmmitte gerade steht.

**Auf dem Handy** gibt es keinen Korridor – dafür ist kein Platz. Das Haus bleibt dort mittig, wird
aber klein und auf 40 % Deckkraft zurückgenommen, sodass es wie ein Wasserzeichen hinter dem Text
liegt. Wenn das stört, ist die Stelle `.anim .haus-feld.klein{opacity:.4}` in `style.css`.

Die Striche stehen im `d`-Attribut von `.haus-linie` in `index.html`:

```
M 0 200 L 220 200 L 220 92 L 110 0 L 0 92 L 0 200
```

Boden → rechte Wand → Dach rechts → Dach links → linke Wand. Das JavaScript liest die Punkte aus
diesem Attribut und verteilt die Silben automatisch auf die Striche. Wer die Hausform ändert, muss
also nur das `d`-Attribut anfassen – aber die Zahl der Striche muss zur Zahl der Silben passen
(fünf Punkte-Paare ergeben fünf Striche).

## Freigestellte Speisen – NOCH PLATZHALTER
In `img/speisen/` liegen sechs **Platzhalter** (`.svg`, graue Strichzeichnungen mit Beschriftung).
Sie sollen durch echte, freigestellte Fotos ersetzt werden:

1. Fotos als PNG mit transparentem Hintergrund speichern, mindestens 1200 px Kantenlänge.
2. Nach `img/speisen/` legen.
3. In `index.html` im Block `<div class="speisen">` die sechs `src`-Pfade von `.svg` auf `.png` ändern.

Reihenfolge und Platzierung: `s1`–`s6` sind links und rechts außen verteilt, damit sie Haus,
Überschrift und Schaltflächen nicht überdecken. Positionen stehen in `style.css` unter `.speise.s1` bis `.s6`.

## Speisekarten pflegen
Die Karten stehen seit dem Umbau **als Text direkt in `index.html`** (Abschnitt `#karten`), nicht mehr
als PDF. Das ist besser für Google, für Handys und für Screenreader.

- Drei Reiter: Mittagskarte, Speisekarte, Brotzeitkarte. Jeweils ein `<div class="karte-blatt">`.
- Ein Gericht ist eine Zeile:
  ```html
  <li><span class="was"><b>Name</b> <i>Beilagen</i></span><span class="preis">12,90</span></li>
  ```
  Das Euro-Zeichen setzt das Stylesheet, bitte nicht mittippen.
- `<span class="vegan">Vegane</span>` färbt das Wort grün ein.
- **Wöchentlich zu pflegen:** der Kasten „Mittagsgerichte der Woche“ oben in der Mittagskarte
  (Datumsspanne in der Überschrift und die fünf Wochentage). Stand aktuell: 16.11. – 20.11.26.
- Ohne JavaScript stehen alle drei Karten untereinander statt in Reitern.

Die alten PDFs wurden entfernt. Die Originale liegen weiterhin in `../_quelle-alte-website/pdf/`.

## Barrierefreiheit und Rücksicht
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, bekommt die Seite ohne Animation:
  Haus fertig gezeichnet, Speisen sichtbar, normaler Seitenfluss.
- Ohne JavaScript funktioniert die ganze Seite ebenso, nur ohne Bewegung und ohne Reiter.
- Die Reiter lassen sich mit Pfeiltasten, Pos1 und Ende bedienen.

## Offene Punkte vor dem Livegang
1. **Echte Speisen-PNGs** statt der Platzhalter einsetzen (siehe oben).
2. Kamerafahrt in den Raum ist noch nicht gebaut, war so abgesprochen.
3. Datenschutzerklärung: Hosting-Abschnitt (alt: 3Dreams) an neuen Hoster anpassen, Borlabs-Cookie- und Kontaktformular-Abschnitt entfernen, Abschnitt zu resmio ergänzen.
4. Impressum: „§ 5 TMG“ wurde zu „§ 5 DDG“ aktualisiert (TMG gilt seit Mai 2024 nicht mehr). Der Link zur EU-Streitschlichtungsplattform ist entfallen, weil die Plattform im Juli 2025 abgeschaltet wurde. „Realisation: 3Dreams“ ist entfallen.
5. Festtags-Hinweis 2025/26 (Weihnachten/Silvester) wurde nicht übernommen, weil er veraltet ist.
6. Online-Bewerbungsformular gibt es nicht mehr (statische Seite), Bewerbung läuft per E-Mail.
