// The setup window may ask three things and do nothing else. Every one of them
// is a round trip to the main process, so no part of Node ever reaches the page.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sonorus', {
  /** `{ server, configured }` - the address to show, and whether one is stored. */
  state: () => ipcRenderer.invoke('setup:state'),
  /** `{ ok }` or `{ ok: false, message }`. On success the main process takes over. */
  connect: (server) => ipcRenderer.invoke('setup:connect', server),
  cancel: () => ipcRenderer.send('setup:cancel'),
});
