class CalculadoraServicoContabil {
    constructor() {
        // Alíquotas padrão para o Regime Regular (Lucro Presumido/Real)
        this.REG_PIS = 0.0065;    // 0,65% (Faturamento de Serviços Padrão)
        this.REG_COFINS = 0.0300; // 3,00%
        this.REG_ISS_PADRAO = 0.0500; // 5,00% (Teto máximo municipal)

        // Tabela Oficial do Simples Nacional 2026 (Anexo III - Prestação de Serviços)
        this.TABELA_SIMPLES_2026 = [
            { limite: 180000.00, nominal: 0.060, deducao: 0.00 },
            { limite: 360000.00, nominal: 0.112, deducao: 9360.00 },
            { limite: 720000.00, nominal: 0.135, deducao: 17640.00 },
            { limite: 1800000.00, nominal: 0.160, deducao: 35640.00 },
            { limite: 3600000.00, nominal: 0.210, deducao: 125640.00 },
            { limite: 4800000.00, nominal: 0.330, deducao: 648000.00 }
        ];
    }

    _arredondar(valor) {
        return Math.round(valor * 100) / 100;
    }

    _calcularAliquotaEfetivaSimples(rbt12) {
        if (!rbt12 || rbt12 <= 0) return this.TABELA_SIMPLES_2026[0].nominal;

        for (let faixa of this.TABELA_SIMPLES_2026) {
            if (rbt12 <= faixa.limite) {
                let efetiva = ((rbt12 * faixa.nominal) - faixa.deducao) / rbt12;
                return this._arredondar(efetiva);
            }
        }
        return this.TABELA_SIMPLES_2026[this.TABELA_SIMPLES_2026.length - 1].nominal;
    }

    processarServico(dadosServico) {
        const regime = (dadosServico.regimeTributario || 'REGULAR').toUpperCase();
        const valorBrutoServico = dadosServico.valorTotalServico;
        const desconto = dadosServico.descontoConcedido || 0;
        const valorComDesconto = Math.max(0, valorBrutoServico - desconto);
        const custoServicoPrestado = dadosServico.custoServicoPrestado || 0; // CSP

        let iss = 0, pis = 0, cofins = 0, valorDasSimples = 0, taxaSimplesDescrita = "0.0%";
        let pisRetido = 0, cofinsRetido = 0;

        if (regime === 'SIMPLES') {
            // No Simples Nacional, os impostos são recolhidos unificados no DAS mensal
            const rbt12 = dadosServico.faturamentoAcumulado12Meses || 0;
            const aliquotaEfetiva = this._calcularAliquotaEfetivaSimples(rbt12);
            
            valorDasSimples = this._arredondar(valorComDesconto * aliquotaEfetiva);
            taxaSimplesDescrita = `${(aliquotaEfetiva * 100).toFixed(2)}%`;
        } else {
            // Regime Regular: Calcula impostos incidentes sobre a nota
            const alIss = dadosServico.aliquotaIss !== undefined ? (dadosServico.aliquotaIss / 100) : this.REG_ISS_PADRAO;
            
            iss = this._arredondar(valorComDesconto * alIss);
            pis = this._arredondar(valorComDesconto * this.REG_PIS);
            cofins = this._arredondar(valorComDesconto * this.REG_COFINS);

            // Tratamento de retenções na fonte (se aplicável ao tipo de cliente/serviço)
            if (dadosServico.sofreRetencaoFonte) {
                pisRetido = this._arredondar(valorComDesconto * 0.0065); // 0,65% retido
                cofinsRetido = this._arredondar(valorComDesconto * 0.0300); // 3,00% retido
            }
        }

        // Fluxo Financeiro: O valor que entra no caixa considera o desconto e os impostos retidos na fonte
        const totalImpostosNota = iss + pis + cofins + valorDasSimples;
        const totalRetencoes = pisRetido + cofinsRetido;
        
        const percentualAVista = dadosServico.percentualAVista || 0;
        const valorLiquidoReceber = valorComDesconto - totalRetencoes;
        const valorAVista = this._arredondar(valorLiquidoReceber * (percentualAVista / 100));
        const valorAPrazo = this._arredondar(valorLiquidoReceber - valorAVista);

        const receitaLiquida = this._arredondar(valorComDesconto - totalImpostosNota);
        const lucroBrutoServico = this._arredondar(receitaLiquida - custoServicoPrestado);

        const servicoCalculado = {
            regime, valorBrutoServico, desconto, valorComDesconto, custoServicoPrestado,
            iss, pis, cofins, valorDasSimples, taxaSimplesDescrita,
            pisRetido, cofinsRetido, totalRetencoes,
            receitaLiquida, lucroBrutoServico, valorAVista, valorAPrazo,
            metodoRecebimento: percentualAVista === 100 ? "À Vista" : (percentualAVista === 0 ? "A Prazo" : "Misto")
        };

        return {
            valores: servicoCalculado,
            lancamentosContabeis: this.gerarLancamentosTexto(servicoCalculado)
        };
    }

