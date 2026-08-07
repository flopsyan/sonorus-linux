// The only thing the page gets from this process, and it goes one way.
//
// A media key arrives in the main process and has to reach the transport of the
// page. This runs in the isolated world, which shares the DOM but not the
// page's Content-Security-Policy - injecting the same line with
// `executeJavaScript` would be at the mercy of that policy, and Sonorus sets a
// strict one.
//
// Nothing is exposed to the page in return: there is no `contextBridge` call
// here, so the web app cannot tell it is running in a window rather than a tab,
// and does not have to.

const { ipcRenderer } = require('electron');

ipcRenderer.on('sonorus:press', (event, selector) => {
  document.querySelector(selector)?.click();
});
