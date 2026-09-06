/* Behavior migrated from newcontact3.html. */
document.getElementById('score-request-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    try {
      const res = await fetch("https://formspree.io/f/mwpodgrw", {
        method: "POST",
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      const responseText = document.getElementById('form-response');
      if (res.ok) {
        responseText.textContent = "✅ Thanks for your submission! We'll review it shortly.";
        form.reset();
      } else {
        responseText.textContent = "⚠️ There was a problem submitting your request. Try again later.";
      }
    } catch (err) {
      document.getElementById('form-response').textContent = "⚠️ Network error. Please try again.";
    }
  });

function toggleMenu() {
    const menu = document.getElementById("navMenu");
    menu.classList.toggle("show");
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
