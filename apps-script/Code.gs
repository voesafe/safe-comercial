// ============================================================
// Code.gs — Roteador principal (doGet / doPost)
// SAFE Escola de Aviação | Dashboard Comercial
//
// DEPLOY: Extensões → Apps Script → Implantar → Novo deploy
//         Tipo: App da Web | Executar como: Eu | Acesso: Qualquer pessoa
// ============================================================

/**
 * GET — para leitura de dados
 * Parâmetros via URL: ?action=...&pac=...&perfil=...&mes=...&ano=...
 */
function doGet(e) {
  try {
    var p = e.parameter;
    var action  = p.action  || '';
    var pac     = p.pac     || null;
    var perfil  = p.perfil  || 'pac';
    var mes     = p.mes     ? Number(p.mes)  : null;
    var ano     = p.ano     ? Number(p.ano)  : null;
    var id      = p.id      || null;

    switch (action) {

      // Dashboard KPIs
      case 'kpis':
        return jsonSuccess(calcularKPIs(pac, perfil, mes, ano));

      // Lista de vendas
      case 'vendas':
        var filtPac = perfil === 'admin' ? null : pac;
        return jsonSuccess(listarVendas(filtPac, mes, ano));

      // Venda específica
      case 'venda':
        if (!id) return jsonError('ID obrigatório');
        return jsonSuccess(buscarVenda(id));

      // Faturamento (admin)
      case 'faturamento':
        return jsonSuccess(listarFaturamento(mes, ano));

      // Resumo faturamento anual (admin)
      case 'faturamento-resumo':
        return jsonSuccess(resumoFaturamento(ano));

      // Lista usuários (admin)
      case 'usuarios':
        if (perfil !== 'admin') return jsonError('Acesso negado');
        return jsonSuccess(listarUsuarios());

      // Canais disponíveis
      case 'canais':
        return jsonSuccess(CANAIS);

      default:
        return jsonError('Ação desconhecida: ' + action);
    }

  } catch(err) {
    return jsonError(err.message);
  }
}

/**
 * POST — para escrita, edição e autenticação
 * Body JSON: { action, dados, pac, perfil, ... }
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action  = body.action  || '';
    var dados   = body.dados   || {};
    var pac     = body.pac     || '';
    var perfil  = body.perfil  || 'pac';

    switch (action) {

      // ── Autenticação ─────────────────────────────────────
      case 'login':
        var usuario = login(dados.pac, dados.senha);
        if (!usuario) return jsonError('PAC ou senha incorretos');
        return jsonSuccess(usuario);

      case 'alterar-senha':
        var ok = alterarSenha(pac, dados.senhaAtual, dados.novaSenha);
        if (!ok) return jsonError('Senha atual incorreta');
        return jsonSuccess({ mensagem: 'Senha alterada com sucesso' });

      // ── Vendas ───────────────────────────────────────────
      case 'criar-venda':
        // PAC só pode criar venda para si mesmo
        if (perfil !== 'admin') dados.pac = pac;
        return jsonSuccess(criarVenda(dados));

      case 'editar-venda':
        if (!dados.id) return jsonError('ID obrigatório');
        var atualizado = atualizarVenda(dados.id, dados, pac, perfil);
        if (!atualizado) return jsonError('Venda não encontrada');
        return jsonSuccess({ mensagem: 'Venda atualizada' });

      // ── Faturamento (admin) ───────────────────────────────
      case 'salvar-faturamento':
        if (perfil !== 'admin') return jsonError('Acesso negado');
        return jsonSuccess(salvarFaturamento(dados.mes, dados.ano, dados.canal, dados.valor));

      // ── Usuários (admin) ──────────────────────────────────
      case 'criar-usuario':
        if (perfil !== 'admin') return jsonError('Acesso negado');
        return jsonSuccess(criarUsuario(dados));

      case 'editar-usuario':
        if (perfil !== 'admin') return jsonError('Acesso negado');
        if (!dados.id) return jsonError('ID obrigatório');
        var editado = atualizarUsuario(dados.id, dados);
        if (!editado) return jsonError('Usuário não encontrado');
        return jsonSuccess({ mensagem: 'Usuário atualizado' });

      default:
        return jsonError('Ação desconhecida: ' + action);
    }

  } catch(err) {
    return jsonError(err.message);
  }
}
