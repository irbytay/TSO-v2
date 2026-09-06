/* Behavior migrated from voterdash.html. */
// --- Mobile menu toggle (restores hamburger functionality) ---
  function toggleMenu() {
    const menu = document.getElementById("mobileMenu");
    const btn  = document.getElementById("menuToggle");
    if (!menu) return;
    const nowShowing = menu.classList.toggle("show");
    if (btn) {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
    }
    try { console.log("toggleMenu: show=", nowShowing); } catch(_) {}
  }
  // --- CONFIG (yours, unchanged) ---
  const API_KEY  = "AIzaSyCzuh9HBfe0r70r9U35Pe406PPZ-tz6I78";
  const SHEET_ID = "19wBEj9hEkvIyQcoR5E_mBGVAxTzMnddMxk8nuQLAumA";
  // Tab: "State Elections", Range: A2:D51  (A = URL, B = State, C = Upcoming Election Date, D = Registration Deadline)
  const RAW_RANGE = "'State Elections'!A2:D51";
  const RANGE = encodeURIComponent(RAW_RANGE);
  const BIRTH_RANGE = encodeURIComponent("'Birth_Cert'!A1:C51");
let birthStateMap = {};

  // State -> { url, date } map
  let stateMetaMap = {};

  async function fetchStateLinks() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?ranges=${RANGE}&ranges=${BIRTH_RANGE}&key=${API_KEY}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const ranges = json.valueRanges || [];

      const voterRows = (ranges[0] && ranges[0].values) || [];
      const birthRows = (ranges[1] && ranges[1].values) || [];

      // --- voter registration map ---
      stateMetaMap = {};
      for (const row of voterRows) {
        const url = (row[0] || "").trim();
        const state = (row[1] || "").trim();
        const dateRaw = (row[2] || "").trim();
        const regRaw  = (row[3] || "").trim();
        if (state && url) stateMetaMap[state] = { url, date: dateRaw, regDeadline: regRaw };
      }

      // --- birth certificate map ---
      birthStateMap = {};
      for (const row of birthRows) {
        const state = (row[0] || "").trim();
        const url = (row[1] || "").trim();
        const enabled = (row[2] || "").toLowerCase();

        if (state && url && enabled === "true") {
          birthStateMap[state] = url;
        }
      }

      populateStateDropdown();
      populateBirthStateDropdown();
    } catch (e) {
      console.error("Failed to fetch State Elections data:", e);
    }
  }

  function populateStateDropdown() {
    const sel = document.getElementById("state-select");
    // Clear but keep placeholder
    sel.innerHTML = '<option value="">Select Your State:</option>';
    const states = Object.keys(stateMetaMap).sort((a, b) => a.localeCompare(b));
    for (const state of states) {
      const opt = document.createElement("option");
      opt.value = state;
      opt.textContent = state;
      sel.appendChild(opt);
    }
    sel.disabled = states.length === 0;
  }

  function populateBirthStateDropdown() {
    const sel = document.getElementById("birth-state-select");
    if (!sel) return;

    const states = Object.keys(birthStateMap).sort();

    for (const state of states) {
      const opt = document.createElement("option");
      opt.value = state;
      opt.textContent = state;
      sel.appendChild(opt);
    }
  }

  function handleStateChange(e) {
    const state = e.target.value;
    const meta = stateMetaMap[state];
    const link = meta && meta.url;
    const dateStr = meta && meta.date;
    const regStr  = meta && meta.regDeadline;

    const outWrap = document.getElementById("state-output");
    const urlInput = document.getElementById("state-url");
    const openA = document.getElementById("state-open");
    const dateEl = document.getElementById("state-date");
    const regEl  = document.getElementById("state-deadline");

    if (!state || !link) {
      outWrap.style.display = "none";
      urlInput.value = "";
      openA.href = "#";
      if (dateEl) { dateEl.innerHTML = ""; }
      if (regEl) { regEl.innerHTML = ""; }
      return;
    }

    // Show + update
    urlInput.value = link;
    openA.href = link;

    // Render date if available
    if (dateEl) {
      if (dateStr) {
        dateEl.innerHTML = `<span class="date-label">Primary Election:</span> <strong class="date-value">${formatDate(dateStr)}</strong>`;
      } else {
        dateEl.innerHTML = "";
      }
    }

    // Render registration deadline if available
    if (regEl) {
      regEl.innerHTML = regStr
        ? `<span class="date-label">Registration Deadline:</span> <strong class="date-value">${formatDate(regStr)}</strong>`
        : "";
    }

    outWrap.style.display = "block";

    // OPTIONAL: auto-open in a new tab on selection
    // window.open(link, "_blank", "noopener");
  }

  function handleBirthStateChange(e) {

    const state = e.target.value;
    const link = birthStateMap[state];

    const wrap = document.getElementById("birth-state-output");
    const url = document.getElementById("birth-state-url");
    const btn = document.getElementById("birth-state-open");

    if (!link) {
      wrap.style.display = "none";
      return;
    }

    url.value = link;
    btn.href = link;
    wrap.style.display = "block";
  }

  function formatDate(input) {
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      });
    }
    return input; // fallback if sheet already has human-readable text
  }

  // ============================================================
  // ========== NEW: ZIP → DISTRICT + CANDIDATES ================
  // ============================================================

  // Ranges from your screenshots:
  //  - State Elections roster: AH (State full), AI (Position), AJ (Name), AK (District like "AZ-2" or "AK-AtLarge")
  //  - District2Zipcode map:   A (ZIP), C (State abbr), F (District number)
  const RANGE_ROSTER   = encodeURIComponent("'State Elections'!AH1:AN10000");
  const RANGE_ZIPMAP   = encodeURIComponent("'District2Zipcode'!A1:F46654");

  // State -> [{ position, name, district }]
  let stateRosterMap = {};
  let allCandidateRows = [];
  const candidateByKey = new Map();
  let rosterReady = false;
  let rosterLoadError = false;
  // ZIP -> [{ stateAbbr, districtNum }]
  let zipToSD = {};

  const OWL_POSITION_TOPICS = [
    "Reproductive Rights",
    "Cannabis Reform",
    "Democracy & Elections",
    "Gun Policy",
    "Climate & Environment",
    "Education & Curriculum",
    "Healthcare Access",
    "Immigration & Border",
    "Civil & LGBTQ+ Rights",
    "Economic Policy & Labor",
    "Religion & Governance"
  ];

  let pendingCandidateKey = null;

  function hasOwlAccess() {
    return Boolean(
      window.StrategicOwlAccess && window.StrategicOwlAccess.isActive()
    );
  }

  // Two-letter → full state name (to align C=abbr with AH=full)
  const STATE_ABBR_TO_NAME = {
    AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California", CO:"Colorado",
    CT:"Connecticut", DE:"Delaware", FL:"Florida", GA:"Georgia", HI:"Hawaii", ID:"Idaho",
    IL:"Illinois", IN:"Indiana", IA:"Iowa", KS:"Kansas", KY:"Kentucky", LA:"Louisiana",
    ME:"Maine", MD:"Maryland", MA:"Massachusetts", MI:"Michigan", MN:"Minnesota",
    MS:"Mississippi", MO:"Missouri", MT:"Montana", NE:"Nebraska", NV:"Nevada",
    NH:"New Hampshire", NJ:"New Jersey", NM:"New Mexico", NY:"New York",
    NC:"North Carolina", ND:"North Dakota", OH:"Ohio", OK:"Oklahoma", OR:"Oregon",
    PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina", SD:"South Dakota",
    TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont", VA:"Virginia",
    WA:"Washington", WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming", DC:"District of Columbia",
  };

  // --- ZIP normalizer: strip non-digits, keep first 5, and left-pad with zeros ---
  function normalizeZipKey(z) {
    let s = String(z == null ? "" : z);
    s = s.replace(/\D/g, "");        // digits only
    if (s.length >= 5) s = s.slice(0, 5);
    return s.padStart(5, "0");       // e.g., "7040" -> "07040"
  }

  // Fetch roster + zip map (kept separate so your original fetch stays intact)
  async function fetchZipAndRoster() {
    rosterLoadError = false;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet` +
                `?ranges=${RANGE_ROSTER}&ranges=${RANGE_ZIPMAP}&key=${API_KEY}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const v = json.valueRanges || [];

      // 1) Roster (AH:AN)
      const rosterRows = (v[0] && v[0].values) || [];
      stateRosterMap = {};
      allCandidateRows = [];
      candidateByKey.clear();
      for (let i = 0; i < rosterRows.length; i++) {
        const r = rosterRows[i];
        const stFull   = (r[0] || "").trim(); // AH = full state name
        const position = (r[1] || "").trim(); // AI
        const name     = (r[2] || "").trim(); // AJ
        const district = (r[3] || "").trim(); // AK (e.g., "AZ-2", "AK-AtLarge")
        const aligned  = (r[4] || "").trim(); // AL = Trump Aligned (Yes/No)
        const impeach  = (r[5] || "").trim(); // AM = Willing to hold Trump accountable (Yes/No)
        const website  = (r[6] || "").trim(); // AN = Candidate website URL
        if (!stFull || /^state$/i.test(stFull)) continue; // skip header
        const candidate = {
          key: `${stFull}|${position}|${name}|${district}|${i}`,
          stateFullName: stFull,
          position,
          name,
          district,
          aligned,
          impeach,
          website
        };
        (stateRosterMap[stFull] ||= []).push(candidate);
        allCandidateRows.push(candidate);
        candidateByKey.set(candidate.key, candidate);
      }

      // 2) ZIP map (A:F) using C (abbr) + F (district number)
      const zipRows = (v[1] && v[1].values) || [];
      zipToSD = {};
      for (let i = 0; i < zipRows.length; i++) {
        const r = zipRows[i];
        const rawZip     = (r[0] ?? "").toString().trim(); // A (may be "7040" without leading zero)
        const stateAbbr  = (r[2] || "").trim();            // C = state abbr (AZ)
        const districtNo = (r[5] || "").trim();            // F = number (1..)
        const key        = normalizeZipKey(rawZip);        // "7040" -> "07040"
        if (!key || /^zip$/i.test(rawZip)) continue;       // skip header
        if (stateAbbr && districtNo) {
          (zipToSD[key] ||= []).push({ stateAbbr, districtNum: districtNo });
        }
      }
      rosterReady = true;
    } catch (err) {
      console.error("Failed to fetch roster/zip data:", err);
      rosterReady = false;
      rosterLoadError = true;
    }
  }

  // Simple, brand-friendly results
  function handleZipLookup() {
    const input = document.getElementById("zip-input");
    const out   = document.getElementById("zip-output");
    if (!input || !out) return;

    const raw = input.value;
    const key = normalizeZipKey(raw);   // handles "07040" vs "7040"
    if (!key.replace(/^0+/, "")) {      // effectively empty
      out.style.display = "none"; 
      out.innerHTML = ""; 
      return; 
    }

    const hits = zipToSD[key] || [];
    if (hits.length === 0) {
      out.style.display = "";
      out.innerHTML = `<div style="border:1px solid #D4AF37;border-radius:12px;padding:14px;">
        <strong>No match</strong> for ZIP ${escapeHtml(normalizeZipKey(raw))}. Some ZIP codes span multiple districts—try a 9-digit ZIP if you have it.
      </div>`;
      return;
    }

    // dedupe (stateAbbr|districtNum)
    const seen = new Set();
    const uniq = hits.filter(h => {
      const k = `${h.stateAbbr}|${h.districtNum}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    out.style.display = "";
    out.innerHTML = renderCombinedCard(key, uniq);
  }

  function renderDistrictCard(zip, abbr, num) {
    const full = STATE_ABBR_TO_NAME[abbr.toUpperCase()] || abbr;
    const roster = stateRosterMap[full] || [];
    const meta   = stateMetaMap[full] || {};
    const primary = meta.date ? ` (Primary: ${formatDate(meta.date)})` : "";

    // House for this district
    const house = roster.filter(r =>
      /U\.?S\.?\s*House/i.test(r.position) && districtMatches(r.district, abbr, num)
    );
    // Statewide
    const senate   = roster.filter(r => /U\.?S\.?\s*Senate/i.test(r.position));
    const governor = roster.filter(r => /Governor/i.test(r.position));

    return `
      <div style="border:1px solid #D4AF37;border-radius:12px;padding:16px;margin:12px 0;background:#0B1C3D10;">
        <div style="font-weight:700;margin-bottom:6px;">ZIP ${escapeHtml(zip)} → ${escapeHtml(full)} • District ${escapeHtml(num)} <span style="opacity:.7">${primary}</span></div>
        ${renderList("U.S. House Race", house,   (c)=> liCandidate(c))}
        ${renderList("U.S. Senate Race",  senate,  (c)=> liCandidate(c))}
        ${renderList("Governor's Race",     governor,(c)=> liCandidate(c))}
        ${meta.url ? `<div style="margin-top:8px;"><a href="${meta.url}" target="_blank" rel="noopener">Register to Vote in ${escapeHtml(full)}</a></div>` : ""}
      </div>
    `;
  }

  function districtMatches(cell, abbr, num) {
    if (!cell) return false;
    const v = String(cell).trim().toUpperCase();
    const target = `${abbr.toUpperCase()}-${String(num).trim()}`; // e.g., AZ-2
    if (v === target) return true;
    if (v.endsWith(`-${String(num).trim()}`)) return true;       // handles stray prefixes
    // Handle AtLarge case when sheet uses AK-AtLarge but ZIP says "1"
    if (String(num).trim() === "1" && v === `${abbr.toUpperCase()}-ATLARGE`) return true;
    return false;
  }

  function renderList(title, rows, fmt) {
    if (!rows || rows.length === 0) {
      return `<div style="margin:8px 0;"><div style="font-weight:600;">${title}</div><div style="opacity:.75;">No race.</div></div>`;
    }
    return `<div style="margin:8px 0;">
      <div style="font-weight:600;">${title}</div>
      <ul style="margin:6px 0 0 18px;padding:0;">${rows.map(fmt).join("")}</ul>
    </div>`;
  }

  function li(name, position, extra) {
    const x = extra ? ` — <span style="opacity:.8;">${escapeHtml(extra)}</span>` : "";
    return `<li>${escapeHtml(name)} <span style="opacity:.8;">(${escapeHtml(position)})</span>${x}</li>`;
  }

  function isTrumpAligned(v) {
    if (v == null) return false;
    const s = String(v).trim().toLowerCase();
    return s === "yes" || s === "y" || s === "true" || s === "1";
  }

  function isImpeachFlag(v) {
    if (v == null) return false;
    const s = String(v).trim().toLowerCase();
    return s === "yes" || s === "y" || s === "true" || s === "1";
  }

  function liCandidate(c) {
    const extra = c.district ? ` — <span style="opacity:.8;">${escapeHtml(c.district)}</span>` : "";

    const trumpBadge = isTrumpAligned(c.aligned)
      ? ` <span title="Trump-aligned" style="margin-left:6px; padding:2px 6px; border-radius:8px; background:#8B0000; color:#fff; font-size:12px; font-weight:700;">TRUMP</span>`
      : "";

    const impeachBadge = isImpeachFlag(c.impeach)
      ? ` <span title="Willing to hold Trump accountable" style="margin-left:6px; padding:2px 6px; border-radius:8px; background: var(--reliability); color:#fff; font-size:12px; font-weight:700;">IMPEACH</span>`
      : "";

    const site = c.website
      ? ` <a class="candidate-site" href="${escapeHtml(c.website)}" target="_blank" rel="noopener" style="margin-left:8px; font-size:12px;">Candidate Website</a>`
      : "";

    const positions = c.key
      ? ` <button class="owl-position-button" type="button" data-candidate-key="${escapeHtml(c.key)}" data-unlocked="${hasOwlAccess()}">View 11 Positions</button>`
      : "";

    return `<li>${escapeHtml(c.name)} <span style="opacity:.8;">(${escapeHtml(c.position)})</span>${extra}${trumpBadge}${impeachBadge}${site}${positions}</li>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function candidateBadges(candidate) {
    return [
      isTrumpAligned(candidate.aligned)
        ? '<span class="candidate-badge trump" title="Trump-aligned">TRUMP</span>'
        : '',
      isImpeachFlag(candidate.impeach)
        ? '<span class="candidate-badge impeach" title="Willing to hold Trump accountable">IMPEACH</span>'
        : ''
    ].join('');
  }

  function renderCandidateCard(candidate) {
    const location = [candidate.stateFullName, candidate.district].filter(Boolean).join(' • ');
    const website = candidate.website
      ? `<a class="candidate-site-link" href="${escapeHtml(candidate.website)}" target="_blank" rel="noopener noreferrer">Candidate Website</a>`
      : '<span style="color:var(--text-muted)">Website not listed</span>';

    return `
      <article class="candidate-card">
        <h3>${escapeHtml(candidate.name || 'Unnamed candidate')}</h3>
        <div class="candidate-card-meta">${escapeHtml(candidate.position || 'Office not listed')}${location ? ` • ${escapeHtml(location)}` : ''}</div>
        <div>${candidateBadges(candidate)}</div>
        <div class="candidate-card-actions">
          ${website}
          <button class="owl-position-button" type="button" data-candidate-key="${escapeHtml(candidate.key)}" data-unlocked="${hasOwlAccess()}">View 11 Positions</button>
        </div>
      </article>`;
  }

  function handleCandidateSearch() {
    const input = document.getElementById('candidate-name-input');
    const status = document.getElementById('candidate-search-status');
    const results = document.getElementById('candidate-name-results');
    if (!input || !status || !results) return;

    const query = input.value.trim().toLocaleLowerCase();
    results.innerHTML = '';

    if (query.length < 2) {
      status.textContent = 'Enter at least two letters of a candidate’s name.';
      return;
    }
    if (!rosterReady) {
      status.textContent = rosterLoadError
        ? 'Candidate data could not be loaded. Please refresh the page and try again.'
        : 'Candidate data is still loading. Please try again in a moment.';
      return;
    }

    const matches = allCandidateRows
      .filter(candidate => String(candidate.name || '').toLocaleLowerCase().includes(query))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));

    if (!matches.length) {
      status.textContent = `No candidates found for “${input.value.trim()}.”`;
      return;
    }

    const visibleMatches = matches.slice(0, 40);
    status.textContent = matches.length > visibleMatches.length
      ? `${matches.length} candidates found. Showing the first ${visibleMatches.length}.`
      : `${matches.length} candidate${matches.length === 1 ? '' : 's'} found.`;
    results.innerHTML = visibleMatches.map(renderCandidateCard).join('');
  }

  function openOwlModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('owl-modal-open');
    const focusTarget = modal.querySelector('input, button, a');
    if (focusTarget) focusTarget.focus();
  }

  function closeOwlModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if (!document.querySelector('.owl-modal:not([hidden])')) {
      document.body.classList.remove('owl-modal-open');
    }
  }

  function updateOwlAccessState() {
    const accessButton = document.getElementById('owl-access-open');
    const accessActive = hasOwlAccess();

    if (accessButton) {
      accessButton.dataset.access = accessActive ? 'active' : 'locked';
    }
    document.querySelectorAll('.owl-position-button').forEach(button => {
      button.dataset.unlocked = String(accessActive);
    });
  }

  function openCandidatePositions(candidateKey) {
    const candidate = candidateByKey.get(candidateKey);
    if (!candidate) return;

    if (!hasOwlAccess()) {
      pendingCandidateKey = candidateKey;
      if (window.StrategicOwlAccess) window.StrategicOwlAccess.open();
      return;
    }

    const title = document.getElementById('owl-positions-candidate');
    const grid = document.getElementById('owl-topic-grid');
    if (title) {
      title.textContent = [candidate.name, candidate.position, candidate.stateFullName, candidate.district]
        .filter(Boolean)
        .join(' • ');
    }
    if (grid) {
      grid.innerHTML = OWL_POSITION_TOPICS.map(topic => `
        <div class="owl-topic-card">
          <strong>${escapeHtml(topic)}</strong>
          <span>Position information is not available yet.</span>
        </div>`).join('');
    }
    openOwlModal('owl-positions-modal');
  }

  // ---------- NEW HELPERS FOR CONSOLIDATED CARD ----------
  function sortByFirstName(a, b) {
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
  }

  function candidateIsInAnyDistrict(candidateDistrict, hits) {
    if (!candidateDistrict) return false;
    const cd = String(candidateDistrict).trim().toUpperCase();
    for (const h of hits) {
      const ab = String(h.stateAbbr || "").toUpperCase();
      const dn = String(h.districtNum || "").trim();
      if (!ab || !dn) continue;
      const target = `${ab}-${dn}`;
      if (cd === target || cd.endsWith(`-${dn}`)) return true;
      if (dn === "1" && cd === `${ab}-ATLARGE`) return true; // handle AtLarge mapped to "1"
    }
    return false;
  }

  function renderCombinedCard(zip, hits) {
    // assume all hits are same state; take first for state lookup
    const first = hits[0] || {};
    const abbr = (first.stateAbbr || "").toUpperCase();
    const full = STATE_ABBR_TO_NAME[abbr] || abbr;

    const roster = stateRosterMap[full] || [];
    const meta   = stateMetaMap[full] || {};
    const primaryText = meta.date
  ? `Primary: <span class="primary-date">${formatDate(meta.date)}</span>`
  : "";

const deadlineText = meta.regDeadline
  ? `Registration Deadline: <span class="deadline-badge">${formatDate(meta.regDeadline)}</span>`
  : "";
  
const statusLine = [primaryText, deadlineText].filter(Boolean).join(" • ");

    // district string like "3, 4, 6"
    const districtNums = [...new Set(hits.map(h => String(h.districtNum).trim()))].filter(Boolean);
    const districtsStr = districtNums.join(", ");

    // collect candidates
    const house = roster
      .filter(r => /U\.?S\.?\s*House/i.test(r.position) && candidateIsInAnyDistrict(r.district, hits))
      .sort(sortByFirstName);
    const senate = roster
      .filter(r => /U\.?S\.?\s*Senate/i.test(r.position))
      .sort(sortByFirstName);
    const governor = roster
      .filter(r => /Governor/i.test(r.position))
      .sort(sortByFirstName);

    return `
      <div style="border:1px solid #D4AF37;border-radius:12px;padding:16px;margin:12px 0;background:#0B1C3D10;">
        <div style="font-weight:700;margin-bottom:6px;">
          ZIP ${escapeHtml(zip)} → ${escapeHtml(full)} • District${districtNums.length > 1 ? "s" : ""} ${escapeHtml(districtsStr)}
        </div>
        ${statusLine ? `<div style="opacity:.7; margin-bottom:6px;">${statusLine}</div>` : ""}
        ${renderList("U.S. House Race", house, (c)=> liCandidate(c))}
        ${renderList("U.S. Senate Race",  senate,  (c)=> liCandidate(c))}
        ${renderList("Governor's Race",     governor,(c)=> liCandidate(c))}
        ${meta.url ? `<div style="margin-top:8px;"><a href="${meta.url}" target="_blank" rel="noopener">Register to Vote in ${escapeHtml(full)}</a></div>` : ""}
      </div>
    `;
  }

  // --- INIT (kept your calls; added our fetch + listeners) ---
