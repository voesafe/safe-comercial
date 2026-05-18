// ============================================================
// Concorrencia.gs — CRUD de dados de concorrência
// SAFE Escola de Aviação | Dashboard Comercial
// ============================================================

function listarConcorrencia() {
  var sheet = getSheet(SHEETS.CONCORRENCIA);
  var data = sheet.getDataRange().getValues();
  var lista = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({
      id:       row[0],
      escola:   row[1],
      vendedor: row[2],
      curso:    row[3],
      valor:    row[4],
      atualizadoEm: row[5]
    });
  }
  return lista;
}

function criarConcorrencia(dados) {
  var sheet = getSheet(SHEETS.CONCORRENCIA);
  var id = gerarId();
  sheet.appendRow([
    id,
    dados.escola   || '',
    dados.vendedor || '',
    dados.curso    || '',
    Number(dados.valor) || 0,
    new Date()
  ]);
  return { id: id };
}

function editarConcorrencia(dados) {
  var sheet = getSheet(SHEETS.CONCORRENCIA);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(dados.id)) continue;
    var row = i + 1;
    sheet.getRange(row, 2).setValue(dados.escola   || '');
    sheet.getRange(row, 3).setValue(dados.vendedor || '');
    sheet.getRange(row, 4).setValue(dados.curso    || '');
    sheet.getRange(row, 5).setValue(Number(dados.valor) || 0);
    sheet.getRange(row, 6).setValue(new Date());
    return { atualizado: true };
  }
  return { atualizado: false };
}

function excluirConcorrencia(id) {
  var sheet = getSheet(SHEETS.CONCORRENCIA);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { removido: true };
    }
  }
  return { removido: false };
}
