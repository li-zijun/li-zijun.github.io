(function() {
  const currentPage = document.body.dataset.page;
  const routes = {
    about: { page: 'about', href: '/' },
    publications: { page: 'publications', href: 'publications.html' },
    patents: { page: 'publications', href: 'publications.html#patents' }
  };

  // Preserve links shared before the site was divided into separate pages.
  function restoreLegacyLink() {
    const id = window.location.hash.slice(1);
    if (routes[id] && routes[id].page !== currentPage) {
      window.location.replace(routes[id].href);
    } else if ((id === 'research' || id === 'education') && currentPage !== 'about') {
      window.location.replace('/#' + id);
    }
  }
  restoreLegacyLink();
  window.addEventListener('hashchange', restoreLegacyLink);

  const header = document.querySelector('.topbar');
  function updateHeaderHeight() {
    document.documentElement.style.setProperty('--nav-height', Math.ceil(header.getBoundingClientRect().height) + 'px');
  }
  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight);
  if (window.ResizeObserver) new ResizeObserver(updateHeaderHeight).observe(header);
})();

document.querySelectorAll('[data-citation]').forEach(function(button) {
  button.addEventListener('click', async function() {
    const citation = document.getElementById(button.dataset.citation);
    const status = document.getElementById('copy-status');
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(citation.textContent);
      button.textContent = 'Copied';
      status.textContent = 'BibTeX citation copied to clipboard.';
    } catch (error) {
      const range = document.createRange();
      range.selectNodeContents(citation);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Selected — copy manually';
      status.textContent = 'Citation selected. Use your device’s copy command to copy it.';
    }
    window.setTimeout(function() { button.textContent = 'Copy BibTeX'; }, 3500);
  });
});

(function() {
  const button = document.querySelector('[data-site-like]');
  if (!button) return;
  const countElement = button.querySelector('.like-count');
  const status = document.querySelector('[data-like-status]');
  const isPreview = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname) || location.hostname.endsWith('.localhost') || location.protocol === 'file:';
  // Preview votes use a separate counter and never change the public total.
  const counterUrl = isPreview ? 'https://li-zijun.github.io/__preview-likes/' : 'https://li-zijun.github.io/';
  const api = 'https://applause.chabouis.fr';
  const storageKey = 'zijun-li:liked:' + counterUrl;
  let liked = false;
  let loaded = false;
  let busy = false;
  let total = null;

  try { liked = localStorage.getItem(storageKey) === 'true'; } catch (error) {}

  function render() {
    const fullCount = total === null ? '' : total.toLocaleString('en');
    countElement.textContent = total === null ? '—' : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(total);
    button.classList.toggle('is-liked', liked);
    button.disabled = busy || liked;
    button.setAttribute('aria-pressed', String(liked));
    button.setAttribute('aria-busy', String(busy));
    const label = liked ? 'Liked' : 'Like this website';
    button.setAttribute('aria-label', label + (fullCount ? ' · ' + fullCount + ' likes' : ''));
    button.title = busy ? 'Loading likes' : label + (fullCount ? ' · ' + fullCount + ' total likes' : '');
  }

  async function requestCount(method) {
    const controller = new AbortController();
    const timer = window.setTimeout(function() { controller.abort(); }, 8000);
    try {
      const endpoint = method === 'POST' ? 'update-claps' : 'get-claps';
      const options = { method: method, credentials: 'omit', cache: 'no-store', signal: controller.signal };
      if (method === 'POST') {
        options.headers = { 'Content-Type': 'text/plain' };
        options.body = JSON.stringify('1,zijun-li-website');
      }
      const response = await fetch(api + '/' + endpoint + '?url=' + encodeURIComponent(counterUrl), options);
      if (!response.ok) throw new Error('Like service unavailable');
      const text = (await response.text()).trim();
      if (!/^\d+$/.test(text)) throw new Error('Invalid like count');
      const value = Number(text);
      if (!Number.isSafeInteger(value)) throw new Error('Invalid like count');
      return value;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function load() {
    busy = true;
    render();
    try {
      total = await requestCount('GET');
      loaded = true;
      status.textContent = '';
    } catch (error) {
      loaded = false;
      status.textContent = liked ? 'The total is temporarily unavailable. Please refresh later.' : 'Likes are temporarily unavailable. Click to retry.';
    } finally {
      busy = false;
      render();
      if (!loaded) button.title = liked ? 'Liked · total temporarily unavailable' : 'Likes unavailable — click to retry';
    }
  }

  button.addEventListener('click', async function() {
    if (busy || liked) return;
    if (!loaded) { await load(); return; }
    busy = true;
    render();
    try {
      total = await requestCount('POST');
      liked = true;
      try { localStorage.setItem(storageKey, 'true'); } catch (error) {}
      status.textContent = 'Thank you for your like. ' + total.toLocaleString('en') + ' total likes.';
    } catch (error) {
      status.textContent = 'Your like could not be confirmed. Please try again later.';
    } finally {
      busy = false;
      render();
    }
  });

  window.addEventListener('storage', function(event) {
    if (event.key === storageKey && event.newValue === 'true') {
      liked = true;
      render();
    }
  });
  load();
})();
