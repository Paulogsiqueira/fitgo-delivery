import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, WHATSAPP_LOJA, LOJA, isConfigured } from './config.js';

const el = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const round2 = (n) => Math.round(n * 100) / 100;
const supa = isConfigured() ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

el('year').textContent = new Date().getFullYear();
function toast(msg, err = false) { const t = el('toast'); t.textContent = msg; t.classList.toggle('err', err); t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 3400); }

// ===== estado =====
let menu = [];
let cart = JSON.parse(localStorage.getItem('fitgo_cart') || '[]');
let frete = null;
let session = null;
const saveCart = () => localStorage.setItem('fitgo_cart', JSON.stringify(cart));

// ===== sessão / auth =====
function setAuth(s) {
  session = s;
  const logged = !!s;
  el('authBtn').hidden = logged;
  el('userChip').hidden = !logged;
  el('navPedidos').hidden = !logged;
  if (logged) el('userEmail').textContent = s.user.email;
}
if (supa) {
  supa.auth.getSession().then(({ data }) => setAuth(data.session));
  supa.auth.onAuthStateChange((_e, s) => setAuth(s));
}
el('logoutBtn').addEventListener('click', () => supa.auth.signOut());

// modal auth
let authTab = 'login';
function openAuth() { el('authError').textContent = ''; el('authModal').hidden = false; }
function closeAuth() { el('authModal').hidden = true; }
el('authBtn').addEventListener('click', openAuth);
document.querySelectorAll('[data-close-auth]').forEach((b) => b.addEventListener('click', closeAuth));
document.querySelectorAll('.auth-tab').forEach((t) => t.addEventListener('click', () => {
  authTab = t.dataset.tab;
  document.querySelectorAll('.auth-tab').forEach((x) => x.classList.toggle('active', x === t));
  el('nomeField').hidden = authTab !== 'signup';
  el('authSubmit').textContent = authTab === 'signup' ? 'Criar conta' : 'Entrar';
}));
el('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  el('authError').textContent = '';
  el('authSubmit').disabled = true;
  const email = el('auEmail').value.trim(), senha = el('auSenha').value;
  try {
    if (authTab === 'signup') {
      const { data, error } = await supa.auth.signUp({ email, password: senha, options: { data: { nome: el('auNome').value.trim() } } });
      if (error) throw error;
      if (data.session) { closeAuth(); toast('Conta criada! Você já está logado. 🎉'); }
      else { el('authError').textContent = 'Conta criada! Confirme pelo e-mail para entrar (ou desative a confirmação no Supabase).'; }
    } else {
      const { error } = await supa.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      closeAuth(); toast('Bem-vindo de volta! 👋');
    }
  } catch (err) {
    el('authError').textContent = err.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : (err.message || 'Erro.');
  } finally { el('authSubmit').disabled = false; }
});

