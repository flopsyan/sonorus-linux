// Sonorus as a desktop window: a Chromium that only ever shows one site.
//
// The client *is* the web app on the server - this process owns nothing of it
// and renders nothing of its own. What it owns are the four things a browser
// tab cannot do for it: remember which server to load, remember how big the
// window was, keep the window on that server, and answer the media keys.
//
// That is also why there is no offline mode and no local player here, unlike in
// the Android app: a window around a web app has exactly the reach of that web
// app, and pretending otherwise would mean building a second client.

import { app, BrowserWindow, Menu, dialog, globalShortcut, ipcMain, shell } from 'electron';
import path from 'node:path';
import * as config from './config.js';
import { belongsTo, normalize, reachable } from './server-url.js';

/** Pre-filled in the setup window, the same address the Android app offers. */
const DEFAULT_SERVER = 'https://sonorus.example.com';

const ICON = path.join(import.meta.dirname, '..', 'build', 'icon.png');
const PRELOAD = path.join(import.meta.dirname, 'preload.cjs');
const SETUP_PRELOAD = path.join(import.meta.dirname, 'setup', 'preload.cjs');
const SETUP_PAGE = path.join(import.meta.dirname, 'setup', 'setup.html');

/** The chassis colour of the web app, so no white frame flashes before it paints. */
const CHASSIS = '#100e14';

const BOUNDS_DEBOUNCE_MS = 400;

let mainWindow = null;
let setupWindow = null;

// --- The window the music is in ---------------------------------------------

function openMain(server) {
  const bounds = config.read().bounds;
  mainWindow = new BrowserWindow({
    ...(bounds ?? { width: 1200, height: 820 }),
    minWidth: 480,
    minHeight: 420,
    title: 'Sonorus',
    icon: ICON,
    backgroundColor: CHASSIS,
    // A player with a permanent menu bar over it looks wrong. Alt brings it
    // back, and every shortcut in it works whether it is shown or not.
    autoHideMenuBar: true,
    webPreferences: {
      // The safe defaults of current Electron are left alone (no node, context
      // isolated, sandboxed). The preload adds one thing and nothing else, see
      // preload.cjs.
      preload: PRELOAD,
    },
  });

  mainWindow.loadURL(server);

  // A link leading off the server opens in the real browser. Nothing in Sonorus
  // does that today, but a window with no address bar is the worst place to end
  // up on a page you cannot navigate back from.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (belongsTo(url, server)) return;
    event.preventDefault();
    openExternal(url);
  });

  mainWindow.webContents.on('did-fail-load', (event, code, description, url, isMainFrame) => {
    // -3 is ERR_ABORTED, which is what an ordinary superseded navigation looks
    // like from here - not a failure worth a dialog.
    if (!isMainFrame || code === -3) return;
    showUnreachable(server, description);
  });

  // Written while it happens rather than on the way out. A window ends in more
  // ways than its close button - a page calling `window.close()` raises no
  // `close` event at all, and a killed session raises nothing - so hanging the
  // only write on that one event loses the size in every other case.
  mainWindow.on('resize', rememberBounds);
  mainWindow.on('move', rememberBounds);
  mainWindow.on('close', rememberBounds);
  mainWindow.on('closed', () => { mainWindow = null; });
}

let boundsTimer = null;

/**
 * Stores how big the window is, at most once every [BOUNDS_DEBOUNCE_MS] -
 * dragging one across the screen is hundreds of events and would otherwise be
 * hundreds of writes.
 *
 * The *normal* bounds, not the current ones: asking a maximised window how big
 * it is answers "the screen", and unmaximising it in the next session would
 * then have nothing to go back to.
 */
function rememberBounds() {
  clearTimeout(boundsTimer);
  boundsTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      config.write({ bounds: mainWindow.getNormalBounds() });
    }
  }, BOUNDS_DEBOUNCE_MS);
}

