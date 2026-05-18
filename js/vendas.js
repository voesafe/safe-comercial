// ============================================================
// vendas.js — Listagem, cadastro e edição de vendas
// SAFE Dashboard Comercial
// ============================================================

const Vendas = {

  mesFiltro: CONFIG.MES_ATUAL,
  anoFiltro:  CONFIG.ANO_ATUAL,
  dados:     [],
  pacs:      [],
  filtroPac: '',
  editandoId: null,

  async init() {
    Auth.proteger();
    Auth.preencherUI();
    await this.carregarPacs();
    this.initFiltros();
    this.initForm();
    this.initSidebar();
    await this.carregar();
  },

  async carregarPacs() {
    const campoPac = document.getElementById('f-pac');
    if (!campoPac) return;

    const fallback = Array.from(campoPac.options).map(option => ({
      nome: option.textContent.trim(),
      pac: option.value,
      perfil: 'pac'
    }));

    try {
      const res = await API.getUsuariosLogin();
      this.pacs = res.ok && Array.isArray(res.data) && res.data.length
        ? res.data.filter(u => u.pac && !Auth.perfilSomenteLeitura(u.perfil))
        : fallback;
    } catch {
      this.pacs = fallback;
    }

    this.preencherSelectPacs();
    this.preencherFiltroPacs();
  },

  preencherSelectPacs() {
    const campoPac = document.getElementById('f-pac');
    if (!campoPac || !this.pacs.length) return;

    const valorAtual = campoPac.value;
    campoPac.innerHTML = '';

    this.pacs.forEach(usuario => {
      const option = document.createElement('option');
      option.value = usuario.pac;
      option.textContent = usuario.nome && usuario.nome !== usuario.pac
        ? `${usuario.nome} (${usuario.pac})`
        : usuario.pac;
      campoPac.appendChild(option);
    });

    if (valorAtual && this.pacs.some(usuario => usuario.pac === valorAtual)) {
      campoPac.value = valorAtual;
    }
  },

  preencherFiltroPacs() {
    const filtro = document.getElementById('filtro-pac-vendas');
    if (!filtro) return;

    if (!Auth.eAdmin()) {
      filtro.style.display = 'none';
      return;
    }

    const valorAtual = filtro.value || this.filtroPac;
    const pacs = [...new Map(
      this.pacs
        .filter(usuario => usuario.pac)
        .map(usuario => [usuario.pac, usuario.pac])
    ).values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    filtro.innerHTML = '<option value="">Todos os PACs</option>';
    pacs.forEach(pac => {
      const option = document.createElement('option');
      option.value = pac;
      option.textContent = pac;
      filtro.appendChild(option);
    });

    if (valorAtual && pacs.includes(valorAtual)) {
      filtro.value = valorAtual;
      this.filtroPac = valorAtual;
    }
  },

  initFiltros() {
    const selMes = document.getElementById('sel-mes');
    const selAno = document.getElementById('sel-ano');

    if (selMes) {
      selMes.value = String(this.mesFiltro); // abre no mês atual
      selMes.addEventListener('change', () => {
        this.mesFiltro = selMes.value;
        this.carregar();
      });
    }
    if (selAno) {
      selAno.value = this.anoFiltro;
      selAno.addEventListener('change', () => {
        this.anoFiltro = selAno.value;
        this.carregar();
      });
    }

    document.getElementById('filtro-pac-vendas')?.addEventListener('change', e => {
      this.filtroPac = e.target.value;
      this.renderTabela();
    });

    document.getElementById('busca')?.addEventListener('input', e => {
      this.renderTabela(e.target.value);
    });
  },

  initForm() {
    document.getElementById('btn-nova-venda')?.addEventListener('click', () => {
      this.abrirForm();
    });
    document.getElementById('modal-close')?.addEventListener('click', () => {
      fecharModal('modal-venda');
    });
    document.getElementById('modal-cancelar')?.addEventListener('click', () => {
      fecharModal('modal-venda');
    });
    document.getElementById('btn-salvar')?.addEventListener('click', () => {
      this.salvar();
    });
  },

  async carregar() {
    this.setLoadingTabela(true);
    const res = await API.getVendas(this.mesFiltro || null, this.anoFiltro);

    if (!res.ok) {
      toast(res.error || 'Erro ao carregar vendas.', 'error');
      this.setLoadingTabela(false);
      return;
    }

    this.dados = this.ordenarPorDataDesc(res.data || []);
    this.renderTabela();
    this.setLoadingTabela(false);
  },

  timestampVenda(venda) {
    const data = venda?.data ? new Date(venda.data).getTime() : 0;
    return Number.isFinite(data) ? data : 0;
  },

  ordenarPorDataDesc(lista) {
    return [...lista].sort((a, b) => {
      const dataDiff = this.timestampVenda(b) - this.timestampVenda(a);
      if (dataDiff !== 0) return dataDiff;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  },

  renderTabela(busca = document.getElementById('busca')?.value || '') {
    const tbody = document.getElementById('tabela-vendas');
    if (!tbody) return;

    let lista = this.ordenarPorDataDesc(this.dados);

    if (Auth.eAdmin() && this.filtroPac) {
      lista = lista.filter(v => String(v.pac || '') === String(this.filtroPac));
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(v =>
        (v.nome   || '').toLowerCase().includes(q) ||
        (v.curso  || '').toLowerCase().includes(q) ||
        (v.email  || '').toLowerCase().includes(q) ||
        (v.pac    || '').toLowerCase().includes(q)
      );
    }

    if (!lista.length) {
      this.atualizarContador(lista);
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <div class="icon">◎</div>
            <p>Nenhuma venda encontrada</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(v => `
      <tr>
        <td data-label="Data">${formatData(v.data)}</td>
        ${Auth.eAdmin() ? `<td class="col-pac" data-label="PAC"><span class="badge badge-blue">${v.pac || '—'}</span></td>` : ''}
        <td data-label="Cliente">${v.nome || '—'}</td>
        <td class="col-curso" data-label="Curso">${v.curso || '—'}</td>
        <td class="col-origem" data-label="Origem">${v.origem || '—'}</td>
        <td class="col-lead" data-label="Lead Novo"><span class="badge ${v.leadNovo === 'Sim' || v.leadNovo === 'SIM' ? 'badge-green' : 'badge-navy'}">${v.leadNovo || '—'}</span></td>
        <td class="col-valor" data-label="Valor" style="text-align:right;font-weight:700;color:var(--navy);white-space:nowrap">${formatBRL(v.valor)}</td>
        <td data-label="Ação">${Auth.podeEditar() ? `<button class="btn btn-ghost btn-sm btn-icon" onclick="Vendas.editar('${v.id}')" title="Editar">✎</button>` : ''}</td>
      </tr>
    `).join('');

    this.atualizarContador(lista);
  },

  atualizarContador(lista = this.dados) {
    const total = lista.reduce((s, v) => s + (Number(v.valor) || 0), 0);
    const el = document.getElementById('info-total');
    if (el) el.textContent = `${lista.length} vendas · ${formatBRL(total)}`;
  },

  abrirForm(venda = null) {
    if (!Auth.podeEditar()) {
      toast('Este acesso é somente leitura.', 'warning');
      return;
    }

    this.editandoId = venda ? venda.id : null;

    document.getElementById('modal-titulo').textContent =
      venda ? 'Editar Venda' : 'Nova Venda';

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
      document.getElementById('f-data').value         = new Date().toISOString().split('T')[0];
      document.getElementById('f-pac').value          = Auth.eAdmin()
        ? (this.pacs[0]?.pac || 'Thiago')
        : Auth.getPac();
      document.getElementById('f-nome').value         = '';
      document.getElementById('f-sexo').value         = '';
      document.getElementById('f-nascimento').value   = '';
      document.getElementById('f-cidade').value       = '';
      document.getElementById('f-estado').value       = '';
      document.getElementById('f-origem').value       = '';
      document.getElementById('f-curso').value        = '';
      document.getElementById('f-email').value        = '';
      document.getElementById('f-valor').value        = '';
      document.getElementById('f-lead-novo').value    = 'Não';
      document.getElementById('f-quem-comprou').value = '';
    }

    // PAC travado para não-admin
    const campoPac = document.getElementById('f-pac');
    if (campoPac) {
      campoPac.disabled = !Auth.eAdmin();
      if (!Auth.eAdmin()) campoPac.value = Auth.getPac();
    }

    abrirModal('modal-venda');
  },

  async editar(id) {
    const venda = this.dados.find(v => v.id === id);
    if (venda) this.abrirForm(venda);
  },

  async salvar() {
    if (!Auth.podeEditar()) {
      toast('Este acesso é somente leitura.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-salvar');
    btnLoading(btn, true);

    const dados = {
      id:          this.editandoId,
      data:        document.getElementById('f-data').value,
      pac:         Auth.eAdmin()
                     ? document.getElementById('f-pac').value
                     : Auth.getPac(),
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
      btnLoading(btn, false);
      return;
    }

    const res = this.editandoId
      ? await API.editarVenda(dados)
      : await API.criarVenda(dados);

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
    if (on && tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:40px">Carregando...</td></tr>`;
    }
  },

  initSidebar() {
    const toggle  = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('main');
    const overlay = document.getElementById('sidebar-overlay');
    const hamb    = document.getElementById('hamburger');

    toggle?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('sidebar-collapsed');
      toggle.innerHTML = sidebar.classList.contains('collapsed') ? '›' : '‹';
    });
    hamb?.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    });
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Vendas.init());
