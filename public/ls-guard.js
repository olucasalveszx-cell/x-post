(function () {
  try {
    var orig = Storage.prototype.setItem;

    function stripBase64(v) {
      if (typeof v !== "string" || v.indexOf("data:") === -1) return v;
      try {
        var p = JSON.parse(v);
        if (Array.isArray(p)) {
          p = p.map(function (x) {
            return Object.assign({}, x, {
              avatarSrc:
                x.avatarSrc && x.avatarSrc.indexOf("http") === 0
                  ? x.avatarSrc
                  : undefined,
            });
          });
        } else if (p && p.avatarSrc && p.avatarSrc.indexOf("http") !== 0) {
          p.avatarSrc = undefined;
        }
        return JSON.stringify(p);
      } catch (e) {
        return v;
      }
    }

    Object.defineProperty(Storage.prototype, "setItem", {
      writable: true,
      configurable: true,
      value: function (k, v) {
        if (k === "xpz_profile" || k === "xpz_profiles") v = stripBase64(v);
        try {
          orig.call(this, k, v);
        } catch (e) {}
      },
    });

    // Clean existing base64 on load
    ["xpz_profile", "xpz_profiles"].forEach(function (k) {
      try {
        var val = localStorage.getItem(k);
        if (!val || val.indexOf("data:") === -1) return;
        var cleaned = stripBase64(val);
        localStorage.removeItem(k);
        try {
          orig.call(localStorage, k, cleaned);
        } catch (e) {}
      } catch (e) {}
    });
  } catch (e) {}
})();
