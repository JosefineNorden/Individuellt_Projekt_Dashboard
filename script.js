/***************** KLOCKA *****************/
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('clock').textContent = `${hours}:${minutes}`;

  const opts = { day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('date').textContent = now.toLocaleDateString('sv-SE', opts);
}
setInterval(updateClock, 1000);
updateClock();

/*************** RUBRIK – klicka redigera ***************/
const TITLE_KEY = 'dashboardTitle';
const titleEl = document.getElementById('dashboard-title');

function loadTitle() {
  const saved = localStorage.getItem(TITLE_KEY);
  if (saved && saved.trim()) titleEl.textContent = saved;
}
function saveTitle(newTitle) {
  const clean = (newTitle || '').trim();
  if (!clean) return;
  localStorage.setItem(TITLE_KEY, clean);
  titleEl.textContent = clean;
}
function startEditingTitle() {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'title-edit-input';
  input.value = titleEl.textContent.trim();
  input.maxLength = 60;

  titleEl.style.display = 'none';
  titleEl.insertAdjacentElement('afterend', input);
  input.focus(); input.select();

  const confirm = () => { if (input.value.trim()) saveTitle(input.value); cleanup(); };
  const cancel  = () => cleanup();
  const cleanup = () => { input.remove(); titleEl.style.display = ''; };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') cancel();
  });
  input.addEventListener('blur', confirm);
}
titleEl.addEventListener('click', startEditingTitle);
loadTitle();

/*************** SNABBLÄNKAR ***************/
const LINKS_KEY = 'dashboardLinks';
const linksList = document.getElementById('links-list');
const addLinkBtn = document.getElementById('add-link');
const linkForm   = document.getElementById('link-form');
const linkTitle  = document.getElementById('link-title');
const linkURL    = document.getElementById('link-url');
const cancelLinkBtn = document.getElementById('cancel-link');

function loadLinks() {
  linksList.innerHTML = '';
  const links = JSON.parse(localStorage.getItem(LINKS_KEY) || '[]');
  links.forEach(l => addLinkToDOM(l.title, l.url));
}
function saveLinks() {
  const links = [];
  linksList.querySelectorAll('li a').forEach(a => {
    links.push({ title: a.textContent, url: a.getAttribute('href') });
  });
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}
/* lägg på https:// automatiskt */
function normalizeUrl(url) {
  const u = (url || '').trim();
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function faviconUrl(url){
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
}

function addLinkToDOM(title, url, save = false) {
  const li = document.createElement('li');

  
  const left = document.createElement('div');
  left.className = 'left';

  const href = normalizeUrl(url);

  const fav = document.createElement('img');
  fav.className = 'favicon';
  fav.alt = '';
  fav.src = faviconUrl(href);

  const a = document.createElement('a');
  a.href = href;
  a.textContent = title;
  a.target = '_blank';
  a.rel = 'noopener';

  left.append(fav, a);

  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-link';
  removeBtn.title = 'Ta bort';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => { li.remove(); saveLinks(); addLinkBtn.focus(); });

  li.append(left, removeBtn);
  linksList.appendChild(li);
  if (save) saveLinks();
}

addLinkBtn.addEventListener('click', () => {
  linkForm.hidden = false;
  linkTitle.value = '';
  linkURL.value = '';
  linkTitle.focus();
});
cancelLinkBtn.addEventListener('click', () => {
  linkForm.hidden = true;
  addLinkBtn.focus();
});
linkForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = linkTitle.value.trim();
  const url = linkURL.value.trim();
  if (!title || !url) return;
  addLinkToDOM(title, url, true);
  linkForm.hidden = true;
  addLinkBtn.focus();
});
loadLinks();

/*************** ANTECKNINGAR – autospar ***************/
const NOTES_KEY = 'dashboardNotes';
const notesEl = document.getElementById('notes-text');
if (notesEl) {
  notesEl.value = localStorage.getItem(NOTES_KEY) || '';
  notesEl.addEventListener('input', () => {
    localStorage.setItem(NOTES_KEY, notesEl.value);
  });
}