function openExternal(url) {
  // Only the two schemes a link can sensibly be. Handing the desktop anything
  // else is how a page gets to open a program.
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

async function showUnreachable(server, reason) {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'Sonorus',
    message: 'Der Server ist nicht erreichbar.',
    detail: `${server}\n\n${reason}`,
    buttons: ['Erneut versuchen', 'Server ändern …', 'Beenden'],
    defaultId: 0,
    cancelId: 2,
  });
  if (response === 0) mainWindow?.loadURL(server);
  else if (response === 1) openSetup();
  else app.quit();
}

// --- The window that asks where the server is -------------------------------

function openSetup() {
  if (setupWindow) {
    setupWindow.focus();
    return;
  }
  setupWindow = new BrowserWindow({
    width: 460,
    height: 400,
    resizable: false,
    title: 'Sonorus',
    icon: ICON,
    backgroundColor: CHASSIS,
    webPreferences: { preload: SETUP_PRELOAD },
  });
  setupWindow.removeMenu();
  setupWindow.loadFile(SETUP_PAGE);
  setupWindow.on('closed', () => { setupWindow = null; });
}

ipcMain.handle('setup:state', () => {
  const server = config.read().server;
  return { server: server ?? DEFAULT_SERVER, configured: Boolean(server) };
});

ipcMain.handle('setup:connect', async (event, input) => {
  const server = normalize(input);
  if (!server) return { ok: false, message: 'Das ist keine gültige Adresse.' };

  const check = await reachable(server);
  if (!check.ok) return { ok: false, message: `Keine Verbindung: ${check.error}` };

  config.write({ server });
  // The main window is opened *before* the setup window closes: with no window
  // left at all, even for an instant, Electron quits the app.
  if (mainWindow) mainWindow.loadURL(server);
  else openMain(server);
  setupWindow?.close();
  return { ok: true };
});

ipcMain.on('setup:cancel', () => setupWindow?.close());

// --- Menu -------------------------------------------------------------------

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Sonorus',
      submenu: [
        { role: 'reload', label: 'Neu laden' },
        { label: 'Server ändern …', click: openSetup },
        { type: 'separator' },
        { role: 'quit', label: 'Beenden' },
      ],
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'zoomIn', label: 'Vergrößern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        { role: 'resetZoom', label: 'Originalgröße' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
        { role: 'toggleDevTools', label: 'Entwicklertools' },
      ],
    },
  ]));
}

// --- Media keys -------------------------------------------------------------
// Electron embeds Chromium's *content* layer, and the bridge that makes an
// ordinary Chromium answer the media keys (MPRIS on Linux) sits in the browser
// layer around it, which Electron does not ship. So this window would ignore
// them, even though the web app feeds `navigator.mediaSession` perfectly well.
//
// The cheap way back is to take the keys and click the transport the page
// already draws. Two things follow, and both are worth knowing:
//
//  - **The grab is global.** While Sonorus runs, no other player sees these
//    keys. For a dedicated music window that is usually what you want, and
//    deleting these few lines is how you undo it.
//  - **The selectors are the web app's own ids.** Renaming a transport button
//    in ../sonorus silently stops this from working, and nothing here will say
//    so.
//
// Under Wayland a client cannot necessarily grab keys at all, so this may
// simply not take - `register` says so by returning false, and there is nothing
// useful to do about it from in here.

const MEDIA_KEYS = {
  MediaPlayPause: '#btn-play',
  MediaNextTrack: '#btn-next',
  MediaPreviousTrack: '#btn-prev',
};

function registerMediaKeys() {
  for (const [key, selector] of Object.entries(MEDIA_KEYS)) {
    globalShortcut.register(key, () => mainWindow?.webContents.send('sonorus:press', selector));
  }
}

// --- Lifecycle --------------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
  // A second start is a request to see the window that is already playing.
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = mainWindow ?? setupWindow;
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    buildMenu();
    registerMediaKeys();
    const server = config.read().server;
    if (server) openMain(server);
    else openSetup();
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
}
