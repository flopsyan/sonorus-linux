// The setup window. It knows the address it was given, hands back what was
// typed, and shows why the main process refused it - the checking itself
// happens over there, where the network is.

const form = document.getElementById('form');
const input = document.getElementById('server');
const error = document.getElementById('error');
const connect = document.getElementById('connect');
const cancel = document.getElementById('cancel');

async function init() {
  const state = await window.sonorus.state();
  input.value = state.server;
  // Only offered once there is a server to go back to. On the very first start
  // there is nothing to cancel *to*.
  cancel.hidden = !state.configured;
  input.focus();
  input.select();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.textContent = '';
  connect.disabled = true;
  connect.textContent = 'Verbinden …';

  const result = await window.sonorus.connect(input.value);
  // On success the main process opens the player and closes this window, so
  // there is nothing to do here.
  if (result.ok) return;

  error.textContent = result.message;
  connect.disabled = false;
  connect.textContent = 'Verbinden';
  input.focus();
  input.select();
});

cancel.addEventListener('click', () => window.sonorus.cancel());

init();
