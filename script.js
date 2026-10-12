(function() {
  const currentPage = document.body.dataset.page;
  const routes = {
    about: { page: 'about', href: 'index.html' },
    publications: { page: 'publications', href: 'publications.html' },
    patents: { page: 'publications', href: 'publications.html#patents' }
  };

  // Preserve links shared before the site was divided into separate pages.
  function restoreLegacyLink() {
    const id = window.location.hash.slice(1);
    if (routes[id] && routes[id].page !== currentPage) {
      window.location.replace(routes[id].href);
    } else if ((id === 'research' || id === 'education') && currentPage !== 'about') {
      window.location.replace('index.html#' + id);
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
