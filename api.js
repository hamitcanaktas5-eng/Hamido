/* ================================================
   RoxyScore — api.js  v0.7
   API-Football v3 + LocalStorage Cache
   ================================================ */

const API = (() => {
  const memCache = {};

  const CACHE_KEYS = {
    TODAY:    'rs_api_today',
    TODAY_TS: 'rs_api_today_ts',
    USAGE:    'rs_api_usage',
    LAST_ERR: 'rs_api_last_err',
  };

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

  function trackRequest() {
    const today = new Date().toDateString();
    const u = lsGet(CACHE_KEYS.USAGE) || { date: today, count: 0 };
    if (u.date !== today) { u.date = today; u.count = 0; }
    u.count++;
    lsSet(CACHE_KEYS.USAGE, u);
    console.log(`📊 API: ${u.count}/100 istek bugün`);
    return u.count;
  }

  function getDailyUsage() {
    const today = new Date().toDateString();
    const u = lsGet(CACHE_KEYS.USAGE) || { date: today, count: 0 };
    return u.date === today ? u.count : 0;
  }

  // ── HTTP İSTEK ───────────────────────────────
  async function request(endpoint, params) {
    const url = new URL(API_BASE_URL + endpoint);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const cacheKey = url.toString();

    // Bellek cache
    if (memCache[cacheKey] && Date.now() - memCache[cacheKey].ts < 60000) {
      return memCache[cacheKey].data;
    }

    if (!API_KEY) {
      console.error('❌ API_KEY bulunamadı!');
      lsSet(CACHE_KEYS.LAST_ERR, 'API key eksik');
      return null;
    }

    trackRequest();

    try {
      const resp = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-apisports-key': API_KEY,
          'x-rapidapi-key':  API_KEY,       // RapidAPI fallback
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
      });

      if (resp.status === 429) {
        const err = 'Günlük limit doldu (429)';
        lsSet(CACHE_KEYS.LAST_ERR, err);
        console.warn('⚠️', err);
        return null;
      }
      if (resp.status === 401 || resp.status === 403) {
        const err = 'API key geçersiz (' + resp.status + ')';
        lsSet(CACHE_KEYS.LAST_ERR, err);
        console.warn('⚠️', err);
        return null;
      }
      if (!resp.ok) {
        const err = 'HTTP hata: ' + resp.status;
        lsSet(CACHE_KEYS.LAST_ERR, err);
        console.warn('⚠️', err);
        return null;
      }

      const json = await resp.json();

      if (json.errors && Object.keys(json.errors).length > 0) {
        const errMsg = Object.values(json.errors).join(', ');
        lsSet(CACHE_KEYS.LAST_ERR, errMsg);
        console.warn('⚠️ API hatası:', errMsg);
        return null;
      }

      // Başarılı, cache'e kaydet
      lsSet(CACHE_KEYS.LAST_ERR, null);
      const data = json.response || [];
      memCache[cacheKey] = { data, ts: Date.now() };
      return data;

    } catch (e) {
      const err = e.message || 'Bilinmeyen hata';
      lsSet(CACHE_KEYS.LAST_ERR, err);
      console.warn('❌ Fetch hatası:', err);
      return null;
    }
  }

  function currentSeason() {
    const now = new Date();
    return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  }

  function todayStr() {
    // Istanbul timezone'da bugünün tarihi
    const now = new Date();
    const istanbul = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const y = istanbul.getFullYear();
    const m = String(istanbul.getMonth() + 1).padStart(2, '0');
    const d = String(istanbul.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ── BUGÜNÜN MAÇLARI ──────────────────────────
  async function getTodayFixtures(forceRefresh) {
    const today = todayStr();
    const cachedTs = lsGet(CACHE_KEYS.TODAY_TS);

    // Cache geçerli mi?
    if (!forceRefresh && cachedTs && cachedTs.date === today) {
      const cached = lsGet(CACHE_KEYS.TODAY);
      if (cached && cached.length > 0) {
        const hasLive = cached.some(f => {
          const s = f.fixture && f.fixture.status && f.fixture.status.short;
          return ['1H','HT','2H','ET','BT','P','LIVE'].includes(s);
        });
        const maxAge = hasLive ? 60*1000 : 15*60*1000;
        if (Date.now() - cachedTs.ts < maxAge) {
          console.log(`✅ Cache'den: ${cached.length} maç (${Math.round((Date.now()-cachedTs.ts)/1000)}sn önce)`);
          return cached;
        }
      }
    }

    console.log(`🌐 API'den çekiliyor: ${today} tarihli maçlar...`);

    // Tüm ligler için paralel istek
    const results = await Promise.allSettled(
      LEAGUE_CONFIG.map(lc => request('/fixtures', {
        league:   lc.id,
        season:   currentSeason(),
        date:     today,
        timezone: 'Europe/Istanbul',
      }))
    );

    const fixtures = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        console.log(`  ${LEAGUE_CONFIG[i].name}: ${r.value.length} maç`);
        fixtures.push(...r.value);
      }
    });

    console.log(`📋 Toplam: ${fixtures.length} maç bulundu`);

    if (fixtures.length > 0) {
      lsSet(CACHE_KEYS.TODAY, fixtures);
      lsSet(CACHE_KEYS.TODAY_TS, { date: today, ts: Date.now() });
    }

    return fixtures;
  }

  // ── TAKIM FİKSTÜRÜ ───────────────────────────
  async function getTeamFixtures(teamId, season) {
    return await request('/fixtures', {
      team:     teamId,
      season:   season || currentSeason(),
      timezone: 'Europe/Istanbul',
    });
  }

  // ── MAÇ DETAYLARI ────────────────────────────
  async function getFixtureStats(fixtureId) {
    const d = await request('/fixtures/statistics', { fixture: fixtureId });
    return (d && d.length) ? mapStats(d) : [];
  }

  async function getFixtureLineups(fixtureId) {
    const d = await request('/fixtures/lineups', { fixture: fixtureId });
    return (d && d.length) ? mapLineup(d) : null;
  }

  async function getFixtureEvents(fixtureId, homeTeamId) {
    const d = await request('/fixtures/events', { fixture: fixtureId });
    return (d && d.length) ? mapEvents(d, homeTeamId) : [];
  }

  async function getH2H(teamA, teamB) {
    const d = await request('/fixtures/headtohead', { h2h: `${teamA}-${teamB}`, last: 10 });
    return d ? mapH2H(d, String(teamA), String(teamB)) : { wins:{home:0,draw:0,away:0}, matches:[] };
  }

  async function getStandings(leagueId) {
    return await request('/standings', { league: leagueId, season: currentSeason() });
  }

  // ── MAPPERS ──────────────────────────────────
  function mapEvents(evs, homeTeamId) {
    return evs.map(e => ({
      min:    e.time.elapsed,
      type:   e.type === 'Goal'  ? 'goal'
            : e.type === 'Card'  ? (e.detail === 'Red Card' ? 'red' : 'yellow')
            : e.type === 'subst' ? 'sub'
            : e.type.toLowerCase(),
      side:   String(e.team && e.team.id) === String(homeTeamId) ? 'home' : 'away',
      player: (e.player && e.player.name) || '?',
      assist: (e.assist && e.assist.name) || '',
      detail: e.detail || '',
    }));
  }

  function mapStats(apiStats) {
    if (!apiStats || apiStats.length < 2) return [];
    const home = apiStats[0].statistics || [];
    const away = apiStats[1].statistics || [];
    const LABELS = {
      'Ball Possession':  'Topa Sahip Olma',
      'Total Shots':      'Şut',
      'Shots on Goal':    'İsabetli Şut',
      'Shots off Goal':   'İsabetsiz Şut',
      'Corner Kicks':     'Korner',
      'Fouls':            'Faul',
      'Offsides':         'Ofsayt',
      'Yellow Cards':     'Sarı Kart',
      'Red Cards':        'Kırmızı Kart',
      'Goalkeeper Saves': 'Kurtarış',
      'Total passes':     'Pas',
    };
    return home
      .filter(s => LABELS[s.type])
      .map(s => {
        const aw = away.find(x => x.type === s.type);
        let hv = s.value || 0, av = (aw && aw.value) || 0;
        if (typeof hv === 'string') hv = parseInt(hv) || 0;
        if (typeof av === 'string') av = parseInt(av) || 0;
        return { label: LABELS[s.type], home: hv, away: av };
      });
  }

  function mapLineup(ls) {
    if (!ls || ls.length < 2) return null;
    const mp = list => (list||[]).map(p => ({
      num: (p.player && p.player.number) || '',
      name: (p.player && p.player.name) || '',
      pos: (p.player && p.player.pos) || '',
    }));
    return {
      home: { formation: ls[0].formation||'', starting: mp(ls[0].startXI), subs: mp(ls[0].substitutes), coach: (ls[0].coach && ls[0].coach.name)||'' },
      away: { formation: ls[1].formation||'', starting: mp(ls[1].startXI), subs: mp(ls[1].substitutes), coach: (ls[1].coach && ls[1].coach.name)||'' },
    };
  }

  function mapH2H(fixtures, homeId, awayId) {
    let hw=0, d=0, aw=0;
    const matches = fixtures.slice(0,10).map(f => {
      const hg = (f.goals && f.goals.home) || 0, ag = (f.goals && f.goals.away) || 0;
      const first = String(f.teams.home.id) === String(homeId);
      const oh = first?hg:ag, oa = first?ag:hg;
      if (oh>oa) hw++; else if (oh<oa) aw++; else d++;
      const dt = new Date(f.fixture.date);
      return { date: dt.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'}), homeScore:oh, awayScore:oa };
    });
    return { wins:{home:hw,draw:d,away:aw}, matches };
  }

  function mapTeamFixture(f, teamId) {
    const fix=f.fixture, teams=f.teams, goals=f.goals, lg=f.league;
    const lc=(typeof LEAGUE_MAP!=='undefined' && LEAGUE_MAP[parseInt(lg.id)])||{name:lg.name,flag:'🏆'};
    const isHome=String(teams.home.id)===String(teamId);
    const sh=fix.status.short;
    const LIVE=['1H','HT','2H','ET','BT','P','LIVE'], DONE=['FT','AET','PEN'];
    const status=LIVE.includes(sh)?'live':DONE.includes(sh)?'finished':'upcoming';
    const opp=isHome?teams.away:teams.home;
    const kt=new Date(fix.date);
    return {
      id:String(fix.id), fixtureId:fix.id, isHome,
      oppId:String(opp.id), oppName:opp.name, oppLogo:opp.logo||'',
      myGoals:isHome?(goals.home!=null?goals.home:null):(goals.away!=null?goals.away:null),
      oppGoals:isHome?(goals.away!=null?goals.away:null):(goals.home!=null?goals.home:null),
      status, minute:fix.status.elapsed,
      leagueName:lc.name||lg.name, leagueFlag:lc.flag||'🏆',
      date:kt.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'}),
      time:kt.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}),
      matchweek:lg.round||'',
    };
  }

  function getTeamColor(tid) {
    const tc=typeof TEAM_COLORS!=='undefined'&&TEAM_COLORS[parseInt(tid)];
    if(tc) return tc.color;
    const tp=typeof TEAM_PROFILES!=='undefined'&&TEAM_PROFILES[String(tid)];
    return tp?tp.color:'#1e2740';
  }
  function getTeamColor2(tid) {
    const tc=typeof TEAM_COLORS!=='undefined'&&TEAM_COLORS[parseInt(tid)];
    if(tc) return tc.color2;
    const tp=typeof TEAM_PROFILES!=='undefined'&&TEAM_PROFILES[String(tid)];
    return tp?(tp.color2||'rgba(255,255,255,0.15)'):'rgba(255,255,255,0.15)';
  }
  function getTeamShort(tid, name) {
    const tc=typeof TEAM_COLORS!=='undefined'&&TEAM_COLORS[parseInt(tid)];
    if(tc) return tc.short;
    const tp=typeof TEAM_PROFILES!=='undefined'&&TEAM_PROFILES[String(tid)];
    if(tp) return tp.short;
    return (name||'UNK').replace(/\s+/g,'').substring(0,3).toUpperCase();
  }

  return {
    getTodayFixtures, getTeamFixtures,
    getFixtureStats, getFixtureLineups, getFixtureEvents,
    getH2H, getStandings,
    mapTeamFixture, mapEvents, mapStats, mapLineup, mapH2H,
    getTeamColor, getTeamColor2, getTeamShort,
    getDailyUsage, currentSeason,
    getLastError: () => lsGet(CACHE_KEYS.LAST_ERR),
  };
})();
