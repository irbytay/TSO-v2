/* Behavior migrated from feed.html. */
// 🦉 The Perch feed: Daily Owl Logic + The Owl's Position
  // Mirrors the Flutter feed.dart logic: Owl_Logic!B2:D21, read in row pairs.

  const PERCH_SHEET_ID = "19wBEj9hEkvIyQcoR5E_mBGVAxTzMnddMxk8nuQLAumA";
  const PERCH_API_KEY = "AIzaSyCzuh9HBfe0r70r9U35Pe406PPZ-tz6I78";
  const PERCH_RANGE = "Owl_Logic!B2:E21";

  function soToast(msg) {
    const el = document.getElementById('so-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    window.clearTimeout(el.__t);
    el.__t = window.setTimeout(() => el.classList.remove('show'), 2400);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parsePerchDateTime(dateText, timeText) {
    const rawDate = String(dateText || '').trim();
    const rawTime = String(timeText || '').replace(/\bET\b/gi, '').trim();

    const dateParts = rawDate.split('/').map((part) => parseInt(part, 10));
    if (dateParts.length !== 3 || dateParts.some(Number.isNaN)) return new Date(0);

    let [month, day, year] = dateParts;
    let hour = 0;
    let minute = 0;

    const timeMatch = rawTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = (timeMatch[3] || '').toUpperCase();
      if (meridiem === 'PM' && hour !== 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
    }

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  function formatPerchTimestamp(dateText, timeText) {
    const date = String(dateText || '').trim();
    const time = String(timeText || '').trim();
    if (date && time) return `${date} • ${time}`;
    return date || time || '';
  }

  async function fetchPerchFeed() {
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${PERCH_SHEET_ID}/values/${encodeURIComponent(PERCH_RANGE)}`);
    url.searchParams.set('key', PERCH_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Sheets fetch failed: ${res.status}`);

    const json = await res.json();
    const rows = json.values || [];
    const posts = [];

    for (let i = 0; i < rows.length; i += 2) {
      const dailyRow = rows[i] || [];
      const strategicRow = rows[i + 1] || [];

      const dailyOwlLogic = String(dailyRow[0] || '').trim();
const strategicPositioning = String(strategicRow[0] || '').trim();

const date = String(dailyRow[2] || '').trim();
const time = String(strategicRow[2] || '').trim();

// Column E = optional image attached to this post
const imageUrl = String(dailyRow[3] || '').trim();

      if (!dailyOwlLogic || !strategicPositioning) continue;

      posts.push({
  id: `perch-${i}`,
  dailyOwlLogic,
  strategicPositioning,
  imageUrl,
  date,
  time,
  timestamp: formatPerchTimestamp(date, time),
  sortDate: parsePerchDateTime(date, time),
});
    }

    posts.sort((a, b) => b.sortDate - a.sortDate);
    return posts;
  }

  async function copyText(text, label) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return;

    try {
      await navigator.clipboard.writeText(cleanText);
      soToast(`Copied ${label}.`);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = cleanText;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      soToast(`Copied ${label}.`);
    }
  }

  async function shareText(text, title) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return;

    if (navigator.share) {
      try {
        await navigator.share({ title, text: cleanText });
      } catch (_) {
        // User cancelled share sheet.
      }
    } else {
      await copyText(cleanText, title);
      soToast('Share not supported here. Copied instead.');
    }
  }

  function renderPerchPost(post) {
    const fullPost = `${post.dailyOwlLogic}\n\n${post.strategicPositioning}`;

    return `
      <article class="so-card perch-post" data-post-id="${escapeHtml(post.id)}">
        <div class="so-card-title-row">
          <div class="so-card-heading-block">
            <div class="so-author-row">
              <img src="assets/images/founder-portrait.png" alt="Taylor Irby" class="so-author-avatar" onerror="this.style.display='none';" />
              <p class="so-author-meta">
                <span class="so-author-name">Taylor Irby</span>
                ${post.timestamp ? `<span class="so-author-time">${escapeHtml(post.timestamp)}</span>` : ''}
              </p>
              <img class="feed-card-brand-mark" src="assets/images/brand-title.png" alt="The Strategic Owl" />
            </div>
            <h2 class="so-card-title">Daily Owl Logic</h2>
          </div>
          <div class="so-actions">
            <button class="so-icon-btn" data-copy="daily" title="Copy Owl Logic" aria-label="Copy Owl Logic">
              <svg class="so-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm4 4H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 18H8V7h12v16z"/></svg>
            </button>
            <button class="so-icon-btn" data-share="daily" title="Share Owl Logic" aria-label="Share Owl Logic">
              <svg class="so-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a2.5 2.5 0 0 0 0-1.39l7.02-4.11A2.99 2.99 0 1 0 14 5a2.9 2.9 0 0 0 .04.49L7.02 9.6a3 3 0 1 0 0 4.8l7.02 4.11c-.03.16-.04.33-.04.49a3 3 0 1 0 3-2.92z"/></svg>
            </button>
          </div>
        </div>
        <div class="so-card-body">${escapeHtml(post.dailyOwlLogic)}</div>

        <div class="so-feed-section-spacer" aria-hidden="true"></div>

        <div class="so-card-title-row">
          <h2 class="so-card-title">The Owl’s Position</h2>
          <div class="so-actions">
            <button class="so-icon-btn" data-copy="position" title="Copy The Owl’s Position" aria-label="Copy The Owl’s Position">
              <svg class="so-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm4 4H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 18H8V7h12v16z"/></svg>
            </button>
            <button class="so-icon-btn" data-share="position" title="Share The Owl’s Position" aria-label="Share The Owl’s Position">
              <svg class="so-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a2.5 2.5 0 0 0 0-1.39l7.02-4.11A2.99 2.99 0 1 0 14 5a2.9 2.9 0 0 0 .04.49L7.02 9.6a3 3 0 1 0 0 4.8l7.02 4.11c-.03.16-.04.33-.04.49a3 3 0 1 0 3-2.92z"/></svg>
            </button>
          </div>
        </div>
        <div class="so-card-body italic">${escapeHtml(post.strategicPositioning)}</div>

        ${post.imageUrl ? `
          <div class="so-post-media">
            <img
              src="${escapeHtml(post.imageUrl)}"
              alt="Strategic Owl editorial artwork"
              class="so-post-image"
              loading="lazy"
              decoding="async"
            />
          </div>
        ` : ''}

        <div style="margin-top:16px; text-align:center;">
          <button class="so-icon-btn" data-copy="full" title="Copy full post" aria-label="Copy full post" style="width:auto; padding:0 14px; color:var(--understanding); font-weight:700; font-family:'Inter', sans-serif;">
            Copy Full Post
          </button>
        </div>
      </article>
    `;
  }

  function attachPerchActions(posts) {
    document.querySelectorAll('.perch-post').forEach((card) => {
      const post = posts.find((item) => item.id === card.dataset.postId);
      if (!post) return;

      const fullPost = `${post.dailyOwlLogic}\n\n${post.strategicPositioning}`;

      card.querySelector('[data-copy="daily"]')?.addEventListener('click', () => copyText(post.dailyOwlLogic, 'Owl Logic'));
      card.querySelector('[data-share="daily"]')?.addEventListener('click', () => shareText(post.dailyOwlLogic, 'Daily Owl Logic'));
      card.querySelector('[data-copy="position"]')?.addEventListener('click', () => copyText(post.strategicPositioning, 'The Owl’s Position'));
      card.querySelector('[data-share="position"]')?.addEventListener('click', () => shareText(post.strategicPositioning, 'The Owl’s Position'));
      card.querySelector('[data-copy="full"]')?.addEventListener('click', () => copyText(fullPost, 'full post'));
    });
  }

  async function loadPerchFeed() {
    const list = document.getElementById('perch-feed-list');
    if (!list) return;

    list.innerHTML = `
      <div class="so-card">
        <p class="so-card-subtitle" style="text-align:center; margin:0;">Loading the latest Owl Logic…</p>
      </div>
    `;

    try {
      const posts = await fetchPerchFeed();

      if (!posts.length) {
        list.innerHTML = `
          <div class="so-card">
            <p class="so-card-subtitle" style="text-align:center; margin:0;">No feed posts are available right now.</p>
          </div>
        `;
        return;
      }

      list.innerHTML = posts.map(renderPerchPost).join('');
      attachPerchActions(posts);
    } catch (e) {
      console.warn('The Perch feed failed:', e);
      list.innerHTML = `
        <div class="so-card">
          <p class="so-card-subtitle" style="text-align:center; margin:0;">The feed could not load. Please refresh and try again.</p>
        </div>
      `;
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    loadPerchFeed();
    document.getElementById('refresh-feed')?.addEventListener('click', loadPerchFeed);
  });

