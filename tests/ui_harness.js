// Served only by scripts/preview_ui.py. Never calls the live model service.
const realFetch = window.fetch.bind(window);
window.fetch = (url, options) => {
  if (String(url).includes('modal.run')) {
    if (String(url).endsWith('/score')) return new Promise(resolve => setTimeout(() => resolve(
      new Response(JSON.stringify({ code: 'busy' }), {
        status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
      })), 8000));
    return Promise.resolve(new Response(JSON.stringify({ code: 'busy' }), {
      status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '1' },
    }));
  }
  return realFetch(url, options);
};
window.addEventListener('load', async () => {
  while (!pool.length) await new Promise(resolve => setTimeout(resolve, 30));
  if (new URLSearchParams(location.search).get('mode') === 'flow') return;
  const failures = runWebFixtures();
  const report = document.createElement('output');
  report.id = 'test-report';
  report.textContent = JSON.stringify(failures);
  report.setAttribute('aria-label', 'UI test failures');
  document.body.append(report);
});