document.addEventListener("DOMContentLoaded", () => {
  // Ensure hamburger has ARIA attributes and event binding
  const menuBtn = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  if (menuBtn) {
    if (!menuBtn.hasAttribute("aria-controls")) menuBtn.setAttribute("aria-controls", "mobileMenu");
    menuBtn.setAttribute("aria-expanded", "false");
    // Bind click as a backup in case inline onclick is removed by CSP
    menuBtn.addEventListener("click", toggleMenu);
  }
  if (mobileMenu) {
    // Close menu after selecting a link
    mobileMenu.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        mobileMenu.classList.remove("show");
        if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }
  // On resize to desktop, ensure menu is reset
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && mobileMenu) {
      mobileMenu.classList.remove("show");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    }
  });
  // Yours:
  fetchStateLinks();
  const stateSel = document.getElementById("state-select");
  if (stateSel) stateSel.addEventListener("change", handleStateChange);

  const birthSel = document.getElementById("birth-state-select");
  if (birthSel) birthSel.addEventListener("change", handleBirthStateChange);

  // New:
  fetchZipAndRoster();

  const zipBtn = document.getElementById("zip-go");
  const zipInput = document.getElementById("zip-input");
  const zipValidateBtn = document.getElementById("zip-validate"); // <-- new

  if (zipBtn) zipBtn.addEventListener("click", handleZipLookup);
  if (zipInput) {
    zipInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleZipLookup();
    });
  }
  if (zipValidateBtn) {
    // openHouseLookupFromZip() must be defined (see previous snippet)
    zipValidateBtn.addEventListener("click", openHouseLookupFromZip);
  }

  const candidateSearchButton = document.getElementById('candidate-name-go');
  const candidateSearchInput = document.getElementById('candidate-name-input');
  if (candidateSearchButton) candidateSearchButton.addEventListener('click', handleCandidateSearch);
  if (candidateSearchInput) {
    candidateSearchInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') handleCandidateSearch();
    });
  }

  const accessOpenButton = document.getElementById('owl-access-open');
  if (accessOpenButton) {
    accessOpenButton.addEventListener('click', () => openOwlModal('owl-access-modal'));
  }

  const emailCheckButton = document.getElementById('owl-check-email');
  if (emailCheckButton) {
    emailCheckButton.addEventListener('click', async () => {
      const input = document.getElementById('owl-access-email');
      const message = document.getElementById('owl-access-message');
      const email = input ? input.value.trim().toLowerCase() : '';
      if (!message) return;

      if (!email || !email.includes('@') || !email.includes('.')) {
        message.textContent = 'Enter the email used for your Stripe or paid Substack subscription.';
        return;
      }

      if (!window.StrategicOwlAccess) {
        message.textContent = 'Owl Access could not load. Please refresh and try again.';
        return;
      }

      emailCheckButton.disabled = true;
      message.textContent = 'Checking Owl Access...';
      if (accessOpenButton) accessOpenButton.dataset.access = 'loading';

      try {
        const result = await window.StrategicOwlAccess.validateEmail(email);

        if (result.valid === true) {
          message.textContent = result.message || 'Owl Access confirmed.';
          updateOwlAccessState();

          if (!pendingCandidateKey) {
            window.setTimeout(() => {
              closeOwlModal(document.getElementById('owl-access-modal'));
            }, 650);
          }
        } else {
          message.textContent = result.message || result.error ||
            'No active paid subscription was found for that email.';
        }
      } catch (error) {
        console.error('Owl Access validation failed:', error);
        message.textContent = 'Owl Access could not be checked. Please try again.';
      } finally {
        emailCheckButton.disabled = false;
        if (!hasOwlAccess() && accessOpenButton) {
          accessOpenButton.dataset.access = 'locked';
        }
      }
    });

    const emailInput = document.getElementById('owl-access-email');
    if (emailInput) {
      emailInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') emailCheckButton.click();
      });
    }
  }

  document.addEventListener('click', event => {
    const positionButton = event.target.closest('.owl-position-button');
    if (positionButton) {
      openCandidatePositions(positionButton.dataset.candidateKey || '');
      return;
    }

    const closeButton = event.target.closest('[data-close-modal]');
    if (closeButton) {
      closeOwlModal(closeButton.closest('.owl-modal'));
      return;
    }

    if (event.target.classList && event.target.classList.contains('owl-modal')) {
      closeOwlModal(event.target);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.owl-modal:not([hidden])').forEach(closeOwlModal);
  });

  window.addEventListener('strategic-owl-access-change', event => {
    updateOwlAccessState();

    if (event.detail && event.detail.active && pendingCandidateKey) {
      const candidateKey = pendingCandidateKey;
      pendingCandidateKey = null;
      closeOwlModal(document.getElementById('owl-access-modal'));
      openCandidatePositions(candidateKey);
    }
  });

  updateOwlAccessState();
});
  // --- ZIP → House lookup helpers ---
