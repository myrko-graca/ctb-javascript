class producaoVendasContabil {
    constructor() {
        // --- LIMITES E CONSTANTES FISCAIS FEDERAIS PARA PRODUTOS ---
        this.LIMITES_ICMS = { min: 0.0400, max: 0.2200 }; 
        this.LIMITES_IPI = { min: 0.0000, max: 0.6000 };  
        this.LIMITES_PIS = { min: 0.0000, max: 0.0165 }; 
        this.LIMITES_COFINS = { min: 0.0000, max: 0.0760 }; 
        this.LIMITE_LUCRO_TRIMESTRAL = 60000.00; 
        this.ALIQUOTA_ADICIONAL_IRPJ = 0.10;    

        // Alíquotas Padrão para Regimes Regulares (Fallback)
        this.REG_PIS_CUMULATIVO = 0.0065;
        this.REG_COFINS_CUMULATIVO = 0.0300;
        this.REG_PIS_NAO_CUMULATIVO = 0.0165;
        this.REG_COFINS_NAO_CUMULATIVO = 0.0760;
        this.REG_ICMS_PADRAO = 0.1800;

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
            ]
        };
    }

    _arredondar(valor) {
        return Math.round(valor * 100) / 100;
    }

    _validarTaxa(taxa, limites) {
        if (taxa === undefined || taxa === null || isNaN(taxa)) return false;
        const valorDecimal = taxa > 1 ? taxa / 100 : taxa;
        return valorDecimal >= limites.min && valorDecimal <= limites.max;
    }

    _calcularAliquotaEfetivaSimples(tipoAtividade, rbt12) {
        const atividade = (tipoAtividade || 'COMERCIO').toUpperCase();
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

    _calcularIcmsST(valorBase, valorIpi, percentualMva, aliquotaInternaDestino, icmsProprio) {
        const mvaDecimal = percentualMva > 1 ? percentualMva / 100 : percentualMva;
        const alInternaDecimal = aliquotaInternaDestino > 1 ? aliquotaInternaDestino / 100 : aliquotaInternaDestino;

        // Base ST inclui o valor da mercadoria + IPI faturado por fora
        const valorComIpi = valorBase + valorIpi;
        const baseIcmsST = this._arredondar(valorComIpi * (1 + mvaDecimal));
        
        // Descobre o débito do ST e subtrai o ICMS da própria operação (crédito)
        const icmsDebitoST = this._arredondar(baseIcmsST * alInternaDecimal);
        const icmsSTFinal = Math.max(0, this._arredondar(icmsDebitoST - icmsProprio));

        return { baseIcmsST, icmsSTFinal };
    }
    processarOperacao(dados) {
        const regime = (dados.regimeTributario || 'REGULAR_LP').toUpperCase(); 
        const atividade = (dados.tipoAtividade || 'COMERCIO').toUpperCase();  
        
        const valorBruto = dados.valorTotalItens || 0;
        const desconto = dados.descontoConcedido || 0;
        const valorComDesconto = Math.max(0, valorBruto - desconto);
        const custoOperacional = dados.custoMercadoriaVendida || 0; 

        // Variáveis Fiscais e de Controle
        let icms = 0, ipi = 0, pis = 0, cofins = 0, valorDasSimples = 0;
        let icmsST = 0, baseIcmsST = 0;
        let irpjBase = 0, irpjAdicional = 0, irpj = 0, csll = 0;
        let taxaSimplesDescrita = "0.0%";
        let valorTotalNota = valorComDesconto;
        const temST = dados.sujeitoAosRegimesST || false;

        // LÓGICA SIMPLES / MEI
        if (regime === 'MEI') {
            taxaSimplesDescrita = "Fixo Mensal (DAS-MEI)";
        } 
        else if (regime === 'SIMPLES') {
            const rbt12 = dados.faturamentoAcumulado12Meses || 0;
            const aliquotaEfetiva = this._calcularAliquotaEfetivaSimples(atividade, rbt12);
            valorDasSimples = this._arredondar(valorComDesconto * aliquotaEfetiva);
            taxaSimplesDescrita = `${(aliquotaEfetiva * 100).toFixed(2)}%`;
        } 
        // LÓGICA REGIMES REGULARES
        else if (regime === 'REGULAR_LP' || regime === 'REGULAR_LR') {
            const alIcms = dados.aliquotaIcms !== undefined ? (dados.aliquotaIcms / 100) : this.REG_ICMS_PADRAO;
            const alIpi = dados.aliquotaIpi !== undefined ? (dados.aliquotaIpi / 100) : 0;
            const alIrpj = dados.aliquotaIrpj !== undefined ? (dados.aliquotaIrpj / 100) : 0.15;
            const alCsll = dados.aliquotaCsll !== undefined ? (dados.aliquotaCsll / 100) : 0.09;

            let alPis = dados.aliquotaPis !== undefined ? (dados.aliquotaPis / 100) : 0;
            let alCofins = dados.aliquotaCofins !== undefined ? (dados.aliquotaCofins / 100) : 0;

            if (alPis === 0 && alCofins === 0) {
                alPis = regime === 'REGULAR_LP' ? this.REG_PIS_CUMULATIVO : this.REG_PIS_NAO_CUMULATIVO;
                alCofins = regime === 'REGULAR_LP' ? this.REG_COFINS_CUMULATIVO : this.REG_COFINS_NAO_CUMULATIVO;
            }

            if (!this._validarTaxa(alIcms, this.LIMITES_ICMS)) throw new Error("ERRO_ICMS_INVALIDO");
            if (atividade === 'INDUSTRIA' && !this._validarTaxa(alIpi, this.LIMITES_IPI)) throw new Error("ERRO_IPI_INVALIDO");

            icms = this._arredondar(valorComDesconto * alIcms);
            if (atividade === 'INDUSTRIA') {
                ipi = this._arredondar(valorComDesconto * alIpi);
            }

            // GATILHO DA MARGEM DE VALOR AGREGA DO (MVA) E CALCULO DO ST
            if (temST) {
                const mva = dados.percentualMva || 0;
                const alInternaST = dados.aliquotaInternaST !== undefined ? dados.aliquotaInternaST : alIcms;
                
                const resultadoST = this._calcularIcmsST(valorComDesconto, ipi, mva, alInternaST, icms);
                baseIcmsST = resultadoST.baseIcmsST;
                icmsST = resultadoST.icmsSTFinal;
            }

            // O IPI e o ICMS-ST adicionam valor financeiro "por fora" da Nota
            valorTotalNota = valorComDesconto + ipi + icmsST;

            if (regime === 'REGULAR_LP') {
                pis = this._arredondar(valorComDesconto * alPis);
                cofins = this._arredondar(valorComDesconto * alCofins);

                // Presunção de Mercadoria (8% IRPJ / 12% CSLL)
                const basePresumidaIrpj = this._arredondar(valorComDesconto * 0.08);
                const basePresumidaCsll = this._arredondar(valorComDesconto * 0.12);

                const fatAcumulado = dados.faturamentoAcumuladoTrimestre || 0;
                const baseIrpjAcumuladaTotal = this._arredondar(fatAcumulado * 0.08) + basePresumidaIrpj;

                irpjBase = this._arredondar(basePresumidaIrpj * alIrpj);
                csll = this._arredondar(basePresumidaCsll * alCsll);

                if (baseIrpjAcumuladaTotal > this.LIMITE_LUCRO_TRIMESTRAL) {
                    let parcelaExcedente = (this._arredondar(fatAcumulado * 0.08) >= this.LIMITE_LUCRO_TRIMESTRAL)
                        ? basePresumidaIrpj 
                        : baseIrpjAcumuladaTotal - this.LIMITE_LUCRO_TRIMESTRAL;
                    irpjAdicional = this._arredondar(parcelaExcedente * this.ALIQUOTA_ADICIONAL_IRPJ);
                }
            } 
            else if (regime === 'REGULAR_LR') {
                pis = this._arredondar(Math.max(0, (valorComDesconto * alPis) - (custoOperacional * alPis)));
                cofins = this._arredondar(Math.max(0, (valorComDesconto * alCofins) - (custoOperacional * alCofins)));
                if (atividade === 'INDUSTRIA') ipi = this._arredondar(Math.max(0, ipi - (custoOperacional * alIpi)));

                const lucroRealNota = Math.max(0, valorComDesconto - (icms + pis + cofins) - custoOperacional);
                const lucroRealTotalAcumulado = (dados.lucroRealAcumuladoPeriodo || 0) + lucroRealNota;

                irpjBase = this._arredondar(lucroRealNota * alIrpj);
                csll = this._arredondar(lucroRealNota * alCsll);

                if (lucroRealTotalAcumulado > this.LIMITE_LUCRO_TRIMESTRAL) {
                    let parcelaExcedente = (dados.lucroRealAcumuladoPeriodo || 0) >= this.LIMITE_LUCRO_TRIMESTRAL 
                        ? lucroRealNota 
                        : lucroRealTotalAcumulado - this.LIMITE_LUCRO_TRIMESTRAL;
                    irpjAdicional = this._arredondar(parcelaExcedente * this.ALIQUOTA_ADICIONAL_IRPJ);
                }
            }
            irpj = this._arredondar(irpjBase + irpjAdicional);
        }

        const totalImpostosVenda = icms + ipi + pis + cofins + valorDasSimples;
        const receitaLiquida = this._arredondar(valorComDesconto - (totalImpostosVenda - ipi)); 
        const lucroBrutoOpe = this._arredondar(receitaLiquida - custoOperacional);

        const percentualAVista = dados.percentualAVista || 0;
        const valorAVista = this._arredondar(valorTotalNota * (percentualAVista / 100));
        const valorAPrazo = this._arredondar(valorTotalNota - valorAVista);

        const payloadFinal = {
            regime, atividade, valorBruto, desconto, valorComDesconto, valorTotalNota, custoOperacional,
            icms, ipi, pis, cofins, valorDasSimples, icmsST, baseIcmsST, taxaSimplesDescrita,
            irpjBase, irpjAdicional, irpj, csll, receitaLiquida, lucroBrutoOpe, valorAVista, valorAPrazo,
            metodoRecebimento: percentualAVista === 100 ? "À Vista" : (percentualAVista === 0 ? "A Prazo" : "Misto")
        };

        return {
            valores: payloadFinal,
            lancamentosContabeis: this.gerarLancamentosTexto(payloadFinal),
            lancamentosJSON: this.gerarLancamentosJSON(payloadFinal)
        };
    }
    processarDevolucao(dadosDevolucao, resultadoVendaOriginal) {
        const vOriginal = resultadoVendaOriginal.valores;
        const valorDevolvidoBruto = dadosDevolucao.valorDevolvidoBruto || vOriginal.valorComDesconto;
        const proporcao = Math.min(1, Math.max(0, valorDevolvidoBruto / vOriginal.valorComDesconto));

        if (proporcao <= 0) throw new Error("ERRO_DEVOLUCAO_INVALIDA");

        const icmsEstornado = this._arredondar(vOriginal.icms * proporcao);
        const ipiEstornado = this._arredondar(vOriginal.ipi * proporcao);
        const pisEstornado = this._arredondar(vOriginal.pis * proporcao);
        const cofinsEstornado = this._arredondar(vOriginal.cofins * proporcao);
        const simplesEstornado = this._arredondar(vOriginal.valorDasSimples * proporcao);
        const icmsSTEstornado = this._arredondar(vOriginal.icmsST * proporcao);
        const irpjEstornado = this._arredondar(vOriginal.irpj * proporcao);
        const csllEstornado = this._arredondar(vOriginal.csll * proporcao);
        const custoEstornado = this._arredondar(vOriginal.custoOperacional * proporcao);
        const receitaLiquidaAnulada = this._arredondar(vOriginal.receitaLiquida * proporcao);
        const totalNotaDevolvido = this._arredondar(vOriginal.valorTotalNota * proporcao);
        
        let estornoCaixa = 0, estornoClientes = 0;
        if (dadosDevolucao.origemEstornoFinanceiro === 'CAIXA') {
            estornoCaixa = totalNotaDevolvido;
        } else if (dadosDevolucao.origemEstornoFinanceiro === 'CLIENTES') {
            estornoClientes = totalNotaDevolvido;
        } else {
            estornoCaixa = this._arredondar(totalNotaDevolvido * (vOriginal.valorAVista / vOriginal.valorTotalNota));
            estornoClientes = this._arredondar(totalNotaDevolvido - estornoCaixa);
        }

        const devCalculada = {
            regime: vOriginal.regime, atividade: vOriginal.atividade, valorDevolvidoBruto, totalNotaDevolvido,
            proporcaoPercentual: `${(proporcao * 100).toFixed(2)}%`,
            icmsEstornado, ipiEstornado, pisEstornado, cofinsEstornado, simplesEstornado, icmsSTEstornado,
            irpjEstornado, csllEstornado, custoEstornado, receitaLiquidaAnulada, estornoCaixa, estornoClientes
        };

        return {
            valores: devCalculada,
            lancamentosContabeis: this.gerarLancamentosTextoDevolucao(devCalculada),
            lancamentosJSON: this.gerarLancamentosJSONDevolucao(devCalculada)
        };
    }

    gerarLancamentosJSON(v) {
        const lancamentos = [];
        lancamentos.push({ tipo: "CRÉDITO", conta: "Receita de Venda de Produtos/Mercadorias (Resultado)", valor: v.valorComDesconto });
        if (v.valorAVista > 0) lancamentos.push({ tipo: "DÉBITO", conta: "Caixa / Bancos (Ativo Circulante)", valor: v.valorAVista });
        if (v.valorAPrazo > 0) lancamentos.push({ tipo: "DÉBITO", conta: "Clientes / Contas a Receber (Ativo Circulante)", valor: v.valorAPrazo });

        if (v.custoOperacional > 0) {
            let cDebito = v.atividade === 'INDUSTRIA' ? "Custo dos Produtos Vendidos - CPV (Resultado)" : "Custo das Mercadorias Vendidas - CMV (Resultado)";
            let cCredito = v.atividade === 'INDUSTRIA' ? "Estoque de Produtos Acabados (Ativo Circulante)" : "Estoque de Mercadorias para Revenda (Ativo)";
            lancamentos.push({ tipo: "DÉBITO", conta: cDebito, valor: v.custoOperacional });
            lancamentos.push({ tipo: "CRÉDITO", conta: cCredito, valor: v.custoOperacional });
        }

        if (v.valorDasSimples > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "Simples Nacional (Dedução)", valor: v.valorDasSimples }); lancamentos.push({ tipo: "CRÉDITO", conta: "Simples Nacional a Recolher (Passivo)", valor: v.valorDasSimples }); }
        if (v.icms > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "ICMS sobre Vendas (Dedução)", valor: v.icms }); lancamentos.push({ tipo: "CRÉDITO", conta: "ICMS a Recolher (Passivo)", valor: v.icms }); }
        if (v.icmsST > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "ICMS-ST Retido sobre Vendas (Passivo/Passagem)", valor: v.icmsST }); lancamentos.push({ tipo: "CRÉDITO", conta: "ICMS-ST a Recolher (Passivo)", valor: v.icmsST }); }
        if (v.ipi > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "IPI Faturado sobre Vendas (Dedução/Passivo)", valor: v.ipi }); lancamentos.push({ tipo: "CRÉDITO", conta: "IPI a Recolher (Passivo)", valor: v.ipi }); }
        if (v.pis > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "PIS sobre Faturamento (Dedução)", valor: v.pis }); lancamentos.push({ tipo: "CRÉDITO", conta: "PIS a Recolher (Passivo)", valor: v.pis }); }
        if (v.cofins > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "COFINS sobre Faturamento (Dedução)", valor: v.cofins }); lancamentos.push({ tipo: "CRÉDITO", conta: "COFINS a Recolher (Passivo)", valor: v.cofins }); }
        if (v.irpj > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "Provisão de IRPJ (Resultado)", valor: v.irpj }); lancamentos.push({ tipo: "CRÉDITO", conta: "IRPJ a Recolher (Passivo)", valor: v.irpj }); }
        if (v.csll > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "Provisão de CSLL (Resultado)", valor: v.csll }); lancamentos.push({ tipo: "CRÉDITO", conta: "CSLL a Recolher (Passivo)", valor: v.csll }); }
        return { metadata: { regime: v.regime, atividade: v.atividade }, partidas: lancamentos };
    }

    gerarLancamentosJSONDevolucao(d) {
        const lancamentos = [];
        lancamentos.push({ tipo: "DÉBITO", conta: "(-) Devolução de Vendas (Resultado)", valor: d.valorDevolvidoBruto });
        if (d.estornoCaixa > 0) lancamentos.push({ tipo: "CRÉDITO", conta: "Caixa / Bancos (Ativo)", valor: d.estornoCaixa });
        if (d.estornoClientes > 0) lancamentos.push({ tipo: "CRÉDITO", conta: "Clientes / Contas a Receber (Ativo)", valor: d.estornoClientes });

        if (d.custoEstornado > 0) {
            let cCredito = d.atividade === 'INDUSTRIA' ? "Custo dos Produtos Vendidos - CPV (Resultado)" : "Custo das Mercadorias Vendidas - CMV (Resultado)";
            let cDebito = d.atividade === 'INDUSTRIA' ? "Estoque de Produtos Acabados (Ativo Circulante)" : "Estoque de Mercadorias para Revenda (Ativo)";
            lancamentos.push({ tipo: "DÉBITO", conta: cDebito, valor: d.custoEstornado });
            lancamentos.push({ tipo: "CRÉDITO", conta: cCredito, valor: d.custoEstornado });
        }

        if (d.simplesEstornado > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "Simples Nacional a Recolher (Passivo)", valor: d.simplesEstornado }); lancamentos.push({ tipo: "CRÉDITO", conta: "Simples Nacional (Dedução)", valor: d.simplesEstornado }); }
        if (d.icmsEstornado > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "ICMS a Recolher (Passivo)", valor: d.icmsEstornado }); lancamentos.push({ tipo: "CRÉDITO", conta: "ICMS sobre Vendas (Dedução)", valor: d.icmsEstornado }); }
        if (d.icmsSTEstornado > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "ICMS-ST a Recolher (Passivo)", valor: d.icmsSTEstornado }); lancamentos.push({ tipo: "CRÉDITO", conta: "ICMS-ST Retido sobre Vendas (Passivo)", valor: d.icmsSTEstornado }); }
        if (d.ipiEstornado > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "IPI a Recolher (Passivo)", valor: d.ipiEstornado }); lancamentos.push({ tipo: "CRÉDITO", conta: "IPI Faturado (Dedução)", valor: d.ipiEstornado }); }
        if (d.pisEstornado > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "PIS a Recolher (Passivo)", valor: d.pisEstornado }); lancamentos.push({ tipo: "CRÉDITO", conta: "PIS sobre Faturamento (Dedução)", valor: d.pisEstornado }); }
        if (d.cofinsEstornado > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "COFINS a Recolher (Passivo)", valor: d.cofinsEstornado }); lancamentos.push({ tipo: "CRÉDITO", conta: "COFINS sobre Faturamento (Dedução)", valor: d.cofinsEstornado }); }
        if (d.irpjEstornado > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "IRPJ a Recolher (Passivo)", valor: d.irpjEstornado }); lancamentos.push({ tipo: "CRÉDITO", conta: "Provisão de IRPJ (Resultado)", valor: d.irpjEstornado }); }
        if (d.csllEstornado > 0) { lancamentos.push({ tipo: "DÉBITO", conta: "CSLL a Recolher (Passivo)", valor: d.csllEstornado }); lancamentos.push({ tipo: "CRÉDITO", conta: "Provisão de CSLL (Resultado)", valor: d.csllEstornado }); }
        return { metadata: { regime: d.regime, atividade: d.atividade, impacto: "REVERSAO_DEVOLUCAO" }, partidas: lancamentos };
    }

    gerarLancamentosTexto(v) {
        let t = "========================================================\n";
        t += `   MÓDULO DE PRODUTOS: OPERAÇÃO [${v.regime} - ${v.atividade}]\n`;
        t += "========================================================\n\n";
        t += `Valor Comercial: R$ ${v.valorComDesconto.toFixed(2)} | IPI (Por Fora): R$ ${v.ipi.toFixed(2)} | Nota Total: R$ ${v.valorTotalNota.toFixed(2)}\n`;
        t += `Financeiro Líquido: R$ ${(v.valorAVista + v.valorAPrazo).toFixed(2)} (${v.metodoRecebimento})\n\n`;

        if (v.regime === 'SIMPLES') {
            t += `-> Guia DAS Gerada: R$ ${v.valorDasSimples.toFixed(2)} (Alíquota Efetiva: ${v.taxaSimplesDescrita})\n`;
        } else if (v.regime.startsWith('REGULAR')) {
            t += "--- APURAÇÃO DE TRIBUTOS EM MERCADORIAS ---\n";
            if (v.icms > 0)   t += `   [ESTADUAL] ICMS s/ Venda: .............. R$ ${v.icms.toFixed(2)}\n`;
            if (v.icmsST > 0) t += `   [ESTADUAL] ICMS-ST (Retido p/ fora): ... R$ ${v.icmsST.toFixed(2)} (Base ST: R$ ${v.baseIcmsST.toFixed(2)})\n`;
            if (v.ipi > 0)    t += `   [FEDERAL]  IPI s/ Venda: ............... R$ ${v.ipi.toFixed(2)}\n`;
            if (v.pis > 0)    t += `   [FEDERAL]  PIS s/ Faturamento: ......... R$ ${v.pis.toFixed(2)}\n`;
            if (v.cofins > 0) t += `   [FEDERAL]  COFINS s/ Faturamento: ...... R$ ${v.cofins.toFixed(2)}\n`;
			t +=    [FEDERAL]  IRPJ Trimestral (Total): .... R$ ${v.irpj.toFixed(2)}\n;
			t +=    [FEDERAL]  CSLL Trimestral: ............ R$ ${v.csll.toFixed(2)}\n;
		}
		t += \n   Lucro Bruto da Venda: .................. R$ ${v.lucroBrutoOpe.toFixed(2)}\n;
		return t;
	}
	gerarLancamentosTextoDevolucao(d) {
		let t = "========================================================\n";
		t +=    MÓDULO DE PRODUTOS: DEVOLUÇÃO DE MERCADORIA [${d.regime}]\n;
		t += "========================================================\n\n";
		t += Valor Devolvido: R$ ${d.valorDevolvidoBruto.toFixed(2)} | Total Nota Estornado: R$ ${d.totalNotaDevolvido.toFixed(2)}\n;
		t +=    Estorno Caixa: R$ ${d.estornoCaixa.toFixed(2)} | Abatimento Clientes: R$ ${d.estornoClientes.toFixed(2)}\n\n;
		if (d.icmsSTEstornado > 0) t +=    [ESTORNO ST] ICMS-ST Revertido: ...... R$ ${d.icmsSTEstornado.toFixed(2)}\n;
		t +=    Custo Revertido ao Estoque: .......... R$ ${d.custoEstornado.toFixed(2)}\n;
		t +=    Anulação de Receita Líquida: ......... R$ ${d.receitaLiquidaAnulada.toFixed(2)}\n;
		return t;
	}
}

