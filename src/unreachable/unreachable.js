const retry = document.getElementById('retry');

for (const action of ['retry', 'change', 'quit']) {
  document.getElementById(action).addEventListener('click', () => window.sonorus.choose(action));
}

window.sonorus.state().then(({ server, reason }) => {
  document.getElementById('server').textContent = server;
  document.getElementById('reason').textContent = reason;
  retry.focus();
});
