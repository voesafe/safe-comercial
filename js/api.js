// ============================================================
// api.js — Comunicação com Apps Script (backend)
// SAFE Dashboard Comercial
// ============================================================

const API = {

  /**
   * GET — leitura de dados
   */
  async get(action, params = {}) {
    try {
      const sessao = Auth.getSessao();
      const base = { action };

      if (sessao) {
        base.pac    = sessao.pac;
        base.perfil = sessao.perfil;
      }

      const query = new URLSearchParams({ ...base, ...params }).toString();
      const url   = `${CONFIG.API_URL}?${query}`;

      const res  = await fetch(url);
      const data = await res.json();
      return data;

    } catch (err) {
      console.error('[API GET] Erro:', err);
      return { ok: false, error: 'Erro de conexão com o servidor.' };
    }
  },

  /**
   * POST — escrita e autenticação
   */
  async post(action, dados = {}) {
    try {
      const sessao = Auth.getSessao();
      const body = { action, dados };

      if (sessao) {
        body.pac    = sessao.pac;
        body.perfil = sessao.perfil;
      }

      const res = await fetch(CONFIG.API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' }, // necessário para Apps Script
        body:    JSON.stringify(body)
      });

      const data = await res.json();
      return data;

    } catch (err) {
      console.error('[API POST] Erro:', err);
      return { ok: false, error: 'Erro de conexão com o servidor.' };
    }
  },

  // ── Vendas ──────────────────────────────────────────────────

  async getKPIs(mes, ano) {
    return this.get('kpis', { mes, ano });
  },

  async getVendas(mes, ano) {
    return this.get('vendas', { mes, ano });
  },

  async getVenda(id) {
    return this.get('venda', { id });
  },

  async criarVenda(dados) {
    return this.post('criar-venda', dados);
  },

  async editarVenda(dados) {
    return this.post('editar-venda', dados);
  },

  // ── Faturamento ─────────────────────────────────────────────

  async getFaturamento(mes, ano) {
    return this.get('faturamento', { mes, ano });
  },

  async getResumoFaturamento(ano) {
    return this.get('faturamento-resumo', { ano });
  },

  async salvarFaturamento(mes, ano, canal, valor) {
    return this.post('salvar-faturamento', { mes, ano, canal, valor });
  },

  // ── Usuários ────────────────────────────────────────────────

  async getUsuarios() {
    return this.get('usuarios');
  },

  async criarUsuario(dados) {
    return this.post('criar-usuario', dados);
  },

  async editarUsuario(dados) {
    return this.post('editar-usuario', dados);
  }
};

// ── Helpers de UI ────────────────────────────────────────────

/**
 * Exibe toast de notificação
 */
function toast(msg, tipo = 'info', duracao = 3500) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const container = document.getElementById('toast-container') ||
    (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();

  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerHTML = `<span>${icons[tipo] || icons.info}</span><span>${msg}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all .3s';
    setTimeout(() => el.remove(), 300);
  }, duracao);
}

/**
 * Formata valor em reais
 */
function formatBRL(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(valor || 0);
}

/**
 * Formata data ISO para DD/MM/YYYY
 */
function formatData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Retorna nome do mês
 */
function nomeMes(num) {
  return CONFIG.MESES[Number(num)] || '—';
}

/**
 * Abre modal
 */
function abrirModal(id) {
  document.getElementById(id)?.classList.add('open');
}

/**
 * Fecha modal
 */
function fecharModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

/**
 * Define estado de loading num botão
 */
function btnLoading(btn, loading, textoOriginal) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.original || textoOriginal || 'OK';
  }
}
