// js/spa.js - defensive hash router with logging & graceful fallback
(() => {
  const ROUTES = {
    '/': { file: 'sections/home.html', title: 'Mohamed Elsawaf — Home' },
    '/about': { file: 'sections/about.html', title: 'Mohamed Elsawaf — About' },
    '/publications': { file: 'sections/publications.html', title: 'Mohamed Elsawaf — Publications' },
    '/experience': { file: 'sections/experience.html', title: 'Mohamed Elsawaf — Experience' },
    '/contact': { file: 'sections/contact.html', title: 'Mohamed Elsawaf — Contact' },
    '/*': {file: 'sections/404.html', title: 'Not found'}
  };

  const mainEl = document.getElementById('main-content');
  if (!mainEl) {
    console.error('SPA router could not find #main-content element. Make sure index.html contains <main id="main-content">');
    return;
  }

  const cache = new Map();
  const DEFAULT_TITLE = document.title || 'Mohamed Elsawaf – RF Design Engineer';

  function normalizeRoute(path) {
    if (!path) return '/';
    path = path.split('?')[0].split('#')[0];
    path = path.replace(/\/+$/, '');
    return path === '' ? '/' : path;
  }

  function routeFromHash() {
    if (!location.hash) return '/';
    const h = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    return normalizeRoute(h);
  }

  async function fetchFragment(url) {
    if (cache.has(url)) return cache.get(url);
    console.log('[SPA] fetching:', url);
    try {
      const res = await fetch(url, { 
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) throw new Error('Fetch failed: ' + res.status + ' ' + res.statusText);
      const text = await res.text();
      cache.set(url, text);
      return text;
    } catch (err) {
      console.error('[SPA] fetch error for', url, err);
      throw err;
    }
  }

  function setActiveNav(route) {
    document.querySelectorAll('a[data-link].nav-link, a[data-link]').forEach(a => {
      const href = a.getAttribute('href') || '';
      let linkRoute = '/';
      if (href.startsWith('#')) linkRoute = normalizeRoute(href.slice(1));
      else {
        try { linkRoute = normalizeRoute(new URL(href, location.href).pathname); } catch(e) { linkRoute = '/'; }
      }
      if (linkRoute === route) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      }
    });
  }

  async function loadRoute(route) {
    const info = ROUTES[route] || null;
    const fragment = info ? info.file : 'sections/404.html';

    mainEl.setAttribute('aria-busy', 'true');
    mainEl.classList.add('loading');
    
    try {
      const html = await fetchFragment(fragment);
      // basic sanity: ensure injected content is a fragment (not a full HTML document)
      if (html.trim().startsWith('<!DOCTYPE') || /<html[\s>]/i.test(html)) {
        console.warn('[SPA] Loaded fragment looks like a full HTML document. Did you accidentally fetch index.html or open a fragment directly?');
      }
      mainEl.innerHTML = html;
      mainEl.focus();
      document.title = info ? info.title : DEFAULT_TITLE + ' — Not found';
      
      // Trigger load animations for new content
      setTimeout(() => {
        document.body.classList.add('is-loaded');
      }, 50);
      
    } catch (err) {
      // show fallback content but keep header/footer intact
      mainEl.innerHTML = `<section class="tagline-card"><div class="container"><h2>Unable to load page</h2><p>There was a problem loading the requested section. Please check your connection and try again.</p><p><a href="#/" data-link>← Back to Home</a></p></div></section>`;
      document.title = DEFAULT_TITLE + ' — Error';
    } finally {
      mainEl.removeAttribute('aria-busy');
      mainEl.classList.remove('loading');
      setActiveNav(route);
    }
  }

  // Handle click events on data-link anchors for smoother navigation
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (link) {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        location.hash = href;
      }
    }
  });

  // On hashchange, load the new route
  window.addEventListener('hashchange', () => {
    console.log('[SPA] hashchange ->', location.hash);
    loadRoute(routeFromHash());
  });

  // On initial load, if hash exists use it; otherwise load default route WITHOUT forcing a hash.
  document.addEventListener('DOMContentLoaded', () => {
    const route = routeFromHash();
    console.log('[SPA] initial route ->', route);
    loadRoute(route).then(() => {
      document.body.classList.add('is-loaded');  // <- makes content visible
    });
  });

  // Expose helper for programmatic navigation
  window.spaNavigate = (path) => {
    const route = normalizeRoute(path);
    location.hash = route;
  };

})();