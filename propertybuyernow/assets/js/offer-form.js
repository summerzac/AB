/* ==========================================================================
   Property Buyer Now — multi-step "get your cash offer" form
   ========================================================================== */

(function () {
  "use strict";

  var form = document.getElementById("offer-form");
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll(".form-step"));
  var segs = Array.prototype.slice.call(document.querySelectorAll(".progress-track .seg"));
  var stepLabel = document.getElementById("step-label");
  var backBtn = document.getElementById("btn-back");
  var nextBtn = document.getElementById("btn-next");
  var current = 0;

  var LABELS = ["Step 1 of 3 — Your property", "Step 2 of 3 — Your situation", "Step 3 of 3 — Your details"];

  // Pre-fill postcode passed from the homepage quick-start form.
  var params = new URLSearchParams(window.location.search);
  if (params.get("postcode")) {
    document.getElementById("f-postcode").value = params.get("postcode").toUpperCase();
  }

  function show(i) {
    current = i;
    steps.forEach(function (s, n) { s.classList.toggle("active", n === i); });
    segs.forEach(function (s, n) { s.classList.toggle("done", n <= i); });
    stepLabel.textContent = LABELS[i];
    backBtn.style.visibility = i === 0 ? "hidden" : "visible";
    nextBtn.textContent = i === steps.length - 1 ? "Get my cash offer" : "Continue";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setInvalid(field, invalid) {
    field.closest(".field, .field-radio").classList.toggle("invalid", invalid);
  }

  function validateStep(i) {
    var ok = true;
    steps[i].querySelectorAll("[required]").forEach(function (input) {
      var valid;
      if (input.type === "radio") {
        valid = !!steps[i].querySelector('input[name="' + input.name + '"]:checked');
      } else if (input.type === "email") {
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      } else if (input.id === "f-postcode") {
        // Loose UK postcode check, e.g. "LS8 2AB" or "M1 1AA"
        valid = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(input.value.trim());
      } else if (input.id === "f-phone") {
        valid = /^[\d\s()+-]{10,15}$/.test(input.value.trim());
      } else {
        valid = input.value.trim() !== "";
      }
      var wrap = input.closest(".field");
      if (wrap) wrap.classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    });
    return ok;
  }

  backBtn.addEventListener("click", function () {
    if (current > 0) show(current - 1);
  });

  nextBtn.addEventListener("click", function () {
    if (!validateStep(current)) return;
    if (current < steps.length - 1) {
      show(current + 1);
      return;
    }
    submit();
  });

  function radioValue(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function submit() {
    nextBtn.disabled = true;
    var payload = {
      type: "offer_request",
      postcode: document.getElementById("f-postcode").value.trim().toUpperCase(),
      address: document.getElementById("f-address").value.trim(),
      propertyType: document.getElementById("f-type").value,
      bedrooms: document.getElementById("f-beds").value,
      condition: radioValue("condition"),
      reason: document.getElementById("f-reason").value,
      timeframe: radioValue("timeframe"),
      estimatedValue: Number(document.getElementById("f-value").value) || null,
      name: document.getElementById("f-name").value.trim(),
      phone: document.getElementById("f-phone").value.trim(),
      email: document.getElementById("f-email").value.trim(),
      contactTime: document.getElementById("f-contact-time").value,
      consent: document.getElementById("f-consent").checked
    };

    window.LeadStore.create(payload).then(function (lead) {
      document.getElementById("offer-intro").hidden = true;
      form.querySelector(".progress-track") && (document.querySelector(".progress-track").hidden = true);
      stepLabel.hidden = true;
      steps.forEach(function (s) { s.classList.remove("active"); });
      document.querySelector(".form-nav").hidden = true;

      var done = document.getElementById("offer-success");
      done.hidden = false;
      done.querySelector(".ref").textContent = lead.ref;

      var band = window.LeadStore.estimateOffer(payload.estimatedValue);
      var estEl = document.getElementById("success-estimate");
      if (band && estEl) {
        var fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
        estEl.hidden = false;
        estEl.querySelector("strong").textContent = fmt.format(band.low) + " – " + fmt.format(band.high);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  show(0);
})();