// Instanciação do motor fiscal unificado
const motorFiscal = new SistemaContabilFiscal2026();

console.log("%c 🟢 INICIANDO CRONOGRAMA DE AUDITORIA FISCAL INTEGRADA 2026 ", "background: #111; color: #00ff00; font-weight: bold; font-size: 13px;");

// ==========================================================================================
// CASO DE TESTE A: CONFEITARIA (Indústria de Bolos no Simples Nacional - Anexo II)
// ==========================================================================================
console.log("\n>>> CASO A: INDÚSTRIA DE PANIFICAÇÃO/CONFEITARIA (SIMPLES NACIONAL ANEXO II)");
try {
    let tBolo = motorFiscal.processarOperacao({
        regimeTributario: 'SIMPLES',
        tipoAtividade: 'INDUSTRIA',
        valorTotalItens: 15000.00,       // Valor bruto da venda de bolos
        custoMercadoriaVendida: 4500.00,  // Custo de insumos/ingredientes e embalagens (CPV)
        faturamentoAcumulado12Meses: 400000.00, // Faixa 3 do Simples Industrial (Alíquota progressiva)
        percentualAVista: 100            // Recebimento integral em Caixa/Bancos
    });
    console.log(tBolo.lancamentosContabeis);
    console.log("Partidas Dobradas JSON (Primeiro Lançamento):", tBolo.lancamentosJSON.partidas.slice(0, 3));
} catch (e) {
    console.error("❌ Erro no Caso A:", e.message);
}

