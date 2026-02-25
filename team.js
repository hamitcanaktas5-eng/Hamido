/* ================================================
   RoxyScore — team.js  v0.5
   Fikstür sekmesi API entegrasyonu eklendi
   ================================================ */
AS.requireAuth();

const params = new URLSearchParams(location.search);
const teamId = params.get('id') || 'gs';
const team   = TEAM_PROFILES[teamId];
if (!team) { window.location.replace('home.html'); }

// Takımın API ID'si (TEAM_PROFILES'da apiId varsa kullan)
const apiTeamId = team.apiId || null;

// ── BACK ─────────────────────────────────────────
document.getElementById('back-btn').addEventListener('click', () => goBack('home.html'));

// ── HERO ─────────────────────────────────────────
document.getElementById('topbar-league').textContent = team.league || '';
document.getElementById('hero-name').textContent    = team.name;
document.getElementById('hero-league').textContent  = team.league || '';
document.getElementById('hero-logo').innerHTML      = buildLogo(teamId, 'xl');

document.getElementById('hero-bg').style.cssText = `
  background: linear-gradient(135deg,${team.color}45 0%,${team.color}18 50%,transparent 100%),
              linear-gradient(180deg,var(--bg2) 0%,var(--bg) 100%);
`;

// Topbar scroll
const tabContent = document.getElementById('tab-content');
tabContent.addEventListener('scroll', () => {
  document.getElementById('topbar').classList.toggle('scrolled', tabContent.scrollTop > 20);
});

// ── FAV TOGGLE ────────────────────────────────────
const favBtn = document.getElementById('fav-toggle');
function syncFav() {
  const on = AS.isFavTeam(teamId);
  favBtn.classList.toggle('active', on);
  favBtn.title = on ? 'Favorilerden çıkar' : 'Favorilere ekle';
}
syncFav();
favBtn.addEventListener('click', () => {
  const added = AS.toggleFavTeam({
    id: teamId, name: team.name, short: team.short,
    color: team.color, color2: team.color2, league: team.league
  });
  syncFav();
  showToast(added ? '⭐' : '💔', added ? `${team.name} favorilere eklendi` : `${team.name} favorilerden çıkarıldı`, '', added ? 'goal' : 'neutral');
});

// ── TABS ─────────────────────────────────────────
const tabEls  = document.querySelectorAll('.tab');
const tabLine = document.getElementById('tab-line');
let curTab    = 'squad';

function moveTabLine(el) {
  const pr = document.querySelector('.tabs').getBoundingClientRect();
  const r  = el.getBoundingClientRect();
  tabLine.style.left  = (r.left - pr.left) + 'px';
  tabLine.style.width = r.width + 'px';
}
tabEls.forEach(tab => {
  tab.addEventListener('click', () => {
    tabEls.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    curTab = tab.dataset.tab;
    moveTabLine(tab);
    renderTab(curTab);
  });
});
setTimeout(() => moveTabLine(document.querySelector('.tab.active')), 50);

// ── RENDER ───────────────────────────────────────
function renderTab(tab) {
  const c = document.getElementById('tab-content');
  c.scrollTop = 0;
  c.classList.remove('fade-in'); void c.offsetWidth; c.classList.add('fade-in');
  if (tab === 'squad')   renderSquad();
  else                   renderFixture();
}

function emptyHtml(icon, title, sub) {
  return `<div class="empty-tab"><div class="ei">${icon}</div><h3>${title}</h3><p>${sub}</p></div>`;
}
function loadingHtml(msg) {
  return `<div class="empty-tab"><div class="ei" style="font-size:32px">⏳</div><h3>${msg||'Yükleniyor...'}</h3></div>`;
}

