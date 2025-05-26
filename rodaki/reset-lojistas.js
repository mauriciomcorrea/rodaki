const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./rodaki.db');

db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS lojistas`, (err) => {
    if (err) return console.error("Erro ao apagar tabela:", err.message);
    console.log("Tabela 'lojistas' apagada com sucesso.");
  });
});

db.close();
