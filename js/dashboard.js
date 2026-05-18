// ============================================================
// dashboard.js — Lógica do Dashboard (KPIs + Gráficos)
// SAFE Dashboard Comercial
// ============================================================

// Chart.js via CDN (carregado no HTML)
let chartReceita  = null;
let chartOrigens  = null;
let chartPac      = null;

const Dashboard = {

  mesFiltro: CONFIG.MES_ATUAL,
  anoFiltro:  CONFIG.ANO_ATUAL,

  async init() {
    Auth.proteger();
    Auth.preencherUI();
    this.initFiltros();
    await this.carregar();
    this.initSidebar();
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
      selAno.value = String(this.anoFiltro);
      selAno.addEventListener('change', () => {
        this.anoFiltro = selAno.value;
        this.carregar();
      });
    }
  },

  async carregar() {
    this.setLoading(true);

    const res = await API.getKPIs(this.mesFiltro, this.anoFiltro);

    if (!res.ok) {
      toast(res.error || 'Erro ao carregar dados.', 'error');
      this.setLoading(false);
      return;
    }

    const k = res.data;
    this.renderKPIs(k);
    this.renderChartReceita(k.porMes);
    this.renderChartOrigens(k.origens);
    if (Auth.eAdmin()) this.renderChartPac(k.porPac);
    this.renderRankingCursos(k.cursos);

    this.setLoading(false);
  },

  renderKPIs(k) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('kpi-total-vendas',  k.totalVendas);
    set('kpi-receita',       formatBRL(k.totalReceita));
    set('kpi-ticket',        formatBRL(k.ticketMedio));
    set('kpi-leads',         k.leadsNovos);
  },

  renderChartReceita(porMes) {
    const ctx = document.getElementById('chart-receita');
    if (!ctx) return;

    const labels = [];
    const dados  = [];

    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      let mes = CONFIG.MES_ATUAL - i;
      let ano = CONFIG.ANO_ATUAL;
      if (mes <= 0) { mes += 12; ano--; }
      const chave = `${ano}-${String(mes).padStart(2,'0')}`;
      labels.push(CONFIG.MESES[mes].substring(0,3));
      dados.push((porMes[chave]?.receita || 0));
    }

    if (chartReceita) chartReceita.destroy();

    chartReceita = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Receita (R$)',
          data: dados,
          backgroundColor: dados.map((_, i) =>
            i === dados.length - 1
              ? 'rgba(96,192,191,.9)'
              : 'rgba(91,174,226,.6)'
          ),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => formatBRL(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Montserrat', size: 11 }, color: '#5E7A9A' }
          },
          y: {
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: {
              font: { family: 'Montserrat', size: 10 },
              color: '#5E7A9A',
              callback: v => 'R$ ' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)
            }
          }
        }
      }
    });
  },

  renderChartOrigens(origens) {
    const ctx = document.getElementById('chart-origens');
    if (!ctx) return;

    const labels = Object.keys(origens);
    const dados  = Object.values(origens);

    const cores = [
      '#5BAEE2','#60C0BF','#1D2951','#80B8B8',
      '#3d8cc4','#44a8a7','#253463','#7ec3ea'
    ];

    if (chartOrigens) chartOrigens.destroy();

    chartOrigens = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: dados,
          backgroundColor: cores.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Montserrat', size: 11 },
              color: '#3E5475',
              padding: 12,
              boxWidth: 10,
              borderRadius: 3
            }
          }
        }
      }
    });
  },

  renderChartPac(porPac) {
    const ctx = document.getElementById('chart-pac');
    if (!ctx) return;

    const pacs     = Object.keys(porPac);
    const receitas = pacs.map(p => porPac[p].receita);

    if (chartPac) chartPac.destroy();

    chartPac = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: pacs,
        datasets: [{
          label: 'Receita',
          data: receitas,
          backgroundColor: ['#5BAEE2','#60C0BF','#1D2951'],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => formatBRL(ctx.parsed.x) }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: {
              font: { family: 'Montserrat', size: 10 },
              color: '#5E7A9A',
              callback: v => 'R$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)
            }
          },
          y: {
            grid: { display: false },
            ticks: { font: { family: 'Montserrat', size: 12 }, color: '#1D2951' }
          }
        }
      }
    });
  },

  renderRankingCursos(cursos) {
    const tbody = document.getElementById('ranking-cursos');
    if (!tbody) return;

    const sorted = Object.entries(cursos)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 8);

    if (!sorted.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding:24px">Nenhum dado</td></tr>';
      return;
    }

    const max = sorted[0][1];
    tbody.innerHTML = sorted.map(([curso, qtd], i) => `
      <tr>
        <td style="width:24px;color:var(--gray-300);font-size:.8rem">${i+1}</td>
        <td>
          <div style="font-size:.85rem;font-weight:500;color:var(--navy);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px" title="${curso}">${curso}</div>
          <div style="height:4px;background:var(--gray-100);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${(qtd/max*100).toFixed(0)}%;background:linear-gradient(90deg,var(--blue),var(--teal));border-radius:2px"></div>
          </div>
        </td>
        <td style="text-align:right;font-weight:700;color:var(--navy);font-size:.9rem">${qtd}</td>
      </tr>
    `).join('');
  },

  setLoading(on) {
    document.querySelectorAll('.kpi-value').forEach(el => {
      if (on) el.style.opacity = '.3';
      else    el.style.opacity = '1';
    });
  },

  initSidebar() {
    const toggle  = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('main');
    const overlay = document.getElementById('sidebar-overlay');
    const hamb    = document.getElementById('hamburger');

    // Desktop toggle (collapse)
    toggle?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('sidebar-collapsed');
      toggle.innerHTML = sidebar.classList.contains('collapsed') ? '›' : '‹';
    });

    // Mobile toggle
    hamb?.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    });
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      if (confirm('Deseja sair do dashboard?')) Auth.logout();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
