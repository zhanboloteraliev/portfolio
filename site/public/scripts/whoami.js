(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = document.querySelectorAll("[data-typewriter]");
  if (!els.length || reduceMotion) return;

  // Lock the body's height to its fully-typed size before clearing any
  // text, so the terminal doesn't visibly grow as the output fills in.
  var body = document.querySelector(".terminal-body");
  if (body) {
    body.style.minHeight = body.getBoundingClientRect().height + "px";
  }

  var texts = [];
  els.forEach(function (el, index) {
    texts[index] = el.textContent;
    el.textContent = "";
  });

  function typeNext(index) {
    if (index >= els.length) {
      if (body) body.style.minHeight = "";
      return;
    }
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
    }, 40);
  }

  typeNext(0);
})();