function buildZipForHouse(raw) {
  let z = String(raw || "").trim();
  // keep digits and optional dash
  z = z.replace(/[^\d-]/g, "");
  // if 9 straight digits, convert to ZIP+4 with dash
  if (/^\d{9}$/.test(z)) z = z.slice(0,5) + "-" + z.slice(5);
  // must be 5-digit or 5+4
  if (!/^\d{5}(-\d{4})?$/.test(z)) return null;
  return z;
}

function openHouseLookupFromZip() {
  const input = document.getElementById("zip-input");
  const raw = input ? input.value : "";
  const z = buildZipForHouse(raw);
  if (!z) {
    alert("Please enter a valid 5-digit ZIP or ZIP+4 (e.g., 02115 or 02115-1234).");
    return;
  }
  const url = "https://ziplook.house.gov/htbin/findrep_house?ZIP=" + encodeURIComponent(z);
  window.open(url, "_blank", "noopener,noreferrer");
}
  // Auto-close mobile menu when clicking/tapping outside
  document.addEventListener('click', function (event) {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.getElementById('menuToggle');
    if (!menu || !toggle) return;

    const isClickInsideMenu = menu.contains(event.target);
    const isClickOnToggle = toggle.contains(event.target);

    // If menu is shown and user clicks outside both the menu and the toggle button, close it
    if (menu.classList.contains('show') && !isClickInsideMenu && !isClickOnToggle) {
      menu.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
