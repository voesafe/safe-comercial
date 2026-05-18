// ============================================================
// Faturamento.gs — Faturamento por canal (só admin)
// SAFE Escola de Aviação | Dashboard Comercial
// ============================================================

var CANAIS = ['Lojinha', 'Safe Academy', 'Azul Pontos', 'Lito Academy', 'Vendas Comercial'];

/**
 * Lista faturamento por canal com filtro de mês/ano
 */
function listarFaturamento(mes, ano) {
  var sheet = getSheet(SHEETS.FATURAMENTO);
  var data = sheet.getDataRange().getValues();
  var registros = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    if (mes && Number(row[1]) !== Number(mes)) continue;
    if (ano && Number(row[2]) !== Number(ano)) continue;

    registros.push({
      id:           row[0],
      mes:          row[1],
      ano:          row[2],
      canal:        row[3],
      valor:        row[4],
      atualizadoEm: row[5]
    });
  }

  return registros;
}

/**
 * Salva ou atualiza faturamento de um canal em um mês/ano
 */
function salvarFaturamento(mes, ano, canal, valor) {
  var sheet = getSheet(SHEETS.FATURAMENTO);
  var data = sheet.getDataRange().getValues();

  // Verifica se já existe registro para esse mês/ano/canal
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (Number(row[1]) === Number(mes) &&
        Number(row[2]) === Number(ano) &&
        String(row[3]).toLowerCase() === String(canal).toLowerCase()) {
      // Atualiza
      sheet.getRange(i + 1, 5).setValue(Number(valor));
      sheet.getRange(i + 1, 6).setValue(new Date());
      return { acao: 'atualizado' };
    }
  }

  // Cria novo
  sheet.appendRow([
    gerarId(),
    Number(mes),
    Number(ano),
    canal,
    Number(valor),
    new Date()
  ]);

  return { acao: 'criado' };
}

/**
 * Resumo consolidado de faturamento por mês (todos os canais)
 */
function resumoFaturamento(ano) {
  var sheet = getSheet(SHEETS.FATURAMENTO);
  var data = sheet.getDataRange().getValues();

  // Pega vendas comerciais do Sheets de Vendas para completar
  var vendasSheet = getSheet(SHEETS.VENDAS);
  var vendasData = vendasSheet.getDataRange().getValues();

  var meses = {};

  // Inicializa meses com canais zerados
  for (var m = 1; m <= 12; m++) {
    meses[m] = { total: 0 };
    CANAIS.forEach(function(c) { meses[m][c] = 0; });
  }

  // Preenche com dados de faturamento manual
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    if (ano && Number(row[2]) !== Number(ano)) continue;
    var m = Number(row[1]);
    if (meses[m] && row[3] !== 'Vendas Comercial') {
      meses[m][row[3]] = Number(row[4]) || 0;
    }
  }

  // Calcula Vendas Comercial direto da aba de vendas
  for (var j = 1; j < vendasData.length; j++) {
    var vRow = vendasData[j];
    if (!vRow[0]) continue;
    if (ano && Number(vRow[15]) !== Number(ano)) continue;
    var mes = Number(vRow[14]);
    if (meses[mes]) {
      meses[mes]['Vendas Comercial'] += Number(vRow[11]) || 0;
    }
  }

  // Calcula totais
  Object.keys(meses).forEach(function(m) {
    var total = 0;
    CANAIS.forEach(function(c) { total += meses[m][c] || 0; });
    meses[m].total = total;
  });

  return meses;
}
