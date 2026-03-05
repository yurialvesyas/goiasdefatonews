const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database("database.db")

db.run(`
INSERT INTO noticias (titulo, conteudo)
VALUES (
"Goiás de Fato News é lançado",
"O novo portal de notícias Goiás de Fato News começa suas atividades trazendo informação e análise política."
)
`)

console.log("Notícia criada")

db.close()