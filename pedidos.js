import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js';

const el = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const supa = isConfigured() ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
el('year').textContent = new Date().getFullYear();

const fmtData = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

async function main() {
  const box = el('ordersList');
  if (!supa) { box.innerHTML = '<div class="state error">⚙️ Configure o Supabase em config.js.</div>'; return; }
  const { data: { session } } = await supa.auth.getSession();
  if (!session) {
    box.innerHTML = '<div class="state">Você precisa estar logado para ver seus pedidos.<br><br><a class="btn btn-primary" href="index.html">Ir para o cardápio e entrar</a></div>';
    return;
  }
  el('userChip').hidden = false;
  el('userEmail').textContent = session.user.email;
  el('logoutBtn').addEventListener('click', async () => { await supa.auth.signOut(); location.href = 'index.html'; });

  const { data, error } = await supa.from('orders').select('*').order('created_at', { ascending: false });
  if (error) { box.innerHTML = `<div class="state error">Erro: ${esc(error.message)}</div>`; return; }
  if (!data.length) { box.innerHTML = '<div class="state">Você ainda não fez pedidos.<br><br><a class="btn btn-primary" href="index.html">Fazer meu primeiro pedido</a></div>'; return; }

  box.innerHTML = data.map((o) => {
    const itens = (o.itens || []).map((i) => `${i.qtd}x ${esc(i.nome)}`).join(' · ');
    const e = o.endereco || {};
    return `<div class="order-card">
      <div class="order-top">
        <h3>Pedido de ${fmtData(o.created_at)}</h3>
        <span class="order-status">${esc(o.status || 'recebido')}</span>
      </div>
      <div class="order-items">${itens}</div>
      <div class="order-items">📍 ${esc([e.rua, e.num].filter(Boolean).join(', '))}${e.bairro ? ' — ' + esc(e.bairro) : ''}${e.cidade ? ', ' + esc(e.cidade) : ''}</div>
      <div class="order-top">
        <span class="order-date">Subtotal ${brl(o.subtotal)} + frete ${brl(o.frete)}</span>
        <span class="order-tot">Total ${brl(o.total)}</span>
      </div>
    </div>`;
  }).join('');
}
main();
