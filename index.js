/* ================================================
   RoxyScore — index.js  v0.6
   Tamamen localStorage tabanlı auth.
   Firebase opsiyonel — config.js'e eklenince aktif olur.
   ================================================ */

// Zaten giriş yapılmışsa direkt ana sayfaya gönder
if (AS.getSession()) {
  window.location.replace('home.html');
}

// ── YARDIMCILAR ───────────────────────────────────
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function showErr(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
  el.style.color = '#ff3d57';
  el.style.fontSize = '11px';
  el.style.marginTop = '4px';
  var inp = el.closest('.fg') && el.closest('.fg').querySelector('input');
  if (inp) {
    inp.style.borderColor = msg ? '#ff3d57' : '';
  }
}

function clearAllErrors() {
  ['login-email-err','login-pass-err','reg-email-err','reg-pass-err','reg-confirm-err','forgot-err'].forEach(function(id) {
    showErr(id, '');
  });
}

function setLoading(btnId, on) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = on;
  var bt = btn.querySelector('.bt');
  var bl = btn.querySelector('.bl');
  if (bt) bt.style.display = on ? 'none' : '';
  if (bl) bl.style.display = on ? 'flex' : 'none';
}

function shake() {
  var c = document.querySelector('.auth-card');
  if (!c) return;
  c.style.animation = 'none';
  c.offsetWidth; // reflow
  c.style.animation = '';
  c.classList.remove('shake');
  c.offsetWidth;
  c.classList.add('shake');
}

// ── TAB GEÇİŞİ ───────────────────────────────────
function switchTab(name) {
  // Tab butonları
  document.querySelectorAll('.tabs .tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === name);
  });
  // Formlar
  document.querySelectorAll('.auth-form').forEach(function(f) {
    f.classList.remove('active');
    f.style.display = 'none';
  });
  var target = document.getElementById('form-' + name);
  if (target) {
    target.classList.add('active');
    target.style.display = 'flex';
  }
  clearAllErrors();
}

// Tüm data-tab butonları
document.querySelectorAll('[data-tab]').forEach(function(el) {
  el.addEventListener('click', function() {
    switchTab(el.dataset.tab);
  });
});

// İlk formu göster
switchTab('login');

// ── ŞİFRE GÖSTER/GİZLE ───────────────────────────
document.querySelectorAll('.eye').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var inp = document.getElementById(btn.dataset.t);
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  });
});

// ── ŞİFRE GÜCÜ ───────────────────────────────────
var regPassInput = document.getElementById('reg-password');
if (regPassInput) {
  regPassInput.addEventListener('input', function() {
    var v = this.value;
    var score = 0;
    if (v.length >= 6)              score++;
    if (v.length >= 10)             score++;
    if (/[A-Z]/.test(v))            score++;
    if (/[0-9]/.test(v))            score++;
    if (/[^A-Za-z0-9]/.test(v))     score++;
    var lvls = [
      { pct:'0%',   bg:'#2c3550', lbl:'' },
      { pct:'25%',  bg:'#ff3d57', lbl:'Çok Zayıf' },
      { pct:'50%',  bg:'#ff9800', lbl:'Zayıf' },
      { pct:'75%',  bg:'#ffd600', lbl:'Orta' },
      { pct:'90%',  bg:'#00bcd4', lbl:'İyi' },
      { pct:'100%', bg:'#00e676', lbl:'Güçlü' },
    ];
    var lvl = v.length === 0 ? lvls[0] : lvls[Math.min(score, 5)];
    var sf = document.getElementById('sf');
    var sl = document.getElementById('sl');
    if (sf) { sf.style.width = lvl.pct; sf.style.background = lvl.bg; }
    if (sl) { sl.textContent = lvl.lbl; sl.style.color = lvl.bg; }
  });
}

