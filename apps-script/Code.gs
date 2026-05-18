// ============================================================
// Code.gs — Roteador principal (doGet / doPost)
// SAFE Escola de Aviação | Dashboard Comercial
//
// DEPLOY: Extensões → Apps Script → Implantar → Novo deploy
//         Tipo: App da Web | Executar como: Eu | Acesso: Qualquer pessoa
// ============================================================

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

      // Admin vê todos (null = sem filtro de PAC); PAC vê só os próprios
      case 'kpis':
        return jsonSuccess(calcularKPIs(perfil === 'admin' ? null : pac, perfil, mes, ano));

      case 'vendas':
        var filtPac = perfil === 'admin' ? null : pac;
        return jsonSuccess(listarVendas(filtPac, mes, ano));

      case 'venda':
        if (!id) return jsonError('ID obrigatório');
        return jsonSuccess(buscarVenda(id));

      case 'faturamento':
        return jsonSuccess(listarFaturamento(mes, ano));

      case 'faturamento-resumo':
        return jsonSuccess(resumoFaturamento(ano));

      case 'usuarios':
        if (perfil !== 'admin') return jsonError('Acesso negado');
        return jsonSuccess(listarUsuarios());

      case 'canais':
        return jsonSuccess(CANAIS);

      default:
        return jsonError('Ação desconhecida: ' + action);
    }

  } catch(err) {
    return jsonError(err.message);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action  = body.action  || '';
    var dados   = body.dados   || {};
    var pac     = body.pac     || '';
    var perfil  = body.perfil  || 'pac';

    switch (action) {

      case 'login':
        var usuario = login(dados.pac, dados.senha);
        if (!usuario) return jsonError('PAC ou senha incorretos');
        return jsonSuccess(usuario);

      case 'alterar-senha':
        var ok = alterarSenha(pac, dados.senhaAtual, dados.novaSenha);
        if (!ok) return jsonError('Senha atual incorreta');
        return jsonSuccess({ mensagem: 'Senha alterada com sucesso' });

      case 'criar-venda':
        if (perfil !== 'admin') dados.pac = pac;
        return jsonSuccess(criarVenda(dados));

      case 'editar-venda':
        if (!dados.id) return jsonError('ID obrigatório');
        var atualizado = atualizarVenda(dados.id, dados, pac, perfil);
        if (!atualizado) return jsonError('Venda não encontrada');
        return jsonSuccess({ mensagem: 'Venda atualizada' });

      case 'salvar-faturamento':
        if (perfil !== 'admin') return jsonError('Acesso negado');
        return jsonSuccess(salvarFaturamento(dados.mes, dados.ano, dados.canal, dados.valor));

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
