const express = require('express');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;
const session = require('express-session');

app.use(session({
  secret: 'rodaki_super_secreto', // pode personalizar depois
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 dias
}));


// Configurar banco de dados
const db = new sqlite3.Database('./rodaki.db');

// Criar tabelas se não existirem
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS motoboys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    cidade TEXT,
    tipo_veiculo TEXT,
    whatsapp TEXT,
    documento TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    cidade TEXT,
    tipo_entregador TEXT,
    whatsapp TEXT
  )`);
});

// Configuração do multer para uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Configurações do Express
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Página inicial
app.get('/', (req, res) => {
    db.all(`SELECT * FROM vagas ORDER BY id DESC`, [], (err, vagas) => {
      if (err) return res.send('Erro ao carregar vagas.');
      res.render('index', { vagas, session: req.session });
    });
  });
  
// Página do formulário de motoboy
app.get('/motoboy', (req, res) => {
  res.render('form_motoboy');
});

app.post('/motoboy', upload.single('documento'), async (req, res) => {
    const { nome, cidade, tipo_veiculo, email, senha } = req.body;
    const documento = req.file ? req.file.filename : null;
  
    try {
      const senhaCriptografada = await bcrypt.hash(senha, 10);
  
      db.run(
        `INSERT INTO motoboys (nome, cidade, tipo_veiculo, email, documento, senha) VALUES (?, ?, ?, ?, ?, ?)`,
        [nome, cidade, tipo_veiculo, email, documento, senhaCriptografada],
        (err) => {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed: motoboys.email')) {
              return res.send('E-mail já cadastrado.');
            }
            console.error("Erro ao salvar motoboy:", err.message);
            return res.send('Erro ao salvar no banco.');
          }
          res.redirect('/login-motoboy');
        }
      );
    } catch (error) {
      console.error("Erro ao criptografar senha:", error);
      res.send('Erro interno.');
    }
  });

  // Página de login do motoboy
app.get('/login-motoboy', (req, res) => {
    res.render('login_motoboy', { erro: null });
  });
  
// Processa o login
  app.post('/login-motoboy', (req, res) => {
    const { email, senha } = req.body;
  
    db.get(`SELECT * FROM motoboys WHERE email = ?`, [email], async (err, motoboy) => {
      if (err || !motoboy) {
        return res.render('login_motoboy', { erro: 'E-mail não encontrado.' });
      }
  
      const senhaValida = await bcrypt.compare(senha, motoboy.senha);
      if (!senhaValida) {
        return res.render('login_motoboy', { erro: 'Senha incorreta.' });
      }
  
      req.session.motoboyId = motoboy.id;
      res.redirect(`/painel-motoboy`);
    });
  });

// Painel do motoboy (rota protegida)
app.get('/painel-motoboy', (req, res) => {
    if (!req.session.motoboyId) {
      return res.redirect('/login-motoboy'); // se não estiver logado, redireciona para login
    }
  
    res.send(`Bem-vindo, motoboy ID ${req.session.motoboyId}`);
  });
  

// Página do formulário de pedido
app.get('/pedido', (req, res) => {
  res.render('form_pedido');
});

app.post('/pedido', (req, res) => {
  const { nome, cidade, tipo_entregador, whatsapp } = req.body;

  db.run(
    `INSERT INTO pedidos (nome, cidade, tipo_entregador, whatsapp) VALUES (?, ?, ?, ?)`,
    [nome, cidade, tipo_entregador, whatsapp],
    (err) => {
      if (err) return res.send('Erro ao salvar no banco.');
      res.send('Pedido enviado com sucesso!');
    }
  );
});

// Formulário de cadastro de lojista
app.get('/cadastro-lojista', (req, res) => {
  res.render('form_lojista', { mensagemErro: null, mensagemSucesso: null });
});

app.post('/cadastro-lojista', async (req, res) => {
  const { nome, empresa, cidade, email, tipo_operacao, senha } = req.body;

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    db.run(
      `INSERT INTO lojistas (nome, empresa, cidade, email, tipo_operacao, senha) VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, empresa, cidade, email, tipo_operacao, senhaCriptografada],
      (err) => {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed: lojistas.email')) {
            return res.render('form_lojista', {
              mensagemErro: 'Este e-mail já está cadastrado.',
              mensagemSucesso: null
            });
          }
          return res.render('form_lojista', {
            mensagemErro: 'Erro ao salvar no banco.',
            mensagemSucesso: null
          });
        }

        return res.render('form_lojista', {
          mensagemErro: null,
          mensagemSucesso: 'Cadastro realizado com sucesso! Faça login agora.'
        });
      }
    );
  } catch (error) {
    console.error("Erro ao criptografar senha:", error);
    return res.render('form_lojista', {
      mensagemErro: 'Erro interno no servidor.',
      mensagemSucesso: null
    });
  }
});