// ==========================================================================================
// CASO DE TESTE B: REVENDA PURA (Comércio Varejista no Lucro Presumido - Presunção 8%)
// ==========================================================================================
console.log("\n>>> CASO B: LOJA COMERCIAL / REVENDA DE MERCADORIAS (LUCRO PRESUMIDO)");
try {
    let tComercio = motorFiscal.processarOperacao({
        regimeTributario: 'REGULAR_LP',
        tipoAtividade: 'COMERCIO',
        valorTotalItens: 40000.00,
        descontoConcedido: 2000.00,       // Desconto de balcão aplicado ao cliente
        custoMercadoriaVendida: 15000.00, // Preço pago pelos produtos ao fornecedor (CMV)
        faturamentoAcumuladoTrimestre: 800000.00, // Ativa a parcela adicional de 10% do IRPJ
        aliquotaIcms: 18,                // ICMS padrão interno do estado
        percentualAVista: 30             // Recebimento misto (30% dinheiro / 70% prazo)
    });
    console.log(tComercio.lancamentosContabeis);
} catch (e) {
    console.error("❌ Erro no Caso B:", e.message);
}

// ==========================================================================================
// CASO DE TESTE C: PRESTADOR DE SERVIÇOS (Empresa de Engenharia no Lucro Real)
// ==========================================================================================
console.log("\n>>> CASO C: PRESTADOR DE SERVIÇOS DE TECNOLOGIA/ENGENHARIA (LUCRO REAL)");
try {
    let tServico = motorFiscal.processarOperacao({
        regimeTributario: 'REGULAR_LR',
        tipoAtividade: 'SERVICO',
        valorTotalServico: 120000.00,
        custoServicoPrestado: 40000.00,   // Folha de salários dos engenheiros alocados (CSP)
        lucroRealAcumuladoPeriodo: 5000.00,
        aliquotaIss: 5,                  // ISS padrão municipal
        sofreRetencaoFonte: true,        // Ativa os descontos de IRRF e CSRF na nota B2B
        percentualAVista: 0              // Venda 100% faturada a prazo (Clientes)
    });
    console.log(tServico.lancamentosContabeis);
    console.log("JSON Contábil Completo (Partidas Dobradas):", tServico.lancamentosJSON);
} catch (e) {
    console.error("❌ Erro no Caso C:", e.message);
}

