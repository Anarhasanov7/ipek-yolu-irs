// === THEME TOGGLE ===
(function() {
  var saved = localStorage.getItem('gtdib-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

function getThemeLabels() {
  var lang = document.documentElement.lang || 'az';
  if (lang === 'en') {
    return { dark: 'Dark', light: 'Light' };
  }
  return { dark: 'Qaranlıq', light: 'Açıq' };
}

function updateToggleButton() {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  var isLight = document.documentElement.getAttribute('data-theme') === 'light';
  var labels = getThemeLabels();
  var icon = btn.querySelector('.toggle-icon');
  var label = btn.querySelector('.toggle-label');
  if (icon) icon.textContent = isLight ? '\u2600' : '\u263E';
  if (label) label.textContent = isLight ? labels.light : labels.dark;
}

function toggleTheme() {
  var html = document.documentElement;
  var isLight = html.getAttribute('data-theme') === 'light';
  if (isLight) {
    html.removeAttribute('data-theme');
    localStorage.setItem('gtdib-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
    localStorage.setItem('gtdib-theme', 'light');
  }
  updateToggleButton();
}

document.addEventListener('DOMContentLoaded', updateToggleButton);

// === SCROLL ANIMATIONS ===
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 50);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// === SCROLL PROGRESS BAR ===
const scrollProgress = document.getElementById('scrollProgress');
if (scrollProgress) {
  window.addEventListener('scroll', () => {
    const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    scrollProgress.style.width = scrolled + '%';
  });
}

// === ANIMATED COUNTERS ===
const counters = document.querySelectorAll('.counter');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      const duration = 2000;
      const start = performance.now();
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(animate);
        else el.textContent = target;
      };
      requestAnimationFrame(animate);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

counters.forEach(c => counterObserver.observe(c));
