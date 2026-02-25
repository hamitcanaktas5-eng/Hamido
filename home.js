/* ================================================
   RoxyScore — home.js  v0.8
   Gerçek API entegrasyonu — mock data yok
   ================================================ */
AS.requireAuth();

let activeFilter     = 'all';
let activeDate       = 'today';
let collapsedLeagues = AS.get('rs_collapsed') || [];
let refreshTimer     = null;

// ── YÜKLEME EKRANI ───────────────────────────────
function showLoading() {
  const ml = document.getElementById('match-list');
  ml.innerHTML = `
    <div class="empty-screen">
      <div class="es-spinner"></div>
      <div class="es-title">Maçlar Yükleniyor</div>
      <div class="es-sub">API\'den canlı veriler çekiliyor...</div>
    </div>`;
}

function showNoMatches() {
  const ml = document.getElementById('match-list');
  ml.innerHTML = `
    <div class="empty-screen">
      <div class="es-icon">⚽</div>
      <div class="es-title">Bugün Maç Yok</div>
      <div class="es-sub">Takip ettiğin liglerde bugün maç bulunmuyor.<br>Yarın tekrar kontrol et.</div>
      <button class="es-btn" id="es-retry">Yenile</button>
    </div>`;
  document.getElementById('es-retry').addEventListener('click', () => loadAndRender(true));
}

function showError(msg) {
  const lastErr = API.getLastError ? API.getLastError() : null;
  const detail  = lastErr ? `<div class="es-err-detail">${lastErr}</div>` : '';
  const ml = document.getElementById('match-list');
  ml.innerHTML = `
    <div class="empty-screen">
      <div class="es-icon">📡</div>
      <div class="es-title">Bağlantı Hatası</div>
      <div class="es-sub">${msg || 'API\'ye ulaşılamıyor.'}<br>İnternet bağlantını kontrol et.</div>
      ${detail}
      <button class="es-btn" id="es-retry">Tekrar Dene</button>
    </div>`;
  document.getElementById('es-retry').addEventListener('click', () => loadAndRender(true));
}

// ── ANA YÜKLEME FONKSİYONU ───────────────────────
async function loadAndRender(forceRefresh) {
  // Timer temizle
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }

  // Sadece bugün filtresi için API çek
  if (activeDate !== 'today') {
    renderMatches();
    return;
  }

  // İlk yüklemede loading göster (veri yoksa)
  if (!MATCHES.leagues.length) showLoading();

  try {
    const fixtures = await API.getTodayFixtures(forceRefresh);

    if (!fixtures || fixtures.length === 0) {
      MATCHES.leagues = [];
      buildDateStrip();
      renderFavStrip();
      showNoMatches();
      return;
    }

    const loaded = MATCHES.loadFromAPI(fixtures);
    if (!loaded) {
      showNoMatches();
      return;
    }

  } catch (e) {
    console.error('API yüklenemedi:', e);
    if (!MATCHES.leagues.length) {
      showError('API\'ye ulaşılamıyor.');
      return;
    }
  }

  buildDateStrip();
  renderFavStrip();
  renderMatches();

  // Canlı maç varsa otomatik yenile
  const hasLive = MATCHES.getAllMatches().some(m => m.status === 'live');
  if (hasLive) {
    refreshTimer = setTimeout(() => loadAndRender(true), 60000);
  }
}

