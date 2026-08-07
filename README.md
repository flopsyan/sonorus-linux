# Sonorus for Linux

Sonorus in its own window: the self-hosted music library without a browser
around it, an entry in the application menu, and its own icon in the task bar.

**The client is the web app.** This repository is only the shell around it - an
Electron window that loads your Sonorus server and gets out of the way. There is
no second player here, no local library and no offline mode: a window around a
web app reaches exactly as far as that web app does, and anything more would
mean building a second client.

The shell owns four things a browser tab cannot do for it:

- **which server to load**, asked once and remembered,
- **how big the window was**, restored on the next start,
- **staying on that server** - a link leading anywhere else opens in the real
  browser instead of stranding a window that has no address bar,
- **the media keys**, which Electron does not answer by itself (see below).

## Running it from the source

```bash
npm install
npm start
```

The first start asks for the server address, pre-filled with
`https://sonorus.example.com`, and checks that something answers there before it
saves. Everything after that is the web app's own login.

A missing scheme becomes `https`, never `http`: the session cookie carries
`Secure`, so over a plain connection the login appears to work and then never
stays logged in.

To point the app somewhere else later, press `Alt` for the menu bar, then
**Sonorus - Server ändern**. The address and the window size live in
`config.json` under `~/.config/Sonorus/`; deleting that file brings the setup
window back.

## Building the packages

```bash
npm run dist
```

Four artefacts land in `dist/`, and each one carries its own Chromium, which is
where the size comes from:

| File | Size |
|---|---|
| `Sonorus-<version>.AppImage` | ~128 MB |
| `sonorus-linux_<version>_amd64.deb` | ~100 MB |
| `sonorus-linux-<version>.pacman` | ~91 MB |
| `sonorus-linux-<version>.tar.gz` | ~121 MB |

Those four are the ones electron-builder can produce with nothing installed
beforehand - it brings its own `fpm`. Two more need a tool on the machine first
and are therefore not in the default set:

```bash
npx electron-builder --linux rpm      # needs rpmbuild (Arch: rpm-tools)
npx electron-builder --linux snap     # needs snapcraft
```

`npm run pack` builds only the unpacked directory, which is the quickest way to
check that a real build starts at all.

## The media keys, and why they need code here

The web app already feeds `navigator.mediaSession`, so in an ordinary browser
the media keys and the desktop's media widget work with no help. **Electron does
not inherit that.** It embeds Chromium's content layer, while the bridge that
turns a media key into a play/pause (MPRIS on Linux) lives in the browser layer
around it, which Electron does not ship.

So the shell takes the keys itself and clicks the transport the page already
draws. Two consequences, both deliberate and both easy to undo by deleting the
handful of lines in `src/main.js`:

- **The grab is global.** While Sonorus runs, no other player sees the play,
  next and previous keys.
- **It reaches into the web app's DOM** (`#btn-play`, `#btn-next`, `#btn-prev`).
  Renaming a transport button on the server side stops this working, silently.

**Unverified:** whether the grab takes at all under Wayland, where a client
cannot necessarily claim global keys. Nothing in the app depends on it.

## What is deliberately not here

- **No tray icon.** Closing the window quits the app, music included.
- **No offline mode, no downloads, no local files.** The Android client has
  those because it is a real client; this one is a window.
- **No auto-update**, even though the build writes the metadata for one.
- **No Windows or macOS build.** Nothing in the source prevents it, but neither
  has ever been run.
