const el = document.getElementById('time');
const pad = (n) => String(n).padStart(2, '0');

function render() {
  const now = new Date();
  el.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}

render();
(function tick() {
  setTimeout(() => {
    render();
    tick();
  }, 1000 - (Date.now() % 1000) + 12);
})();
