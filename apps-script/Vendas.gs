// ============================================================
// Vendas.gs — CRUD completo de vendas
// SAFE Escola de Aviação | Dashboard Comercial
// ============================================================

function listarVendas(pac, mes, ano) {
  var sheet = getSheet(SHEETS.VENDAS);
  var data = sheet.getDataRange().getValues();
  var vendas = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    if (pac && String(row[2]).toLowerCase() !== pac.toLowerCase()) continue;
    if (mes && Number(row[14]) !== Number(mes)) continue;
    if (ano && Number(row[15]) !== Number(ano)) continue;
    vendas.push(linhaParaVenda(row));
  }

  vendas.sort(function(a, b) {
    var dataA = a.data ? new Date(a.data).getTime() : 0;
    var dataB = b.data ? new Date(b.data).getTime() : 0;
    if (dataB !== dataA) return dataB - dataA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  return vendas;
}

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

function criarVenda(dados) {
  var sheet = getSheet(SHEETS.VENDAS);
  var id = gerarId();
  var dataVenda = new Date(dados.data);
  var mes = dataVenda.getMonth() + 1;
  var ano = dataVenda.getFullYear();

  sheet.appendRow([
    id,
    dataVenda,
    dados.pac        || '',
    dados.nome       || '',
    dados.sexo       || '',
    dados.nascimento || dados.idade || '',
    dados.cidade     || '',
    dados.estado     || '',
    dados.origem     || '',
    dados.curso      || '',
    dados.email      || '',
    Number(dados.valor) || 0,
    dados.leadNovo   || 'Não',
    dados.quemComprou|| '',
    mes,
    ano
  ]);

  return { id: id };
}

function atualizarVenda(id, dados, pacSolicitante, perfilSolicitante) {
  var sheet = getSheet(SHEETS.VENDAS);
  var data = sheet.getDataRange().getValues();

  if (perfilSomenteLeitura(perfilSolicitante)) {
    throw new Error('Acesso somente leitura.');
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(id)) continue;

    if (!perfilEhAdminCompleto(perfilSolicitante) &&
        String(data[i][2]).toLowerCase() !== pacSolicitante.toLowerCase()) {
      throw new Error('Sem permissão para editar esta venda.');
    }

    var row = i + 1;
    var dataVenda = new Date(dados.data);

    sheet.getRange(row, 2).setValue(dataVenda);
    sheet.getRange(row, 3).setValue(dados.pac        || '');
    sheet.getRange(row, 4).setValue(dados.nome       || '');
    sheet.getRange(row, 5).setValue(dados.sexo       || '');
    sheet.getRange(row, 6).setValue(dados.nascimento || dados.idade || '');
    sheet.getRange(row, 7).setValue(dados.cidade     || '');
    sheet.getRange(row, 8).setValue(dados.estado     || '');
    sheet.getRange(row, 9).setValue(dados.origem     || '');
    sheet.getRange(row, 10).setValue(dados.curso     || '');
    sheet.getRange(row, 11).setValue(dados.email     || '');
    sheet.getRange(row, 12).setValue(Number(dados.valor) || 0);
    sheet.getRange(row, 13).setValue(dados.leadNovo  || 'Não');
    sheet.getRange(row, 14).setValue(dados.quemComprou || '');
    sheet.getRange(row, 15).setValue(dataVenda.getMonth() + 1);
    sheet.getRange(row, 16).setValue(dataVenda.getFullYear());

    return true;
  }
  return false;
}

function calcularKPIs(pac, perfilSolicitante, mes, ano) {
  var todasVendas = listarVendas(pac, mes, ano);

  var totalVendas  = 0;
  var totalReceita = 0;
  var leadsNovos   = 0;
  var origens      = {};
  var cursos       = {};
  var porPac       = {};
  var porMes       = {};

  todasVendas.forEach(function(v) {
    totalVendas++;
    totalReceita += Number(v.valor) || 0;
    if (v.leadNovo === 'Sim' || v.leadNovo === 'SIM') leadsNovos++;

    var origem = v.origem || 'Não informado';
    origens[origem] = (origens[origem] || 0) + 1;

    var curso = v.curso || 'Não informado';
    cursos[curso] = (cursos[curso] || 0) + 1;

    var pacNome = v.pac || 'Sem PAC';
    if (!porPac[pacNome]) porPac[pacNome] = { vendas: 0, receita: 0 };
    porPac[pacNome].vendas++;
    porPac[pacNome].receita += Number(v.valor) || 0;

    var chave = v.ano + '-' + String(v.mes).padStart(2, '0');
    if (!porMes[chave]) porMes[chave] = { vendas: 0, receita: 0 };
    porMes[chave].vendas++;
    porMes[chave].receita += Number(v.valor) || 0;
  });

  var totalVendasGeral = totalVendas;
  var totalReceitaGeral = totalReceita;

  if (!perfilEhAdmin(perfilSolicitante)) {
    var vendasGerais = listarVendas(null, mes, ano);
    totalVendasGeral = vendasGerais.length;
    totalReceitaGeral = vendasGerais.reduce(function(soma, venda) {
      return soma + (Number(venda.valor) || 0);
    }, 0);
  }

  return {
    totalVendas:  totalVendas,
    totalReceita: totalReceita,
    totalVendasGeral: totalVendasGeral,
    totalReceitaGeral: totalReceitaGeral,
    ticketMedio:  totalVendas > 0 ? totalReceita / totalVendas : 0,
    leadsNovos:   leadsNovos,
    origens:      origens,
    cursos:       cursos,
    porPac:       porPac,
    porMes:       porMes
  };
}
