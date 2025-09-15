const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL com sucesso!');
});

pool.on('error', (err) => {
  console.error('❌ Erro no cliente PostgreSQL:', err.message);
});

const initDatabase = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transacoes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        descricao VARCHAR(200) NOT NULL,
        tipo VARCHAR(10) CHECK (tipo IN ('receita', 'despesa')),
        valor DECIMAL(10, 2) NOT NULL,
        data DATE NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabelas verificadas/criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    console.log('📋 Verifique se:');
    console.log('1. O PostgreSQL está rodando');
    console.log('2. As credenciais no .env estão corretas');
    console.log('3. O banco de dados "financeiro_db" existe');
    console.log('4. O usuário "postgres" tem permissões');
  }
};

console.log('🔍 Verificando variáveis de ambiente:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '*** (definida)' : '❌ NÃO DEFINIDA');

initDatabase();

module.exports = { pool };