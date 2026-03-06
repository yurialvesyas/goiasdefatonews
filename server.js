const express = require("express")
const session = require("express-session")
const multer = require("multer")
const { Pool } = require("pg")

const app = express()

app.set("view engine","ejs")
app.use(express.static("public"))
app.use(express.urlencoded({extended:true}))

app.use(session({
secret:"goiasdefatonews",
resave:false,
saveUninitialized:true
}))

/* CONEXÃO POSTGRESQL (NEON) */

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: {
rejectUnauthorized:false
}
})

/* TESTAR CONEXÃO */

pool.query("SELECT NOW()")
.then(res => console.log("✅ Conectado ao Neon:", res.rows[0]))
.catch(err => console.log("❌ Erro conexão Neon:", err))

/* CRIAR TABELAS */

async function criarTabelas(){

await pool.query(`
CREATE TABLE IF NOT EXISTS noticias (
id SERIAL PRIMARY KEY,
titulo TEXT,
conteudo TEXT,
imagem TEXT,
autor TEXT,
data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
visualizacoes INTEGER DEFAULT 0
)
`)

await pool.query(`
CREATE TABLE IF NOT EXISTS usuarios (
id SERIAL PRIMARY KEY,
usuario TEXT,
senha TEXT
)
`)

/* CRIAR ADMIN PADRÃO */

const admin = await pool.query(
"SELECT * FROM usuarios WHERE usuario=$1",
["admin"]
)

if(admin.rows.length === 0){

await pool.query(
"INSERT INTO usuarios (usuario,senha) VALUES ($1,$2)",
["admin","123456"]
)

}

}

criarTabelas()

/* CONFIGURAR UPLOAD */

const storage = multer.diskStorage({
destination:(req,file,cb)=>{
cb(null,"public/img")
},
filename:(req,file,cb)=>{
cb(null,Date.now()+"-"+file.originalname)
}
})

const upload = multer({storage:storage})

/* HOME */

app.get("/", async (req,res)=>{

const noticias = await pool.query(
"SELECT * FROM noticias ORDER BY data_publicacao DESC"
)

res.render("index",{noticias:noticias.rows})

})

/* VER NOTICIA */

app.get("/noticia/:id", async (req,res)=>{

let id = req.params.id

await pool.query(
"UPDATE noticias SET visualizacoes = visualizacoes + 1 WHERE id=$1",
[id]
)

const noticia = await pool.query(
"SELECT * FROM noticias WHERE id=$1",
[id]
)

const maisLidas = await pool.query(
"SELECT * FROM noticias ORDER BY visualizacoes DESC LIMIT 5"
)

res.render("noticia",{
noticia:noticia.rows[0],
maisLidas:maisLidas.rows
})

})

/* LOGIN */

app.get("/login",(req,res)=>{
res.render("login")
})

app.post("/login", async (req,res)=>{

let usuario = req.body.usuario
let senha = req.body.senha

const result = await pool.query(
"SELECT * FROM usuarios WHERE usuario=$1 AND senha=$2",
[usuario,senha]
)

if(result.rows.length > 0){

req.session.usuario = usuario
res.redirect("/admin")

}else{

res.send("Login inválido")

}

})

/* PAINEL ADMIN */

app.get("/admin", async (req,res)=>{

if(!req.session.usuario){
return res.redirect("/login")
}

const noticias = await pool.query(
"SELECT * FROM noticias ORDER BY data_publicacao DESC"
)

res.render("admin",{noticias:noticias.rows})

})

/* PUBLICAR NOTICIA */

app.post("/admin/publicar",upload.single("imagem"), async (req,res)=>{

let titulo = req.body.titulo
let conteudo = req.body.conteudo
let autor = req.body.autor
let imagem = req.file ? req.file.filename : null

await pool.query(
"INSERT INTO noticias (titulo,conteudo,imagem,autor) VALUES ($1,$2,$3,$4)",
[titulo,conteudo,imagem,autor]
)

res.redirect("/admin")

})

/* EXCLUIR NOTICIA */

app.get("/admin/excluir/:id", async (req,res)=>{

let id = req.params.id

await pool.query(
"DELETE FROM noticias WHERE id=$1",
[id]
)

res.redirect("/admin")

})

/* EDITAR NOTICIA */

app.get("/admin/editar/:id", async (req,res)=>{

let id = req.params.id

const noticia = await pool.query(
"SELECT * FROM noticias WHERE id=$1",
[id]
)

res.render("editar",{noticia:noticia.rows[0]})

})

app.post("/admin/editar/:id", async (req,res)=>{

let id = req.params.id
let titulo = req.body.titulo
let conteudo = req.body.conteudo

await pool.query(
"UPDATE noticias SET titulo=$1, conteudo=$2 WHERE id=$3",
[titulo,conteudo,id]
)

res.redirect("/admin")

})

/* LOGOUT */

app.get("/logout",(req,res)=>{
req.session.destroy()
res.redirect("/login")
})

/* SERVIDOR */

const PORT = process.env.PORT || 3000

app.listen(PORT,()=>{
console.log("🚀 Servidor rodando")
})