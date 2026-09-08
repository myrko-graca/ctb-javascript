class CalculadoraVendaContabil {
    constructor() {
        // Regime Regular (Fallback)
        this.REG_PIS = 0.0165; this.REG_COFINS = 0.0760; this.REG_ICMS = 0.1800;   

        // --- MAPA DOS ANEXOS DO SIMPLES NACIONAL 2026 ---
        this.TABELAS_SIMPLES = {
            'COMERCIO': [ // Anexo I
                { limite: 180000.00, nominal: 0.040, deducao: 0.00 },
                { limite: 360000.00, nominal: 0.073, deducao: 5940.00 },
                { limite: 720000.00, nominal: 0.095, deducao: 13860.00 },
                { limite: 1800000.00, nominal: 0.107, deducao: 22500.00 },
                { limite: 3600000.00, nominal: 0.143, deducao: 87300.00 },
                { limite: 4800000.00, nominal: 0.190, deducao: 378000.00 }
            ],
            'INDUSTRIA': [ // Anexo II
                { limite: 180000.00, nominal: 0.045, deducao: 0.00 },
                { limite: 360000.00, nominal: 0.078, deducao: 5940.00 },
                { limite: 720000.00, nominal: 0.100, deducao: 13860.00 },
                { limite: 1800000.00, nominal: 0.112, deducao: 22500.00 },
                { limite: 3600000.00, nominal: 0.147, deducao: 85500.00 },
                { limite: 4800000.00, nominal: 0.300, deducao: 720000.00 }
            ],
            'SERVICO': [ // Anexo III (Serviços Gerais)
                { limite: 180000.00, nominal: 0.060, deducao: 0.00 },
                { limite: 360000.00, nominal: 0.112, deducao: 9360.00 },
                { limite: 720000.00, nominal: 0.135, deducao: 17640.00 },
                { limite: 1800000.00, nominal: 0.160, deducao: 35640.00 },
                { limite: 3600000.00, nominal: 0.210, deducao: 125640.00 },
                { limite: 4800000.00, nominal: 0.330, deducao: 648000.00 }
            ]
        };
    }

    _arredondar(valor) {
        return Math.round(valor * 100) / 100;
    }

    // Método corrigido e inteligente que escolhe a tabela nominal pela atividade
    _calcularAliquotaEfetivaSimples(tipoAtividade, rbt12) {
        const atividade = (tipoAtividade || 'COMERCIO').toUpperCase();
        // Fallback caso passem um tipo inválido, escolhe Comércio
        const tabelaEscolhida = this.TABELAS_SIMPLES[atividade] || this.TABELAS_SIMPLES['COMERCIO'];

        if (!rbt12 || rbt12 <= 0) return tabelaEscolhida[0].nominal;

        for (let faixa of tabelaEscolhida) {
            if (rbt12 <= faixa.limite) {
                let efetiva = ((rbt12 * faixa.nominal) - faixa.deducao) / rbt12;
                return this._arredondar(efetiva);
            }
        }
        return tabelaEscolhida[tabelaEscolhida.length - 1].nominal;
    }

    processarVenda(dadosVenda) {
        const regime = (dadosVenda.regimeTributario || 'REGULAR').toUpperCase();
        const atividade = (dadosVenda.tipoAtividade || 'COMERCIO').toUpperCase();
        
        const valorBrutoVenda = dadosVenda.valorTotalItens;
        const desconto = dadosVenda.descontoConcedido || 0;
        const valorComDesconto = Math.max(0, valorBrutoVenda - desconto);
        const custoEstoqueVT = dadosVenda.custoMercadoriaVendida;

        let icms = 0, pis = 0, cofins = 0, valorDasSimples = 0, taxaSimplesDescrita = "0.0%";

        if (regime === 'SIMPLES') {
            const rbt12 = dadosVenda.faturamentoAcumulado12Meses || 0;
            // Agora passa dinamicamente a ATIVIDADE do faturamento
            const aliquotaEfetiva = this._calcularAliquotaEfetivaSimples(atividade, rbt12);
            
            valorDasSimples = this._arredondar(valorComDesconto * aliquotaEfetiva);
            taxaSimplesDescrita = `${(aliquotaEfetiva * 100).toFixed(2)}%`;
        } else {
            const alIcms = dadosVenda.aliquotaIcms !== undefined ? (dadosVenda.aliquotaIcms / 100) : this.REG_ICMS;
            const alPis = dadosVenda.aliquotaPis !== undefined ? (dadosVenda.aliquotaPis / 100) : this.REG_PIS;
            const alCofins = dadosVenda.aliquotaCofins !== undefined ? (dadosVenda.aliquotaCofins / 100) : this.REG_COFINS;

            icms = this._arredondar(valorComDesconto * alIcms);
            pis = this._arredondar(valorComDesconto * alPis);
            cofins = this._arredondar(valorComDesconto * alCofins);
        }

        const totalImpostosVenda = icms + pis + cofins + valorDasSimples;
        const receitaLiquida = this._arredondar(valorComDesconto - totalImpostosVenda);
        const lucroBrutoDaVenda = this._arredondar(receitaLiquida - custoEstoqueVT);

        const percentualAVista = dadosVenda.percentualAVista || 0;
        const valorAVista = this._arredondar(valorComDesconto * (percentualAVista / 100));
        const valorAPrazo = this._arredondar(valorComDesconto - valorAVista);

        const vendaCalculada = {
            regime, atividade, valorBrutoVenda, desconto, valorComDesconto, custoEstoqueVT,
            icms, pis, cofins, valorDasSimples, taxaSimplesDescrita,
            receitaLiquida, lucroBrutoDaVenda, valorAVista, valorAPrazo,
            metodoRecebimento: percentualAVista === 100 ? "À Vista" : (percentualAVista === 0 ? "A Prazo" : "Misto")
        };

        return {
            valores: vendaCalculada,
            lancamentosContabeis: this.gerarLancamentosTexto(vendaCalculada)
        };
    }

    gerarLancamentosTexto(v) {
        let texto = "========================================================\n";
        texto += `   LANÇAMENTOS CONTÁBEIS: OPERAÇÃO [${v.regime} - ${v.atividade}]\n`;
        texto += "========================================================\n\n";
        texto += "--- 1. REGISTRO DO FATURAMENTO E DESCONTO ---\n";

        if (v.valorAVista > 0) texto += "DÉBITO : Caixa / Bancos (Ativo Circulante) --------- R$ " + v.valorAVista.toFixed(2) + "\n";
        if (v.valorAPrazo > 0) texto += "DÉBITO : Clientes / Duplicatas a Receber (Ativo C.) - R$ " + v.valorAPrazo.toFixed(2) + "\n";
        if (v.desconto > 0)    texto += "DÉBITO : (-) Descontos Concedidos (Resultado) ------- R$ " + v.desconto.toFixed(2) + "\n";

        texto += "CRÉDITO: Receita Bruta (Resultado) ------------------ R$ " + v.valorBrutoVenda.toFixed(2) + "\n";
        texto += "Histórico: Faturamento comercial ref. emissão de documento fiscal.\n\n";

        if (v.regime === 'SIMPLES') {
            texto += "--- 2. REGISTRO DO IMPOSTO UNIFICADO (SIMPLES NACIONAL) ---\n";
            texto += "DÉBITO : (-) Simples Nacional sobre Faturamento (Res.) R$ " + v.valorDasSimples.toFixed(2) + "\n";
            texto += "CRÉDITO: Simples Nacional a Recolher (Passivo Circ.) - R$ " + v.valorDasSimples.toFixed(2) + "\n";
            texto += "Histórico: Provisão mensal de DAS unificado (Alíquota Efetiva: " + v.taxaSimplesDescrita + ").\n\n";
        } else {
            texto += "--- 2. REGISTRO DOS IMPOSTOS INDIVIDUALIZADOS (REGIME REGULAR) ---\n";
            texto += "DÉBITO : (-) ICMS sobre Vendas (Resultado) ---------- R$ " + v.icms.toFixed(2) + "\n";
            texto += "CRÉDITO: ICMS a Recolher (Passivo Circulante) ------- R$ " + v.icms.toFixed(2) + "\n\n";
            texto += "DÉBITO : (-) PIS sobre Vendas (Resultado) ----------- R$ " + v.pis.toFixed(2) + "\n";
            texto += "CRÉDITO: PIS a Recolher (Passivo Circulante) -------- R$ " + v.pis.toFixed(2) + "\n\n";
            texto += "DÉBITO : (-) COFINS sobre Vendas (Resultado) -------- R$ " + v.cofins.toFixed(2) + "\n";
            texto += "CRÉDITO: COFINS a Recolher (Passivo Circulante) ----- R$ " + v.cofins.toFixed(2) + "\n\n";
        }

        texto += "--- 3. BAIXA DO ESTOQUE / CUSTO OPERACIONAL ---\n";
        if (v.atividade === 'SERVICO') {
            texto += "DÉBITO : Custo dos Serviços Prestados - CSP (Result) - R$ " + v.custoEstoqueVT.toFixed(2) + "\n";
            texto += "CRÉDITO: Mão de Obra / Custos Aplicados (Ativo/Res.) - R$ " + v.custoEstoqueVT.toFixed(2) + "\n";
        } else {
            texto += "DÉBITO : Custo das Mercadorias Vendidas - CMV (Result) R$ " + v.custoEstoqueVT.toFixed(2) + "\n";
            texto += "CRÉDITO: Estoque de Mercadorias (Ativo Circulante) -- R$ " + v.custoEstoqueVT.toFixed(2) + "\n";
        }
        
        return texto;
    }
}
