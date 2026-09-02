(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = document.querySelectorAll("[data-typewriter]");
  if (!els.length || reduceMotion) return;

  var texts = [];
  els.forEach(function (el, index) {
    texts[index] = el.textContent;
    el.textContent = "";
  });

  function typeNext(index) {
    if (index >= els.length) return;
    var el = els[index];
    var fullText = texts[index];
    var i = 0;
    var interval = setInterval(function () {
      el.textContent += fullText[i];
      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
        typeNext(index + 1);
      }
    }, 75);
  }

  typeNext(0);
})();
