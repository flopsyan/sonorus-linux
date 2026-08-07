// What this machine remembers between starts, and deliberately not more.
//
// Only two things belong here: which server to talk to, and how big the window
// was. Everything that belongs to the *account* - volume, shuffle, repeat,
// ratings, playlists, history - lives on the server and follows the user to any
// other client. Storing a copy of it here would only give it a chance to
// disagree.

import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const file = () => path.join(app.getPath('userData'), 'config.json');

export function read() {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf8'));
  } catch {
    // No file yet, or one left half-written by a kill. Either way the app has
    // to come up, and the setup window is the answer to both.
    return {};
  }
}

export function write(patch) {
  const next = { ...read(), ...patch };
  const target = file();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  // Written whole and renamed, so an interrupted write leaves the old file
  // standing rather than half of a new one.
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
  fs.renameSync(tmp, target);
  return next;
}
