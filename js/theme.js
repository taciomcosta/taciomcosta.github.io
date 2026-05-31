(function () {
  var DARK = 'dark';
  var LIGHT = 'light';
  var KEY = 'theme';

  function current() {
    return document.documentElement.dataset.theme === LIGHT ? LIGHT : DARK;
  }

  function apply(theme) {
    if (theme === LIGHT) {
      document.documentElement.dataset.theme = LIGHT;
    } else {
      delete document.documentElement.dataset.theme;
    }
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === DARK ? '◑' : '◐';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var stored = localStorage.getItem(KEY);
    var theme;
    if (stored === LIGHT || stored === DARK) {
      theme = stored;
    } else {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? LIGHT : DARK;
    }
    apply(theme);

    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var next = current() === DARK ? LIGHT : DARK;
        localStorage.setItem(KEY, next);
        apply(next);
      });
    }
  });
})();
