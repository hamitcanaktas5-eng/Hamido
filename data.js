/* ================================================
   RoxyScore — data.js  v0.3
   Merkezi veri katmanı
   Firebase entegrasyonu için hazır yapı.
   AS.auth → Firebase Auth
   AS.db   → Firestore / Realtime DB
   ================================================ */

const AS = {
  KEYS: {
    USERS:       'rs_users',
    SESSION:     'rs_session',
    FAV_TEAMS:   'rs_fav_teams',
    FAV_MATCHES: 'rs_fav_matches',
    SUPPORT:     'rs_support',
    NOTIF_ON:    'rs_notif_on',
    COLLAPSED:   'rs_collapsed',
  },

  // ── Storage ──
  get(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  remove(k) { localStorage.removeItem(k); },

  // ── Auth ── (Firebase'e geçişte burası firebase.auth() olacak)
  getUsers()        { return this.get(this.KEYS.USERS) || {}; },
  saveUsers(u)      { this.set(this.KEYS.USERS, u); },
  getSession()      { return this.get(this.KEYS.SESSION); },
  setSession(email, uid) { this.set(this.KEYS.SESSION, { email, uid: uid||null, ts: Date.now() }); },
  logout()          { this.remove(this.KEYS.SESSION); },
  requireAuth() {
    if (!this.getSession()) {
      window.location.replace('index.html');
      return false;
    }
    return true;
  },

  // ── Favori Takımlar ──
  getFavTeams() { return this.get(this.KEYS.FAV_TEAMS) || []; },
  isFavTeam(id) { return this.getFavTeams().some(t => t.id === id); },
  toggleFavTeam(team) {
    let favs = this.getFavTeams();
    if (favs.some(t => t.id === team.id)) {
      favs = favs.filter(t => t.id !== team.id);
      this.set(this.KEYS.FAV_TEAMS, favs);
      return false;
    }
    favs.push(team);
    this.set(this.KEYS.FAV_TEAMS, favs);
    return true;
  },

  // ── Favori Maçlar (bildirim) ──
  getFavMatches()   { return this.get(this.KEYS.FAV_MATCHES) || []; },
  isFavMatch(id)    { return this.getFavMatches().includes(id); },
  toggleFavMatch(id) {
    let favs = this.getFavMatches();
    if (favs.includes(id)) {
      favs = favs.filter(x => x !== id);
      this.set(this.KEYS.FAV_MATCHES, favs);
      return false;
    }
    favs.push(id);
    this.set(this.KEYS.FAV_MATCHES, favs);
    return true;
  },

  // ── Destek Talepleri ──
  getTickets()   { return this.get(this.KEYS.SUPPORT) || []; },
  saveTickets(t) { this.set(this.KEYS.SUPPORT, t); },
  createTicket(subject, body, email) {
    const tickets = this.getTickets();
    const ticket = {
      id: 'TKT-' + Date.now(),
      subject, body, email,
      status: 'open',
      createdAt: Date.now(),
      messages: [{ from: 'user', text: body, ts: Date.now() }]
    };
    tickets.unshift(ticket);
    this.saveTickets(tickets);
    return ticket;
  },
  addMessage(ticketId, text, from) {
    from = from || 'user';
    const tickets = this.getTickets();
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return null;
    t.messages.push({ from, text, ts: Date.now() });
    if (from === 'user') t.status = 'open';
    this.saveTickets(tickets);
    return t;
  },
  closeTicket(ticketId) {
    const tickets = this.getTickets();
    const t = tickets.find(x => x.id === ticketId);
    if (t) { t.status = 'closed'; this.saveTickets(tickets); }
  },

  // ── Yardımcılar ──
  formatDate(ts) {
    return new Date(ts).toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric' });
  },
  formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
  },
  getNotifOn()   { const v = this.get(this.KEYS.NOTIF_ON); return v === null ? true : v; },
  setNotifOn(on) { this.set(this.KEYS.NOTIF_ON, on); },
};

/* ================================================
   TAKIM PROFİLLERİ
   Firebase'e geçişte Firestore'dan gelecek
   ================================================ */
