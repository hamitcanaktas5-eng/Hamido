/* ================================================
   RoxyScore — config.js  v0.4
   API-Football anahtarı + Firebase yapılandırması
   ================================================ */

/* ── API-FOOTBALL ─────────────────────────────── */
// API_KEY → keys.js dosyasından geliyor (.gitignore'a eklenmiş)
// keys.js bulunamazsa API devre dışı, mock data çalışmaya devam eder
const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_HEADERS  = {
  'x-apisports-key': typeof API_KEY !== 'undefined' ? API_KEY : '',
};

/* ── LİG YAPILANDIRMASI ───────────────────────── */
// Toplam 8 lig: 5 Büyük Avrupa + 3 Türk
const LEAGUE_CONFIG = [
  { id: 203, name: 'Süper Lig',   country: 'Türkiye',  flag: '🇹🇷', priority: 1 },
  { id: 204, name: 'TFF 1. Lig',  country: 'Türkiye',  flag: '🇹🇷', priority: 2 },
  { id: 205, name: 'TFF 2. Lig',  country: 'Türkiye',  flag: '🇹🇷', priority: 3 },
  { id: 39,  name: 'Premier League', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', priority: 4 },
  { id: 140, name: 'La Liga',     country: 'İspanya',  flag: '🇪🇸', priority: 5 },
  { id: 78,  name: 'Bundesliga',  country: 'Almanya',  flag: '🇩🇪', priority: 6 },
  { id: 135, name: 'Serie A',     country: 'İtalya',   flag: '🇮🇹', priority: 7 },
  { id: 61,  name: 'Ligue 1',     country: 'Fransa',   flag: '🇫🇷', priority: 8 },
];

// League ID → config lookup
const LEAGUE_MAP = {};
LEAGUE_CONFIG.forEach(l => { LEAGUE_MAP[l.id] = l; });

// API'ye göndermek için ID listesi
const LEAGUE_IDS = LEAGUE_CONFIG.map(l => l.id).join('-');

/* ── FİREBASE (Web SDK v9 compat) ────────────── */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCfVS3pxq1C8xyMfbRMHBhH2QJ-dpfNn4Q",
  authDomain:        "roxyscore-app.firebaseapp.com",
  projectId:         "roxyscore-app",
  storageBucket:     "roxyscore-app.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef",
};

/* ── RENK PALETİ (API ID'ye göre) ─────────────
   API-Football takım ID'leri ile renk eşleşmesi.
   TEAM_PROFILES'da tanımlı değilse buradan bakar.
─────────────────────────────────────────────── */
const TEAM_COLORS = {
  // Süper Lig
  645:  { short:'GS',  color:'#e8002d', color2:'#FFD700' }, // Galatasaray
  611:  { short:'FB',  color:'#002f6c', color2:'#FFED00' }, // Fenerbahçe
  609:  { short:'BJK', color:'#1a1a1a', color2:'#CCCCCC' }, // Beşiktaş
  614:  { short:'TS',  color:'#8B1A1A', color2:'#1C4F9C' }, // Trabzonspor
  2762: { short:'İBB', color:'#0066CC', color2:'#FF6600' }, // Başakşehir
  603:  { short:'ANK', color:'#000080', color2:'#FFD700' }, // Ankaragücü
  601:  { short:'KSP', color:'#C0392B', color2:'#FFFFFF' }, // Kasımpaşa
  7503: { short:'SVS', color:'#8B0000', color2:'#FFA500' }, // Sivasspor
  607:  { short:'ADA', color:'#00529B', color2:'#E30A17' }, // Adana Demirspor
  6890: { short:'SAM', color:'#E30A17', color2:'#000000' }, // Samsunspor
  // Premier League
  50:   { short:'MCI', color:'#6CABDD', color2:'#1c2c5b' }, // Man City
  42:   { short:'ARS', color:'#EF0107', color2:'#063672' }, // Arsenal
  40:   { short:'LIV', color:'#C8102E', color2:'#00B2A9' }, // Liverpool
  49:   { short:'CHE', color:'#034694', color2:'#DBA111' }, // Chelsea
  33:   { short:'MNU', color:'#DA020E', color2:'#FFE500' }, // Man United
  47:   { short:'TOT', color:'#132257', color2:'#FFFFFF' }, // Tottenham
  34:   { short:'NEW', color:'#241F20', color2:'#00A650' }, // Newcastle
  66:   { short:'AVL', color:'#95BFE5', color2:'#670E36' }, // Aston Villa
  // La Liga
  541:  { short:'RMA', color:'#FEBE10', color2:'#1a1a2e' }, // Real Madrid
  529:  { short:'BAR', color:'#004D98', color2:'#A50044' }, // Barcelona
  530:  { short:'ATM', color:'#CB3524', color2:'#273B7D' }, // Atletico
  532:  { short:'SEV', color:'#C8102E', color2:'#F5F5F5' }, // Sevilla
  548:  { short:'REA', color:'#1A6B3A', color2:'#FFFFFF' }, // Real Betis
  // Bundesliga
  157:  { short:'FCB', color:'#DC052D', color2:'#0066B2' }, // Bayern
  165:  { short:'BVB', color:'#FDE100', color2:'#000000' }, // Dortmund
  168:  { short:'BSC', color:'#005CA9', color2:'#D4021D' }, // Leverkusen
  // Serie A
  489:  { short:'MIL', color:'#000000', color2:'#005AC0' }, // Milan
  505:  { short:'INT', color:'#0070BB', color2:'#000000' }, // Inter
  492:  { short:'NAP', color:'#0067B3', color2:'#FFFFFF' }, // Napoli
  496:  { short:'JUV', color:'#000000', color2:'#FFFFFF' }, // Juventus
  // Ligue 1
  85:   { short:'PSG', color:'#003F7F', color2:'#D80027' }, // PSG
  80:   { short:'LYO', color:'#1C318E', color2:'#FFFFFF' }, // Lyon
};
