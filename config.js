// ============================================================
//  CONFIGURAÇÃO DO SUPABASE (mesmo projeto dos outros demos)
//  Supabase → Project Settings → API
// ============================================================
export const SUPABASE_URL = 'https://ttbizrvqgkzwozpyqgpk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_jxfXl8fKbwJCs5CnBQTOXA_64GC8V4s';

// WhatsApp da loja (só dígitos, com DDI) para onde o pedido é enviado
export const WHATSAPP_LOJA = '5511900000000';

// Coordenadas da loja (para calcular o frete pela distância)
export const LOJA = { lat: -23.561414, lng: -46.655881, nome: 'FitGo · Av. Paulista, SP' };

export const isConfigured = () =>
  !SUPABASE_URL.includes('SEU-PROJETO') && !SUPABASE_ANON_KEY.includes('SUA-ANON-KEY');
