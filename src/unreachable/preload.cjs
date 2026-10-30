// Same shape as the setup window's bridge: the page reads what failed and
// reports one choice, and nothing of Node reaches it.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sonorus', {
  /** `{ server, reason }` - the address that failed and why. */
  state: () => ipcRenderer.invoke('unreachable:state'),
  /** One of `retry`, `change`, `quit`. */
  choose: (action) => ipcRenderer.send('unreachable:choose', action),
});
