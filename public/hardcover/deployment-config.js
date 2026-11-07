/** Set during GitHub Actions build; never place a secret API key here. */
(function () {
  var backend = "__ZAIN_API_BASE_URL__";
  if (!backend || backend.indexOf('__ZAIN_') === 0) return;
  backend = backend.replace(/\/+$/, '');
  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (url, options) {
    var raw = typeof url === 'string' ? url : url instanceof Request ? url.url : String(url);
    try {
      var parsed = new URL(raw, window.location.href);
      if (parsed.origin === window.location.origin && parsed.pathname.indexOf('/api/') === 0) {
        var target = backend + parsed.pathname + parsed.search + parsed.hash;
        if (url instanceof Request) return nativeFetch(new Request(target, url), options);
        return nativeFetch(target, options);
      }
    } catch (e) {}
    return nativeFetch(url, options);
  };
})();
