const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./rodaki.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS motoboys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        cidade TEXT,
        tipo_veiculo TEXT,
        email TEXT UNIQUE,
        documento TEXT,
        senha TEXT
      )`);
            

  db.run(`CREATE TABLE IF NOT EXISTS lojistas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    empresa TEXT,
    cidade TEXT,
    email TEXT UNIQUE,
    tipo_operacao TEXT,
    senha TEXT
  )`);
  

  db.run(`CREATE TABLE IF NOT EXISTS vagas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lojista_id INTEGER,
    cidade TEXT,
    tipo_entregador TEXT,
    condicoes TEXT,
    detalhes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lojista_id) REFERENCES lojistas(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS candidaturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motoboy_id INTEGER,
    vaga_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (motoboy_id) REFERENCES motoboys(id),
    FOREIGN KEY (vaga_id) REFERENCES vagas(id)
  )`);
});

db.close();
