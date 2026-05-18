// ============================================================
// auth.js — Autenticação, sessão e proteção de rotas
// SAFE Dashboard Comercial
// ============================================================

const Auth = {

  /**
   * Salva sessão no sessionStorage
   */
  salvarSessao(usuario) {
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(usuario));
  },

  /**
   * Retorna dados da sessão atual
   */
  getSessao() {
    try {
      const raw = sessionStorage.getItem(CONFIG.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Verifica se está logado
   */
  estaLogado() {
    return !!this.getSessao();
  },

  /**
   * Verifica se é admin
   */
  eAdmin() {
    const s = this.getSessao();
    return s && s.perfil === 'admin';
  },

  /**
   * Retorna PAC do usuário logado
   */
  getPac() {
    const s = this.getSessao();
    return s ? s.pac : null;
  },

  /**
   * Retorna perfil do usuário logado
   */
  getPerfil() {
    const s = this.getSessao();
    return s ? s.perfil : null;
  },

  /**
   * Retorna nome do usuário logado
   */
  getNome() {
    const s = this.getSessao();
    return s ? s.nome : null;
  },

  /**
   * Faz logout e redireciona para login
   */
  logout() {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
    window.location.href = 'index.html';
  },

  /**
   * Protege página: redireciona para login se não autenticado
   * Se adminOnly=true, redireciona PAC para dashboard
   */
  proteger(adminOnly = false) {
    if (!this.estaLogado()) {
      window.location.href = 'index.html';
      return false;
    }
    if (adminOnly && !this.eAdmin()) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  },

  /**
   * Faz login via API
   */
  async login(pac, senha) {
    const res = await API.post('login', { pac, senha });
    if (res.ok) {
      this.salvarSessao(res.data);
    }
    return res;
  },

  /**
   * Altera senha via API
   */
  async alterarSenha(senhaAtual, novaSenha) {
    const sessao = this.getSessao();
    return await API.post('alterar-senha', {
      pac:       sessao.pac,
      senhaAtual,
      novaSenha
    });
  },

  /**
   * Preenche o avatar e nome do usuário nos elementos da sidebar
   */
  preencherUI() {
    const sessao = this.getSessao();
    if (!sessao) return;

    // Avatar (primeira letra do nome)
    document.querySelectorAll('.sidebar-avatar').forEach(el => {
      el.textContent = sessao.nome.charAt(0).toUpperCase();
    });

    // Nome e role
    document.querySelectorAll('.sidebar-user-name').forEach(el => {
      el.textContent = sessao.nome;
    });
    document.querySelectorAll('.sidebar-user-role').forEach(el => {
      el.textContent = sessao.perfil === 'admin' ? 'Administrador' : 'Consultor Comercial';
    });

    // Oculta itens de admin para PACs
    if (!this.eAdmin()) {
      document.querySelectorAll('[data-admin-only]').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Marca nav item ativo
    const path = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-item').forEach(el => {
      const href = el.getAttribute('href');
      if (href && href === path) el.classList.add('active');
    });
  }
};