// ⚖️ Legal popup (show on first visit or after 30 days)
  const legalPopup = document.getElementById('legal-popup');
  const lastAccepted = localStorage.getItem('legalPopupAccepted');
  const now = Date.now();
  const thirtyDays = 1000 * 60 * 60 * 24 * 30;

  if (legalPopup) {
    const last = parseInt(lastAccepted || '0', 10);
    if (!last || (now - last) > thirtyDays) {
      legalPopup.style.display = 'block';
    }

    const acceptLink = document.getElementById('accept-link');
    if (acceptLink) {
      acceptLink.addEventListener('click', () => {
        localStorage.setItem('legalPopupAccepted', Date.now().toString());
      });
    }
  }

  // 🍔 Mobile menu
  function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    if (!menu) return;
    menu.classList.toggle('show');
    menu.classList.toggle('open');
  }

// Auto-close mobile menu when clicking/tapping outside
  document.addEventListener('click', function (event) {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.getElementById('menuToggle');

    if (!menu || !toggle) return;

    const isClickInsideMenu = menu.contains(event.target);
    const isClickOnToggle = toggle.contains(event.target);

    if (!isClickInsideMenu && !isClickOnToggle && menu.classList.contains('open')) {
      menu.classList.remove('open');
      menu.classList.remove('show');
    }
  });
