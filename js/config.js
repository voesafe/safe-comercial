// ============================================================
// config.js — Configuração central
// SAFE Dashboard Comercial
// ============================================================

const CONFIG = {
  // ← Cole aqui a URL do seu Apps Script após o deploy
  API_URL: 'https://script.google.com/macros/s/AKfycbzmaCBkPawFNplB5bmeroYC2DrvsOumnzfKvt7zk3IjSrzp5jBlgFP-p2TU4EW29QmE/exec',

  APP_NAME:    'SAFE Comercial',
  APP_VERSION: '1.0.0',

  MESES: [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],

  ESTADOS: [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO',
    'MA','MT','MS','MG','PA','PB','PR','PE','PI',
    'RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  ],

  ORIGENS: [
    'Instagram', 'Google', 'Site', 'Facebook',
    'Indicação', 'Aluno Interno', 'YouTube',
    'WhatsApp', 'Outros'
  ],

  CANAIS_FATURAMENTO: [
    'Lojinha', 'Safe Academy', 'Azul Pontos',
    'Lito Academy', 'Vendas Comercial'
  ],

  SESSION_KEY: 'safe_session'
};

// Ano atual para filtros
CONFIG.ANO_ATUAL = new Date().getFullYear();
CONFIG.MES_ATUAL = new Date().getMonth() + 1;
