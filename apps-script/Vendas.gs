// ============================================================
// Vendas.gs — CRUD completo de vendas
// SAFE Escola de Aviação | Dashboard Comercial
// ============================================================

/**
 * Lista vendas com filtros opcionais
 * @param {string} pac - filtra por PAC (null = todos, só admin)
 * @param {number} mes - mês (opcional)
 * @param {number} ano - ano (opcional)
 */
function listarVendas(pac, mes, ano) {
  var sheet = getSheet(SHEETS.VENDAS);
  var data = sheet.getDataRange().getValues();
  var vendas = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;

    // Filtro de PAC
    if (pac && String(row[2]).toLowerCase() !== pac.toLowerCase()) continue;

    // Filtro de mês/ano
    if (mes && Number(row[14]) !== Number(mes)) continue;
    if (ano && Number(row[15]) !== Number(ano)) continue;

    vendas.push(linhaParaVenda(row));
  }

  return vendas;
}

/**
 * Busca uma venda por ID
 */
function buscarVenda(id) {
  var sheet = getSheet(SHEETS.VENDAS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return linhaParaVenda(data[i]);
    }
  }
  return null;
}

/**
 * Cria nova venda
 */
function criarVenda(dados) {
  var sheet = getSheet(SHEETS.VENDAS);
  var id = gerarId();
  var dataVenda = new Date(dados.data);
  var mes = dataVenda.getMonth() + 1;
  var ano = dataVenda.getFullYear();

  sheet.appendRow([
    id,
    dataVenda,
    dados.pac,
    dados.nome,
    dados.sexo        || '',
    dados.idade       || '',
    dados.cidade      || '',
    dados.estado      || '',
    dados.origem      || '',
    dados.curso       || '',
    dados.email       || '',
    Number(dados.valor) || 0,
    dados.leadNovo    || 'Não',
    dados.quemComprou || '',
    mes,
    ano
  ]);

  return { id: id };
}

/**
 * Atualiza venda existente
 * pacSolicitante: quem está fazendo a edição (para checar permissão)
 * perfilSolicitante: 'admin' ou 'pac'
 */
function atualizarVenda(id, dados, pacSolicitante, perfilSolicitante) {
  var sheet = getSheet(SHEETS.VENDAS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(id)) continue;

    // PAC só pode editar próprias vendas
    if (perfilSolicitante !== 'admin' &&
        String(data[i][2]).toLowerCase() !== pacSolicitante.toLowerCase()) {
      throw new Error('Sem permissão para editar esta venda.');
    }

    var row = i + 1;
    var dataVenda = new Date(dados.data);

    sheet.getRange(row, 2).setValue(dataVenda);
    sheet.getRange(row, 3).setValue(dados.pac);
    sheet.getRange(row, 4).setValue(dados.nome);
    sheet.getRange(row, 5).setValue(dados.sexo        || '');
    sheet.getRange(row, 6).setValue(dados.idade       || '');
    sheet.getRange(row, 7).setValue(dados.cidade      || '');
    sheet.getRange(row, 8).setValue(dados.estado      || '');
    sheet.getRange(row, 9).setValue(dados.origem      || '');
    sheet.getRange(row, 10).setValue(dados.curso      || '');
    sheet.getRange(row, 11).setValue(dados.email      || '');
    sheet.getRange(row, 12).setValue(Number(dados.valor) || 0);
    sheet.getRange(row, 13).setValue(dados.leadNovo    || 'Não');
    sheet.getRange(row, 14).setValue(dados.quemComprou || '');
    sheet.getRange(row, 15).setValue(dataVenda.getMonth() + 1);
    sheet.getRange(row, 16).setValue(dataVenda.getFullYear());

    return true;
  }
  return false;
}

/**
 * KPIs para o dashboard
 * Se pac for null e perfil for admin, retorna dados de todos
 */
function calcularKPIs(pac, perfilSolicitante, mes, ano) {
  var todasVendas = listarVendas(
    perfilSolicitante === 'admin' ? null : pac,
    mes,
    ano
  );

  var totalVendas    = 0;
  var totalReceita   = 0;
  var leadsNovos     = 0;
  var origens        = {};
  var cursos         = {};
  var porPac         = {};
  var porMes         = {};

  todasVendas.forEach(function(v) {
    totalVendas++;
    totalReceita += Number(v.valor) || 0;
    if (v.leadNovo === 'Sim' || v.leadNovo === 'SIM') leadsNovos++;

    // Origem
    var origem = v.origem || 'Não informado';
    origens[origem] = (origens[origem] || 0) + 1;

    // Curso
    var curso = v.curso || 'Não informado';
    cursos[curso] = (cursos[curso] || 0) + 1;

    // Por PAC
    var pacNome = v.pac || 'Sem PAC';
    if (!porPac[pacNome]) porPac[pacNome] = { vendas: 0, receita: 0 };
    porPac[pacNome].vendas++;
    porPac[pacNome].receita += Number(v.valor) || 0;

    // Por mês
    var chave = v.ano + '-' + String(v.mes).padStart(2, '0');
    if (!porMes[chave]) porMes[chave] = { vendas: 0, receita: 0 };
    porMes[chave].vendas++;
    porMes[chave].receita += Number(v.valor) || 0;
  });

  var ticketMedio = totalVendas > 0 ? totalReceita / totalVendas : 0;

  return {
    totalVendas:  totalVendas,
    totalReceita: totalReceita,
    ticketMedio:  ticketMedio,
    leadsNovos:   leadsNovos,
    origens:      origens,
    cursos:       cursos,
    porPac:       porPac,
    porMes:       porMes
  };
}
