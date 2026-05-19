/* ==========================================
   NAV — 스크롤 시 배경 활성화
   ========================================== */
var nav = document.getElementById('nav');

window.addEventListener('scroll', function () {
  if (window.scrollY > 40) {
    nav.classList.add('sc');
  } else {
    nav.classList.remove('sc');
  }
});


/* ==========================================
   SCROLL REVEAL — IntersectionObserver
   ========================================== */
var observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.rv').forEach(function (el) {
  observer.observe(el);
});