console.log("\n%c 🏁 BATERIA DE AUDITORIA FINALIZADA COM SUCESSO! ", "background: #111; color: #00ffff; font-weight: bold;");

console.log("\n%c 🔄 INICIANDO SIMULAÇÃO DE RITUAL DE DEVOLUÇÃO DE VENDAS ", "background: #222; color: #ffaa00; font-weight: bold;");

// 1. Primeiramente, gera-se a venda original (Cenário do Bolo de R$ 15.000,00)
let vendaOriginalBolo = motorFiscal.processarOperacao({
    regimeTributario: 'SIMPLES',
    tipoAtividade: 'INDUSTRIA',
    valorTotalItens: 15000.00,
    custoMercadoriaVendida: 4500.00, // Custo de Produção (CPV)
    faturamentoAcumulado12Meses: 400000.00,
    percentualAVista: 100
});

// 2. Executa-se a devolução parcial de R$ 7.500,00 (Exatamente 50% da carga de bolos deu defeito ou venceu)
let devolucaoParcialBolo = motorFiscal.processarDevolucao({
    valorDevolvidoBruto: 7500.00,
    origemEstornoFinanceiro: 'CAIXA' // Devolve o dinheiro em conta para o cliente
}, vendaOriginalBolo);

// Exibe o relatório de reversão contábil no console
console.log(devolucaoParcialBolo.lancamentosContabeis);

// Exibe a primeira partida dobrada do JSON para checar o Retorno ao Estoque de Produtos Acabados
console.log("JSON de Partidas Dobradas (Estorno de Estoque/Custo):", 
    devolucaoParcialBolo.lancamentosJSON.partidas.find(p => p.conta.includes("Estoque"))
);
