const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');
const { pool } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

app.use(session({
    secret: process.env.JWT_SECRET || 'segredo-desenvolvimento',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/');
};

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/transacoes');
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, 'cadastro.html'));
});

app.get('/transacoes', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'transacoes.html'));
});

app.get('/api/usuario', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Não autenticado' 
        });
    }

    res.json({ 
        success: true, 
        usuario: req.session.user 
    });
});

app.post('/api/cadastrar', async (req, res) => {
    const { nome, email, senha } = req.body;
    
    try {
        const usuarioExistente = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Este e-mail já está cadastrado.' 
            });
        }

        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email',
            [nome, email, senhaCriptografada]
        );
        
        res.json({ 
            success: true, 
            message: 'Cadastro realizado com sucesso!',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro no servidor.' 
        });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'E-mail ou senha incorretos.' 
            });
        }

        const usuario = result.rows[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (!senhaValida) {
            return res.status(401).json({ 
                success: false, 
                message: 'E-mail ou senha incorretos.' 
            });
        }

        req.session.user = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email
        };

        req.session.save((err) => {
            if (err) {
                console.error('Erro ao salvar sessão:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erro no servidor.' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Login realizado com sucesso!',
                user: req.session.user
            });
        });
        
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro no servidor.' 
        });
    }
});

app.post('/api/logout', (req, res) => {
    if (!req.session) {
        return res.json({ success: true, message: 'Logout realizado' });
    }

    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao destruir sessão:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao fazer logout' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Logout realizado com sucesso' 
        });
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Servidor está funcionando',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/transacoes', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Não autenticado' 
        });
    }

    try {
        const result = await pool.query(
            `SELECT id, descricao, tipo, valor, data 
             FROM transacoes 
             WHERE usuario_id = $1 
             ORDER BY data DESC, id DESC`,
            [req.session.user.id]
        );
        
        res.json({ 
            success: true, 
            transacoes: result.rows 
        });
    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar transações' 
        });
    }
});

app.post('/api/transacoes', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Não autenticado' 
        });
    }

    const { descricao, tipo, valor, data } = req.body;

    if (!descricao || !tipo || !valor || !data) {
        return res.status(400).json({ 
            success: false, 
            message: 'Todos os campos são obrigatórios' 
        });
    }

    if (!['receita', 'despesa'].includes(tipo)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Tipo deve ser "receita" ou "despesa"' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO transacoes (usuario_id, descricao, tipo, valor, data) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, descricao, tipo, valor, data`,
            [req.session.user.id, descricao, tipo, parseFloat(valor), data]
        );
        
        res.json({ 
            success: true, 
            message: 'Transação criada com sucesso!',
            transacao: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao criar transação:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar transação' 
        });
    }
});

app.get('/api/dashboard', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Não autenticado' 
        });
    }

    try {
        const saldoResult = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END), 0) as saldo
            FROM transacoes 
            WHERE usuario_id = $1
        `, [req.session.user.id]);

        const receitasResult = await pool.query(`
            SELECT COALESCE(SUM(valor), 0) as total
            FROM transacoes 
            WHERE usuario_id = $1 
            AND tipo = 'receita' 
            AND data >= CURRENT_DATE - INTERVAL '30 days'
        `, [req.session.user.id]);

        const despesasResult = await pool.query(`
            SELECT COALESCE(SUM(valor), 0) as total
            FROM transacoes 
            WHERE usuario_id = $1 
            AND tipo = 'despesa' 
            AND data >= CURRENT_DATE - INTERVAL '30 days'
        `, [req.session.user.id]);

        res.json({
            success: true,
            saldo: parseFloat(saldoResult.rows[0].saldo),
            receitas: parseFloat(receitasResult.rows[0].total),
            despesas: parseFloat(despesasResult.rows[0].total)
        });
    } catch (error) {
        console.error('Erro ao buscar dashboard:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar dados' 
        });
    }
});

app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Rota não encontrada' 
    });
});

app.use((error, req, res, next) => {
    console.error('Erro global:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});