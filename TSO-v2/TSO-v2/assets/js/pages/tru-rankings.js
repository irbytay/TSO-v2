/* Behavior migrated from Dash.html. */
const SHEET_ID = "19wBEj9hEkvIyQcoR5E_mBGVAxTzMnddMxk8nuQLAumA";
  const API_KEY = "AIzaSyCzuh9HBfe0r70r9U35Pe406PPZ-tz6I78";
  const RANGE = "the_constitution!A2:G1000";

  const colors = {
    gold: "#D4AF37",
    text: "#FFFFFF",
    bullet: "#7C8A9B",
    heading: "#FFFFF0"
  };

const DASHBOARD_RANGE = "Dashboards!A1:P11";

async function fetchDashboardData() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${DASHBOARD_RANGE}?key=${API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.values || [];
}

function populateDashboardSection(title1, title2, col1, col2, data, elementId) {
  const container = document.getElementById(elementId);

  const sectionLabels = {
    "influencer-dashboard": "Influencers",
    "journalist-dashboard": "Journalists",
    "politician-dashboard": "Politicians",
    "media-dashboard": "Media Companies"
  };

  function renderList(label, nameCol, scoreCol) {
    const items = data.slice(1).map(row => {
      const name = row[nameCol] || '';
      const rawScore = row[scoreCol];
      const num = parseFloat(rawScore);
      const score = !isNaN(num) ? num.toLocaleString() : '';
      const className = !isNaN(num) && num < 0 ? 'score-value negative' : 'score-value';

      return `<li>${name}${score ? ` <span class="${className}">${score}</span>` : ''}</li>`;
    }).join('');

    return `<h3>${label}</h3><ul>${items}</ul>`;
  }

  const label = sectionLabels[elementId] || "";

  container.innerHTML = `
    <h2>${label}</h2>
    ${renderList(title1, col1, col1 + 1)}
    ${renderList(title2, col2, col2 + 1)}
  `;
}

async function loadDashboard() {
  const data = await fetchDashboardData();
  populateDashboardSection(data[0][0], data[0][2], 0, 2, data, "influencer-dashboard");
  populateDashboardSection(data[0][4], data[0][6], 4, 6, data, "journalist-dashboard");
  populateDashboardSection(data[0][8], data[0][10], 8, 10, data, "politician-dashboard");
  populateDashboardSection(data[0][12], data[0][14], 12, 14, data, "media-dashboard");
}

window.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
});

function toggleMenu() {
    document.getElementById("navMenu").classList.toggle("show");
  }

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
