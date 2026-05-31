(function () {
  var searchInput = document.getElementById('post-search');
  var tagButtons = document.querySelectorAll('.tag-btn');
  var listItems = document.querySelectorAll('.posts-list li[data-title]');
  var noResults = document.getElementById('no-results');
  var activeTags = [];

  function runFilter() {
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var visibleCount = 0;

    listItems.forEach(function (item) {
      var title = item.getAttribute('data-title') || '';
      var tags = (item.getAttribute('data-tags') || '').split(',').filter(Boolean);
      var matchesText = !query || title.indexOf(query) !== -1;
      var matchesTag = activeTags.length === 0 ||
        activeTags.some(function (t) { return tags.indexOf(t) !== -1; });

      var visible = matchesText && matchesTag;
      item.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    if (noResults) noResults.style.display = visibleCount === 0 ? '' : 'none';
  }

  if (searchInput) searchInput.addEventListener('input', runFilter);

  tagButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tag = btn.getAttribute('data-tag');
      var idx = activeTags.indexOf(tag);
      if (idx === -1) {
        activeTags.push(tag);
        btn.classList.add('active');
      } else {
        activeTags.splice(idx, 1);
        btn.classList.remove('active');
      }
      runFilter();
    });
  });
})();
