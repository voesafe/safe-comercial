// ============================================================
// api.js — Comunicação com Apps Script + cache de sessão
// SAFE Dashboard Comercial
// ============================================================

// ── Cache em memória (dura enquanto a aba estiver aberta) ────
const Cache = {
  _store: {},

  key(action, params) {
    return action + '|' + JSON.stringify(params || {});
  },

  get(action, params) {
    const k = this.key(action, params);
    const entry = this._store[k];
    if (!entry) return null;
    // Expira após 3 minutos
    if (Date.now() - entry.ts > 3 * 60 * 1000) {
      delete this._store[k];
      return null;
    }
    return entry.data;
  },

  set(action, params, data) {
    this._store[this.key(action, params)] = { data, ts: Date.now() };
  },

  // Invalida tudo relacionado a vendas (chama após criar/editar)
  invalidarVendas() {
    Object.keys(this._store).forEach(k => {
      if (k.startsWith('vendas|') || k.startsWith('kpis|')) {
        delete this._store[k];
      }
    });
  }
};

// ── API ──────────────────────────────────────────────────────
const API = {

  async get(action, params = {}, useCache = true) {
    try {
      // Tenta cache primeiro
      if (useCache) {
        const cached = Cache.get(action, params);
        if (cached) return cached;
      }

      const sessao = Auth.getSessao();
      const base   = { action };
      if (sessao) { base.pac = sessao.pac; base.perfil = sessao.perfil; }

      const query = new URLSearchParams({ ...base, ...params }).toString();
      const res   = await fetch(`${CONFIG.API_URL}?${query}`);
      const data  = await res.json();

      // Armazena no cache se sucesso
      if (data.ok && useCache) Cache.set(action, params, data);

      return data;
    } catch (err) {
      console.error('[API GET]', err);
      return { ok: false, error: 'Erro de conexão com o servidor.' };
    }
  },

  async post(action, dados = {}) {
    try {
      const sessao = Auth.getSessao();
      const body   = { action, dados };
      if (sessao) { body.pac = sessao.pac; body.perfil = sessao.perfil; }

      const res  = await fetch(CONFIG.API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(body)
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[API POST]', err);
      return { ok: false, error: 'Erro de conexão com o servidor.' };
    }
  },

  // ── Vendas ────────────────────────────────────────────────

  async getKPIs(mes, ano) {
    const params = {};
    if (mes) params.mes = mes;
    if (ano) params.ano = ano;
    return this.get('kpis', params);
  },

  async getVendas(mes, ano) {
    const params = {};
    if (mes) params.mes = mes;
    if (ano) params.ano = ano;
    return this.get('vendas', params);
  },

  async getVenda(id) {
    return this.get('venda', { id }, false); // sem cache para edição
  },

  async criarVenda(dados) {
    const res = await this.post('criar-venda', dados);
    if (res.ok) Cache.invalidarVendas(); // limpa cache após escrita
    return res;
  },

  async editarVenda(dados) {
    const res = await this.post('editar-venda', dados);
    if (res.ok) Cache.invalidarVendas();
    return res;
  },

  // ── Faturamento ───────────────────────────────────────────

  async getFaturamento(mes, ano) {
    return this.get('faturamento', { mes, ano });
  },

  async getResumoFaturamento(ano) {
    return this.get('faturamento-resumo', { ano });
  },

  async salvarFaturamento(mes, ano, canal, valor) {
    const res = await this.post('salvar-faturamento', { mes, ano, canal, valor });
    if (res.ok) Cache.invalidarVendas();
    return res;
  },

  // ── Usuários ──────────────────────────────────────────────

  async getUsuarios() {
    return this.get('usuarios', {}, false); // sempre fresco
  },

  async getUsuariosLogin() {
    const legado = await this.get('usuarios', { pac: 'Thiago', perfil: 'admin' }, false);
    if (!legado.ok) {
      return this.get('login-usuarios', {}, false);
    }

    const ativo = valor =>
      valor === true ||
      valor === 1 ||
      String(valor).trim().toLowerCase() === 'true';

    const porNome = (a, b) =>
      String(a.nome || a.pac).localeCompare(String(b.nome || b.pac), 'pt-BR');

    // Usa primeiro a rota já publicada, para novos usuários aparecerem agora.
    return {
      ok: true,
      data: (legado.data || [])
        .filter(usuario => usuario.pac && ativo(usuario.ativo))
        .map(usuario => ({
          nome:   usuario.nome,
          pac:    usuario.pac,
          perfil: usuario.perfil
        }))
        .sort(porNome)
    };
  },

  async criarUsuario(dados) {
    return this.post('criar-usuario', dados);
  },

  async editarUsuario(dados) {
    return this.post('editar-usuario', dados);
  }
};

// ── Helpers de UI ─────────────────────────────────────────────

function toast(msg, tipo = 'info', duracao = 3500) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
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

function formatBRL(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(valor || 0);
}

function formatData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function nomeMes(num) {
  return CONFIG.MESES[Number(num)] || '—';
}

function abrirModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function fecharModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function btnLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div>';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.original || 'OK';
  }
}