// ── FAV MAÇ ŞERİDİ ───────────────────────────────
function renderFavStrip() {
  const container = document.getElementById('fav-strip-container');
  const ids   = AS.getFavMatches();
  const items = ids.map(id => MATCHES.getMatch(id)).filter(Boolean);

  if (!items.length) {
    container.innerHTML = '';
    setMatchListTop(0);
    return;
  }

  const html = `<div class="fav-strip" id="fav-strip">
    ${items.map(m => {
      const sH = m.score.home !== null ? m.score.home : '-';
      const sA = m.score.away !== null ? m.score.away : '-';
      let badgeHtml = '';
      if (m.status === 'live')     badgeHtml = `<span class="fav-mc-live">● ${m.minute || '?'}'</span>`;
      else if (m.status === 'finished') badgeHtml = `<span class="fav-mc-done">MS</span>`;
      else                         badgeHtml = `<span class="fav-mc-time">${m.time}</span>`;
      return `<div class="fav-mc${m.status==='live'?' live':''}" data-mid="${m.id}">
        <div class="fav-mc-team">
          ${buildTeamLogo(m.home, 'xs')}
          <span class="fav-mc-name">${m.home.short || m.home.name}</span>
        </div>
        <div class="fav-mc-score-wrap">
          <span class="fav-mc-score">${sH}:${sA}</span>
          ${badgeHtml}
        </div>
        <div class="fav-mc-team">
          ${buildTeamLogo(m.away, 'xs')}
          <span class="fav-mc-name">${m.away.short || m.away.name}</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  container.innerHTML = html;

  container.querySelectorAll('.fav-mc').forEach(el => {
    el.addEventListener('click', () => goTo(`match.html?id=${el.dataset.mid}`));
  });

  const favH = container.getBoundingClientRect().height;
  setMatchListTop(favH);
}

// ── LAYOUT ───────────────────────────────────────
const BASE_TOP = 52 + 68 + 48;
function setMatchListTop(favH) {
  const list = document.getElementById('match-list');
  list.style.top    = (BASE_TOP + favH) + 'px';
  list.style.bottom = '72px';
}

// ── TARİH ŞERİDİ ─────────────────────────────────
function buildDateStrip() {
  const strip = document.getElementById('date-strip');
  const days  = [];
  const today = new Date();
  for (let i = -2; i <= 4; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = i === 0 ? 'today'
              : i === 1 ? 'tomorrow'
              : d.toISOString().split('T')[0];
    const label = i === 0 ? 'Bugün'
                : i === 1 ? 'Yarın'
                : d.toLocaleDateString('tr-TR', { weekday:'short', day:'numeric', month:'short' });
    days.push({ key, label });
  }
  strip.innerHTML = days.map(d =>
    `<button class="date-btn${activeDate===d.key?' active':''}" data-date="${d.key}">${d.label}</button>`
  ).join('');
  strip.querySelectorAll('.date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeDate = btn.dataset.date;
      strip.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (activeDate === 'today') {
        loadAndRender();
      } else {
        showNoMatches(); // Diğer günler şimdilik yok
      }
    });
  });
}

// ── FİLTRE PİLLERI ───────────────────────────────
document.querySelectorAll('.pill').forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMatches();
  });
});

// ── MAÇLARI RENDER ET ────────────────────────────
function renderMatches() {
  const ml = document.getElementById('match-list');
  const allMatches = MATCHES.getAllMatches();

  // Filtrele
  const filtered = allMatches.filter(m => {
    if (activeFilter === 'all')      return true;
    if (activeFilter === 'live')     return m.status === 'live';
    if (activeFilter === 'finished') return m.status === 'finished';
    if (activeFilter === 'upcoming') return m.status === 'upcoming';
    return true;
  });

  if (!filtered.length) {
    ml.innerHTML = `<div class="empty-screen">
      <div class="es-icon">🔍</div>
      <div class="es-title">Sonuç Yok</div>
      <div class="es-sub">Bu filtre için maç bulunamadı.</div>
    </div>`;
    return;
  }

  // Ligiere göre grupla
  const leagueOrder = MATCHES.leagues.map(l => l.id);
  const byLeague = {};
  filtered.forEach(m => {
    if (!byLeague[m.leagueId]) {
      byLeague[m.leagueId] = {
        id: m.leagueId,
        name: m.leagueName,
        flag: m.leagueFlag || '🏆',
        matches: [],
      };
    }
    byLeague[m.leagueId].matches.push(m);
  });

  const leagues = leagueOrder
    .filter(id => byLeague[id])
    .map(id => byLeague[id]);

  const collapsed = AS.get('rs_collapsed') || [];

  ml.innerHTML = leagues.map(lg => {
    const isCollapsed = collapsed.includes(lg.id);
    return `
      <div class="league-group" data-lid="${lg.id}">
        <div class="league-header" data-lid="${lg.id}">
          <span class="league-flag">${lg.flag}</span>
          <span class="league-name">${lg.name}</span>
          <span class="league-count">${lg.matches.length}</span>
          <svg class="collapse-arrow${isCollapsed?' collapsed':''}" viewBox="0 0 24 24">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
        <div class="league-matches${isCollapsed?' hidden':''}">
          ${lg.matches.map(buildMatchCard).join('')}
        </div>
      </div>`;
  }).join('');

  bindEvents();
}

// ── MAÇ KARTI (yeni tasarım) ─────────────────────
function buildMatchCard(m) {
  const hasScore = m.score.home !== null;
  const favMatch = AS.isFavMatch(m.id);
  const favHome  = AS.isFavTeam(m.home.id);
  const favAway  = AS.isFavTeam(m.away.id);

  const sH = hasScore ? m.score.home : (m.status === 'upcoming' ? '' : '-');
  const sA = hasScore ? m.score.away : (m.status === 'upcoming' ? '' : '-');

  let statusHtml = '';
  if (m.status === 'live') {
    statusHtml = `<div class="card-status live-status">
      <span class="live-pulse"></span>
      <span>${m.minute || 'CANLI'}'</span>
    </div>`;
  } else if (m.status === 'finished') {
    statusHtml = `<div class="card-status done-status">MS</div>`;
  } else {
    statusHtml = `<div class="card-status upcoming-status">${m.time}</div>`;
  }

  const scoreHtml = hasScore
    ? `<div class="card-score">${sH}<span class="score-div">:</span>${sA}</div>`
    : (m.status === 'upcoming'
        ? `<div class="card-score upcoming-score">vs</div>`
        : `<div class="card-score">-<span class="score-div">:</span>-</div>`);

  const homeFavData = `data-tid="${m.home.id}" data-tname="${m.home.name}" data-tshort="${m.home.short||''}" data-tcolor="${m.home.color||''}" data-tcolor2="${m.home.color2||''}" data-tleague="${m.leagueName}"`;
  const awayFavData = `data-tid="${m.away.id}" data-tname="${m.away.name}" data-tshort="${m.away.short||''}" data-tcolor="${m.away.color||''}" data-tcolor2="${m.away.color2||''}" data-tleague="${m.leagueName}"`;

  return `<div class="match-card${m.status==='live'?' card-live':''}" data-mid="${m.id}">

    <!-- ÜST: Takip butonu -->
    <div class="card-top">
      <button class="btn-follow${favMatch?' active':''}" data-mid="${m.id}">
        <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
        ${favMatch ? 'Takipte' : 'Takip Et'}
      </button>
    </div>

    <!-- ORTA: Takımlar + Skor -->
    <div class="card-body">

      <!-- Ev Takımı (sol) -->
      <div class="card-team home-team">
        <button class="btn-fav-team${favHome?' active':''}" ${homeFavData}>
          <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </button>
        <div class="team-logo-name">
          ${buildTeamLogo(m.home, 'md')}
          <span class="team-label">${m.home.name}</span>
        </div>
      </div>

      <!-- Orta: Skor + Durum -->
      <div class="card-center">
        ${scoreHtml}
        ${statusHtml}
      </div>

      <!-- Deplasman Takımı (sağ) -->
      <div class="card-team away-team">
        <div class="team-logo-name">
          ${buildTeamLogo(m.away, 'md')}
          <span class="team-label">${m.away.name}</span>
        </div>
        <button class="btn-fav-team${favAway?' active':''}" ${awayFavData}>
          <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </button>
      </div>

    </div>
  </div>`;
}

// ── EVENT BAĞLA ──────────────────────────────────
function bindEvents() {
  // League collapse
  document.querySelectorAll('.league-header').forEach(h => {
    h.addEventListener('click', () => {
      const lid = h.dataset.lid;
      const body = h.nextElementSibling;
      const arrow = h.querySelector('.collapse-arrow');
      const isCollapsed = body.classList.toggle('hidden');
      arrow.classList.toggle('collapsed', isCollapsed);
      let arr = AS.get('rs_collapsed') || [];
      if (isCollapsed) { if (!arr.includes(lid)) arr.push(lid); }
      else { arr = arr.filter(x => x !== lid); }
      AS.set('rs_collapsed', arr);
    });
  });

  // Karta tıklama → maç detay (fav butonları hariç)
  document.querySelectorAll('.match-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.btn-fav-team') || e.target.closest('.btn-follow')) return;
      goTo(`match.html?id=${card.dataset.mid}`);
    });
  });

  // Takım fav yıldızı
  document.querySelectorAll('.btn-fav-team').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const team = {
        id:     btn.dataset.tid,
        name:   btn.dataset.tname,
        short:  btn.dataset.tshort,
        color:  btn.dataset.tcolor,
        color2: btn.dataset.tcolor2,
        league: btn.dataset.tleague,
      };
      const added = AS.toggleFavTeam(team);
      btn.classList.toggle('active', added);
      showToast(added ? '⭐' : '💔',
        added ? `${team.name} favorilere eklendi` : `${team.name} favorilerden çıkarıldı`,
        '', added ? 'goal' : 'neutral');
    });
  });

  // Maç takip (follow) butonu
  document.querySelectorAll('.btn-follow').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const mid   = btn.dataset.mid;
      const added = AS.toggleFavMatch(mid);
      btn.classList.toggle('active', added);
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
        ${added ? 'Takipte' : 'Takip Et'}`;
      showToast(added ? '🔔' : '🔕',
        added ? 'Maç takibe alındı' : 'Takip bırakıldı',
        '', 'neutral');
      renderFavStrip();
    });
  });

  // Takım adına tıklama → takım sayfası
  document.querySelectorAll('.team-label').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const card = el.closest('.match-card');
      if (!card) return;
      const mid  = card.dataset.mid;
      const match = MATCHES.getMatch(mid);
      if (!match) return;
      const isHome = el.closest('.home-team') !== null;
      const tid = isHome ? match.home.id : match.away.id;
      goTo(`team.html?id=${tid}&from=home.html`);
    });
  });
}

