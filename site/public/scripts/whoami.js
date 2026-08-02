(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cmdEl = document.querySelector("[data-typewriter]");
  if (!cmdEl || reduceMotion) return;

  var fullText = cmdEl.textContent;
  cmdEl.textContent = "";
  var i = 0;
  var interval = setInterval(function () {
    cmdEl.textContent += fullText[i];
    i++;
    if (i >= fullText.length) clearInterval(interval);
  }, 75);
})();
