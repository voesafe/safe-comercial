// ============================================================
// vendas.js — Listagem, cadastro e edição de vendas
// SAFE Dashboard Comercial
// ============================================================

const Vendas = {

  mesFiltro:   CONFIG.MES_ATUAL,
  anoFiltro:   CONFIG.ANO_ATUAL,
  dados:       [],
  pacs:        [],
  filtroPac:   '',
  filtroCidade:'',
  filtroEstado:'',
  filtroIdade: '',
  editandoId:  null,

  async init() {
    Auth.proteger();
    Auth.preencherUI();
    this.setLoadingTabela(true);
    await this.carregarPacs();
    this.initFiltros();
    this.initForm();
    this.initSidebar();
    await this.carregar();
  },

  async carregarPacs() {
    const campoPac = document.getElementById('f-pac');
    if (!campoPac) return;

    const fallback = Array.from(campoPac.options).map(o => ({
      nome: o.textContent.trim(), pac: o.value, perfil: 'pac'
    }));

    try {
      const res = await API.getUsuariosLogin();
      this.pacs = res.ok && Array.isArray(res.data) && res.data.length
        ? res.data.filter(u => u.pac && !Auth.perfilSomenteLeitura(u.perfil))
        : fallback;
    } catch { this.pacs = fallback; }

    this.preencherSelectPacs();
    this.preencherFiltroPacs();
  },

  preencherSelectPacs() {
    const campoPac = document.getElementById('f-pac');
    if (!campoPac || !this.pacs.length) return;
    const valorAtual = campoPac.value;
    campoPac.innerHTML = '';
    this.pacs.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.pac;
      opt.textContent = u.nome && u.nome !== u.pac ? `${u.nome} (${u.pac})` : u.pac;
      campoPac.appendChild(opt);
    });
    if (valorAtual && this.pacs.some(u => u.pac === valorAtual)) campoPac.value = valorAtual;
  },

  preencherFiltroPacs() {
    const filtro = document.getElementById('filtro-pac-vendas');
    if (!filtro) return;
    if (!Auth.eAdmin()) { filtro.style.display = 'none'; return; }

    const valorAtual = filtro.value || this.filtroPac;
    const pacs = [...new Map(
      this.pacs.filter(u => u.pac).map(u => [u.pac, u.pac])
    ).values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    filtro.innerHTML = '<option value="">Todos os PACs</option>';
    pacs.forEach(pac => {
      const opt = document.createElement('option');
      opt.value = pac; opt.textContent = pac;
      filtro.appendChild(opt);
    });
    if (valorAtual && pacs.includes(valorAtual)) { filtro.value = valorAtual; this.filtroPac = valorAtual; }
  },

  // Popula o dropdown de estados nos filtros a partir dos dados carregados
  _preencherFiltroEstados() {
    const sel = document.getElementById('filtro-estado-vendas');
    if (!sel) return;
    const estados = [...new Set(this.dados.map(v => v.estado).filter(Boolean))].sort();
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todos os estados</option>';
    estados.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e; opt.textContent = e;
      sel.appendChild(opt);
    });
    if (atual && estados.includes(atual)) sel.value = atual;
  },

  initFiltros() {
    const selMes = document.getElementById('sel-mes');
    const selAno = document.getElementById('sel-ano');

    if (selMes) {
      selMes.value = String(this.mesFiltro);
      selMes.addEventListener('change', () => { this.mesFiltro = selMes.value; this.carregar(); });
    }
    if (selAno) {
      selAno.value = this.anoFiltro;
      selAno.addEventListener('change', () => { this.anoFiltro = selAno.value; this.carregar(); });
    }

    document.getElementById('filtro-pac-vendas')?.addEventListener('change', e => {
      this.filtroPac = e.target.value; this.renderTabela();
    });
    document.getElementById('busca')?.addEventListener('input', e => {
      this.renderTabela(e.target.value);
    });
    document.getElementById('filtro-cidade-vendas')?.addEventListener('input', e => {
      this.filtroCidade = e.target.value.trim(); this.renderTabela();
    });
    document.getElementById('filtro-estado-vendas')?.addEventListener('change', e => {
      this.filtroEstado = e.target.value; this.renderTabela();
    });
    document.getElementById('filtro-idade-vendas')?.addEventListener('change', e => {
      this.filtroIdade = e.target.value; this.renderTabela();
    });

    // Botão limpar filtros avançados
    document.getElementById('btn-limpar-filtros')?.addEventListener('click', () => {
      this.filtroCidade = '';
      this.filtroEstado = '';
      this.filtroIdade  = '';
      const cidade = document.getElementById('filtro-cidade-vendas');
      const estado = document.getElementById('filtro-estado-vendas');
      const idade  = document.getElementById('filtro-idade-vendas');
      if (cidade) cidade.value = '';
      if (estado) estado.value = '';
      if (idade)  idade.value  = '';
      this.renderTabela();
    });
  },

  initForm() {
    document.getElementById('btn-nova-venda')?.addEventListener('click',   () => this.abrirForm());
    document.getElementById('modal-close')?.addEventListener('click',      () => fecharModal('modal-venda'));
    document.getElementById('modal-cancelar')?.addEventListener('click',   () => fecharModal('modal-venda'));
    document.getElementById('btn-salvar')?.addEventListener('click',       () => this.salvar());
  },

  async carregar() {
    this.setLoadingTabela(true);
    const res = await API.getVendas(this.mesFiltro || null, this.anoFiltro);

    if (!res.ok) { toast(res.error || 'Erro ao carregar vendas.', 'error'); this.setLoadingTabela(false); return; }

    this.dados = this.ordenarPorDataDesc(res.data || []);
    this._preencherFiltroEstados();
    this.renderTabela();
  },

  // ── Cálculo de idade ────────────────────────────────────────
  _calcularIdade(nascimento) {
    if (!nascimento) return null;
    const nasc = new Date(nascimento);
    if (isNaN(nasc)) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  },

  _faixaEtaria(idade) {
    if (idade === null) return null;
    if (idade < 18)  return 'menor18';
    if (idade <= 24) return '18-24';
    if (idade <= 34) return '25-34';
    if (idade <= 44) return '35-44';
    if (idade <= 54) return '45-54';
    return '55+';
  },

  timestampVenda(venda) {
    const d = venda?.data ? new Date(venda.data).getTime() : 0;
    return Number.isFinite(d) ? d : 0;
  },

  ordenarPorDataDesc(lista) {
    return [...lista].sort((a, b) => {
      const diff = this.timestampVenda(b) - this.timestampVenda(a);
      if (diff !== 0) return diff;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  },

  renderTabela(busca = document.getElementById('busca')?.value || '') {
    const tbody = document.getElementById('tabela-vendas');
    if (!tbody) return;

    let lista = this.ordenarPorDataDesc(this.dados);

    // Filtro PAC
    if (Auth.eAdmin() && this.filtroPac)
      lista = lista.filter(v => String(v.pac || '') === String(this.filtroPac));

    // Filtro texto (nome, curso, email, pac)
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(v =>
        (v.nome  || '').toLowerCase().includes(q) ||
        (v.curso || '').toLowerCase().includes(q) ||
        (v.email || '').toLowerCase().includes(q) ||
        (v.pac   || '').toLowerCase().includes(q)
      );
    }

    // Filtro cidade
    if (this.filtroCidade) {
      const q = this.filtroCidade.toLowerCase();
      lista = lista.filter(v => (v.cidade || '').toLowerCase().includes(q));
    }

    // Filtro estado
    if (this.filtroEstado)
      lista = lista.filter(v => (v.estado || '') === this.filtroEstado);

    // Filtro faixa etária
    if (this.filtroIdade) {
      lista = lista.filter(v => {
        const idade = this._calcularIdade(v.nascimento || v.idade);
        return this._faixaEtaria(idade) === this.filtroIdade;
      });
    }

    // Indicador de filtros ativos
    this._atualizarBadgeFiltros(lista.length);

    if (!lista.length) {
      this.atualizarContador(lista);
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <div class="icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4">
                <path d="M4 3v18l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                <path d="M8 8h8M8 12h8M8 16h5"/>
              </svg>
            </div>
            <p>Nenhuma venda encontrada</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.style.opacity = '0';
    tbody.innerHTML = lista.map(v => `
      <tr>
        <td data-label="Data">${formatData(v.data)}</td>
        ${Auth.eAdmin() ? `<td class="col-pac" data-label="PAC"><span class="badge badge-blue">${v.pac || '—'}</span></td>` : ''}
        <td data-label="Cliente">${v.nome || '—'}</td>
        <td class="col-curso" data-label="Curso">${v.curso || '—'}</td>
        <td class="col-origem" data-label="Origem">${v.origem || '—'}</td>
        <td class="col-lead" data-label="Lead Novo">
          <span class="badge ${v.leadNovo === 'Sim' || v.leadNovo === 'SIM' ? 'badge-green' : 'badge-navy'}">${v.leadNovo || '—'}</span>
        </td>
        <td class="col-valor" data-label="Valor" style="text-align:right;font-weight:700;color:var(--navy);white-space:nowrap">${formatBRL(v.valor)}</td>
        <td data-label="Ação">${Auth.podeEditar() ? `<button class="btn btn-ghost btn-sm btn-icon" onclick="Vendas.editar('${v.id}')" title="Editar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>` : ''}</td>
      </tr>
    `).join('');

    requestAnimationFrame(() => { tbody.style.transition = 'opacity .25s'; tbody.style.opacity = '1'; });
    this.atualizarContador(lista);
  },

  _atualizarBadgeFiltros(total) {
    const ativos = [this.filtroCidade, this.filtroEstado, this.filtroIdade].filter(Boolean).length;
    const badge = document.getElementById('badge-filtros-ativos');
    const btnLimpar = document.getElementById('btn-limpar-filtros');
    if (badge) {
      badge.textContent = ativos;
      badge.style.display = ativos > 0 ? 'inline-flex' : 'none';
    }
    if (btnLimpar) btnLimpar.style.display = ativos > 0 ? 'inline-flex' : 'none';
  },

  atualizarContador(lista = this.dados) {
    const total = lista.reduce((s, v) => s + (Number(v.valor) || 0), 0);
    const el = document.getElementById('info-total');
    if (el) el.textContent = `${lista.length} vendas · ${formatBRL(total)}`;
  },

  abrirForm(venda = null) {
    if (!Auth.podeEditar()) { toast('Este acesso é somente leitura.', 'warning'); return; }

    this.editandoId = venda ? venda.id : null;
    document.getElementById('modal-titulo').textContent = venda ? 'Editar Venda' : 'Nova Venda';

    if (venda) {
      document.getElementById('f-data').value         = venda.data        || '';
      document.getElementById('f-pac').value          = venda.pac         || '';
      document.getElementById('f-nome').value         = venda.nome        || '';
      document.getElementById('f-sexo').value         = venda.sexo        || '';
      document.getElementById('f-nascimento').value   = venda.nascimento  || venda.idade || '';
      document.getElementById('f-cidade').value       = venda.cidade      || '';
      document.getElementById('f-estado').value       = venda.estado      || '';
      document.getElementById('f-origem').value       = venda.origem      || '';
      document.getElementById('f-curso').value        = venda.curso       || '';
      document.getElementById('f-email').value        = venda.email       || '';
      document.getElementById('f-valor').value        = venda.valor       || '';
      document.getElementById('f-lead-novo').value    = venda.leadNovo    || 'Não';
      document.getElementById('f-quem-comprou').value = venda.quemComprou || '';
    } else {
      ['f-nome','f-nascimento','f-cidade','f-email','f-valor'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      document.getElementById('f-data').value         = new Date().toISOString().split('T')[0];
      document.getElementById('f-pac').value          = Auth.eAdmin() ? (this.pacs[0]?.pac || '') : Auth.getPac();
      document.getElementById('f-sexo').value         = '';
      document.getElementById('f-estado').value       = '';
      document.getElementById('f-origem').value       = '';
      document.getElementById('f-curso').value        = '';
      document.getElementById('f-lead-novo').value    = 'Não';
      document.getElementById('f-quem-comprou').value = '';
    }

    const campoPac = document.getElementById('f-pac');
    if (campoPac) { campoPac.disabled = !Auth.eAdmin(); if (!Auth.eAdmin()) campoPac.value = Auth.getPac(); }

    abrirModal('modal-venda');
    setTimeout(() => document.getElementById('f-nome')?.focus(), 150);
  },

  async editar(id) {
    const venda = this.dados.find(v => v.id === id);
    if (venda) this.abrirForm(venda);
  },

  async salvar() {
    if (!Auth.podeEditar()) { toast('Este acesso é somente leitura.', 'warning'); return; }

    const btn = document.getElementById('btn-salvar');
    btnLoading(btn, true);

    const dados = {
      id:          this.editandoId,
      data:        document.getElementById('f-data').value,
      pac:         Auth.eAdmin() ? document.getElementById('f-pac').value : Auth.getPac(),
      nome:        document.getElementById('f-nome').value,
      sexo:        document.getElementById('f-sexo').value,
      nascimento:  document.getElementById('f-nascimento').value,
      cidade:      document.getElementById('f-cidade').value,
      estado:      document.getElementById('f-estado').value,
      origem:      document.getElementById('f-origem').value,
      curso:       document.getElementById('f-curso').value,
      email:       document.getElementById('f-email').value,
      valor:       document.getElementById('f-valor').value,
      leadNovo:    document.getElementById('f-lead-novo').value,
      quemComprou: document.getElementById('f-quem-comprou').value
    };

    if (!dados.data || !dados.nome || !dados.valor || !dados.curso) {
      toast('Data, nome, curso e valor são obrigatórios.', 'warning');
      btnLoading(btn, false); return;
    }

    const res = this.editandoId ? await API.editarVenda(dados) : await API.criarVenda(dados);
    btnLoading(btn, false);

    if (res.ok) {
      toast(this.editandoId ? 'Venda atualizada!' : 'Venda registrada!', 'success');
      fecharModal('modal-venda');
      await this.carregar();
    } else {
      toast(res.error || 'Erro ao salvar.', 'error');
    }
  },

  setLoadingTabela(on) {
    const tbody = document.getElementById('tabela-vendas');
    if (!tbody || !on) return;
    const cols = Auth.eAdmin() ? 8 : 7;
    const shimmer = `<td><div style="height:13px;border-radius:4px;background:linear-gradient(90deg,var(--gray-100) 25%,var(--gray-200) 50%,var(--gray-100) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite"></div></td>`;
    tbody.innerHTML = Array.from({ length: 7 }, (_, i) =>
      `<tr class="sk-row" style="opacity:${1 - i * 0.1}">${Array.from({ length: cols }, () => shimmer).join('')}</tr>`
    ).join('');
    if (!document.getElementById('shimmer-kf')) {
      const s = document.createElement('style'); s.id = 'shimmer-kf';
      s.textContent = '@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
      document.head.appendChild(s);
    }
  },

  initSidebar() {
    const toggle  = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('main');
    const overlay = document.getElementById('sidebar-overlay');
    const hamb    = document.getElementById('hamburger');
    toggle?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed'); main.classList.toggle('sidebar-collapsed');
      toggle.innerHTML = sidebar.classList.contains('collapsed') ? '›' : '‹';
    });
    hamb?.addEventListener('click', () => { sidebar.classList.toggle('mobile-open'); overlay.classList.toggle('active'); });
    overlay?.addEventListener('click', () => { sidebar.classList.remove('mobile-open'); overlay.classList.remove('active'); });
  }
};

document.addEventListener('DOMContentLoaded', () => Vendas.init());
