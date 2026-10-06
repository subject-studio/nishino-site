const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const navDropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));
const desktopNavQuery = window.matchMedia('(min-width:1181px)');

const setDropdownOpen = (dropdown, open) => {
  dropdown.querySelector('.nav-dropdown-toggle').setAttribute('aria-expanded', String(open));
  dropdown.querySelector('.nav-submenu').hidden = !open;
};

const closeDropdowns = () => navDropdowns.forEach((dropdown) => setDropdownOpen(dropdown, false));

const closeMainNav = () => {
  nav?.classList.remove('is-open');
  menuButton?.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'メニューを開く');
  document.body.classList.remove('is-menu-open');
  closeDropdowns();
};

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  menuButton.classList.toggle('is-open', open);
  document.body.classList.toggle('is-menu-open', open);
  if (!open) closeDropdowns();
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', closeMainNav);
});

navDropdowns.forEach((dropdown) => {
  const toggle = dropdown.querySelector('.nav-dropdown-toggle');
  const submenu = dropdown.querySelector('.nav-submenu');
  let openedByHover = false;

  toggle.addEventListener('click', () => {
    const open = openedByHover || toggle.getAttribute('aria-expanded') !== 'true';
    openedByHover = false;
    closeDropdowns();
    setDropdownOpen(dropdown, open);
  });

  toggle.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setDropdownOpen(dropdown, true);
    const links = submenu.querySelectorAll('a');
    (event.key === 'ArrowDown' ? links[0] : links[links.length - 1])?.focus();
  });

  dropdown.addEventListener('pointerenter', (event) => {
    if (desktopNavQuery.matches && event.pointerType === 'mouse') {
      openedByHover = toggle.getAttribute('aria-expanded') !== 'true';
      setDropdownOpen(dropdown, true);
    }
  });
  dropdown.addEventListener('pointerleave', (event) => {
    if (desktopNavQuery.matches && event.pointerType === 'mouse' && !submenu.contains(document.activeElement)) {
      openedByHover = false;
      setDropdownOpen(dropdown, false);
    }
  });
  dropdown.addEventListener('focusout', (event) => {
    if (!dropdown.contains(event.relatedTarget)) setDropdownOpen(dropdown, false);
  });
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-dropdown')) closeDropdowns();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const openDropdown = navDropdowns.find((dropdown) => dropdown.querySelector('.nav-dropdown-toggle').getAttribute('aria-expanded') === 'true');
  if (openDropdown) {
    closeDropdowns();
    openDropdown.querySelector('.nav-dropdown-toggle').focus();
  } else if (nav?.classList.contains('is-open')) {
    closeMainNav();
    menuButton?.focus();
  }
});

desktopNavQuery.addEventListener('change', closeMainNav);

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const delay = Number(entry.target.dataset.revealDelay ?? 0);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (typeof entry.target.animate === 'function') {
        const keyframes = reduceMotion
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: 'translate3d(0, 32px, 0) scale(.985)', filter: 'blur(6px)' },
              { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', filter: 'blur(0)' },
            ];

        entry.target.animate(keyframes, {
          duration: reduceMotion ? 900 : 1250,
          delay,
          easing: 'cubic-bezier(.22, 1, .36, 1)',
          fill: 'both',
        });
      }

      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

const revealElements = document.querySelectorAll('.reveal');

revealElements.forEach((element) => {
  const revealSiblings = Array.from(element.parentElement?.children ?? [])
    .filter((sibling) => sibling.classList.contains('reveal'));
  const siblingIndex = revealSiblings.indexOf(element);
  const delay = Math.min(Math.max(siblingIndex, 0), 5) * 90;

  element.style.setProperty('--reveal-delay', `${delay}ms`);
  element.dataset.revealDelay = String(delay);
});

// Paint the hidden state first so elements already in the viewport also animate.
window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => {
    revealElements.forEach((element) => observer.observe(element));
  });
});

const scrollProgress = document.querySelector('.scroll-progress span');
let isScrollTicking = false;

const updateScrollProgress = () => {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  scrollProgress?.style.setProperty('transform', `scaleX(${Math.min(1, Math.max(0, progress))})`);
  isScrollTicking = false;
};

window.addEventListener('scroll', () => {
  if (!isScrollTicking) {
    window.requestAnimationFrame(updateScrollProgress);
    isScrollTicking = true;
  }
}, { passive: true });

updateScrollProgress();

const worksTabs = Array.from(document.querySelectorAll('.works-tab'));
const worksPanels = Array.from(document.querySelectorAll('.works-panel'));

const activateWorksTab = (tab, moveFocus = false) => {
  const panelId = tab.getAttribute('aria-controls');

  worksTabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });

  worksPanels.forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });

  if (moveFocus) tab.focus();
};

const requestedWorksCategory = new URLSearchParams(window.location.search).get('category');
const requestedWorksTab = document.getElementById(`works-tab-${requestedWorksCategory}`);

if (requestedWorksTab && worksTabs.includes(requestedWorksTab)) {
  activateWorksTab(requestedWorksTab);
}

worksTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateWorksTab(tab));
  tab.addEventListener('keydown', (event) => {
    let nextIndex = index;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % worksTabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + worksTabs.length) % worksTabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = worksTabs.length - 1;
    else return;

    event.preventDefault();
    activateWorksTab(worksTabs[nextIndex], true);
  });
});

document.querySelectorAll('.works-project-carousel').forEach((carousel) => {
  const track = carousel.querySelector('.works-project-grid');
  const slides = Array.from(track.children);
  const dots = Array.from(carousel.querySelectorAll('.works-project-dot'));
  const currentLabel = carousel.querySelector('.works-project-current');
  const mobileQuery = window.matchMedia('(max-width:760px)');
  let currentIndex = 0;
  let scrollFrame = 0;

  const updateCurrentSlide = () => {
    scrollFrame = 0;
    if (!mobileQuery.matches || track.clientWidth === 0) return;
    const trackLeft = track.getBoundingClientRect().left;
    const distances = slides.map((slide) => Math.abs(slide.getBoundingClientRect().left - trackLeft));
    currentIndex = distances.indexOf(Math.min(...distances));
    dots.forEach((dot, index) => {
      const active = index === currentIndex;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    const value = String(currentIndex + 1);
    if (currentLabel.textContent !== value) currentLabel.textContent = value;
  };

  const showSlide = (index) => {
    if (!mobileQuery.matches) return;
    currentIndex = (index + slides.length) % slides.length;
    const left = slides[currentIndex].getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    track.scrollTo({
      left,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  carousel.querySelectorAll('[data-slide-direction]').forEach((button) => {
    button.addEventListener('click', () => showSlide(currentIndex + Number(button.dataset.slideDirection)));
  });
  dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));
  track.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateCurrentSlide);
  }, { passive: true });
  track.addEventListener('keydown', (event) => {
    if (!mobileQuery.matches) return;
    let index = currentIndex;
    if (event.key === 'ArrowRight') index += 1;
    else if (event.key === 'ArrowLeft') index -= 1;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = slides.length - 1;
    else return;
    event.preventDefault();
    showSlide(index);
  });

  const updateLayout = () => {
    track.tabIndex = mobileQuery.matches ? 0 : -1;
    updateCurrentSlide();
  };
  mobileQuery.addEventListener('change', updateLayout);
  new ResizeObserver(updateLayout).observe(track);
  carousel.classList.add('is-ready');
  updateLayout();
});
