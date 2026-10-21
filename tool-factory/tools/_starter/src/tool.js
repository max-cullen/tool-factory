// __NAME__ tool logic. Runs in the browser; nothing is sent anywhere.
// Replace the example below with the real tool.
const root = document.querySelector('[data-tool]');
if (root) {
  const input = root.querySelector('[data-input]');
  const out = root.querySelector('[data-output]');
  const render = () => {
    const text = input.value.trim();
    out.innerHTML = '';
    if (!text) { out.innerHTML = '<p class="hint">Type something to see results.</p>'; return; }
    const list = document.createElement('ul');
    list.className = 'result-list m-0 list-none p-0';
    for (const v of [text, text.toUpperCase(), [...text].reverse().join('')]) {
      const li = document.createElement('li');
      li.textContent = v;
      list.appendChild(li);
    }
    out.appendChild(list);
  };
  input.addEventListener('input', render);
  render();
}