    gerarLancamentosTexto(v) {
        let texto = "========================================================\n";
        texto += `   LANÇAMENTOS CONTÁBEIS: PRESTAÇÃO DE SERVIÇO [${v.regime}]\n`;
        texto += "========================================================\n\n";
        texto += "--- 1. REGISTRO DO FATURAMENTO, DESCONTO E RETENÇÕES ---\n";

        if (v.valorAVista > 0) texto += "DÉBITO : Caixa / Bancos (Ativo Circulante) --------- R$ " + v.valorAVista.toFixed(2) + "\n";
        if (v.valorAPrazo > 0) texto += "DÉBITO : Clientes / Contas a Receber (Ativo Circ.) - R$ " + v.valorAPrazo.toFixed(2) + "\n";
        if (v.desconto > 0)    texto += "DÉBITO : (-) Descontos Concedidos (Resultado) ------- R$ " + v.desconto.toFixed(2) + "\n";
        
        // Registra o direito de compensar os impostos retidos no Ativo Circulante
        if (v.totalRetencoes > 0) {
            texto += "DÉBITO : PIS a Compensar / Retido (Ativo Circulante)  R$ " + v.pisRetido.toFixed(2) + "\n";
            texto += "DÉBITO : COFINS a Compensar / Retido (Ativo Circ.) -- R$ " + v.cofinsRetido.toFixed(2) + "\n";
        }

        texto += "CRÉDITO: Receita de Prestação de Serviços (Resultado) R$ " + v.valorBrutoServico.toFixed(2) + "\n";
        texto += "Histórico: Faturamento ref. NFS-e emitida, recebimento " + v.metodoRecebimento + ".\n\n";

        if (v.regime === 'SIMPLES') {
            texto += "--- 2. REGISTRO DO SIMPLES NACIONAL (ANEXO III) ---\n";
            texto += "DÉBITO : (-) Simples Nacional sobre Faturamento (Res.) R$ " + v.valorDasSimples.toFixed(2) + "\n";
            texto += "CRÉDITO: Simples Nacional a Recolher (Passivo Circ.) - R$ " + v.valorDasSimples.toFixed(2) + "\n";
            texto += "Histórico: Provisão de DAS sobre serviço (Alíquota Efetiva: " + v.taxaSimplesDescrita + ").\n\n";
        } else {
            texto += "--- 2. REGISTRO DOS IMPOSTOS DA OPERAÇÃO (REGIME REGULAR) ---\n";
            texto += "DÉBITO : (-) ISS sobre Serviços (Resultado) --------- R$ " + v.iss.toFixed(2) + "\n";
            texto += "CRÉDITO: ISS a Recolher (Passivo Circulante) -------- R$ " + v.iss.toFixed(2) + "\n\n";
            texto += "DÉBITO : (-) PIS sobre Faturamento (Resultado) ------ R$ " + v.pis.toFixed(2) + "\n";
            texto += "CRÉDITO: PIS a Recolher (Passivo Circulante) -------- R$ " + v.pis.toFixed(2) + "\n\n";
            texto += "DÉBITO : (-) COFINS sobre Faturamento (Resultado) ---- R$ " + v.cofins.toFixed(2) + "\n";
            texto += "CRÉDITO: COFINS a Recolher (Passivo Circulante) ----- R$ " + v.cofins.toFixed(2) + "\n\n";
        }

        texto += "--- 3. REGISTRO DO CUSTO DO SERVIÇO (CSP) ---\n";
        texto += "DÉBITO : Custo dos Serviços Prestados - CSP (Result) - R$ " + v.custoServicoPrestado.toFixed(2) + "\n";
        texto += "CRÉDITO: Mão de Obra / Custos Aplicados (Ativo/Res.) - R$ " + v.custoServicoPrestado.toFixed(2) + "\n";
        texto += "Histórico: Apropriação dos custos diretos aplicados na execução do serviço.\n";
        
        return texto;
    }
}
