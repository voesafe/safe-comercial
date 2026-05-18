// ============================================================
// vendas.js — Listagem, cadastro e edição de vendas
// SAFE Dashboard Comercial
// ============================================================

const Vendas = {

  mesFiltro: '',
  anoFiltro: CONFIG.ANO_ATUAL,
  dados:     [],
  editandoId: null,

  async init() {
    Auth.proteger();
    Auth.preencherUI();
    this.initFiltros();
    this.initForm();
    this.initSidebar();
    await this.carregar();
  },

  initFiltros() {
    const selMes = document.getElementById('sel-mes');
    const selAno = document.getElementById('sel-ano');

    if (selMes) {
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

    this.dados = res.data || [];
    this.renderTabela();
    this.atualizarContador();
    this.setLoadingTabela(false);
  },

  renderTabela(busca = '') {
    const tbody = document.getElementById('tabela-vendas');
    if (!tbody) return;

    let lista = this.dados;

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
        <td>${formatData(v.data)}</td>
        ${Auth.eAdmin() ? `<td class="col-pac"><span class="badge badge-blue">${v.pac || '—'}</span></td>` : ''}
        <td title="${v.nome}">${v.nome || '—'}</td>
        <td class="col-curso" title="${v.curso}">${v.curso || '—'}</td>
        <td class="col-origem">${v.origem || '—'}</td>
        <td class="col-lead"><span class="badge ${v.leadNovo === 'Sim' || v.leadNovo === 'SIM' ? 'badge-green' : 'badge-navy'}">${v.leadNovo || '—'}</span></td>
        <td style="text-align:right;font-weight:700;color:var(--navy)">${formatBRL(v.valor)}</td>
        <td>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="Vendas.editar('${v.id}')" title="Editar">✎</button>
        </td>
      </tr>
    `).join('');
  },

  atualizarContador() {
    const total = this.dados.reduce((s, v) => s + (Number(v.valor) || 0), 0);
    const el = document.getElementById('info-total');
    if (el) el.textContent = `${this.dados.length} vendas · ${formatBRL(total)}`;
  },

  abrirForm(venda = null) {
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
      document.getElementById('f-pac').value          = Auth.eAdmin() ? 'Thiago' : Auth.getPac();
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
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      if (confirm('Deseja sair?')) Auth.logout();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Vendas.init());
