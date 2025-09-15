# Sistema-financeiro-pessoal
Um sistema completo de gestão financeira pessoal que permite o controle de receitas e despesas com interface intuitiva e relatórios financeiros. 

# no bash
npm install

psql -U postgres

CREATE DATABASE financeiro_db;

\q

# crie um arquivo .env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=financeiro_db
DB_USER=postgres
DB_PASSWORD=[sua senha]

JWT_SECRET=[gerar com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]

# no bash
npm start

# acesse o sistema em http://localhost:3000