const TEAM_PROFILES = {
  gs: {
    id:'gs', name:'Galatasaray', short:'GS', color:'#e8002d', color2:'#FFD700', league:'Süper Lig', apiId: 645,
    coach: { name:'Okan Buruk', nat:'Türkiye', since:'Tem 2022', age:53, formation:'4-2-3-1' },
    injured: [
      { name:'Mauro Icardi',   num:9,  pos:'FWD', reason:'Diz Ameliyatı', until:'Mart 2025' },
      { name:'Yunus Akgün',   num:7,  pos:'MID', reason:'Kas Problemi',  until:'Şubat 2025' },
    ],
    squad: [
      { num:1,  name:'F. Muslera',       pos:'GK' },
      { num:53, name:'Sacha Boey',       pos:'DEF' },
      { num:6,  name:'Abdülkerim E.',    pos:'DEF' },
      { num:4,  name:'Victor Nelsson',   pos:'DEF' },
      { num:3,  name:'Van Aanholt',      pos:'DEF' },
      { num:8,  name:'Seri',             pos:'MID' },
      { num:18, name:'Torreira',         pos:'MID' },
      { num:22, name:'Ziyech',           pos:'MID' },
      { num:17, name:'Kerem Aktürkoğlu',pos:'MID' },
      { num:10, name:'Mertens',          pos:'MID' },
      { num:30, name:'Angelino',         pos:'DEF' },
      { num:15, name:'Oliveira',         pos:'MID' },
      { num:25, name:'Pentek',           pos:'FWD' },
      { num:44, name:'Kaan Ayhan',       pos:'DEF' },
      { num:29, name:'Ömercan A.',       pos:'GK' },
    ],
    recentMatchIds: ['sl1','sl3','pl2'],
  },
  fb: {
    id:'fb', name:'Fenerbahçe', short:'FB', color:'#002f6c', color2:'#FFED00', league:'Süper Lig', apiId: 611,
    coach: { name:'José Mourinho', nat:'Portekiz', since:'Haz 2024', age:61, formation:'4-3-3' },
    injured: [
      { name:'Mert Hakan Yandaş', num:14, pos:'MID', reason:'Ayak Bileği', until:'Ocak 2025' },
    ],
    squad: [
      { num:1,  name:'Livakovic',        pos:'GK' },
      { num:87, name:'Osayi-Samuel',     pos:'DEF' },
      { num:3,  name:'Djiku',            pos:'DEF' },
      { num:21, name:'Rodrigues',        pos:'DEF' },
      { num:88, name:'Ferdi Kadıoğlu',  pos:'DEF' },
      { num:8,  name:'Fred',             pos:'MID' },
      { num:6,  name:'İsmail Yüksek',   pos:'MID' },
      { num:10, name:'Tadic',            pos:'MID' },
      { num:23, name:'Crespo',           pos:'FWD' },
      { num:11, name:'Dzeko',            pos:'FWD' },
      { num:17, name:'İrfan Can',        pos:'FWD' },
      { num:20, name:'Szymanski',        pos:'MID' },
      { num:9,  name:'Batshuayi',        pos:'FWD' },
      { num:33, name:'Günok',            pos:'GK' },
    ],
    recentMatchIds: ['sl1','sl2'],
  },
  bjk: {
    id:'bjk', name:'Beşiktaş', short:'BJK', color:'#1a1a1a', color2:'#CCCCCC', league:'Süper Lig', apiId: 609,
    coach: { name:'Giovanni van Bronckhorst', nat:'Hollanda', since:'Aralık 2023', age:49, formation:'4-4-2' },
    injured: [
      { name:'Rıdvan Yılmaz',    num:33, pos:'DEF', reason:'Hamstring',    until:'Şubat 2025' },
      { name:'Alex Oxlade-C.',   num:15, pos:'MID', reason:'Diz Problemi', until:'Ocak 2025' },
    ],
    squad: [
      { num:1,  name:'Mert Günok',   pos:'GK' },
      { num:4,  name:'Tayyip Talha', pos:'DEF' },
      { num:5,  name:'Vida',         pos:'DEF' },
      { num:8,  name:'Al-Musrati',   pos:'MID' },
      { num:9,  name:'Michy B.',     pos:'FWD' },
      { num:10, name:'Gedson',       pos:'MID' },
      { num:11, name:'Ghezzal',      pos:'FWD' },
      { num:23, name:'Rebocho',      pos:'DEF' },
      { num:29, name:'Ajdin H.',     pos:'MID' },
    ],
    recentMatchIds: ['sl2'],
  },
  ts: {
    id:'ts', name:'Trabzonspor', short:'TS', color:'#8B1A1A', color2:'#1C4F9C', league:'Süper Lig', apiId: 614,
    coach: { name:'Abdullah Avcı', nat:'Türkiye', since:'Ocak 2021', age:56, formation:'4-2-3-1' },
    injured: [],
    squad: [
      { num:1,  name:'Uğurcan Ç.', pos:'GK' },
      { num:3,  name:'Marc Bartra', pos:'DEF' },
      { num:9,  name:'Maxi Gomez', pos:'FWD' },
      { num:10, name:'Hamsik',     pos:'MID' },
      { num:7,  name:'Trezeguet',  pos:'FWD' },
      { num:22, name:'Denswil',    pos:'DEF' },
    ],
    recentMatchIds: ['sl2'],
  },
  mci: {
    id:'mci', name:'Manchester City', short:'MCI', color:'#6CABDD', color2:'#1c2c5b', league:'Premier League',
    coach: { name:'Pep Guardiola', nat:'İspanya', since:'Haz 2016', age:53, formation:'4-3-3' },
    injured: [
      { name:'Rodri',           num:16, pos:'MID', reason:'Ön Çapraz Bağ',    until:'Sezon Sonu' },
      { name:'Kevin De Bruyne', num:17, pos:'MID', reason:'Kasık Yaralanması', until:'Mart 2025' },
    ],
    squad: [
      { num:31, name:'Ederson',   pos:'GK' },
      { num:3,  name:'R. Dias',   pos:'DEF' },
      { num:5,  name:'Akanji',    pos:'DEF' },
      { num:2,  name:'Walker',    pos:'DEF' },
      { num:6,  name:'Gvardiol',  pos:'DEF' },
      { num:20, name:'B. Silva',  pos:'MID' },
      { num:76, name:'Doku',      pos:'FWD' },
      { num:47, name:'Foden',     pos:'MID' },
      { num:67, name:'Kovacic',   pos:'MID' },
      { num:9,  name:'Haaland',   pos:'FWD' },
      { num:11, name:'Savinho',   pos:'FWD' },
    ],
    recentMatchIds: ['pl1','ucl2'],
  },
  ars: {
    id:'ars', name:'Arsenal', short:'ARS', color:'#EF0107', color2:'#063672', league:'Premier League',
    coach: { name:'Mikel Arteta', nat:'İspanya', since:'Aralık 2019', age:42, formation:'4-2-3-1' },
    injured: [
      { name:'Gabriel Jesus', num:9, pos:'FWD', reason:'Diz Ameliyatı', until:'Nisan 2025' },
    ],
    squad: [
      { num:1,  name:'Raya',       pos:'GK' },
      { num:4,  name:'Ben White',  pos:'DEF' },
      { num:6,  name:'Gabriel',    pos:'DEF' },
      { num:12, name:'Timber',     pos:'DEF' },
      { num:35, name:'Zinchenko',  pos:'DEF' },
      { num:29, name:'Havertz',    pos:'MID' },
      { num:8,  name:'Ødegaard',   pos:'MID' },
      { num:41, name:'Rice',       pos:'MID' },
      { num:7,  name:'Saka',       pos:'FWD' },
      { num:11, name:'Martinelli', pos:'FWD' },
      { num:19, name:'Trossard',   pos:'MID' },
    ],
    recentMatchIds: ['pl1'],
  },
  liv: {
    id:'liv', name:'Liverpool', short:'LIV', color:'#C8102E', color2:'#00B2A9', league:'Premier League',
    coach: { name:'Arne Slot', nat:'Hollanda', since:'Haz 2024', age:45, formation:'4-3-3' },
    injured: [],
    squad: [
      { num:1,  name:'Alisson',         pos:'GK' },
      { num:66, name:'Alexander-Arnold', pos:'DEF' },
      { num:4,  name:'Van Dijk',         pos:'DEF' },
      { num:5,  name:'Konaté',           pos:'DEF' },
      { num:26, name:'Robertson',        pos:'DEF' },
      { num:8,  name:'Szoboszlai',       pos:'MID' },
      { num:10, name:'Mac Allister',     pos:'MID' },
      { num:38, name:'Elliott',          pos:'MID' },
      { num:11, name:'Salah',            pos:'FWD' },
      { num:7,  name:'Díaz',             pos:'FWD' },
      { num:9,  name:'Núñez',            pos:'FWD' },
    ],
    recentMatchIds: ['pl2'],
  },
  rma: {
    id:'rma', name:'Real Madrid', short:'RMA', color:'#FEBE10', color2:'#1a1a2e', league:'La Liga',
    coach: { name:'Carlo Ancelotti', nat:'İtalya', since:'Haz 2021', age:65, formation:'4-3-3' },
    injured: [
      { name:'Militão', num:3, pos:'DEF', reason:'Ön Çapraz Bağ', until:'Nisan 2025' },
      { name:'Alaba',   num:4, pos:'DEF', reason:'Ön Çapraz Bağ', until:'Sezon Sonu' },
    ],
    squad: [
      { num:1,  name:'Lunin',        pos:'GK' },
      { num:2,  name:'Carvajal',     pos:'DEF' },
      { num:22, name:'Rudiger',      pos:'DEF' },
      { num:6,  name:'Nacho',        pos:'DEF' },
      { num:23, name:'Mendy',        pos:'DEF' },
      { num:10, name:'Modric',       pos:'MID' },
      { num:8,  name:'Kroos',        pos:'MID' },
      { num:18, name:'Tchouaméni',  pos:'MID' },
      { num:7,  name:'Vinícius Jr.', pos:'FWD' },
      { num:9,  name:'Benzema',      pos:'FWD' },
      { num:11, name:'Rodrygo',      pos:'FWD' },
    ],
    recentMatchIds: ['la1','ucl1'],
  },
  bar: {
    id:'bar', name:'Barcelona', short:'BAR', color:'#004D98', color2:'#A50044', league:'La Liga',
    coach: { name:'Hansi Flick', nat:'Almanya', since:'Haz 2024', age:59, formation:'4-3-3' },
    injured: [
      { name:'ter Stegen', num:1, pos:'GK', reason:'Diz Ameliyatı', until:'Sezon Sonu' },
    ],
    squad: [
      { num:25, name:'Iñaki Peña',   pos:'GK' },
      { num:23, name:'Koundé',       pos:'DEF' },
      { num:15, name:'Christensen',  pos:'DEF' },
      { num:3,  name:'Balde',        pos:'DEF' },
      { num:24, name:'Cubarsí',      pos:'DEF' },
      { num:8,  name:'Pedri',        pos:'MID' },
      { num:6,  name:'Gavi',         pos:'MID' },
      { num:11, name:'Raphinha',     pos:'FWD' },
      { num:9,  name:'Lewandowski',  pos:'FWD' },
      { num:19, name:'Lamine Yamal', pos:'FWD' },
    ],
    recentMatchIds: ['la1'],
  },
  psg: {
    id:'psg', name:'PSG', short:'PSG', color:'#003F7F', color2:'#D80027', league:'Şampiyonlar Ligi',
    coach: { name:'Luis Enrique', nat:'İspanya', since:'Haz 2023', age:54, formation:'4-3-3' },
    injured: [],
    squad: [
      { num:50, name:'Donnarumma', pos:'GK' },
      { num:2,  name:'Hakimi',     pos:'DEF' },
      { num:5,  name:'Marquinhos', pos:'DEF' },
      { num:3,  name:'Skriniar',   pos:'DEF' },
      { num:25, name:'N. Mendes',  pos:'DEF' },
      { num:8,  name:'Fabian Ruiz',pos:'MID' },
      { num:6,  name:'Vitinha',    pos:'MID' },
      { num:7,  name:'Dembélé',    pos:'FWD' },
      { num:11, name:'Ramos',      pos:'FWD' },
      { num:19, name:'Lee Kang-in',pos:'MID' },
    ],
    recentMatchIds: ['ucl1'],
  },
  // Diğer takımlar
  bsk: { id:'bsk', name:'Başakşehir', short:'İBB', color:'#0066CC', color2:'#FF6600', league:'Süper Lig', coach:{name:'Tayfur Havutçu',nat:'Türkiye',since:'2024',age:52,formation:'4-3-3'}, injured:[], squad:[], recentMatchIds:['sl3'] },
  svs: { id:'svs', name:'Sivasspor',  short:'SVS', color:'#8B0000', color2:'#FFA500', league:'Süper Lig', coach:{name:'Bülent Uygun',nat:'Türkiye',since:'2023',age:51,formation:'5-3-2'}, injured:[], squad:[], recentMatchIds:['sl3'] },
  ank: { id:'ank', name:'Ankaragücü', short:'ANK', color:'#000080', color2:'#FFD700', league:'Süper Lig', coach:{name:'Emre Belözoğlu',nat:'Türkiye',since:'2024',age:44,formation:'4-4-2'}, injured:[], squad:[], recentMatchIds:['sl4'] },
  ksp: { id:'ksp', name:'Kasımpaşa', short:'KSP', color:'#C0392B', color2:'#FFFFFF', league:'Süper Lig', coach:{name:'Fuat Çapa',nat:'Türkiye',since:'2023',age:57,formation:'4-3-3'}, injured:[], squad:[], recentMatchIds:['sl4'] },
  che: { id:'che', name:'Chelsea',    short:'CHE', color:'#034694', color2:'#DBA111', league:'Premier League', coach:{name:'Enzo Maresca',nat:'İtalya',since:'2024',age:44,formation:'4-2-3-1'}, injured:[], squad:[], recentMatchIds:['pl2'] },
  tot: { id:'tot', name:'Tottenham',  short:'TOT', color:'#132257', color2:'#FFFFFF', league:'Premier League', coach:{name:'Ange Postecoglou',nat:'Avustralya',since:'2023',age:58,formation:'4-3-3'}, injured:[], squad:[], recentMatchIds:['pl3'] },
  mnu: { id:'mnu', name:'Man United', short:'MNU', color:'#DA020E', color2:'#FFE500', league:'Premier League', coach:{name:'Ruben Amorim',nat:'Portekiz',since:'2024',age:39,formation:'3-4-3'}, injured:[], squad:[], recentMatchIds:['pl3'] },
  atm: { id:'atm', name:'Atletico Madrid', short:'ATM', color:'#CB3524', color2:'#273B7D', league:'La Liga', coach:{name:'Diego Simeone',nat:'Arjantin',since:'2011',age:54,formation:'4-4-2'}, injured:[], squad:[], recentMatchIds:['la2'] },
  sev: { id:'sev', name:'Sevilla', short:'SEV', color:'#C8102E', color2:'#F5F5F5', league:'La Liga', coach:{name:'Diego Alonso',nat:'Uruguay',since:'2024',age:47,formation:'4-3-3'}, injured:[], squad:[], recentMatchIds:['la2'] },
  bay: { id:'bay', name:'Bayern Münih', short:'FCB', color:'#DC052D', color2:'#0066B2', league:'Bundesliga', coach:{name:'Vincent Kompany',nat:'Belçika',since:'2024',age:38,formation:'4-2-3-1'}, injured:[], squad:[], recentMatchIds:['ucl2'] },
};

