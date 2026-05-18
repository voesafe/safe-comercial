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
    return s && this.perfilEhAdmin(s.perfil);
  },

  /**
   * Verifica se é admin completo, com permissão de edição
   */
  eAdminCompleto() {
    const s = this.getSessao();
    return s && this.normalizarPerfil(s.perfil) === 'admin';
  },

  /**
   * Verifica se o perfil atual é somente leitura
   */
  eSomenteLeitura() {
    const s = this.getSessao();
    return s && this.perfilSomenteLeitura(s.perfil);
  },

  /**
   * Verifica se o usuário pode criar/editar registros
   */
  podeEditar() {
    return this.estaLogado() && !this.eSomenteLeitura();
  },

  normalizarPerfil(perfil) {
    return String(perfil || '').trim().toLowerCase().replace(/-/g, '_');
  },

  perfilEhAdmin(perfil) {
    const p = this.normalizarPerfil(perfil);
    return p === 'admin' || p === 'admin_readonly' || p === 'admin_visualizacao';
  },

  perfilSomenteLeitura(perfil) {
    const p = this.normalizarPerfil(perfil);
    return p === 'admin_readonly' || p === 'admin_visualizacao';
  },

  descricaoPerfil(perfil) {
    if (this.perfilSomenteLeitura(perfil)) return 'Admin. somente leitura';
    if (this.perfilEhAdmin(perfil)) return 'Administrador';
    return 'Consultor Comercial';
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

  iconSvg(nome) {
    const base = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    const icons = {
      dashboard: `<svg ${base}><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>`,
      vendas: `<svg ${base}><path d="M4 3v18l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path><path d="M8 8h8"></path><path d="M8 12h8"></path><path d="M8 16h5"></path></svg>`,
      faturamento: `<svg ${base}><rect x="3" y="6" width="18" height="14" rx="2"></rect><path d="M16 10h5"></path><path d="M7 6V4h10v2"></path><path d="M7 14h4"></path></svg>`,
      concorrencia: `<svg ${base}><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3"></path><path d="M12 19v3"></path><path d="M2 12h3"></path><path d="M19 12h3"></path></svg>`,
      usuarios: `<svg ${base}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      logout: `<svg ${base}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>`
    };

    return icons[nome] || '';
  },

  renderizarIconesSidebar() {
    const porHref = {
      'dashboard.html': 'dashboard',
      'vendas.html': 'vendas',
      'faturamento.html': 'faturamento',
      'concorrencia.html': 'concorrencia',
      'admin.html': 'usuarios'
    };

    document.querySelectorAll('.nav-item').forEach(item => {
      const href = (item.getAttribute('href') || '').split('/').pop();
      const nomeIcone = porHref[href];
      const alvo = item.querySelector('.nav-icon');
      if (!nomeIcone || !alvo) return;

      alvo.innerHTML = this.iconSvg(nomeIcone);
      alvo.setAttribute('aria-hidden', 'true');
    });
  },

  prepararLogoutSidebar() {
    const usuario = document.querySelector('.sidebar-user');
    const footer = document.querySelector('.sidebar-footer');
    if (!usuario || !footer) return;

    if (usuario.id === 'btn-logout') {
      usuario.id = 'sidebar-user-current';
      usuario.removeAttribute('title');
    }

    if (!document.getElementById('btn-logout')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btn-logout';
      btn.className = 'sidebar-logout';
      btn.innerHTML = `
        <span class="sidebar-logout-icon" aria-hidden="true">${this.iconSvg('logout')}</span>
        <span class="sidebar-logout-label">Sair</span>
      `;
      footer.appendChild(btn);
    }

    this.inicializarLogoutSidebar();
  },

  inicializarLogoutSidebar() {
    const btn = document.getElementById('btn-logout');
    if (!btn || btn.dataset.bound === 'true') return;

    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      if (confirm('Deseja sair?')) this.logout();
    });
  },

  /**
   * Preenche o avatar e nome do usuário nos elementos da sidebar
   */
  preencherUI() {
    const sessao = this.getSessao();
    if (!sessao) return;

    this.renderizarIconesSidebar();
    this.prepararLogoutSidebar();

    // Avatar (primeira letra do nome)
    document.querySelectorAll('.sidebar-avatar').forEach(el => {
      el.textContent = sessao.nome.charAt(0).toUpperCase();
    });

    // Nome e role
    document.querySelectorAll('.sidebar-user-name').forEach(el => {
      el.textContent = sessao.nome;
    });
    document.querySelectorAll('.sidebar-user-role').forEach(el => {
      el.textContent = this.descricaoPerfil(sessao.perfil);
    });

    // Oculta itens de admin para PACs
    if (!this.eAdmin()) {
      document.querySelectorAll('[data-admin-only]').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Oculta ações de escrita para perfis somente leitura
    if (!this.podeEditar()) {
      document.querySelectorAll('[data-write-only]').forEach(el => {
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