/*************** VÄDER***************/
(function setupWeatherWithGeo() {
  const rows = document.querySelectorAll('#weather-list .weather-row');
  const titleEl = document.getElementById('weather-title');
  if (rows.length < 3 || !titleEl) return;

  const FALLBACK = { lat: 57.4264, lon: 12.5252, name: 'Björketorp' };

  const WMO_SV = {
    0: 'Klart', 1: 'Mestadels klart', 2: 'Halvklart', 3: 'Mulet',
    45: 'Dimma', 48: 'Underkyld dimma',
    51: 'Duggregn lätt', 53: 'Duggregn', 55: 'Duggregn kraftigt',
    56: 'Underkylt duggregn', 57: 'Underkylt duggregn kraftigt',
    61: 'Regn lätt', 63: 'Regn', 65: 'Regn kraftigt',
    66: 'Underkylt regn', 67: 'Underkylt regn kraftigt',
    71: 'Snö lätt', 73: 'Snö', 75: 'Snö kraftigt',
    77: 'Snökorn',
    80: 'Regnskurar lätta', 81: 'Regnskurar', 82: 'Regnskurar kraftiga',
    85: 'Snöbyar', 86: 'Snöbyar kraftiga',
    95: 'Åska', 96: 'Åska med hagel', 99: 'Kraftig åska med hagel'
  };
  const sv = (code) => WMO_SV[code] || 'Okänt väder';

  function iconClassFor(code){
    if ([0,1,2].includes(code)) return 'sun';
    if (code === 3) return 'cloud';
    if ([45,48].includes(code)) return 'fog';
    if ([51,53,55,56,57].includes(code)) return 'rain';
    if ([61,63,65,66,67,80,81,82].includes(code)) return 'rain';
    if ([71,73,75,77,85,86].includes(code)) return 'snow';
    if ([95,96,99].includes(code)) return 'thunder';
    return 'cloud';
  }
  function setIcon(row, code){
    const icon = row.querySelector('.w-icon');
    if (!icon) return;
    icon.className = 'w-icon ' + iconClassFor(code);
  }

  const labelForIndex = (i, isoDate) => {
    if (i === 0) return 'Idag';
    if (i === 1) return 'Imorgon';
    const d = new Date(isoDate);
    const w = d.toLocaleDateString('sv-SE', { weekday: 'long' });
    return w.charAt(0).toUpperCase() + w.slice(1);
  };

  function ensureChips(row) {
    let chips = row.querySelectorAll('.chip');
    if (chips.length < 2) {
      const tags = row.querySelector('.w-tags');
      if (!tags) return [];
      tags.replaceChildren();
      const t = document.createElement('span'); t.className = 'chip';
      const d = document.createElement('span'); d.className = 'chip';
      tags.append(t, d);
      chips = row.querySelectorAll('.chip');
    }
    return chips;
  }

  function setRow(row, label, temp, desc) {
    const title = row.querySelector('.w-text strong');
    if (title) title.textContent = label;
    const [tempChip, descChip] = ensureChips(row);
    if (tempChip) tempChip.textContent = `${Math.round(temp)}°C`;
    if (descChip) descChip.textContent = desc;
  }

  function showError(msg) {
    const first = rows[0];
    const title = first.querySelector('.w-text strong');
    if (title) title.textContent = 'Fel';
    const tags = first.querySelector('.w-tags');
    if (tags) {
      tags.replaceChildren(Object.assign(document.createElement('span'), { className: 'chip', textContent: msg }));
    }
  }

  async function fetchForecast(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max&timezone=auto&forecast_days=3`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Nätverksfel');
    return res.json();
  }

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=sv`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('geo-net');
      const data = await res.json();
      const place = data?.results?.[0];
      return place?.name || place?.locality || place?.admin2 || null;
    } catch { return null; }
  }

  async function renderFor(lat, lon, note) {
    try {
      const place = await reverseGeocode(lat, lon);
      if (place) titleEl.textContent = `Dagens väder – ${place}`;
      if (note)  titleEl.textContent += ` (${note})`;

      const data = await fetchForecast(lat, lon);
      const times = data?.daily?.time || [];
      const temps = data?.daily?.temperature_2m_max || [];
      const codes = data?.daily?.weathercode || [];

      for (let i = 0; i < 3; i++) {
        const code = Number(codes[i]);
        setRow(rows[i], labelForIndex(i, times[i]), temps[i], sv(code));
        setIcon(rows[i], code);
      }
    } catch (e) {
      console.error(e);
      showError('Kunde inte hämta väder');
    }
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation saknas'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000
      });
    });
  }

  (async () => {
    try {
      const pos = await getPosition();
      const { latitude, longitude } = pos.coords;
      await renderFor(latitude, longitude);
    } catch (err) {
      console.warn('Geo-fel, använder fallback:', err);
      titleEl.textContent = `Dagens väder – ${FALLBACK.name} (plats nekad/fel)`;
      await renderFor(FALLBACK.lat, FALLBACK.lon);
    }
  })();
})();

