// ============================================================
// Auth.gs — Autenticação e gestão de usuários
// SAFE Escola de Aviação | Dashboard Comercial
// Login por e-mail (coluna D = row[3])
// ============================================================

/**
 * Valida login por e-mail e retorna dados do usuário
 */
function login(email, senha) {
  try {
    var sheet = getSheet(SHEETS.USUARIOS);
    var data = sheet.getDataRange().getValues();
    var hash = hashSenha(senha);

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowEmail  = String(row[3]).trim().toLowerCase();
      var rowHash   = String(row[4]).trim();
      var rowAtivo  = row[6];

      if (rowEmail === email.trim().toLowerCase() && rowHash === hash && valorBooleano(rowAtivo)) {
        return {
          id:     row[0],
          nome:   row[1],
          pac:    row[2],
          email:  row[3],
          perfil: row[5]
        };
      }
    }
    return null;
  } catch(e) {
    throw new Error('Erro no login: ' + e.message);
  }
}

/**
 * Lista usuários ativos para preencher seletor de PAC nos formulários
 */
function listarUsuariosLogin() {
  var sheet = getSheet(SHEETS.USUARIOS);
  var data = sheet.getDataRange().getValues();
  var usuarios = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] || !valorBooleano(row[6])) continue;
    usuarios.push({
      nome:   row[1],
      pac:    row[2],
      email:  row[3],
      perfil: row[5]
    });
  }

  usuarios.sort(function(a, b) {
    return String(a.nome || a.pac).localeCompare(String(b.nome || b.pac), 'pt-BR');
  });

  return usuarios;
}

/**
 * Lista todos os usuários (só admin)
 */
function listarUsuarios() {
  var sheet = getSheet(SHEETS.USUARIOS);
  var data = sheet.getDataRange().getValues();
  var usuarios = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    usuarios.push({
      id:       row[0],
      nome:     row[1],
      pac:      row[2],
      email:    row[3],
      perfil:   row[5],
      ativo:    row[6],
      criadoEm: row[7]
    });
  }
  return usuarios;
}

/**
 * Cria novo usuário (só admin)
 */
function criarUsuario(dados) {
  var sheet = getSheet(SHEETS.USUARIOS);
  var senhaHash = hashSenha(dados.senha || 'safe@2024');
  var id = gerarId();

  sheet.appendRow([
    id,
    dados.nome,
    dados.pac,
    dados.email,
    senhaHash,
    dados.perfil || 'pac',
    dados.hasOwnProperty('ativo') ? valorBooleano(dados.ativo) : true,
    new Date()
  ]);

  return { id: id, nome: dados.nome };
}

/**
 * Atualiza usuário (só admin)
 */
function atualizarUsuario(id, dados) {
  var sheet = getSheet(SHEETS.USUARIOS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      var row = i + 1;
      if (dados.nome)   sheet.getRange(row, 2).setValue(dados.nome);
      if (dados.pac)    sheet.getRange(row, 3).setValue(dados.pac);
      if (dados.email)  sheet.getRange(row, 4).setValue(dados.email);
      if (dados.senha)  sheet.getRange(row, 5).setValue(hashSenha(dados.senha));
      if (dados.perfil) sheet.getRange(row, 6).setValue(dados.perfil);
      if (dados.hasOwnProperty('ativo')) sheet.getRange(row, 7).setValue(dados.ativo);
      return true;
    }
  }
  return false;
}

/**
 * Altera senha do próprio usuário (busca por e-mail)
 */
function alterarSenha(email, senhaAtual, novaSenha) {
  var sheet = getSheet(SHEETS.USUARIOS);
  var data = sheet.getDataRange().getValues();
  var hashAtual = hashSenha(senhaAtual);
  var hashNova  = hashSenha(novaSenha);

  for (var i = 1; i < data.length; i++) {
    var rowEmail = String(data[i][3]).trim().toLowerCase();
    var rowHash  = String(data[i][4]).trim();

    if (rowEmail === String(email).trim().toLowerCase() && rowHash === hashAtual) {
      sheet.getRange(i + 1, 5).setValue(hashNova);
      return true;
    }
  }
  return false;
}
