/* ================================================
   RoxyScore — support.js  v0.3
   Firebase'e geçişte Firestore ile çalışacak
   ================================================ */
AS.requireAuth();

const session   = AS.getSession();
const userEmail = session?.email || '';
let currentTicketId = null;
let ticketFilter    = 'all';

// ── VIEW YÖNETİMİ ─────────────────────────────────
function show(viewId) {
  ['view-list','view-new','view-chat'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== viewId);
  });
}

// ── LİSTE ─────────────────────────────────────────
function renderList() {
  show('view-list');
  const all      = AS.getTickets();
  const filtered = ticketFilter === 'all' ? all : all.filter(t => t.status === ticketFilter);
  const list     = document.getElementById('ticket-list');

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="e-icon">🎫</div>
      <h3>${ticketFilter === 'all' ? 'Henüz Talep Yok' : 'Bu Kategoride Talep Yok'}</h3>
      <p>Yeni bir destek talebi oluşturmak için sağ üstteki "Yeni" butonuna bas.</p>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(t => {
    const lastMsg = t.messages[t.messages.length - 1];
    const preview = (lastMsg?.text || '').substring(0, 56) + ((lastMsg?.text?.length || 0) > 56 ? '…' : '');
    return `<div class="ticket-item ${t.status}" data-id="${t.id}">
      <div class="ticket-dot ${t.status}"></div>
      <div class="ticket-body">
        <div class="ticket-id">${t.id}</div>
        <div class="ticket-subject">${t.subject}</div>
        <div class="ticket-preview">${preview}</div>
        <div class="ticket-meta">
          <span class="ticket-date">${AS.formatDate(t.createdAt)}</span>
          <span class="ticket-badge ${t.status === 'open' ? 'badge-open' : 'badge-closed'}">${t.status === 'open' ? 'AÇIK' : 'KAPALI'}</span>
        </div>
      </div>
      <svg class="ticket-arrow" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </div>`;
  }).join('');

  list.querySelectorAll('.ticket-item').forEach(item => {
    item.addEventListener('click', () => openChat(item.dataset.id));
  });
}

// ── FİLTRELER ─────────────────────────────────────
document.querySelectorAll('.tfilter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tfilter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ticketFilter = btn.dataset.f;
    renderList();
  });
});

// ── GERİ ──────────────────────────────────────────
document.getElementById('back-list').addEventListener('click', () => goBack('home.html'));

// ── YENİ TALEPç ────────────────────────────────────
document.getElementById('open-new-btn').addEventListener('click', () => {
  show('view-new');
  document.getElementById('ticket-subject').value = '';
  document.getElementById('ticket-body').value    = '';
  clearFe('subject-err'); clearFe('body-err');
});

document.getElementById('back-new').addEventListener('click', renderList);

document.getElementById('submit-ticket').addEventListener('click', async () => {
  const subject = document.getElementById('ticket-subject').value.trim();
  const body    = document.getElementById('ticket-body').value.trim();
  let valid = true;
  clearFe('subject-err'); clearFe('body-err');

  if (!subject)        { showFe('subject-err', 'Konu gerekli'); valid = false; }
  if (!body || body.length < 10) { showFe('body-err', 'En az 10 karakter girin'); valid = false; }
  if (!valid) return;

  const btn = document.getElementById('submit-ticket');
  btn.querySelector('.bt').classList.add('hidden');
  btn.querySelector('.bl').classList.remove('hidden');
  btn.disabled = true;

  await sleep(800);

  // Firebase'e geçişte: Firestore.collection('tickets').add(...)
  const ticket = AS.createTicket(subject, body, userEmail);

  // OTOMATİK CEVAP
  setTimeout(() => {
    AS.addMessage(ticket.id,
      'Merhabalar, talebinizi aldık. En kısa sürede iletişime geçilecektir.',
      'support'
    );
  }, 2500);

  btn.querySelector('.bt').classList.remove('hidden');
  btn.querySelector('.bl').classList.add('hidden');
  btn.disabled = false;

  openChat(ticket.id);
});

// ── CHAT ──────────────────────────────────────────
function openChat(ticketId) {
  currentTicketId = ticketId;
  const ticket = AS.getTickets().find(t => t.id === ticketId);
  if (!ticket) return;

  show('view-chat');
  const closed = ticket.status === 'closed';

  document.getElementById('chat-title').textContent = ticket.subject;
  const badge = document.getElementById('chat-badge');
  badge.textContent = closed ? 'Kapalı' : 'Açık';
  badge.className = 'chat-badge ' + ticket.status;

  document.getElementById('chat-bar').classList.toggle('hidden', closed);
  document.getElementById('chat-closed-bar').classList.toggle('hidden', !closed);
  document.getElementById('close-ticket-btn').classList.toggle('hidden', closed);

  renderMessages(ticket);
}

function renderMessages(ticket) {
  const container = document.getElementById('chat-messages');
  let html = ''; let lastDate = '';

  ticket.messages.forEach(msg => {
    const date = new Date(msg.ts).toLocaleDateString('tr-TR', { day:'numeric', month:'long' });
    if (date !== lastDate) {
      html += `<div class="chat-date-divider"><span>${date}</span></div>`;
      lastDate = date;
    }
    const time    = new Date(msg.ts).toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
    const isUser  = msg.from === 'user';
    html += `<div class="msg ${msg.from}">
      ${!isUser ? '<div class="msg-sender">Destek Ekibi</div>' : ''}
      <div class="msg-bubble">${msg.text}</div>
      <div class="msg-time">${time}</div>
    </div>`;
  });

  container.innerHTML = html;
  setTimeout(() => container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }), 50);
}

document.getElementById('back-chat').addEventListener('click', () => {
  currentTicketId = null;
  renderList();
});

document.getElementById('close-ticket-btn').addEventListener('click', () => {
  if (!currentTicketId) return;
  if (!confirm('Talebi kapatmak istediğinizden emin misiniz?')) return;
  AS.closeTicket(currentTicketId);
  openChat(currentTicketId);
});

// ── MESAJ GÖNDER ──────────────────────────────────
const chatInput = document.getElementById('chat-input');
const chatSend  = document.getElementById('chat-send');

function sendMsg() {
  const text = chatInput.value.trim();
  if (!text || !currentTicketId) return;
  const t = AS.addMessage(currentTicketId, text, 'user');
  chatInput.value = '';
  chatInput.style.height = 'auto';
  renderMessages(t);

  // Firebase'e geçişte: buradaki delay kalkacak, Firestore onSnapshot ile realtime gelecek
  setTimeout(() => {
    const t2 = AS.addMessage(currentTicketId,
      'Mesajınız ekibimize iletildi. En kısa sürede geri dönüş yapılacaktır.',
      'support'
    );
    if (currentTicketId) renderMessages(t2);
  }, 1800 + Math.random() * 1200);
}

chatSend.addEventListener('click', sendMsg);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
});
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
});

// ── HELPERS ───────────────────────────────────────
function showFe(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  const inp = el.closest('.fg')?.querySelector('input,textarea');
  if (inp) inp.classList.add('error');
}
function clearFe(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('show');
  el.closest?.('.fg')?.querySelector('input,textarea')?.classList.remove('error');
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── INIT ──────────────────────────────────────────
renderList();
