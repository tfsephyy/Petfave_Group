;(function () {
  var theme = 'light'
  try {
    var saved = localStorage.getItem('petfave-theme')
    if (saved === 'light' || saved === 'dark') theme = saved
  } catch {
    // Theme selection also works when browser storage is unavailable.
  }
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
})()