// ── ARAMA ────────────────────────────────────────
document.getElementById('nav-search').addEventListener('click', () => {
  document.getElementById('search-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('search-input').focus(), 100);
});
document.getElementById('search-close').addEventListener('click', () => {
  document.getElementById('search-overlay').classList.add('hidden');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div class="search-hint">Aramak istediğin takım veya ligi yaz...</div>';
});
document.getElementById('search-input').addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  const res = document.getElementById('search-results');
  if (q.length < 2) {
    res.innerHTML = '<div class="search-hint">En az 2 karakter gir...</div>';
    return;
  }
  const teams = MATCHES.getAllTeams().filter(t =>
    t.name.toLowerCase().includes(q) || (t.short && t.short.toLowerCase().includes(q))
  );
  if (!teams.length) {
    res.innerHTML = '<div class="search-hint">Sonuç bulunamadı.</div>';
    return;
  }
  res.innerHTML = teams.slice(0, 8).map(t => `
    <div class="search-item" data-tid="${t.id}">
      ${buildTeamLogo(t, 'xs')}
      <div>
        <div class="si-name">${t.name}</div>
        <div class="si-league">${t.league || ''}</div>
      </div>
    </div>`).join('');
  res.querySelectorAll('.search-item').forEach(el => {
    el.addEventListener('click', () => goTo(`team.html?id=${el.dataset.tid}&from=home.html`));
  });
});

// ── FAV + DIĞER NAV ──────────────────────────────
document.getElementById('nav-home').addEventListener('click',  () => { window.scrollTo(0,0); loadAndRender(); });
document.getElementById('nav-table').addEventListener('click', () => goTo('table.html'));
document.getElementById('nav-fav').addEventListener('click',   () => goTo('favorites.html'));
// nav-menu → shared.js openDrawer

// ── BAŞLAT ───────────────────────────────────────
loadAndRender();
