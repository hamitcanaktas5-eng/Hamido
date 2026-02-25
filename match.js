/* ================================================
   RoxyScore — match.js  v0.3
   ================================================ */
AS.requireAuth();

const params   = new URLSearchParams(location.search);
const matchId  = params.get('id') || 'sl1';
const match    = MATCHES.getMatch(matchId);
if (!match) { window.location.replace('home.html'); }

// ── BACK ─────────────────────────────────────────
document.getElementById('back-btn').addEventListener('click', () => goBack('home.html'));

// ── TOPBAR ───────────────────────────────────────
document.getElementById('topbar-league').textContent = match.leagueName;
document.getElementById('topbar-date').textContent   = match.date + ' · ' + match.time;

// ── NOTIF TOGGLE ─────────────────────────────────
const notifBtn = document.getElementById('notif-toggle');
function syncNotif() {
  const on = AS.isFavMatch(match.id);
  notifBtn.classList.toggle('active', on);
  notifBtn.title = on ? 'Bildirimi Kapat' : 'Maç Bildirimi Al';
}
syncNotif();
notifBtn.addEventListener('click', () => {
  const added = AS.toggleFavMatch(match.id);
  syncNotif();
  showToast(added ? '🔔' : '🔕', added ? 'Maç favorilere eklendi' : 'Maç favorilerden çıkarıldı', '', 'neutral');
});

// ── HERO ─────────────────────────────────────────
document.getElementById('home-logo').innerHTML = buildTeamLogo(match.home, 'lg');
document.getElementById('away-logo').innerHTML = buildTeamLogo(match.away, 'lg');
document.getElementById('home-name').textContent = match.home.name;
document.getElementById('away-name').textContent = match.away.name;

document.getElementById('hero-bg').style.background =
  `linear-gradient(90deg,${match.home.color}18 0%,transparent 40%,transparent 60%,${match.away.color}18 100%),` +
  `linear-gradient(180deg,var(--bg2) 0%,var(--bg) 100%)`;

const hasScore = match.score.home !== null;
if (match.status === 'live') {
  document.getElementById('live-badge').classList.remove('hidden');
  document.getElementById('hero-status').textContent = match.minute + "'";
  document.getElementById('hero-status').style.color = 'var(--red)';
} else if (match.status === 'finished') {
  document.getElementById('hero-status').textContent = 'MAÇ SONU';
  document.getElementById('hero-status').style.color = 'var(--sub)';
} else {
  document.getElementById('hero-status').textContent = match.time;
  document.getElementById('hero-status').style.color = 'var(--green)';
}

document.getElementById('sh').textContent = hasScore ? match.score.home : '-';
document.getElementById('sa').textContent = hasScore ? match.score.away : '-';
if (!hasScore) {
  document.getElementById('sh').style.color = 'var(--sub)';
  document.getElementById('sa').style.color = 'var(--sub)';
}
if (match.ht) document.getElementById('hero-ht').textContent = 'İY: ' + match.ht;

// Events ribbon
document.getElementById('evt-ribbon').innerHTML = match.events
  .filter(e => e.type === 'goal' || e.type === 'red')
  .map(e => {
    const icon = e.type === 'goal'
      ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`
      : `<svg width="8" height="11" viewBox="0 0 10 14" fill="currentColor"><rect width="10" height="14" rx="2"/></svg>`;
    return `<div class="evt-chip ${e.type}">${icon} ${e.player} <span style="opacity:.6">${e.min}'</span></div>`;
  }).join('');

// ── FAV BUTTONS ───────────────────────────────────
function initFav(btnId, teamData) {
  const btn = document.getElementById(btnId);
  function sync() { btn.classList.toggle('active', AS.isFavTeam(teamData.id)); }
  sync();
  btn.addEventListener('click', () => {
    const added = AS.toggleFavTeam(teamData);
    sync();
    showToast(added ? '⭐' : '💔', added ? `${teamData.name} favorilere eklendi` : `${teamData.name} favorilerden çıkarıldı`, '', added ? 'goal' : 'neutral');
  });
}
initFav('home-fav', { id: match.home.id, name: match.home.name, short: match.home.short, color: match.home.color, color2: match.home.color2, league: match.leagueName });
initFav('away-fav', { id: match.away.id, name: match.away.name, short: match.away.short, color: match.away.color, color2: match.away.color2, league: match.leagueName });

