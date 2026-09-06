/* Behavior migrated from realitycheck.html. */
async function fetchTRUData() {
    const API_KEY = "AIzaSyCzuh9HBfe0r70r9U35Pe406PPZ-tz6I78";
    const SHEET_ID = "19wBEj9hEkvIyQcoR5E_mBGVAxTzMnddMxk8nuQLAumA";
    const RANGE = "ElectionTRU!A2:Y1000";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      return json.values || [];
    } catch (err) {
      console.error("Failed to fetch sheet data", err);
      const select = document.getElementById("person-select");
      if (select) {
        select.innerHTML = '<option value="">Failed to load data. Please try again later.</option>';
      }
      return [];
    }
  }

  function showScores() {
    const select = document.getElementById("person-select");
    const table = document.getElementById("score-table");
    const tbody = document.getElementById("score-body");
    const selected = select.value;
    if (!selected || !window.rowMap || !window.rowMap[selected]) {
      table.style.display = "none";
      return;
    }

    const row = window.rowMap[selected];
    tbody.innerHTML = "";
    let total = 0;

    const categories = [
      "Constitutional Knowledge", "Legal Framework", "Federalism",
      "Election Mechanics", "Electoral Count Process", "Disinformation Awareness",
      "Public Impact", "Judicial Oversight", "Election Worker Protections",
      "Psychological Manipulation"
    ];

    for (let i = 0; i < 10; i++) {
      const label = categories[i];
      const score = parseInt(row[3 + i]) || 0;
      const explanation = row[14 + i] || "";

      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${label}</td><td>${score >= 0 ? "+" : ""}${score}</td><td>${explanation}</td>`;
      tbody.appendChild(tr);
      total += score;
    }

    const flag = (row[24] || "").toLowerCase();
    let bonus = 0, label = "", desc = "";

    if (flag === "true") {
      bonus = -10;
      label = "2020 Election Denial Penalty";
      desc = "Denial of the 2020 election outcome signals rejection of verified democratic processes and aligns with disinformation or blind loyalty.";
    } else if (flag === "false") {
      bonus = 5;
      label = "2020 Election Affirmation Bonus";
      desc = "Publicly affirming the legitimacy of the 2020 election supports truth, counters disinformation, and helps protect democratic confidence.";
    } else if (flag === "gray") {
      bonus = -5;
      label = "Ambiguous Stance Penalty";
      desc = "Failure to clearly affirm the 2020 election results contributes to public doubt and enables misinformation to spread unchecked.";
    }

    if (label) {
      const bonusClass = bonus >= 0 ? "positive-score" : "negative-score";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><strong>${label}</strong></td><td class="${bonusClass}"><strong>${bonus >= 0 ? "+" : ""}${bonus}</strong></td><td><strong>${desc}</strong></td>`;
      tbody.appendChild(tr);
      total += bonus;
    }

    const summary = row[13] || "No summary provided.";
    const totalClass = total >= 0 ? "positive-score" : "negative-score";
    const totalRow = document.createElement("tr");
    totalRow.innerHTML = `<td><strong>Total Score</strong></td><td class="${totalClass}"><strong>${total >= 0 ? "+" : ""}${total}</strong></td><td><strong>${summary}</strong></td>`;
    tbody.appendChild(totalRow);

    table.style.display = "table";
  }

  async function initElectionPage() {
    window.rowMap = {};
    const data = await fetchTRUData();
    data.forEach(row => {
      const key = row[0];
      if (key) window.rowMap[key] = row;
    });

    const select = document.getElementById("person-select");
    if (!select) return;

    select.innerHTML = '<option value="">Choose a name</option>';
    Object.keys(window.rowMap).sort().forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
      select.appendChild(opt);
    });

    select.removeEventListener("change", showScores);
    select.addEventListener("change", showScores);
  }

  window.addEventListener("DOMContentLoaded", initElectionPage);
   const API_KEY = "AIzaSyB3NmN4OpDutbaX6V2KkLy1p-vDLghrF5M";
    const SHEET_ID = "1p66gmWWjxJbrySxpR5T--fP8iEgUbW7RrXru61gagRA";
    const RANGE = "HeritageVoterfraudRawData!B6:D1589";

    async function fetchSheetData() {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        return data.values || [];
      } catch (error) {
        console.error("Failed to fetch data:", error);
        return [];
      }
    }

    function populateDropdown(statesSet, stateSelect) {
      const sortedStates = Array.from(statesSet).sort();
      sortedStates.forEach(state => {
        const opt = document.createElement("option");
        opt.value = state;
        opt.textContent = state;
        stateSelect.appendChild(opt);
      });
    }

    async function initStateFraudPage() {
      const stateSelect = document.getElementById("state-select");
      const tableBody = document.getElementById("state-data-body");
      const resultsWrapper = document.getElementById("state-results");
      const summaryLine = document.getElementById("state-summary");

      if (!stateSelect || !tableBody || !resultsWrapper || !summaryLine) {
        console.warn("[statefraud] Required elements not found.");
        return;
      }

      const rows = await fetchSheetData();
      const statesSet = new Set(rows.map(row => row[1]));
      populateDropdown(statesSet, stateSelect);

      stateSelect.addEventListener("change", function () {
        const selected = this.value;
        tableBody.innerHTML = "";
        summaryLine.textContent = "";

        const filtered = rows.filter(row => row[1] === selected);

        if (filtered.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="3">No records found for ${selected}</td></tr>`;
          resultsWrapper.style.display = "flex";
          return;
        }

        const sorted = filtered.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

        const years = sorted.map(row => parseInt(row[0])).filter(year => !isNaN(year));
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        const caseCount = sorted.length;

        summaryLine.textContent = `${caseCount} case${caseCount === 1 ? '' : 's'} found from ${minYear} to ${maxYear}`;

        sorted.forEach(row => {
          const year = row[0];
          const state = row[1];
          const name = row[2];
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${year}</td><td>${state}</td><td>${name}</td>`;
          tableBody.appendChild(tr);
        });

        resultsWrapper.style.display = "flex";
      });
    }
   function toggleMenu() {
    const menu = document.getElementById("navMenu");
    menu.classList.toggle("show");
  }

  // Close mobile menu when clicking outside of it
  function closeMenuOnOutsideClick(event) {
    const navMenu = document.getElementById("navMenu");
    const menuToggle = document.querySelector(".menu-toggle");

    if (
      navMenu.classList.contains("show") &&
      !navMenu.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      navMenu.classList.remove("show");
    }
  }

  document.addEventListener("click", closeMenuOnOutsideClick);

    // ✅ Enable for standalone mode
    window.addEventListener("DOMContentLoaded", initStateFraudPage);
  function toggleMenu() {
    document.getElementById("navMenu").classList.toggle("show");
  }
  // --- Culture Subs JS ---
  async function fetchCultureData() {
    const SHEET_ID = "19wBEj9hEkvIyQcoR5E_mBGVAxTzMnddMxk8nuQLAumA";
    const RANGE = "CultureSubs!A2:D1000";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=AIzaSyCzuh9HBfe0r70r9U35Pe406PPZ-tz6I78`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.values || [];
    } catch (error) {
      console.error("Failed to fetch CultureSubs data:", error);
      return [];
    }
  }

  async function initCulturePage() {
    const dropdown = document.getElementById("culture-select");
    const cultureRows = await fetchCultureData();
    const subjectSet = new Set(cultureRows.map(row => row[0]));

    // Clear and repopulate dropdown only
    dropdown.innerHTML = '<option value="">Misconception</option>';
    subjectSet.forEach(subject => {
      const opt = document.createElement("option");
      opt.value = subject;
      opt.textContent = subject;
      dropdown.appendChild(opt);
    });

    window.cultureMap = {};
    cultureRows.forEach(row => {
      const subject = row[0];
      if (!window.cultureMap[subject]) {
        window.cultureMap[subject] = [];
      }
      window.cultureMap[subject].push({ subcategory: row[1], claim: row[2], extra: row[3] || "" });
    });
  }

  function showCultureSubs() {
    const selected = document.getElementById("culture-select").value;
    const wrapper = document.getElementById("culture-results");
    const body = document.getElementById("culture-body");
    body.innerHTML = "";

    if (!selected || !window.cultureMap[selected]) {
      wrapper.style.display = "none";
      return;
    }

    window.cultureMap[selected].forEach(({ claim, extra }) => {
      const claimRow = document.createElement("tr");
      claimRow.innerHTML = `<td colspan="3" style="padding-left: 12px; padding-top: 16px; color: #FF7F7F; font-weight: bold;"><em>Claim:</em> ${claim}</td>`;
      body.appendChild(claimRow);

      const factRow = document.createElement("tr");
      factRow.innerHTML = `<td colspan="3" style="padding-left: 20px; padding-bottom: 12px; color: var(--understanding);"><em>Fact:</em> ${extra}</td>`;
      body.appendChild(factRow);
    });

    wrapper.style.display = "block";
  }

  window.addEventListener("DOMContentLoaded", initCulturePage);
