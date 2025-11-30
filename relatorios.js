let graficoEvolucao, graficoCategorias;

async function carregarUsuario() {
    const elementoSaudacao = document.getElementById('saudacao-usuario');
    
    try {
        const response = await fetch('/api/usuario');
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }
        
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const data = await response.json();
        
        if (data.success && data.usuario) {
            elementoSaudacao.textContent = `Olá, ${data.usuario.nome}`;
            await carregarRelatorios();
        } else {
            throw new Error('Dados do usuário inválidos');
        }
        
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        elementoSaudacao.textContent = 'Erro ao carregar usuário';
    }
}

async function carregarRelatorios() {
    const periodo = document.getElementById('periodo').value;
    
    try {
        const [evolucaoRes, categoriasRes, comparativoRes] = await Promise.all([
            fetch(`/api/relatorios/evolucao?meses=${periodo}`),
            fetch(`/api/relatorios/categorias?meses=${periodo}`),
            fetch(`/api/relatorios/comparativo?meses=${periodo}`)
        ]);

        if (!evolucaoRes.ok || !categoriasRes.ok || !comparativoRes.ok) {
            throw new Error('Erro ao carregar relatórios');
        }

        const evolucaoData = await evolucaoRes.json();
        const categoriasData = await categoriasRes.json();
        const comparativoData = await comparativoRes.json();

        if (evolucaoData.success && categoriasData.success && comparativoData.success) {
            renderizarGraficoEvolucao(evolucaoData.dados);
            renderizarGraficoCategorias(categoriasData.dados);
            renderizarTabelaComparativo(comparativoData.dados);
        }
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        alert('Erro ao carregar relatórios');
    }
}

function renderizarGraficoEvolucao(dados) {
    const ctx = document.getElementById('graficoEvolucao').getContext('2d');
    
    if (graficoEvolucao) {
        graficoEvolucao.destroy();
    }

    graficoEvolucao = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dados.meses,
            datasets: [
                {
                    label: 'Receitas',
                    data: dados.receitas,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Despesas',
                    data: dados.despesas,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Saldo',
                    data: dados.saldos,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Evolução Financeira Mensal'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    });
}

function renderizarGraficoCategorias(dados) {
    const ctx = document.getElementById('graficoCategorias').getContext('2d');
    
    if (graficoCategorias) {
        graficoCategorias.destroy();
    }

    const cores = [
        '#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6',
        '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad'
    ];

    graficoCategorias = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dados.categorias,
            datasets: [{
                data: dados.valores,
                backgroundColor: cores,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: R$ ${value.toLocaleString('pt-BR')} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderizarTabelaComparativo(dados) {
    const tbody = document.getElementById('tabelaComparativo');
    
    tbody.innerHTML = dados.map(item => `
        <tr>
            <td><strong>${item.mes}</strong></td>
            <td class="transacoes-valor receita">R$ ${item.receita.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="transacoes-valor despesa">R$ ${item.despesa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="transacoes-valor ${item.saldo >= 0 ? 'receita' : 'despesa'}">
                R$ ${item.saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </td>
            <td class="${item.variacao >= 0 ? 'positivo' : 'negativo'}">
                ${item.variacao >= 0 ? '+' : ''}${item.variacao}%
            </td>
        </tr>
    `).join('');
}

function exportarRelatorio() {
    alert('Funcionalidade de exportação em desenvolvimento!');
}

async function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        try {
            await fetch('/api/logout', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            window.location.href = '/';
        } catch (error) {
            console.error('Erro no logout:', error);
            window.location.href = '/';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    carregarUsuario();
});