// Formulário de login do lojista
app.get('/login-lojista', (req, res) => {
    res.render('login_lojista', { erro: null });
  });
  
  // Validação de login
  app.post('/login-lojista', (req, res) => {
    const { email, senha } = req.body;
  
    db.get(`SELECT * FROM lojistas WHERE email = ?`, [email], async (err, lojista) => {
      if (err || !lojista) {
        return res.render('login_lojista', { erro: 'E-mail não encontrado.' });
      }
  
      const senhaValida = await bcrypt.compare(senha, lojista.senha);
  
      if (!senhaValida) {
        return res.render('login_lojista', { erro: 'Senha incorreta.' });
      }
  
      // ✅ Salva o ID do lojista na sessão
      req.session.lojista_id = lojista.id;
  
      // Redireciona para o painel (sem passar o ID pela URL)
      res.redirect('/painel-lojista');
    });
  });
  

  

// Formulário para criar vaga
app.get('/vaga/nova', (req, res) => {
    res.render('vaga_criar');
  });
  
  app.post('/vaga/nova', (req, res) => {
    const { cidade, tipo_entregador, condicoes, detalhes } = req.body;
    const lojistaId = req.session.lojista_id; // Pega o ID da sessão do lojista autenticado
  
    if (!lojistaId) {
      return res.redirect('/login-lojista');
    }
  
    db.run(
      `INSERT INTO vagas (lojista_id, cidade, tipo_entregador, condicoes, detalhes) VALUES (?, ?, ?, ?, ?)`,
      [lojistaId, cidade, tipo_entregador, condicoes, detalhes],
      (err) => {
        if (err) return res.send('Erro ao salvar no banco.');
        res.redirect('/painel-lojista');
      }
    );
  });
  

  // Página que lista as vagas
app.get('/vagas', (req, res) => {
    db.all(`SELECT * FROM vagas ORDER BY created_at DESC`, [], (err, rows) => {
      if (err) return res.send('Erro ao carregar vagas.');
      res.render('vaga_listar', { vagas: rows });
    });
  });

  // Página para se candidatar à vaga
  app.get('/vaga/:id/candidatar', (req, res) => {
    console.log(">> ENTROU NA ROTA DE CANDIDATURA"); // <- Adicione esta linha
    const vagaId = req.params.id;
  
    db.get(`SELECT * FROM vagas WHERE id = ?`, [vagaId], (err, vaga) => {
      if (err || !vaga) return res.send('Vaga não encontrada.');
      res.render('vaga_candidatar', { vaga });
    });
  });
  
  
  app.post('/vaga/:id/candidatar', (req, res) => {
    const vagaId = req.params.id;
    const { nome, cidade, whatsapp } = req.body;
  
    // Inserir o motoboy na tabela de motoboys (sem documento)
    db.run(
      `INSERT INTO motoboys (nome, cidade, tipo_veiculo, whatsapp, documento) VALUES (?, ?, ?, ?, ?)`,
      [nome, cidade, 'indefinido', whatsapp, null],
      function (err) {
        if (err) return res.send('Erro ao cadastrar motoboy.');
  
        const motoboyId = this.lastID;
  
        db.run(
          `INSERT INTO candidaturas (motoboy_id, vaga_id) VALUES (?, ?)`,
          [motoboyId, vagaId],
          (err2) => {
            if (err2) return res.send('Erro ao registrar candidatura.');
            res.send('Candidatura enviada com sucesso!');
          }
        );
      }
    );
  });

// Painel do lojista para ver suas vagas e candidaturas
app.get('/painel-lojista', (req, res) => {
    const lojistaId = req.session.lojista_id;
  
    if (!lojistaId) return res.render('painel_lojista', { vagas: [] });
  
    db.all(`SELECT * FROM vagas WHERE lojista_id = ?`, [lojistaId], (err, vagas) => {
      if (err) return res.send('Erro ao buscar vagas.');
  
      const vagasComCandidatos = [];
  
      let pendentes = vagas.length;
      if (pendentes === 0) return res.render('painel_lojista', { vagas: [] });
  
      vagas.forEach((vaga) => {
        db.all(
          `SELECT m.nome, m.cidade, m.whatsapp 
           FROM candidaturas c 
           JOIN motoboys m ON m.id = c.motoboy_id 
           WHERE c.vaga_id = ?`,
          [vaga.id],
          (err2, candidatos) => {
            vagasComCandidatos.push({ ...vaga, candidatos: candidatos || [] });
            pendentes--;
            if (pendentes === 0) {
              res.render('painel_lojista', { vagas: vagasComCandidatos });
            }
          }
        );
      });
    });
  });
  

// Iniciar servidor
app.listen(port, () => {
  console.log(`Rodaki rodando em http://localhost:${port}`);
});
