/* ================================================
   RoxyScore — favorites.js  v0.5
   Sadece takım favorileri (Maç Bildirimleri kaldırıldı)
   ================================================ */
AS.requireAuth();

// ── NAV ──────────────────────────────────────────
document.getElementById('back-btn').addEventListener('click',  () => goBack('home.html'));
// nav-drawer: shared.js tarafından yönetiliyor
document.getElementById('nav-search').addEventListener('click',() => goTo('home.html'));
document.getElementById('nav-home').addEventListener('click',  () => goTo('home.html'));
document.getElementById('nav-table').addEventListener('click', () => goTo('table.html'));

// Tab line sadece bir tab olduğu için konumu sabitle
setTimeout(() => {
  const tab = document.querySelector('.ftab.active');
  const ftLine = document.getElementById('ftab-line');
  if (tab && ftLine) {
    const wr = document.querySelector('.tabs-wrap').getBoundingClientRect();
    const r  = tab.getBoundingClientRect();
    ftLine.style.left  = (r.left - wr.left) + 'px';
    ftLine.style.width = r.width + 'px';
  }
}, 50);

// ── RENDER ───────────────────────────────────────
function render() {
  const c = document.getElementById('fav-content');
  c.classList.remove('fade-in'); void c.offsetWidth; c.classList.add('fade-in');
  renderTeams();
}

// ── FAVORİ TAKIMLAR ───────────────────────────────
function renderTeams() {
  const teams = AS.getFavTeams();
  const c     = document.getElementById('fav-content');

  if (!teams.length) {
    c.innerHTML = `<div class="empty-fav">
      <div class="ef-icon">⭐</div>
      <h3>Favori Takım Yok</h3>
      <p>Maç kartlarındaki yıldız butonundan ya da takım sayfasından favorilere ekleyebilirsin.</p>
      <button class="empty-fav-btn" id="go-home-btn">Maçlara Dön</button>
    </div>`;
    document.getElementById('go-home-btn').addEventListener('click', () => goTo('home.html'));
    return;
  }

  c.innerHTML = `<div class="team-grid">
    ${teams.map(t => `
      <div class="team-card" data-tid="${t.id}">
        <button class="team-card-remove" data-id="${t.id}">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <div>${buildLogo(t.id, 'lg')}</div>
        <div class="team-card-name">${t.name}</div>
        <div class="team-card-league">${t.league || ''}</div>
        <button class="team-card-detail" data-tid="${t.id}">Detay</button>
      </div>`).join('')}
  </div>`;

  c.querySelectorAll('.team-card-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const team = teams.find(t => t.id === btn.dataset.id);
      AS.toggleFavTeam(team);
      showToast('💔', `${team.name} favorilerden çıkarıldı`, '', 'neutral');
      render();
    });
  });
  c.querySelectorAll('.team-card-detail').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      goTo(`team.html?id=${btn.dataset.tid}&from=favorites.html`);
    });
  });
  c.querySelectorAll('.team-card').forEach(card => {
    card.addEventListener('click', () => goTo(`team.html?id=${card.dataset.tid}&from=favorites.html`));
  });
}

render();
