-- ============================================================
--  FitGo — Delivery Fitness (Supabase)
--  Pode rodar no MESMO projeto Supabase dos outros demos.
--  SQL Editor → New query → cole tudo → Run
-- ============================================================

-- 1) Cardápio --------------------------------------------------
create table if not exists public.menu_items (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  descricao  text,
  categoria  text,
  preco      numeric not null,
  kcal       int,
  foto       text,
  ativo      boolean default true,
  ordem      int default 0,
  created_at timestamptz default now()
);
alter table public.menu_items enable row level security;
drop policy if exists "menu_read" on public.menu_items;
create policy "menu_read" on public.menu_items for select using (true);
drop policy if exists "menu_auth_write" on public.menu_items;
create policy "menu_auth_write" on public.menu_items for all to authenticated using (true) with check (true);

-- 2) Pedidos (histórico por usuário) --------------------------
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  itens      jsonb not null,
  subtotal   numeric not null,
  frete      numeric not null default 0,
  total      numeric not null,
  endereco   jsonb,
  obs        text,
  status     text default 'recebido',
  created_at timestamptz default now()
);
alter table public.orders enable row level security;

-- cada usuário só vê e cria os PRÓPRIOS pedidos
drop policy if exists "orders_own_select" on public.orders;
create policy "orders_own_select" on public.orders
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "orders_own_insert" on public.orders;
create policy "orders_own_insert" on public.orders
  for insert to authenticated with check (user_id = auth.uid());

-- 3) Cardápio de exemplo (só se estiver vazio) ----------------
insert into public.menu_items (nome, descricao, categoria, preco, kcal, foto, ordem)
select v.nome, v.descricao, v.categoria, v.preco, v.kcal, v.foto, v.ordem from (values
  ('Frango grelhado + batata-doce', 'Peito de frango grelhado, batata-doce e brócolis no vapor.', 'Pratos', 25.90, 480, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', 1),
  ('Salmão com legumes', 'Salmão selado, mix de legumes e arroz integral.', 'Pratos', 34.90, 520, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80', 2),
  ('Strogonoff fit de frango', 'Strogonoff de frango com iogurte e arroz integral.', 'Pratos', 27.90, 510, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80', 3),
  ('Panqueca proteica', 'Panqueca de aveia recheada com frango desfiado.', 'Pratos', 22.90, 430, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80', 4),
  ('Salada Caesar fit', 'Folhas, frango grelhado, parmesão e molho leve.', 'Saladas', 24.90, 320, 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80', 5),
  ('Bowl vegano', 'Grão-de-bico, quinoa, abacate e legumes.', 'Saladas', 26.90, 410, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', 6),
  ('Wrap de frango', 'Wrap integral com frango, cottage e salada.', 'Snacks', 19.90, 360, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80', 7),
  ('Barra proteica caseira', 'Barra de aveia, whey e pasta de amendoim.', 'Snacks', 9.90, 210, 'https://images.unsplash.com/photo-1490567674331-72de84996c8f?auto=format&fit=crop&w=600&q=80', 8),
  ('Suco verde detox', 'Couve, maçã, limão e gengibre. 300ml.', 'Bebidas', 11.90, 90, 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=600&q=80', 9),
  ('Shake proteico', 'Whey, banana e pasta de amendoim. 300ml.', 'Bebidas', 15.90, 250, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80', 10),
  ('Água de coco', 'Natural, gelada. 300ml.', 'Bebidas', 7.90, 60, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80', 11)
) as v(nome, descricao, categoria, preco, kcal, foto, ordem)
where not exists (select 1 from public.menu_items);

-- ============================================================
--  IMPORTANTE (para o cadastro funcionar sem e-mail):
--  Authentication → Sign In / Providers → Email →
--  desative "Confirm email". Assim o cliente se cadastra e já
--  entra direto, sem precisar confirmar por e-mail.
-- ============================================================
