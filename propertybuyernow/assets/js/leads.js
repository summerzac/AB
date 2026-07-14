/* ==========================================================================
   Property Buyer Now — Lead store
   --------------------------------------------------------------------------
   A small data-access layer shared by the public site (writes leads) and the
   admin panel (reads/updates leads).

   IMPORTANT: this demo implementation persists to window.localStorage so the
   whole site works with zero backend. localStorage is per-browser — leads
   submitted by a visitor are only visible in that visitor's browser.

   For production, replace the bodies of the methods below with fetch() calls
   to your API (Supabase, Firebase, or your own endpoint). The method
   signatures are already async so nothing else needs to change.
   ========================================================================== */

(function (global) {
  "use strict";

  var STORAGE_KEY = "pbn_leads_v1";

  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeAll(leads) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }

  function makeRef() {
    // e.g. PBN-20260714-4X7K
    var d = new Date();
    var date = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var suffix = "";
    for (var i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    return "PBN-" + date + "-" + suffix;
  }

  /**
   * Indicative cash offer band. Cash buyers typically pay 80–85% of open
   * market value in exchange for speed and certainty. Tune to your model.
   */
  function estimateOffer(marketValue) {
    var v = Number(marketValue);
    if (!v || v <= 0) return null;
    return {
      low: Math.round((v * 0.80) / 500) * 500,
      high: Math.round((v * 0.85) / 500) * 500
    };
  }

  var LeadStore = {
    STATUSES: ["new", "contacted", "offer_made", "offer_accepted", "completed", "declined"],

    STATUS_LABELS: {
      new: "New",
      contacted: "Contacted",
      offer_made: "Offer made",
      offer_accepted: "Offer accepted",
      completed: "Completed",
      declined: "Declined / lost"
    },

    estimateOffer: estimateOffer,

    /** Create a lead. `data` is the raw form payload. Returns the stored lead. */
    create: function (data) {
      var leads = readAll();
      var lead = {
        id: (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
        ref: makeRef(),
        type: data.type || "offer_request", // offer_request | enquiry | callback
        status: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
        activity: [{ at: new Date().toISOString(), text: "Lead created via website" }],
        data: data
      };
      leads.unshift(lead);
      writeAll(leads);
      return Promise.resolve(lead);
    },

    list: function () {
      return Promise.resolve(readAll());
    },

    get: function (id) {
      var lead = readAll().find(function (l) { return l.id === id; });
      return Promise.resolve(lead || null);
    },

    update: function (id, patch) {
      var leads = readAll();
      var lead = leads.find(function (l) { return l.id === id; });
      if (!lead) return Promise.resolve(null);
      Object.assign(lead, patch, { updatedAt: new Date().toISOString() });
      writeAll(leads);
      return Promise.resolve(lead);
    },

    setStatus: function (id, status) {
      var self = this;
      return this.get(id).then(function (lead) {
        if (!lead) return null;
        lead.activity.push({ at: new Date().toISOString(), text: "Status changed to “" + (self.STATUS_LABELS[status] || status) + "”" });
        return self.update(id, { status: status, activity: lead.activity });
      });
    },

    addNote: function (id, text) {
      var self = this;
      return this.get(id).then(function (lead) {
        if (!lead) return null;
        lead.notes.push({ at: new Date().toISOString(), text: text });
        lead.activity.push({ at: new Date().toISOString(), text: "Note added" });
        return self.update(id, { notes: lead.notes, activity: lead.activity });
      });
    },

    remove: function (id) {
      writeAll(readAll().filter(function (l) { return l.id !== id; }));
      return Promise.resolve(true);
    },

    /** Export all leads as a CSV string. */
    toCsv: function (leads) {
      var cols = ["ref", "createdAt", "status", "type", "name", "phone", "email", "postcode", "propertyType", "bedrooms", "condition", "reason", "timeframe", "estimatedValue"];
      var head = cols.join(",");
      var rows = leads.map(function (l) {
        return cols.map(function (c) {
          var v = (c in l) ? l[c] : (l.data ? l.data[c] : "");
          v = (v === undefined || v === null) ? "" : String(v);
          return '"' + v.replace(/"/g, '""') + '"';
        }).join(",");
      });
      return [head].concat(rows).join("\r\n");
    },

    /** Seed a handful of demo leads so the admin panel has something to show. */
    seedDemo: function () {
      var samples = [
        { name: "S. Whitfield", phone: "07700 900123", email: "s.whitfield@example.com", postcode: "LS8 2AB", propertyType: "Semi-detached", bedrooms: "3", condition: "Needs modernisation", reason: "Inherited property", timeframe: "ASAP", estimatedValue: 210000 },
        { name: "D. Okafor", phone: "07700 900456", email: "d.okafor@example.com", postcode: "M14 5TR", propertyType: "Terraced", bedrooms: "2", condition: "Good", reason: "Relocation", timeframe: "1-3 months", estimatedValue: 165000 },
        { name: "P. Kaur", phone: "07700 900789", email: "p.kaur@example.com", postcode: "B29 6HJ", propertyType: "Detached", bedrooms: "4", condition: "Excellent", reason: "Avoiding repossession", timeframe: "ASAP", estimatedValue: 340000 },
        { name: "R. Hughes", phone: "07700 900321", email: "r.hughes@example.com", postcode: "CF10 3NP", propertyType: "Flat / apartment", bedrooms: "1", condition: "Fair", reason: "Chain broke down", timeframe: "1 month", estimatedValue: 120000 }
      ];
      var self = this;
      var chain = Promise.resolve();
      samples.forEach(function (s, i) {
        chain = chain.then(function () {
          s.type = "offer_request";
          return self.create(s).then(function (lead) {
            // Stagger the demo statuses so the pipeline looks realistic.
            var statuses = ["new", "contacted", "offer_made", "offer_accepted"];
            if (statuses[i] !== "new") return self.setStatus(lead.id, statuses[i]);
            return lead;
          });
        });
      });
      return chain;
    },

    clearAll: function () {
      localStorage.removeItem(STORAGE_KEY);
      return Promise.resolve(true);
    }
  };

  global.LeadStore = LeadStore;
})(window);