// ── KADRO ─────────────────────────────────────────
function renderSquad() {
  const c      = document.getElementById('tab-content');
  const squad  = team.squad   || [];
  const coach  = team.coach;
  const injured= team.injured || [];

  const posOrder = ['GK', 'DEF', 'MID', 'FWD'];
  const posLabel = { GK:'Kaleci', DEF:'Defans', MID:'Orta Saha', FWD:'Forvet' };
  const posClass = { GK:'pos-gk', DEF:'pos-def', MID:'pos-mid', FWD:'pos-fwd' };

  let html = '';

  if (coach) {
    const initials = coach.name.split(' ').filter((_, i, a) => i === 0 || i === a.length-1).map(w => w[0]).join('').toUpperCase();
    html += `<div class="sec-title">Teknik Direktör</div>
    <div class="coach-card">
      <div class="coach-av">${initials}</div>
      <div>
        <div class="coach-name">${coach.name}</div>
        <div class="coach-meta">${coach.nat} · ${coach.since}'dan beri</div>
        <div class="coach-badge">${coach.formation}</div>
      </div>
    </div>`;
  }

  if (squad.length) {
    posOrder.forEach(pos => {
      const group = squad.filter(p => p.pos === pos);
      if (!group.length) return;
      html += `<div class="sec-title">${posLabel[pos]}</div>
      <div class="pl-list">
        ${group.map(p => `<div class="pl-row">
          <div class="pl-num">${p.num}</div>
          <div class="pl-name">${p.name}</div>
          <div class="pl-pos ${posClass[p.pos]||''}">${p.pos}</div>
        </div>`).join('')}
      </div>`;
    });
  } else {
    html += emptyHtml('👥', 'Kadro Bilgisi Yok', 'Bu takım için oyuncu listesi henüz eklenmemiş.');
  }

  html += `<div class="sec-title">Oynayamayacaklar</div>`;
  if (!injured.length) {
    html += `<div class="no-inj">Sakatı veya cezalısı bulunmuyor.</div>`;
  } else {
    html += injured.map(p => `<div class="inj-card">
      <div style="flex:1">
        <div class="inj-name">${p.name}</div>
        <div class="inj-reason">${p.reason}</div>
        <div class="inj-until">Tahmini dönüş: ${p.until}</div>
      </div>
      <div class="inj-num">#${p.num}</div>
    </div>`).join('');
  }

  html += '<div style="height:24px"></div>';
  c.innerHTML = html;
}

// ── FİKSTÜR ───────────────────────────────────────
// Önce mock verilerle göster, sonra API'den yükle
let fixtureCache = null;

async function renderFixture() {
  const c = document.getElementById('tab-content');

  // Eğer önbellekte varsa direkt göster
  if (fixtureCache) {
    renderFixtureList(fixtureCache);
    return;
  }

  // API id yoksa mock göster
  if (!apiTeamId) {
    const mockMatches = (team.recentMatchIds || []).map(id => MATCHES.getMatch(id)).filter(Boolean);
    if (!mockMatches.length) {
      c.innerHTML = emptyHtml('📅', 'Fikstür Yok', 'Bu takım için fikstür bilgisi bulunmuyor.');
      return;
    }
    // Mock veriyi fikstür formatına çevir
    const mockFixtures = mockMatches.map(m => {
      const isHome = m.home.id === teamId;
      const opp = isHome ? m.away : m.home;
      const myGoals = isHome ? m.score.home : m.score.away;
      const oppGoals = isHome ? m.score.away : m.score.home;
      let result = null;
      if (myGoals !== null && oppGoals !== null) {
        if (myGoals > oppGoals) result = 'w';
        else if (myGoals < oppGoals) result = 'l';
        else result = 'd';
      }
      return {
        id: m.id, matchId: m.id, isApiMatch: false,
        isHome, oppId: opp.id, oppName: opp.name,
        myGoals, oppGoals, result,
        status: m.status, minute: m.minute,
        leagueName: m.leagueName, leagueFlag: m.leagueFlag || '🏆',
        date: m.date, time: m.time, matchweek: '',
      };
    });
    fixtureCache = mockFixtures;
    renderFixtureList(mockFixtures);
    return;
  }

  // API'den yükle
  c.innerHTML = loadingHtml('Fikstür yükleniyor...');

  try {
    const data = await API.getTeamFixtures(apiTeamId);
    if (!data || !data.length) {
      c.innerHTML = emptyHtml('📅', 'Fikstür Bulunamadı', 'API\'den veri alınamadı.');
      return;
    }
    // Tarihe göre sırala
    const sorted = data.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
    const fixtures = sorted.map(f => {
      const fm = API.mapTeamFixture(f, apiTeamId);
      // Sonuç hesapla
      let result = null;
      if (fm.myGoals !== null && fm.oppGoals !== null) {
        if (fm.myGoals > fm.oppGoals) result = 'w';
        else if (fm.myGoals < fm.oppGoals) result = 'l';
        else result = 'd';
      }
      return { ...fm, matchId: String(fm.id), isApiMatch: true, result };
    });
    fixtureCache = fixtures;
    renderFixtureList(fixtures);
  } catch(e) {
    console.warn('Fikstür yüklenemedi:', e);
    c.innerHTML = emptyHtml('📅', 'Fikstür Yüklenemedi', 'İnternet bağlantınızı kontrol edin.');
  }
}

