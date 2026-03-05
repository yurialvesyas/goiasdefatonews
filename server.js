const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const session = require("express-session")
const multer = require("multer")

const app = express()

app.set("view engine","ejs")
app.use(express.static("public"))
app.use(express.urlencoded({extended:true}))

app.use(session({
secret:"goiasdefatonews",
resave:false,
saveUninitialized:true
}))

const db = new sqlite3.Database("database.db")

/* TABELA DE NOTICIAS */

db.run(`
CREATE TABLE IF NOT EXISTS noticias (
id INTEGER PRIMARY KEY AUTOINCREMENT,
titulo TEXT,
conteudo TEXT,
imagem TEXT,
visualizacoes INTEGER DEFAULT 0
)
`)

/* TABELA DE USUARIOS */

db.run(`
CREATE TABLE IF NOT EXISTS usuarios (
id INTEGER PRIMARY KEY AUTOINCREMENT,
usuario TEXT,
senha TEXT
)
`)

/* CRIA ADMIN PADRAO */

db.get("SELECT * FROM usuarios WHERE usuario='admin'",(err,row)=>{
if(!row){
db.run("INSERT INTO usuarios (usuario,senha) VALUES ('admin','123456')")
}
})

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

app.get("/",(req,res)=>{

db.all("SELECT * FROM noticias ORDER BY id DESC",(err,rows)=>{

res.render("index",{noticias:rows})

})

})

/* PAGINA DA NOTICIA */

app.get("/noticia/:id",(req,res)=>{

let id = req.params.id

db.run(
"UPDATE noticias SET visualizacoes = visualizacoes + 1 WHERE id=?",
[id]
)

db.get(
"SELECT * FROM noticias WHERE id=?",
[id],
(err,row)=>{

res.render("noticia",{noticia:row})

})

})

/* LOGIN */

app.get("/login",(req,res)=>{
res.render("login")
})

app.post("/login",(req,res)=>{

let usuario = req.body.usuario
let senha = req.body.senha

db.get(
"SELECT * FROM usuarios WHERE usuario=? AND senha=?",
[usuario,senha],
(err,row)=>{

if(row){

req.session.usuario = usuario
res.redirect("/admin")

}else{

res.send("Login inválido")

}

})

})

/* ADMIN */

app.get("/admin",(req,res)=>{

if(!req.session.usuario){
return res.redirect("/login")
}

res.render("admin")

})

/* PUBLICAR NOTICIA */

app.post("/admin/publicar",upload.single("imagem"),(req,res)=>{

let titulo = req.body.titulo
let conteudo = req.body.conteudo
let imagem = req.file ? req.file.filename : null

db.run(
"INSERT INTO noticias (titulo,conteudo,imagem) VALUES (?,?,?)",
[titulo,conteudo,imagem]
)

res.redirect("/")

})

/* LOGOUT */

app.get("/logout",(req,res)=>{

req.session.destroy()
res.redirect("/login")

})

/* SERVIDOR */

app.listen(3000,()=>{
console.log("Portal rodando em http://localhost:3000")
})