// ── GİRİŞ ─────────────────────────────────────────
document.getElementById('form-login').addEventListener('submit', function(e) {
  e.preventDefault();
  clearAllErrors();

  var email = document.getElementById('login-email').value.trim().toLowerCase();
  var pass  = document.getElementById('login-password').value;

  // Validasyon
  var ok = true;
  if (!email)           { showErr('login-email-err', 'E-posta adresi gerekli'); ok = false; }
  else if (!isEmail(email)) { showErr('login-email-err', 'Geçerli bir e-posta girin'); ok = false; }
  if (!pass)            { showErr('login-pass-err', 'Şifre gerekli'); ok = false; }
  if (!ok) { shake(); return; }

  setLoading('login-btn', true);

  // Kullanıcıyı localStorage'da ara
  var users = AS.getUsers();

  if (!users[email]) {
    showErr('login-email-err', 'Bu e-posta ile kayıt bulunamadı');
    shake();
    setLoading('login-btn', false);
    return;
  }

  if (users[email].password !== pass) {
    showErr('login-pass-err', 'Şifre yanlış');
    shake();
    setLoading('login-btn', false);
    return;
  }

  // Başarılı giriş
  AS.setSession(email, null);
  window.location.replace('home.html');
});

// ── KAYIT ──────────────────────────────────────────
document.getElementById('form-register').addEventListener('submit', function(e) {
  e.preventDefault();
  clearAllErrors();

  var email   = document.getElementById('reg-email').value.trim().toLowerCase();
  var pass    = document.getElementById('reg-password').value;
  var confirm = document.getElementById('reg-confirm').value;

  // Validasyon
  var ok = true;
  if (!email)              { showErr('reg-email-err', 'E-posta adresi gerekli'); ok = false; }
  else if (!isEmail(email)){ showErr('reg-email-err', 'Geçerli bir e-posta girin'); ok = false; }
  if (!pass)               { showErr('reg-pass-err', 'Şifre gerekli'); ok = false; }
  else if (pass.length < 6){ showErr('reg-pass-err', 'En az 6 karakter olmalı'); ok = false; }
  if (!confirm)            { showErr('reg-confirm-err', 'Şifre tekrarı gerekli'); ok = false; }
  else if (pass !== confirm){ showErr('reg-confirm-err', 'Şifreler eşleşmiyor'); ok = false; }
  if (!ok) { shake(); return; }

  setLoading('reg-btn', true);

  var users = AS.getUsers();

  if (users[email]) {
    showErr('reg-email-err', 'Bu e-posta zaten kayıtlı');
    shake();
    setLoading('reg-btn', false);
    return;
  }

  // Kullanıcıyı kaydet
  users[email] = { email: email, password: pass, createdAt: Date.now() };
  AS.saveUsers(users);

  // Direkt giriş yap
  AS.setSession(email, null);
  window.location.replace('home.html');
});

// ── ŞİFRE SIFIRLA ─────────────────────────────────
document.getElementById('form-forgot').addEventListener('submit', function(e) {
  e.preventDefault();
  clearAllErrors();

  var email = document.getElementById('forgot-email').value.trim().toLowerCase();

  if (!email)           { showErr('forgot-err', 'E-posta adresi gerekli'); shake(); return; }
  if (!isEmail(email))  { showErr('forgot-err', 'Geçerli bir e-posta girin'); shake(); return; }

  setLoading('forgot-btn', true);

  var users = AS.getUsers();

  // Şifreyi sıfırla (localStorage versiyonu: şifreyi göster)
  setTimeout(function() {
    setLoading('forgot-btn', false);

    if (!users[email]) {
      showErr('forgot-err', 'Bu e-posta ile kayıt bulunamadı');
      shake();
      return;
    }

    // Şifreyi göster — localStorage'da gerçek e-posta gönderilemez
    showModal(
      'Şifren Bulundu',
      'Kayıtlı şifren: ' + users[email].password + '\n\nBu bilgiyi not al.',
      function() { switchTab('login'); document.getElementById('login-email').value = email; }
    );
  }, 600);
});

// ── MODAL ─────────────────────────────────────────
function showModal(title, desc, onOk) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-desc').textContent  = desc;
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('modal').classList.remove('hidden');

  var btn = document.getElementById('modal-ok');
  var clone = btn.cloneNode(true);
  btn.parentNode.replaceChild(clone, btn);
  document.getElementById('modal-ok').addEventListener('click', function() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').style.display = 'none';
    if (onOk) onOk();
  });
}
