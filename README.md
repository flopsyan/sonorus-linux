# Sonorus für Linux

Sonorus in einem eigenen Fenster: die selbst gehostete Bibliothek ohne Browser
drumherum, ein Eintrag im Anwendungsmenü und ein eigenes Symbol in der
Taskleiste.

**Der Client ist die Web-App.** Dieses Repository ist nur die Hülle darum - ein
Electron-Fenster, das deinen Sonorus-Server lädt und ansonsten aus dem Weg geht.
Es gibt hier keinen zweiten Player, keine lokale Bibliothek und keinen
Offline-Modus: Ein Fenster um eine Web-App reicht genau so weit wie diese
Web-App, und alles darüber hinaus hieße, einen zweiten Client zu bauen. Was die
Web-App kann, kann dieses Fenster deshalb auch - Musik, Podcasts, Hörbücher,
Hörspiele und die Leseansicht für E-Books.

Vier Dinge gehören der Hülle, weil ein Browser-Tab sie nicht leisten kann:

- **Welcher Server geladen wird**, einmal gefragt und gemerkt,
- **wie groß das Fenster war**, beim nächsten Start wiederhergestellt,
- **auf diesem Server zu bleiben** - ein Link, der woanders hinführt, öffnet
  sich im echten Browser, statt ein Fenster ohne Adresszeile zu stranden,
- **die Medientasten**, die Electron von sich aus nicht beantwortet (siehe
  unten).

## Aus dem Quelltext starten

```bash
npm install
npm start
```

Der erste Start fragt nach der Adresse deines Sonorus-Servers und prüft, ob dort
überhaupt etwas antwortet, bevor er sie speichert. Alles danach ist die
Anmeldung der Web-App selbst.

Ein fehlendes Schema wird zu `https`, nie zu `http`: Das Sitzungs-Cookie trägt
`Secure`, über eine ungesicherte Verbindung sieht die Anmeldung also so aus, als
hätte sie geklappt - und bleibt dann nie angemeldet.

Um die App später woandershin zu zeigen: `Alt` für die Menüleiste drücken, dann
**Sonorus - Server ändern**. Adresse und Fenstergröße liegen in `config.json`
unter `~/.config/Sonorus/`; löscht man diese Datei, kommt das Einrichtungsfenster
zurück.

## Pakete bauen

```bash
npm run dist
```

In `dist/` landen vier Artefakte, und jedes bringt sein eigenes Chromium mit -
daher die Größe:

| Datei | Größe |
|---|---|
| `Sonorus-<version>.AppImage` | ~128 MB |
| `sonorus-linux_<version>_amd64.deb` | ~100 MB |
| `sonorus-linux-<version>.pacman` | ~91 MB |
| `sonorus-linux-<version>.tar.gz` | ~121 MB |

Diese vier kann electron-builder ohne Vorbereitung erzeugen - es bringt sein
eigenes `fpm` mit. Zwei weitere brauchen erst ein Werkzeug auf dem Rechner und
sind deshalb nicht im Standardsatz:

```bash
npx electron-builder --linux rpm      # braucht rpmbuild (Arch: rpm-tools)
npx electron-builder --linux snap     # braucht snapcraft
```

`npm run pack` baut nur das entpackte Verzeichnis - der schnellste Weg zu prüfen,
ob ein echter Build überhaupt anläuft.

## Die Medientasten, und warum sie hier Code brauchen

Die Web-App füttert `navigator.mediaSession` bereits, in einem gewöhnlichen
Browser funktionieren die Medientasten und das Medien-Widget des Desktops also
ohne Zutun. **Electron erbt das nicht.** Es bettet Chromiums Content-Layer ein,
während die Brücke, die aus einer Medientaste ein Play/Pause macht (unter Linux
MPRIS), im Browser-Layer darüber sitzt - und den liefert Electron nicht mit.

Also greift sich die Hülle die Tasten selbst und klickt die Transportleiste, die
die Seite ohnehin zeichnet. Zwei Folgen, beide gewollt und beide durch Löschen
der paar Zeilen in `src/main.js` rückgängig zu machen:

- **Der Zugriff ist global.** Solange Sonorus läuft, sieht kein anderer Player
  die Tasten für Play, Weiter und Zurück.
- **Er greift in das DOM der Web-App** (`#btn-play`, `#btn-next`, `#btn-prev`).
  Wird eine Transport-Schaltfläche serverseitig umbenannt, hört das hier
  stillschweigend auf zu funktionieren.

**Nicht verifiziert:** ob der Zugriff unter Wayland überhaupt greift, wo ein
Client globale Tasten nicht ohne Weiteres beanspruchen kann. Nichts in der App
hängt davon ab.

## Was hier bewusst fehlt

- **Kein Tray-Symbol.** Das Fenster zu schließen beendet die App, samt Musik.
- **Kein Offline-Modus, keine Downloads, keine lokalen Dateien.** Der
  Android-Client hat das, weil er ein echter Client ist; dieser hier ist ein
  Fenster.
- **Keine automatische Aktualisierung**, obwohl der Build die Metadaten dafür
  schreibt.
- **Kein Windows- oder macOS-Build.** Nichts im Quelltext spricht dagegen, aber
  gelaufen ist beides nie.
