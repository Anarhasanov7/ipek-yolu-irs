// === THEME TOGGLE ===
(function() {
  const saved = localStorage.getItem('gtdib-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  if (next === 'dark') {
    html.removeAttribute('data-theme');
    localStorage.setItem('gtdib-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
    localStorage.setItem('gtdib-theme', 'light');
  }
  // Update toggle button label
  const btn = document.querySelector('.theme-toggle');
  if (btn) {
    const isLight = html.getAttribute('data-theme') === 'light';
    btn.querySelector('.toggle-icon').textContent = isLight ? '☀' : '☾';
    btn.querySelector('.toggle-label').textContent = isLight ? 'Light' : 'Dark';
  }
}

// Initialize toggle label on load
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.querySelector('.theme-toggle');
  if (btn) {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    btn.querySelector('.toggle-icon').textContent = isLight ? '☀' : '☾';
    btn.querySelector('.toggle-label').textContent = isLight ? 'Light' : 'Dark';
  }
});

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
