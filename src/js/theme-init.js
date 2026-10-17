/* Runs synchronously in <head> (inlined by the build): sets the theme before first paint and
   honours an explicit language choice made on an earlier visit. */
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  try {
    var t = localStorage.getItem("fe-theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    d.setAttribute("data-theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#021526" : "#fef9fc");
  } catch (e) {
    d.setAttribute("data-theme", "light");
  }
  try {
    var l = localStorage.getItem("fe-lang");
    if ((l === "ar" || l === "en") && l !== d.lang) {
      var a = document.querySelector('link[rel="alternate"][hreflang="' + l + '"]');
      if (a) location.replace(new URL(a.href).pathname + location.search + location.hash);
    }
  } catch (e) {
    /* storage unavailable: stay on the requested language */
  }
})();