// ── TABS ─────────────────────────────────────────
const tabEls  = document.querySelectorAll('.tab');
const tabLine = document.getElementById('tab-line');
let curTab    = 'summary';

function moveTabLine(el) {
  const pr = document.getElementById('tabs').getBoundingClientRect();
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

// ── RENDER DISPATCH ───────────────────────────────
function renderTab(tab) {
  const c = document.getElementById('tab-content');
  c.scrollTop = 0;
  c.classList.remove('fade-in'); void c.offsetWidth; c.classList.add('fade-in');
  if      (tab === 'summary') renderSummary();
  else if (tab === 'stats')   renderStats();   // async
  else if (tab === 'lineup')  renderLineup();  // async
  else if (tab === 'h2h')     renderH2H();
}

function emptyHtml(icon, title, sub) {
  return `<div class="empty-tab"><div class="ei">${icon}</div><h3>${title}</h3><p>${sub}</p></div>`;
}

// ── ÖZET ─────────────────────────────────────────
function renderSummary() {
  const evts = match.events;
  if (!evts.length) {
    document.getElementById('tab-content').innerHTML =
      emptyHtml('⚽', 'Henüz Olay Yok', match.status === 'upcoming' ? 'Maç başlamadı.' : 'Maç devam ediyor.');
    return;
  }
  const ICONS = {
    goal:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`,
    yellow: `<svg width="10" height="13" viewBox="0 0 10 14" fill="#ffd600"><rect width="10" height="14" rx="2"/></svg>`,
    red:    `<svg width="10" height="13" viewBox="0 0 10 14" fill="#ff3d57"><rect width="10" height="14" rx="2"/></svg>`,
    sub:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.3 2.3-4.9 4.9-4-4L2 16.6 3.4 18l6-6 4 4 6.3-6.3L22 12V6z"/></svg>`,
  };
  const CLS = { goal:'g', yellow:'y', red:'r', sub:'' };
  let html = '<div class="timeline">'; let htAdded = false;
  evts.forEach(e => {
    if (!htAdded && e.min > 45) {
      htAdded = true;
      html += `<div class="ht-div"><span class="ht-lbl">İlk Yarı Sonu${match.ht ? ' · ' + match.ht : ''}</span></div>`;
    }
    const icon = ICONS[e.type] || '•';
    const cls  = CLS[e.type]  || '';
    const nameHtml = `<span class="tl-name">${e.player}</span><span class="tl-sub">${e.detail}</span>`;
    if (e.side === 'home') {
      html += `<div class="tl-item"><div class="tl-home">${nameHtml}</div><div class="tl-center"><div class="tl-icon ${cls}">${icon}</div><span class="tl-min">${e.min}'</span></div><div></div></div>`;
    } else {
      html += `<div class="tl-item"><div></div><div class="tl-center"><div class="tl-icon ${cls}">${icon}</div><span class="tl-min">${e.min}'</span></div><div class="tl-away">${nameHtml}</div></div>`;
    }
  });
  if (!htAdded) html += `<div class="ht-div"><span class="ht-lbl">İlk Yarı Sonu${match.ht ? ' · ' + match.ht : ''}</span></div>`;
  if (match.status === 'live') html += `<div class="ht-div"><span class="ht-lbl" style="color:var(--red);border-color:rgba(255,61,87,.3);background:var(--red-dim)">● CANLI · ${match.minute}'</span></div>`;
  html += '</div>';
  document.getElementById('tab-content').innerHTML = html;
}

// ── İSTATİSTİK ────────────────────────────────────
async function renderStats() {
  const c = document.getElementById('tab-content');
  if (!match.stats.length && match.status !== 'upcoming') {
    // API'den lazy yükle
    c.innerHTML = '<div class="empty-state" style="padding:40px"><div style="font-size:32px;margin-bottom:8px">⏳</div><h3>Yükleniyor...</h3></div>';
    try {
      const stats = await API.getFixtureStats(match.id);
      if (stats && stats.length) match.stats = stats;
    } catch(e) { /* yüklenemedi */ }
  }
  if (!match.stats.length) {
    c.innerHTML = emptyHtml('📊', 'Veri Yok', 'Maç başladığında istatistikler görünecek.');
    return;
  }
  const poss = match.stats.find(s => s.type === 'possession');
  let html = '';
  if (poss) {
    html += `<div class="poss-row">
      <div class="poss-labels">
        <span class="ph">${poss.home}%</span>
        <span class="pm">Topa Sahip Olma</span>
        <span class="pa">${poss.away}%</span>
      </div>
      <div class="poss-bar-wrap">
        <div class="poss-home" style="width:${poss.home}%"></div>
        <div class="poss-away" style="width:${poss.away}%"></div>
      </div>
    </div>`;
  }
  html += '<div class="sec-title">Maç İstatistikleri</div><div class="stats-list">';
  match.stats.filter(s => s.type !== 'possession').forEach(s => {
    const tot = (s.home + s.away) || 1;
    const hp  = Math.round(s.home / tot * 100);
    html += `<div class="stat-row">
      <div class="stat-val h">${s.home}</div>
      <div class="stat-bw">
        <div class="stat-lbl">${s.label}</div>
        <div class="stat-bar">
          <div class="stat-h" style="width:${hp}%"></div>
          <div class="stat-a" style="width:${100-hp}%"></div>
        </div>
      </div>
      <div class="stat-val a">${s.away}</div>
    </div>`;
  });
  html += '</div>';
  document.getElementById('tab-content').innerHTML = html;
}

// ── KADRO ─────────────────────────────────────────
let lineupSide = 'home';

async function renderLineup() {
  const c   = document.getElementById('tab-content');
  const hasData = match.lineup.home.starting.length > 0 || match.lineup.away.starting.length > 0;

  if (!hasData) {
    // API'den lazy yükle
    c.innerHTML = '<div class="empty-state" style="padding:40px"><div style="font-size:32px;margin-bottom:8px">⏳</div><h3>Yükleniyor...</h3></div>';
    try {
      const lu = await API.getFixtureLineups(match.id);
      if (lu) {
        match.lineup.home.formation = lu.home.formation;
        match.lineup.home.starting  = lu.home.starting;
        match.lineup.home.subs      = lu.home.subs;
        match.lineup.away.formation = lu.away.formation;
        match.lineup.away.starting  = lu.away.starting;
        match.lineup.away.subs      = lu.away.subs;
      }
    } catch(e) { /* yüklenemedi */ }
  }

  const hlu = match.lineup.home;
  const alu = match.lineup.away;
  const hasDataNow = hlu.starting.length > 0 || alu.starting.length > 0;

  if (!hasDataNow) {
    c.innerHTML = emptyHtml('👥', 'Kadro Açıklanmadı', 'Maç öncesi kadrolar burada görünecek.');
    return;
  }

  // Takım toggle butonları + içerik alanı
  c.innerHTML = `
    <div class="lineup-team-toggle">
      <button class="ltt-btn${lineupSide === 'home' ? ' active' : ''}" id="ltt-home">
        ${buildLogo(match.home.id, 'xs')}
        <span>${match.home.name}</span>
      </button>
      <button class="ltt-btn${lineupSide === 'away' ? ' active' : ''}" id="ltt-away">
        ${buildLogo(match.away.id, 'xs')}
        <span>${match.away.name}</span>
      </button>
    </div>
    <div id="lineup-body"></div>`;

  document.getElementById('ltt-home').addEventListener('click', () => {
    lineupSide = 'home';
    document.querySelectorAll('.ltt-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('ltt-home').classList.add('active');
    renderLineupBody();
  });
  document.getElementById('ltt-away').addEventListener('click', () => {
    lineupSide = 'away';
    document.querySelectorAll('.ltt-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('ltt-away').classList.add('active');
    renderLineupBody();
  });

  renderLineupBody();
}

function renderLineupBody() {
  const lu   = lineupSide === 'home' ? match.lineup.home : match.lineup.away;
  const tid  = lineupSide === 'home' ? match.home.id    : match.away.id;
  const prof = TEAM_PROFILES[tid];
  const container = document.getElementById('lineup-body');
  if (!container) return;

  const posClass = { GK:'pos-gk', DEF:'pos-def', MID:'pos-mid', FWD:'pos-fwd' };
  const evClass  = { G:'g', Y:'y', R:'r', S:'s' };

  function plRow(p) {
    const evHtml = p.event
      ? `<span class="pl-ev ${evClass[p.event]||''}">${{G:'⚽',Y:'🟨',R:'🟥',S:'⇄'}[p.event]||p.event}</span>`
      : '';
    return `<div class="pl-row">
      <div class="pl-num">${p.num}</div>
      <div class="pl-name">${p.name}</div>
      ${evHtml}
      <div class="pl-pos ${posClass[p.pos]||''}">${p.pos}</div>
    </div>`;
  }

  let html = '';

  // İLK 11
  if (lu.starting.length) {
    html += `<div class="lineup-sec"><span class="lineup-sec-label">İlk 11</span><span style="font-family:var(--font-h);font-size:11px;font-weight:700;color:var(--green);background:var(--green-dim);border:1px solid rgba(0,230,118,.25);border-radius:99px;padding:2px 8px">${lu.formation}</span></div>
    <div class="pl-list">${lu.starting.map(plRow).join('')}</div>`;
  }

  // YEDEKLER
  if (lu.subs && lu.subs.length) {
    html += `<div class="lineup-sec"><span class="lineup-sec-label">Yedekler</span></div>
    <div class="pl-list">${lu.subs.map(plRow).join('')}</div>`;
  }

  // TEKNİK DİREKTÖR
  if (prof && prof.coach) {
    const c = prof.coach;
    const initials = c.name.split(' ').map(w => w[0]).filter((_,i,a) => i === 0 || i === a.length-1).join('').toUpperCase();
    html += `<div class="lineup-sec"><span class="lineup-sec-label">Teknik Direktör</span></div>
    <div class="coach-card">
      <div class="coach-av">${initials}</div>
      <div>
        <div class="coach-name">${c.name}</div>
        <div class="coach-meta">${c.nat} · Göreve başlama: ${c.since}</div>
        <div class="coach-badge">${c.formation}</div>
      </div>
    </div>`;
  }

  // OYNAYAMAYACAKLAR
  const injured = prof ? (prof.injured || []) : [];
  html += `<div class="lineup-sec"><span class="lineup-sec-label">Oynayamayacaklar</span></div>`;
  if (!injured.length) {
    html += `<div class="no-inj" style="margin:0 16px">Sakatı veya cezalısı bulunmuyor.</div>`;
  } else {
    html += injured.map(p => `
      <div class="inj-card">
        <div style="flex:1">
          <div class="inj-name">${p.name}</div>
          <div class="inj-reason">${p.reason}</div>
          <div class="inj-until">Tahmini dönüş: ${p.until}</div>
        </div>
        <div class="inj-num">#${p.num}</div>
      </div>`).join('');
  }

  html += '<div style="height:24px"></div>';
  container.innerHTML = html;
}

// ── H2H ──────────────────────────────────────────
async function renderH2H() {
  const c = document.getElementById('tab-content');
  if (!match.h2h.matches.length) {
    c.innerHTML = '<div class="empty-state" style="padding:40px"><div style="font-size:32px;margin-bottom:8px">⏳</div><h3>Yükleniyor...</h3></div>';
    try {
      const h2hData = await API.getH2H(match.home.id, match.away.id);
      if (h2hData) match.h2h = h2hData;
    } catch(e) { /* yüklenemedi */ }
  }
  const h2h   = match.h2h;
  const total = h2h.wins.home + h2h.wins.draw + h2h.wins.away;
  const rows  = h2h.matches.map(m => {
    const hs = m.homeScore > m.awayScore ? 'color:var(--green)' : '';
    const as = m.awayScore > m.homeScore ? 'color:var(--blue)'  : '';
    return `<div class="h2h-row">
      <div class="h2h-team r" style="${hs}">${match.home.name}</div>
      <div class="h2h-c"><div class="h2h-sc">${m.homeScore} — ${m.awayScore}</div><div class="h2h-dt">${m.date}</div></div>
      <div class="h2h-team"   style="${as}">${match.away.name}</div>
    </div>`;
  }).join('');

  c.innerHTML = `<div class="h2h-wrap">
    <div class="sec-title">Son ${total || '...'} Karşılaşma</div>
    <div class="h2h-summary">
      <div class="h2h-box hw"><div class="big-n">${h2h.wins.home}</div><div class="lbl">${match.home.name.split(' ')[0]}</div></div>
      <div class="h2h-box dr"><div class="big-n">${h2h.wins.draw}</div><div class="lbl">Beraberlik</div></div>
      <div class="h2h-box aw"><div class="big-n">${h2h.wins.away}</div><div class="lbl">${match.away.name.split(' ')[0]}</div></div>
    </div>
    <div class="sec-title">Son Maçlar</div>
    <div class="h2h-matches">${rows || emptyHtml('📅', 'Veri Yok', 'Geçmiş maç kaydı bulunamadı.')}</div>
  </div>`;
}

renderTab('summary');
