/* ================================================
   RoxyScore — shared.js  v0.6
   Navigasyon, drawer, toast, logo — tüm sayfalarda ortak
   ================================================ */

// Back-Forward Cache'den gelince animasyon sıfırla
window.addEventListener('pageshow', function(e) {
  document.body.classList.remove('page-exit', 'page-exit-right');
  if (e.persisted) {
    document.body.style.opacity = '1';
    document.body.style.transform = 'none';
  }
});

// ── NAVİGASYON ───────────────────────────────────
function goTo(url, direction) {
  if (!url) return;
  var cls = (direction === 'back') ? 'page-exit-right' : 'page-exit';
  document.body.classList.add(cls);
  setTimeout(function() { window.location.href = url; }, 190);
}

function goBack(fallback) {
  var fb = fallback || 'home.html';
  var fromParam = new URLSearchParams(location.search).get('from');
  if (fromParam) {
    goTo(decodeURIComponent(fromParam), 'back');
  } else {
    goTo(fb, 'back');
  }
}

// ── LOGO (CSS + API img) ─────────────────────────
// API'den logo URL'si gelen takımlar için img tag,
// local profil varsa CSS badge, yoksa initials
function buildLogo(teamId, size, logoUrl) {
  size = size || 'sm';
  var sizeMap = { xs:20, sm:28, md:36, lg:44, xl:60 };
  var px = sizeMap[size] || 28;

  // Eğer API URL'si verilmişse img kullan
  if (logoUrl) {
    return '<div class="tl tl-img tl-' + size + '">'
      + '<img src="' + logoUrl + '" width="' + px + '" height="' + px + '"'
      + ' onerror="this.parentNode.innerHTML=this.parentNode.dataset.fb" loading="lazy"/>'
      + '</div>';
  }

  var t = (typeof TEAM_PROFILES !== 'undefined') ? TEAM_PROFILES[teamId] : null;
  if (!t) {
    var initials = (teamId || 'XX').substring(0, 2).toUpperCase();
    return '<div class="tl tl-' + size + '" style="--tc:#1e2740;--tc2:#2c3550">' + initials + '</div>';
  }
  return '<div class="tl tl-' + size + '" style="--tc:' + t.color + ';--tc2:' + (t.color2 || 'rgba(255,255,255,0.15)') + '">' + t.short + '</div>';
}

// Logo builder — team data objesinden (id + logo url destekli)
function buildTeamLogo(team, size) {
  if (team && team.logo) return buildLogo(team.id, size, team.logo);
  if (team) return buildLogo(team.id, size);
  return buildLogo('??', size);
}

// ── TOAST ────────────────────────────────────────
function showToast(icon, title, sub, type, ms) {
  type = type || 'neutral';
  ms   = ms   || 3200;
  var c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;width:calc(100% - 32px);max-width:380px;pointer-events:none';
    document.body.appendChild(c);
  }
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<div class="toast-icon">' + icon + '</div>'
    + '<div class="toast-body">'
    +   '<div class="toast-title">' + title + '</div>'
    +   (sub ? '<div class="toast-sub">' + sub + '</div>' : '')
    + '</div>';
  c.appendChild(t);
  setTimeout(function() {
    t.style.opacity = '0';
    t.style.transform = 'translateY(-8px)';
    t.style.transition = 'opacity .28s ease, transform .28s ease';
    setTimeout(function() { if (t.parentNode) t.remove(); }, 320);
  }, ms);
}

// ── DRAWER (Her sayfada çalışan evrensel drawer) ──
(function initDrawer() {
  // Mevcut sayfanın URL'sini al
  var currentPage = window.location.pathname.split('/').pop() || 'home.html';

  var session = AS.getSession();
  var emailInitial = session && session.email ? session.email[0].toUpperCase() : 'U';
  var emailText    = session && session.email ? session.email : '—';

  // Drawer HTML'ini oluştur ve body'e ekle
  var drawerHTML = '<div class="drawer-overlay" id="drawer-overlay"></div>'
    + '<div class="drawer" id="drawer">'
    +   '<div class="drawer-header">'
    +     '<div class="drawer-logo"><span class="logo-main">Roxy</span><span class="logo-accent">Score</span></div>'
    +     '<button class="drawer-close" id="drawer-close">'
    +       '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
    +     '</button>'
    +   '</div>'
    +   '<div class="drawer-user">'
    +     '<div class="drawer-avatar">' + emailInitial + '</div>'
    +     '<div>'
    +       '<div class="drawer-email">' + emailText + '</div>'
    +       '<div class="drawer-badge">Üye · v0.1</div>'
    +     '</div>'
    +   '</div>'
    +   '<div class="drawer-divider"></div>'
    +   '<nav class="drawer-nav">'
    +     '<button class="drawer-item' + (currentPage === 'home.html' ? ' active' : '') + '" id="di-home">'
    +       '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>Ana Sayfa'
    +     '</button>'
    +     '<button class="drawer-item' + (currentPage === 'favorites.html' ? ' active' : '') + '" id="di-fav">'
    +       '<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>Favorilerim'
    +     '</button>'
    +     '<button class="drawer-item' + (currentPage === 'table.html' ? ' active' : '') + '" id="di-table">'
    +       '<svg viewBox="0 0 24 24"><path d="M3 3h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3zm0 4h18v2H3z"/></svg>Puan Tablosu'
    +     '</button>'
    +     '<button class="drawer-item' + (currentPage === 'support.html' ? ' active' : '') + '" id="di-support">'
    +       '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>Destek'
    +     '</button>'
    +   '</nav>'
    +   '<div class="drawer-divider"></div>'
    +   '<button class="drawer-item logout" id="di-logout">'
    +     '<svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>Çıkış Yap'
    +   '</button>'
    + '</div>';

  var wrapper = document.createElement('div');
  wrapper.innerHTML = drawerHTML;
  document.body.appendChild(wrapper.children[0]); // overlay
  document.body.appendChild(wrapper.children[0]); // drawer

  // Event'leri bağla
  function openDrawer() {
    document.getElementById('drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('open');
  }
  function closeDrawer() {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
  }

  document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);

  document.getElementById('di-home').addEventListener('click', function() {
    if (currentPage === 'home.html') { closeDrawer(); }
    else { goTo('home.html'); }
  });
  document.getElementById('di-fav').addEventListener('click', function() {
    if (currentPage === 'favorites.html') { closeDrawer(); }
    else { goTo('favorites.html'); }
  });
  document.getElementById('di-table').addEventListener('click', function() {
    if (currentPage === 'table.html') { closeDrawer(); }
    else { goTo('table.html'); }
  });
  document.getElementById('di-support').addEventListener('click', function() {
    if (currentPage === 'support.html') { closeDrawer(); }
    else { goTo('support.html'); }
  });
  document.getElementById('di-logout').addEventListener('click', function() {
    AS.logout();
    goTo('index.html');
  });

  // Tüm sayfadaki nav-menu / nav-drawer butonlarını bağla
  window.openDrawer  = openDrawer;
  window.closeDrawer = closeDrawer;

  // Butonları bul ve bağla (DOM hazır olunca)
  function bindNavButtons() {
    var menuBtn = document.getElementById('nav-menu') || document.getElementById('nav-drawer');
    if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindNavButtons);
  } else {
    bindNavButtons();
  }
})();
