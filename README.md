# 🥗 FitGo — Delivery Fitness (Fullstack)

Delivery de comida fitness com **login/cadastro**, carrinho, **frete calculado pelo endereço**, pedido formatado em **mensagem (WhatsApp)** e **histórico de pedidos** por usuário. Projeto fullstack de demonstração.

- **Front-end:** HTML + CSS + JavaScript puro — GitHub Pages
- **Back-end:** Supabase (PostgreSQL + Auth) — plano gratuito
- **Frete:** CEP via [ViaCEP](https://viacep.com.br) + distância via [Nominatim/OpenStreetMap](https://nominatim.org) (ambos grátis, sem chave)

## Funcionalidades
- **Cadastro e login** de usuário (Supabase Auth) — é preciso estar logado para finalizar o pedido.
- **Cardápio** carregado do banco, com categorias e carrinho.
- **Endereço + frete:** digita o CEP (autocompleta o endereço) e o sistema **geolocaliza e calcula o frete pela distância** até a loja.
- **Finalizar pedido:** gera uma **mensagem formatada** com itens, preços, subtotal, **frete** e endereço — pronta para enviar no **WhatsApp** (e copiável).
- **Histórico de pedidos:** cada usuário vê apenas os próprios pedidos (protegido por RLS).

## Configuração (no Supabase — pode ser o mesmo projeto dos outros demos)
1. Rode o [`SETUP.sql`](SETUP.sql) no SQL Editor. Cria `menu_items` e `orders`, as políticas e o cardápio de exemplo.
2. Em **Authentication → Sign In / Providers → Email**, **desative "Confirm email"** — assim o cliente se cadastra e já entra direto (sem confirmar por e-mail).
3. Em `config.js`, ajuste o `WHATSAPP_LOJA` (número da loja) e, se quiser, a coordenada `LOJA` usada no cálculo do frete.

## Estrutura
```
index.html · pedidos.html          · loja + histórico
app.js                             · cardápio, carrinho, auth, frete, checkout
pedidos.js                         · histórico de pedidos
config.js · styles.css · favicon.svg
SETUP.sql                          · script do banco
```

## Segurança (RLS)
- Cardápio é leitura pública.
- `orders`: cada usuário só **lê e cria os próprios pedidos** (`user_id = auth.uid()`), garantido no banco.

---
Imagens via [Unsplash](https://unsplash.com). Dados fictícios.