// ===== cardápio =====
async function loadMenu() {
  const grid = el('menuGrid');
  if (!supa) { grid.innerHTML = '<div class="state error">⚙️ Configure o Supabase em config.js.</div>'; return; }
  const { data, error } = await supa.from('menu_items').select('*').eq('ativo', true).order('ordem');
  if (error) { grid.innerHTML = `<div class="state error">Erro: ${esc(error.message)}. Rodou o SETUP.sql?</div>`; return; }
  menu = data || [];
  const cats = ['Todos', ...[...new Set(menu.map((m) => m.categoria))]];
  el('catTabs').innerHTML = cats.map((c, i) => `<button class="cat-tab ${i === 0 ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  el('catTabs').querySelectorAll('.cat-tab').forEach((t) => t.addEventListener('click', () => {
    el('catTabs').querySelectorAll('.cat-tab').forEach((x) => x.classList.toggle('active', x === t));
    renderMenu(t.dataset.cat);
  }));
  renderMenu('Todos');
}
function renderMenu(cat) {
  const grid = el('menuGrid');
  const list = cat === 'Todos' ? menu : menu.filter((m) => m.categoria === cat);
  grid.innerHTML = list.map((m) => `
    <article class="dish-card">
      <img class="dc-img" src="${esc(m.foto)}" alt="${esc(m.nome)}" loading="lazy" />
      <div class="dc-body">
        <span class="dc-cat">${esc(m.categoria)}</span>
        <h3>${esc(m.nome)}</h3>
        <p class="dc-desc">${esc(m.descricao || '')}</p>
        ${m.kcal ? `<span class="dc-kcal">🔥 ${m.kcal} kcal</span>` : ''}
        <div class="dc-foot">
          <span class="dc-price">${brl(m.preco)}</span>
          <button class="dc-add" data-add="${m.id}">Adicionar</button>
        </div>
      </div>
    </article>`).join('');
  grid.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => addItem(b.dataset.add)));
}

// ===== carrinho =====
function addItem(id) {
  const item = menu.find((m) => String(m.id) === String(id));
  if (!item) return;
  const line = cart.find((c) => c.id === item.id);
  if (line) line.qtd++;
  else cart.push({ id: item.id, nome: item.nome, preco: Number(item.preco), qtd: 1 });
  saveCart(); renderCart(); toast(`${item.nome} adicionado 🛒`);
}
function changeQty(id, delta) {
  const line = cart.find((c) => c.id === id);
  if (!line) return;
  line.qtd += delta;
  if (line.qtd <= 0) cart = cart.filter((c) => c.id !== id);
  saveCart(); renderCart();
}
const subtotal = () => cart.reduce((s, c) => s + c.preco * c.qtd, 0);
const cartCount = () => cart.reduce((s, c) => s + c.qtd, 0);

function renderCart() {
  el('cartCount').textContent = cartCount();
  const box = el('cartItems');
  if (!cart.length) {
    box.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.<br>Adicione pratos do cardápio 🥗</p>';
  } else {
    box.innerHTML = cart.map((c) => `
      <div class="ci">
        <div><div class="ci-name">${esc(c.nome)}</div><div class="ci-price">${brl(c.preco)}</div></div>
        <div class="ci-qty">
          <button data-dec="${c.id}">−</button><span>${c.qtd}</span><button data-inc="${c.id}">+</button>
        </div>
        <div class="ci-sub" style="grid-column:1/-1;text-align:right">${brl(c.preco * c.qtd)}</div>
      </div>`).join('');
    box.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => changeQty(b.dataset.inc, 1)));
    box.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => changeQty(b.dataset.dec, -1)));
  }
  renderTotals();
}
function renderTotals() {
  const sub = subtotal();
  const tot = sub + (frete || 0);
  el('cartTotals').innerHTML = `
    <div class="tot-row"><span>Subtotal</span><span>${brl(sub)}</span></div>
    <div class="tot-row"><span>Frete</span><span>${frete == null ? '—' : brl(frete)}</span></div>
    <div class="tot-row grand"><span>Total</span><span>${brl(tot)}</span></div>`;
  const ready = cart.length > 0 && frete != null;
  el('checkoutBtn').disabled = !ready;
  el('cartHint').textContent = !cart.length ? '' : (frete == null ? 'Calcule o frete para finalizar.' : (!session ? 'Você fará login/cadastro ao finalizar.' : ''));
}

// abrir/fechar carrinho
el('cartBtn').addEventListener('click', () => { el('cartDrawer').hidden = false; renderCart(); });
document.querySelectorAll('[data-close-cart]').forEach((b) => b.addEventListener('click', () => (el('cartDrawer').hidden = true)));

// ===== endereço / frete =====
el('aCep').addEventListener('blur', async () => {
  const cep = el('aCep').value.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const j = await r.json();
    if (!j.erro) { el('aRua').value = j.logradouro || ''; el('aBairro').value = j.bairro || ''; el('aCidade').value = j.localidade || ''; el('aUf').value = j.uf || ''; }
  } catch (_) {}
});
['aCep', 'aNum', 'aRua', 'aBairro', 'aCidade', 'aUf'].forEach((id) => el(id).addEventListener('input', () => { frete = null; renderTotals(); el('freteMsg').textContent = ''; el('freteMsg').className = 'frete-msg'; }));

function haversine(la1, lo1, la2, lo2) {
  const R = 6371, rad = (x) => x * Math.PI / 180;
  const dLa = rad(la2 - la1), dLo = rad(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
el('freteBtn').addEventListener('click', async () => {
  const cidade = el('aCidade').value.trim();
  if (!cidade || !el('aRua').value.trim()) { el('freteMsg').textContent = 'Preencha o CEP e o endereço.'; el('freteMsg').className = 'frete-msg err'; return; }
  el('freteBtn').disabled = true; el('freteMsg').textContent = 'Calculando…'; el('freteMsg').className = 'frete-msg';
  const q = [el('aRua').value, el('aNum').value, el('aBairro').value, cidade, el('aUf').value, 'Brasil'].filter(Boolean).join(', ');
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
    const j = await r.json();
    if (!j.length) throw new Error('nao encontrado');
    const dist = haversine(LOJA.lat, LOJA.lng, +j[0].lat, +j[0].lon);
    frete = round2(Math.max(6.9, 6.9 + dist * 1.2));
    el('freteMsg').textContent = `📍 ~${dist.toFixed(1)} km da loja · Frete: ${brl(frete)}`;
    el('freteMsg').className = 'frete-msg ok';
  } catch (_) {
    frete = 9.9;
    el('freteMsg').textContent = `Não consegui localizar o endereço exato — aplicando frete padrão de ${brl(frete)}.`;
    el('freteMsg').className = 'frete-msg';
  } finally { el('freteBtn').disabled = false; renderTotals(); }
});

// ===== checkout =====
function buildMessage(o) {
  const linhas = o.itens.map((i) => `• ${i.qtd}x ${i.nome} — ${brl(i.preco * i.qtd)}`).join('\n');
  const e = o.endereco;
  return `🥗 *FitGo — Novo Pedido*

👤 ${o.nome || 'Cliente'} — ${o.email}

*Itens:*
${linhas}

Subtotal: ${brl(o.subtotal)}
🛵 Frete: ${brl(o.frete)}
*Total: ${brl(o.total)}*

📍 *Entrega:*
${e.rua}, ${e.num} — ${e.bairro}
${e.cidade}/${e.uf} — CEP ${e.cep}${e.comp ? `\nCompl.: ${e.comp}` : ''}`;
}

el('checkoutBtn').addEventListener('click', async () => {
  if (!session) { toast('Faça login ou crie sua conta para pedir.'); openAuth(); return; }
  if (frete == null || !cart.length) return;
  el('checkoutBtn').disabled = true; el('checkoutBtn').textContent = 'Enviando…';
  const endereco = { cep: el('aCep').value, rua: el('aRua').value, num: el('aNum').value, bairro: el('aBairro').value, cidade: el('aCidade').value, uf: el('aUf').value, comp: el('aComp').value };
  const order = {
    itens: cart.map((c) => ({ nome: c.nome, qtd: c.qtd, preco: c.preco })),
    subtotal: round2(subtotal()), frete: round2(frete), total: round2(subtotal() + frete),
    endereco,
  };
  const { error } = await supa.from('orders').insert(order);
  el('checkoutBtn').disabled = false; el('checkoutBtn').textContent = 'Finalizar pedido';
  if (error) { toast('Erro ao registrar: ' + error.message, true); return; }

  const msg = buildMessage({ ...order, nome: session.user.user_metadata?.nome, email: session.user.email });
  el('orderMsg').textContent = msg;
  el('waBtn').href = `https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(msg)}`;
  el('cartDrawer').hidden = true;
  el('okModal').hidden = false;
  cart = []; frete = null; saveCart(); renderCart();
});
document.querySelectorAll('[data-close-ok]').forEach((b) => b.addEventListener('click', () => (el('okModal').hidden = true)));
el('copyBtn').addEventListener('click', async () => { try { await navigator.clipboard.writeText(el('orderMsg').textContent); toast('Mensagem copiada!'); } catch { toast('Não foi possível copiar.', true); } });

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeAuth(); el('okModal').hidden = true; el('cartDrawer').hidden = true; } });

loadMenu();
renderCart();