function renderFixtureList(fixtures) {
  const c = document.getElementById('tab-content');
  if (!fixtures.length) {
    c.innerHTML = emptyHtml('📅', 'Fikstür Yok', 'Bu sezon için maç bulunamadı.');
    return;
  }

  // Oynananlar ve gelecek maçları ayır
  const played   = fixtures.filter(f => f.status === 'finished');
  const upcoming = fixtures.filter(f => f.status === 'upcoming');
  const live     = fixtures.filter(f => f.status === 'live');

  // Bugünü bul — "Bu hafta" dilimi için
  const today = new Date().toDateString();

  let html = '';

  // Canlı maçlar
  if (live.length) {
    html += `<div class="sec-title">🔴 Canlı</div>`;
    html += live.map(f => fixtureRow(f)).join('');
  }

  // Gelecek maçlar
  if (upcoming.length) {
    html += `<div class="sec-title">Gelecek Maçlar</div>`;
    html += upcoming.map(f => fixtureRow(f)).join('');
  }

  // Oynanmış maçlar
  if (played.length) {
    html += `<div class="sec-title">Oynananlar</div>`;
    html += played.slice().reverse().map(f => fixtureRow(f)).join('');
  }

  html += '<div style="height:24px"></div>';
  c.innerHTML = html;

  // Maça tıklayınca match.html veya API fixture aç
  c.querySelectorAll('.fixture-row[data-mid]').forEach(row => {
    row.addEventListener('click', () => {
      const mid = row.dataset.mid;
      if (mid && mid !== 'null') {
        goTo(`match.html?id=${mid}&from=team.html?id=${teamId}`);
      }
    });
  });
}

function fixtureRow(f) {
  const statusBadge = f.status === 'live'
    ? `<span class="fix-status s-live">● ${f.minute}'</span>`
    : f.status === 'finished'
      ? `<span class="fix-status s-done">MS</span>`
      : `<span class="fix-status s-upcoming">${f.time}</span>`;

  const scoreHtml = (f.myGoals !== null && f.oppGoals !== null)
    ? `<div class="fix-score">${f.myGoals} <span class="fix-dash">—</span> ${f.oppGoals}</div>`
    : `<div class="fix-score upcoming">vs</div>`;

  const resultBadge = f.result
    ? `<div class="fix-result ${f.result}">${{w:'G',l:'M',d:'B'}[f.result]}</div>`
    : '';

  // Rakip logosu
  const oppLogoHtml = f.isApiMatch
    ? `<div class="fix-logo-wrap">${f.oppLogo ? `<img src="${f.oppLogo}" width="24" height="24" onerror="this.style.display='none'"/>` : buildLogo(f.oppId,'xs')}</div>`
    : `<div class="fix-logo-wrap">${buildLogo(f.oppId,'xs')}</div>`;

  const locationBadge = f.isHome
    ? `<span class="fix-loc home">İç</span>`
    : `<span class="fix-loc away">Dep</span>`;

  const clickable = f.matchId && f.matchId !== 'null' ? `data-mid="${f.matchId}"` : '';

  return `<div class="fixture-row ${f.status === 'live' ? 'live' : ''}" ${clickable}>
    <div class="fix-left">
      ${oppLogoHtml}
      <div class="fix-info">
        <div class="fix-opp">${f.oppName}</div>
        <div class="fix-meta">${f.leagueFlag} ${f.leagueName}${f.matchweek ? ' · ' + f.matchweek : ''}</div>
      </div>
    </div>
    <div class="fix-right">
      <div class="fix-date">${f.date} ${locationBadge}</div>
      ${scoreHtml}
      <div class="fix-status-wrap">${statusBadge} ${resultBadge}</div>
    </div>
  </div>`;
}

renderTab('squad');
