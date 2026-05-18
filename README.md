# SAFE Comercial — Dashboard de Vendas

Dashboard comercial da SAFE Escola de Aviação.
Google Sheets como backend · GitHub Pages como frontend.

---

## Estrutura do projeto

```
safe-comercial/
├── index.html          # Login
├── dashboard.html      # Dashboard principal (KPIs + gráficos)
├── vendas.html         # Listagem e cadastro de vendas
├── faturamento.html    # Faturamento por canal (admin)
├── concorrencia.html   # Tabela de concorrência (admin)
├── admin.html          # Gestão de usuários (admin)
├── assets/img/logo.png # Logo SAFE
├── css/
│   ├── safe-theme.css  # Design system (cores, tipografia, componentes)
│   └── layout.css      # Sidebar, topbar, grid
└── js/
    ├── config.js       # Configuração central (URL do Apps Script)
    ├── auth.js         # Autenticação e sessão
    ├── api.js          # Comunicação com o backend
    ├── dashboard.js    # Lógica do dashboard
    ├── vendas.js       # CRUD de vendas
    └── admin.js        # Gestão de usuários
```

---

## SETUP — Passo a passo completo

### 1. Configurar o Google Sheets

1. Abra seu Google Sheets de Vendas
2. Anote o **ID da planilha** (na URL: `spreadsheets/d/SEU_ID_AQUI/edit`)

### 2. Configurar o Apps Script

1. No Sheets: **Extensões → Apps Script**
2. Apague o código padrão e crie os seguintes arquivos:

| Arquivo no Apps Script | Conteúdo |
|---|---|
| `Code.gs` | Copie o conteúdo de `apps-script/Code.gs` |
| `Auth.gs` | Copie o conteúdo de `apps-script/Auth.gs` |
| `Vendas.gs` | Copie o conteúdo de `apps-script/Vendas.gs` |
| `Faturamento.gs` | Copie o conteúdo de `apps-script/Faturamento.gs` |
| `Utils.gs` | Copie o conteúdo de `apps-script/Utils.gs` |

3. Em `Utils.gs`, substitua:
   ```js
   var SHEET_ID = 'SEU_SPREADSHEET_ID_AQUI';
   ```
   pelo ID real da sua planilha.

4. Rode a função `inicializarPlanilha()` **uma única vez**:
   - No Apps Script, selecione a função `inicializarPlanilha` no dropdown
   - Clique em **Executar**
   - Autorize as permissões solicitadas
   - Isso cria as abas `USUARIOS`, `VENDAS`, `FATURAMENTO`, `CONCORRENCIA`

5. **Deploy do Apps Script:**
   - Clique em **Implantar → Novo deploy**
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
   - Clique em **Implantar** e copie a URL gerada

### 3. Configurar o frontend

Abra `js/config.js` e substitua:
```js
API_URL: 'SUA_URL_DO_APPS_SCRIPT_AQUI',
```
pela URL copiada no passo anterior.

### 4. Migrar dados históricos (opcional)

Para importar as vendas antigas da planilha Excel para a aba `VENDAS`:

1. Copie os dados das abas mensais (Out/2025 até Mai/2026)
2. Cole na aba `VENDAS` respeitando as colunas:
   `ID | DATA | PAC | NOME_COMPLETO | SEXO | IDADE | CIDADE | ESTADO | ORIGEM_LEAD | CURSO_COMPRADO | EMAIL | VALOR | LEAD_NOVO | QUEM_COMPROU | MES | ANO`
3. Preencha `ID` com qualquer string única (ex: sequência numérica)
4. Preencha `MES` e `ANO` correspondentes à data de cada venda

### 5. Deploy no GitHub Pages

```bash
# Na pasta do projeto
git init
git add .
git commit -m "feat: SAFE Comercial Dashboard v1.0"
git remote add origin https://github.com/SEU_USUARIO/safe-comercial.git
git push -u origin main
```

No GitHub:
- **Settings → Pages → Source: main → / (root)**
- Aguarde ~2 minutos
- Acesse: `https://SEU_USUARIO.github.io/safe-comercial`

---

## Credenciais padrão

| PAC | Senha inicial | Perfil |
|---|---|---|
| Thiago | safe@2024 | Admin |
| Marlon | safe@2024 | Consultor |
| Adauto | safe@2024 | Consultor |

> **Importante:** Altere as senhas no primeiro acesso via **Usuários → Alterar minha senha**.

---

## Perfis de acesso

| Recurso | Consultor (PAC) | Admin (Thiago) |
|---|---|---|
| Ver próprias vendas | ✅ | ✅ |
| Ver vendas de todos | ❌ | ✅ |
| Criar venda | ✅ (própria) | ✅ |
| Editar venda | ✅ (própria) | ✅ |
| KPIs gerais | ❌ (só os próprios) | ✅ |
| Faturamento por canal | ❌ | ✅ |
| Concorrência | ❌ | ✅ |
| Gestão de usuários | ❌ | ✅ |

---

## Personalização

**Adicionar novo PAC:**
1. Acesse `admin.html → Novo Usuário`
2. Preencha nome, PAC (identificador de login), email, perfil
3. Depois, adicione o novo PAC no `<select>` de `index.html` e `vendas.html`

**Alterar cores:** edite as variáveis em `css/safe-theme.css` (seção `:root`)

**Adicionar origem de lead:** edite o array `ORIGENS` em `js/config.js` e o `<select>` em `vendas.html`

---

## Tecnologias

- **Frontend:** HTML5 + CSS3 + JavaScript vanilla
- **Gráficos:** Chart.js 4.4
- **Backend:** Google Apps Script (serverless)
- **Banco de dados:** Google Sheets
- **Hospedagem:** GitHub Pages
- **Fontes:** Raleway + Montserrat (Google Fonts)