/* ================================================
   MAÇ VERİSİ
   Firebase'e geçişte Firestore'dan gelecek.
   MATCHES.getMatch(id) fonksiyonu değişmeyecek.
   ================================================ */
/* ================================================
   MATCHES — Gerçek API verisini tutar
   Mock data yok, tüm veri API'den gelir
   ================================================ */
const MATCHES = {
  leagues: [],   // API'den doldurulur
  getAllMatches() { return this.leagues.flatMap(l => l.matches); },
  getMatch(id)   { return this.getAllMatches().find(m => m.id === id); },
  getAllTeams() {
    const seen = {};
    const result = [];
    this.getAllMatches().forEach(m => {
      [m.home, m.away].forEach(t => {
        if (!seen[t.id]) {
          seen[t.id] = true;
          result.push({ ...t, league: m.leagueName });
        }
      });
    });
    return result;
  },

  /* ──────────────────────────────────────────────────
     API-Football'dan gelen fixture'ları v03 formatına
     çevirip mevcut mock data'nın üzerine yazar.
     Eğer API başarısız olursa mock data kalır.
  ─────────────────────────────────────────────────── */
  loadFromAPI(apiFixtures) {
    if (!apiFixtures || !apiFixtures.length) return false;
    try {
      const LC = typeof LEAGUE_CONFIG !== 'undefined' ? LEAGUE_CONFIG : [];
      const leagueMap = {};
      LC.forEach(l => { leagueMap[l.id] = l; });

      const byLeague = {};
      apiFixtures.forEach(f => {
        const fix = f.fixture, teams = f.teams, goals = f.goals, score = f.score;
        const lg  = f.league;
        const lid = String(lg.id);
        const lc  = leagueMap[parseInt(lid)] || { name: lg.name, country: lg.country, flag: '🏆', priority: 99 };

        if (!byLeague[lid]) {
          byLeague[lid] = {
            id: lid,
            name: lc.name || lg.name,
            country: lc.country || lg.country,
            flag: lc.flag || '🏆',
            priority: lc.priority || 99,
            matches: [],
          };
        }

        // Status mapping
        const shortStatus = fix.status.short;
        let status = 'upcoming';
        const liveStatuses = ['1H','HT','2H','ET','BT','P','SUSP','INT','LIVE'];
        const doneStatuses = ['FT','AET','PEN'];
        if (liveStatuses.includes(shortStatus)) status = 'live';
        else if (doneStatuses.includes(shortStatus)) status = 'finished';

        // Team color fallback (from TEAM_PROFILES if available, else by ID)
        function teamColor(teamId) {
          const tp = typeof TEAM_PROFILES !== 'undefined' ? TEAM_PROFILES[String(teamId)] : null;
          return tp ? tp.color : '#1e2740';
        }
        function teamColor2(teamId) {
          const tp = typeof TEAM_PROFILES !== 'undefined' ? TEAM_PROFILES[String(teamId)] : null;
          return tp ? (tp.color2 || 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.15)';
        }
        function teamShort(teamId, name) {
          const tp = typeof TEAM_PROFILES !== 'undefined' ? TEAM_PROFILES[String(teamId)] : null;
          return tp ? tp.short : name.substring(0, 3).toUpperCase();
        }

        const kickoff = new Date(fix.date);
        const timeStr = kickoff.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
        const dateStr = kickoff.toLocaleDateString('tr-TR', { day:'numeric', month:'short' });

        const matchObj = {
          id: String(fix.id),
          leagueId: lid,
          leagueName: lc.name || lg.name,
          leagueFlag: lc.flag || '🏆',
          home: {
            id: String(teams.home.id),
            name: teams.home.name,
            short: teamShort(teams.home.id, teams.home.name),
            color: teamColor(teams.home.id),
            color2: teamColor2(teams.home.id),
            logo: teams.home.logo || '',
          },
          away: {
            id: String(teams.away.id),
            name: teams.away.name,
            short: teamShort(teams.away.id, teams.away.name),
            color: teamColor(teams.away.id),
            color2: teamColor2(teams.away.id),
            logo: teams.away.logo || '',
          },
          score: {
            home: goals.home !== null ? goals.home : null,
            away: goals.away !== null ? goals.away : null,
          },
          status,
          minute: fix.status.elapsed || null,
          ht: score.halftime && score.halftime.home !== null
            ? `${score.halftime.home}-${score.halftime.away}` : null,
          time: timeStr,
          date: dateStr,
          // Detay verileri API'den lazy yüklenir
          events: [],
          stats: [],
          lineup: { home: { formation: '', starting: [], subs: [] }, away: { formation: '', starting: [], subs: [] } },
          h2h: { wins: { home: 0, draw: 0, away: 0 }, matches: [] },
        };

        byLeague[lid].matches.push(matchObj);
      });

      const sorted = Object.values(byLeague).sort((a, b) => a.priority - b.priority);
      if (sorted.length > 0) {
        this.leagues = sorted;
        return true;
      }
    } catch (e) {
      console.warn('loadFromAPI hatası:', e);
    }
    return false;
  },
};