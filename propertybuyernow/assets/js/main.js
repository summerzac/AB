/* ==========================================================================
   Property Buyer Now — site-wide behaviour
   (mobile nav, FAQ accordions, offer calculator, cookie notice, quick-start
   postcode form, contact form)
   ========================================================================== */

(function () {
  "use strict";

  /* Mobile navigation ----------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  /* FAQ accordions --------------------------------------------------------- */
  document.querySelectorAll(".faq-item button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      var body = document.getElementById(btn.getAttribute("aria-controls"));
      if (body) body.classList.toggle("open", !expanded);
    });
  });

  /* Offer calculator -------------------------------------------------------- */
  var calcForm = document.getElementById("calc-form");
  if (calcForm) {
    calcForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = Number(document.getElementById("calc-value").value);
      var result = document.getElementById("calc-result");
      var band = window.LeadStore.estimateOffer(value);
      if (!band) return;
      var fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
      document.getElementById("calc-range").textContent = fmt.format(band.low) + " – " + fmt.format(band.high);
      result.classList.add("show");
    });
  }

  /* Hero quick-start: carry the postcode into the offer form ---------------- */
  var quick = document.getElementById("quickstart-form");
  if (quick) {
    quick.addEventListener("submit", function (e) {
      e.preventDefault();
      var pc = document.getElementById("quickstart-postcode").value.trim();
      var url = "get-offer.html" + (pc ? "?postcode=" + encodeURIComponent(pc) : "");
      window.location.href = url;
    });
  }

  /* Contact form ------------------------------------------------------------ */
  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var payload = {
        type: "enquiry",
        name: document.getElementById("c-name").value.trim(),
        email: document.getElementById("c-email").value.trim(),
        phone: document.getElementById("c-phone").value.trim(),
        message: document.getElementById("c-message").value.trim()
      };
      if (!payload.name || !payload.email || !payload.message) return;
      window.LeadStore.create(payload).then(function (lead) {
        contactForm.hidden = true;
        var ok = document.getElementById("contact-success");
        ok.hidden = false;
        ok.querySelector(".ref").textContent = lead.ref;
        ok.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  /* Cookie / storage notice -------------------------------------------------- */
  var bar = document.getElementById("cookie-bar");
  if (bar && !localStorage.getItem("pbn_cookie_ack")) {
    bar.classList.add("show");
    document.getElementById("cookie-ok").addEventListener("click", function () {
      localStorage.setItem("pbn_cookie_ack", "1");
      bar.classList.remove("show");
    });
  }

  /* Footer year --------------------------------------------------------------- */
  document.querySelectorAll(".js-year").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