/*************** BYT BAKGRUND ***************/
(() => {
  const btn = document.getElementById('change-background');
  if (!btn) return;

  const QUERY = 'nature';
  let clickId = 0;

  const DPR  = Math.min(window.devicePixelRatio || 1, 1.5);
  const dims = () => ({
    w: Math.min(1600, Math.ceil(window.innerWidth  * DPR)),
    h: Math.min( 900, Math.ceil(window.innerHeight * DPR))
  });

  const seed = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const unsplash = (w,h,q=QUERY) =>
    `https://source.unsplash.com/featured/${w}x${h}/?${encodeURIComponent(q)}&sig=${seed()}`;
  const picsum   = (w,h) =>
    `https://picsum.photos/seed/${encodeURIComponent(seed())}/${w}/${h}`;

  function preload(url, timeoutMs){
    return new Promise((resolve, reject) => {
      const img = new Image();
      const t = setTimeout(() => { img.src = 'about:blank'; reject('timeout'); }, timeoutMs);
      img.onload  = () => { clearTimeout(t); resolve(img.currentSrc || url); };
      img.onerror = () => { clearTimeout(t); reject('error'); };
      img.src = url;
    });
  }

  function apply(url){
    const s = `url("${url}")`;
    document.documentElement.style.backgroundImage = s;
    document.body.style.backgroundImage = s;
    document.documentElement.classList.add('has-bg');
    document.body.classList.add('has-bg');
  }

  async function changeBackground(){
    const id = ++clickId;
    btn.disabled = true;
    btn.dataset.txt ??= btn.textContent || 'Byt bakgrund';
    btn.textContent = 'Byter…';

    const { w, h } = dims();
    const pw = Math.max(400, Math.round(w/3));
    const ph = Math.max(300, Math.round(h/3));

    preload(picsum(pw, ph), 2000)
      .then(url => { if (id === clickId) apply(url); })
      .catch(() => {});

    try {
      const hi = await preload(unsplash(w, h), 5000)
                    .catch(() => preload(picsum(w, h), 5000));
      if (id === clickId) apply(hi);
    } finally {
      if (id === clickId) {
        btn.disabled = false;
        btn.textContent = btn.dataset.txt;
      }
    }
  }

  btn.addEventListener('click', changeBackground);
})();

/*************** EXTRA SEKTION – Aftonbladet ***************/
(function setupAftonbladetNews() {
  const section = document.getElementById('custom-api');
  if (!section) return;

  // Sätt rubriken tydligt
  const h2 = section.querySelector('h2');
  if (h2) h2.textContent = 'Senaste nytt (Aftonbladet)';

  // Skapa lista + uppdateraknapp utan att röra HTML
  const list = document.createElement('ul');
  list.id = 'news-list';
  section.appendChild(list);

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'news-refresh';
  refreshBtn.textContent = 'Uppdatera';
  section.appendChild(refreshBtn);

  
  const RSS = 'https://rss.aftonbladet.se/rss2/small/pages/sections/senastenytt';
  const FEED_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(RSS)}`;

  function timeLabel(pubDate) {
    const d = new Date(pubDate);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  }

  async function loadNews() {
    list.innerHTML = '<li class="news-status">Hämtar…</li>';
    try {
      console.log('Hämtar nyheter från Aftonbladet…');
      const res = await fetch(FEED_URL);
      if (!res.ok) throw new Error('Nätverksfel');
      const xml = await res.text();

      
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item')).slice(0, 6);

      list.innerHTML = '';
      items.forEach(item => {
        const title = item.querySelector('title')?.textContent?.trim() || 'Okänd rubrik';
        const link  = item.querySelector('link')?.textContent?.trim() || '#';
        const when  = item.querySelector('pubDate')?.textContent;

        const li = document.createElement('li');
        const time = document.createElement('span');
        time.className = 'news-time';
        time.textContent = timeLabel(when);

        const a = document.createElement('a');
        a.href = link;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = title;

        li.append(time, a);
        list.appendChild(li);
      });

      if (!items.length) {
        list.innerHTML = '<li class="news-status">Inga nyheter hittades just nu.</li>';
      }
    } catch (e) {
      console.error(e);
      list.innerHTML = '<li class="news-status">Kunde inte hämta nyheter.</li>';
    }
  }

  refreshBtn.addEventListener('click', loadNews);
  loadNews(); // ladda direkt
})();

