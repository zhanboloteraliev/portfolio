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

  // Each line (prompt included) stays hidden until it's its turn — otherwise
  // every "~$" prompt for lines further down is visible from the start,
  // even while their own text is still empty.
  var lines = document.querySelectorAll("[data-line]");
  lines.forEach(function (line) {
    line.style.visibility = "hidden";
  });

  var texts = [];
  els.forEach(function (el, index) {
    texts[index] = el.textContent;
    el.textContent = "";
  });

  function typeNext(index) {
    if (index >= els.length) {
      var lastLine = lines[lines.length - 1];
      if (lastLine) lastLine.style.visibility = "visible";
      if (body) body.style.minHeight = "";
      return;
    }
    var el = els[index];
    var line = el.closest("[data-line]");
    if (line) line.style.visibility = "visible";
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
