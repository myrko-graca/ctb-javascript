export class GerenciadorServicosContabil {
    constructor() {
        this.LIMITES_ISS = { min: 0.0200, max: 0.0500 }; 
        this.LIMITES_PIS = { min: 0.0000, max: 0.0165 }; 
        this.LIMITES_COFINS = { min: 0.0000, max: 0.0760 }; 
        this.LIMITE_LUCRO_TRIMESTRAL = 60000.00; 
        this.ALIQUOTA_ADICIONAL_IRPJ = 0.10;    
    }
    _arredondar(valor) {
        return Math.round(valor * 100) / 100;
    }
    _validarTaxa(taxa, limites) {
        if (taxa === undefined || taxa === null || isNaN(taxa)) return false;
        const valorDecimal = taxa > 1 ? taxa / 100 : taxa;
        return valorDecimal >= limites.min && valorDecimal <= limites.max;
    }
    processarServico(dadosServico) {
        const regime = (dadosServico.regimeTributario || 'REGULAR_LP').toUpperCase();
        const valorBrutoServico = dadosServico.valorTotalServico || 0;
        const desconto = dadosServico.descontoConcedido || 0; 
        const valorComDesconto = Math.max(0, valorBrutoServico - desconto);
        const custoServicoPrestado = dadosServico.custoServicoPrestado || 0;
        const issRetidoFonte = regime === 'SIMPLES_ANEXO_IV' 
            ? (dadosServico.issRetidoFonte !== undefined ? dadosServico.issRetidoFonte : true)
            : (dadosServico.issRetidoFonte || false);

        let iss = 0, pis = 0, cofins = 0, irpjBase = 0, irpjAdicional = 0, irpj = 0, csll = 0, valorDasSimples = 0;
        let irrfRetido = 0, csrfRetido = 0, issRetido = 0; 
        let statusRegime = "OK";
        let taxaSimplesDescrita = "0.0%";

        if (regime === 'MEI') {
            taxaSimplesDescrita = "Fixo Mensal (DAS-MEI)";
        } 
        else if (regime === 'SIMPLES' || regime === 'SIMPLES_ANEXO_IV') {
            if (dadosServico.aliquotaSimplesEfetiva === undefined || dadosServico.aliquotaSimplesEfetiva <= 0) {
                throw new Error("ERRO_ALIQUOTA_DAS_OBRIGATORIA: O campo 'aliquotaSimplesEfetiva' é obrigatório e deve ser maior que zero.");
            }
            if (regime === 'SIMPLES_ANEXO_IV' && !this._validarTaxa(dadosServico.aliquotaIss, this.LIMITES_ISS)) {
                throw new Error("ERRO_ISS_INVALIDO: Alíquota de 'aliquotaIss' fora dos limites legais ou ausente para o Anexo IV.");
            }

            const alDAS = dadosServico.aliquotaSimplesEfetiva > 1 ? dadosServico.aliquotaSimplesEfetiva / 100 : dadosServico.aliquotaSimplesEfetiva;
            valorDasSimples = this._arredondar(valorComDesconto * alDAS);
            taxaSimplesDescrita = `${(alDAS * 100).toFixed(2)}%`;

            if (issRetidoFonte) {
                const alISS = dadosServico.aliquotaIss > 1 ? dadosServico.aliquotaIss / 100 : dadosServico.aliquotaIss;
                issRetido = this._arredondar(valorComDesconto * alISS);
            }
        } 
        else if (regime === 'REGULAR_LP' || regime === 'REGULAR_LR') {
            const obrigatorios = ['aliquotaIss', 'aliquotaPis', 'aliquotaCofins', 'aliquotaIrpj', 'aliquotaCsll'];
            for (let campo of obrigatorios) {
                if (dadosServico[campo] === undefined || dadosServico[campo] < 0) {
                    throw new Error(`ERRO_PARAMETRO_${campo.toUpperCase()}_OBRIGATORIO: O campo '${campo}' é exigido e não pode ser negativo.`);
                }
            }
            const alISS = dadosServico.aliquotaIss > 1 ? dadosServico.aliquotaIss / 100 : dadosServico.aliquotaIss;
            const alPIS = dadosServico.aliquotaPis > 1 ? dadosServico.aliquotaPis / 100 : dadosServico.aliquotaPis;
            const alCOFINS = dadosServico.aliquotaCofins > 1 ? dadosServico.aliquotaCofins / 100 : dadosServico.aliquotaCofins;
            const alIRPJ = dadosServico.aliquotaIrpj > 1 ? dadosServico.aliquotaIrpj / 100 : dadosServico.aliquotaIrpj;
            const alCSLL = dadosServico.aliquotaCsll > 1 ? dadosServico.aliquotaCsll / 100 : dadosServico.aliquotaCsll;

            if (!this._validarTaxa(dadosServico.aliquotaIss, this.LIMITES_ISS) || 
                !this._validarTaxa(dadosServico.aliquotaPis, this.LIMITES_PIS) || 
                !this._validarTaxa(dadosServico.aliquotaCofins, this.LIMITES_COFINS)) {
                throw new Error("ERRO_LIMITES_FISCAIS: Uma ou mais taxas (ISS, PIS ou COFINS) violam as travas dos limites legais configurados.");
            }
            iss = this._arredondar(valorComDesconto * alISS);
            if (regime === 'REGULAR_LP') {
                pis = this._arredondar(valorComDesconto * alPIS);
                cofins = this._arredondar(valorComDesconto * alCOFINS);

                const presuncaoInput = dadosServico.percentualPresuncao || 32.0; 
                const alPresuncao = presuncaoInput > 1 ? presuncaoInput / 100 : presuncaoInput;
                
                const basePresumidaNota = this._arredondar(valorComDesconto * alPresuncao);
                const fatAcumulado = dadosServico.faturamentoAcumuladoTrimestre || 0;
                const basePresumidaAnterior = this._arredondar(fatAcumulado * alPresuncao);
                const basePresumidaAcumulada = basePresumidaAnterior + basePresumidaNota;

                irpjBase = this._arredondar(basePresumidaNota * alIRPJ);
                csll = this._arredondar(basePresumidaNota * alCSLL);

                if (basePresumidaAcumulada > this.LIMITE_LUCRO_TRIMESTRAL) {
                    let parcelaExcedenteTributavel = 0;
                    if (basePresumidaAnterior >= this.LIMITE_LUCRO_TRIMESTRAL) {
                        parcelaExcedenteTributavel = basePresumidaNota;
                    } else {
                        parcelaExcedenteTributavel = basePresumidaAcumulada - this.LIMITE_LUCRO_TRIMESTRAL;
                    }
                    irpjAdicional = this._arredondar(parcelaExcedenteTributavel * this.ALIQUOTA_ADICIONAL_IRPJ);
                }
            } else {
                const pisDebito = valorComDesconto * alPIS;
                const pisCredito = custoServicoPrestado * alPIS;
                pis = this._arredondar(Math.max(0, pisDebito - pisCredito));

                const cofinsDebito = valorComDesconto * alCOFINS;
                const cofinsCredito = custoServicoPrestado * alCOFINS;
                cofins = this._arredondar(Math.max(0, cofinsDebito - cofinsCredito));

				const receitaLiquidaAproximada = valorComDesconto - (iss + pis + cofins);
				const lucroRealNota = Math.max(0, receitaLiquidaAproximada - custoServicoPrestado);

				const lucroRealAcumuladoPeriodo = dadosServico.lucroRealAcumuladoPeriodo || 0; 
				const lucroRealTotalAcumulado = lucroRealAcumuladoPeriodo + lucroRealNota;

				irpjBase = this._arredondar(lucroRealNota * alIRPJ);
				csll = this._arredondar(lucroRealNota * alCSLL);

				if (lucroRealTotalAcumulado > this.LIMITE_LUCRO_TRIMESTRAL) {
					let parcelaExcedenteTributavel = 0;
					if (lucroRealAcumuladoPeriodo >= this.LIMITE_LUCRO_TRIMESTRAL) {
						parcelaExcedenteTributavel = lucroRealNota;
					} else {
						parcelaExcedenteTributavel = lucroRealTotalAcumulado - this.LIMITE_LUCRO_TRIMESTRAL;
					}
					irpjAdicional = this._arredondar(parcelaExcedenteTributavel * this.ALIQUOTA_ADICIONAL_IRPJ);
				}
            }
            irpj = this._arredondar(irpjBase + irpjAdicional);
            if (issRetidoFonte) { issRetido = iss; iss = 0; }

            if (dadosServico.sofreRetencaoFonte) {
                if (dadosServico.aliquotaRetIrrf === undefined || dadosServico.aliquotaRetCsrf === undefined) {
                    throw new Error("ERRO_TAXAS_RETENCAO: As alíquotas de retenção na fonte (aliquotaRetIrrf e aliquotaRetCsrf) são obrigatórias.");
                }
                const alRetIRRF = dadosServico.aliquotaRetIrrf > 1 ? dadosServico.aliquotaRetIrrf / 100 : dadosServico.aliquotaRetIrrf;
                const alRetCSRF = dadosServico.aliquotaRetCsrf > 1 ? dadosServico.aliquotaRetCsrf / 100 : dadosServico.aliquotaRetCsrf;

                irrfRetido = this._arredondar(valorComDesconto * alRetIRRF);
                csrfRetido = this._arredondar(valorComDesconto * alRetCSRF);
            }
        }
        const deducoesReceita = iss + pis + cofins + valorDasSimples + issRetido;
        const receitaLiquida = this._arredondar(valorComDesconto - deducoesReceita);
        const lucroBrutoServico = this._arredondar(receitaLiquida - custoServicoPrestado);

        const totalRetencoes = irrfRetido + csrfRetido + issRetido; 
        const valorLiquidoReceber = valorComDesconto - totalRetencoes;
        const percentualAVista = dadosServico.percentualAVista || 0;
        const valorAVista = this._arredondar(valorLiquidoReceber * (percentualAVista / 100));
        const valorAPrazo = this._arredondar(valorLiquidoReceber - valorAVista);

        const servicoCalculado = {
            regime, statusRegime, valorBrutoServico, desconto, valorComDesconto, custoServicoPrestado,
            iss, pis, cofins, irpjBase, irpjAdicional, irpj, csll, valorDasSimples, taxaSimplesDescrita,
            irrfRetido, csrfRetido, issRetido, totalRetencoes, issRetidoFonte,
            receitaLiquida, lucroBrutoServico, valorAVista, valorAPrazo,
            metodoRecebimento: percentualAVista === 100 ? "À Vista" : (percentualAVista === 0 ? "A Prazo" : "Misto")
        };
        return {
            valores: servicoCalculado,
            lancamentosContabeis: this.gerarLancamentosTexto(servicoCalculado),
            lancamentosJSON: this.gerarLancamentosJSON(servicoCalculado)
        };
    }
	gerarLancamentosJSON(v) {
		const lancamentos = [];
		lancamentos.push({ tipo: "CRÉDITO", conta: "Receita de Prestação de Serviços (Resultado)", valor: v.valorComDesconto });

		if (v.valorAVista > 0) lancamentos.push({ tipo: "DÉBITO", conta: "Caixa / Bancos (Ativo Circulante)", valor: v.valorAVista });
		if (v.valorAPrazo > 0) lancamentos.push({ tipo: "DÉBITO", conta: "Clientes / Contas a Receber (Ativo Circulante)", valor: v.valorAPrazo });
		if (v.issRetido > 0) lancamentos.push({ tipo: "DÉBITO", conta: "ISS Retido a Recuperar (Ativo Circulante)", valor: v.issRetido });
		if (v.irrfRetido > 0) lancamentos.push({ tipo: "DÉBITO", conta: "IRRF Retido a Recuperar (Ativo Circulante)", valor: v.irrfRetido });
		if (v.csrfRetido > 0) lancamentos.push({ tipo: "DÉBITO", conta: "CSRF Retida a Recuperar (Ativo Circulante)", valor: v.csrfRetido });

		// =========================================================================
		// INCLUSÃO DO LANÇAMENTO DE CUSTO (CSP)
		// =========================================================================
		if (v.custoServicoPrestado > 0) {
			lancamentos.push({ tipo: "DÉBITO", conta: "Custo dos Serviços Prestados (Resultado / DRE)", valor: v.custoServicoPrestado });
			lancamentos.push({ tipo: "CRÉDITO", conta: "Custos de Serviços em Andamento / Aplicados (Ativo Circulante)", valor: v.custoServicoPrestado });
		}
		// =========================================================================

		if (v.valorDasSimples > 0) {
			lancamentos.push({ tipo: "DÉBITO", conta: "Simples Nacional (Dedução da Receita / Resultado)", valor: v.valorDasSimples });
			lancamentos.push({ tipo: "CRÉDITO", conta: "Simples Nacional a Recolher (Passivo Circulante)", valor: v.valorDasSimples });
		}
		if (v.iss > 0) {
			lancamentos.push({ tipo: "DÉBITO", conta: "ISS sobre Serviços (Dedução da Receita / Resultado)", valor: v.iss });
			lancamentos.push({ tipo: "CRÉDITO", conta: "ISS a Recolher (Passivo Circulante)", valor: v.iss });
		}
		if (v.pis > 0) {
			lancamentos.push({ tipo: "DÉBITO", conta: "PIS sobre Faturamento (Dedução da Receita / Resultado)", valor: v.pis });
			lancamentos.push({ tipo: "CRÉDITO", conta: "PIS a Recolher (Passivo Circulante)", valor: v.pis });
		}
		if (v.cofins > 0) {
			lancamentos.push({ tipo: "DÉBITO", conta: "COFINS sobre Faturamento (Dedução da Receita / Resultado)", valor: v.cofins });
			lancamentos.push({ crowding: "CRÉDITO", conta: "COFINS a Recolher (Passivo Circulante)", valor: v.cofins });
		}
		if (v.irpj > 0) {
			lancamentos.push({ tipo: "DÉBITO", conta: "Provisão de IRPJ (Resultado)", valor: v.irpj });
			lancamentos.push({ tipo: "CRÉDITO", conta: "IRPJ a Recolher (Passivo Circulante)", valor: v.irpj });
		}
		if (v.csll > 0) {
			lancamentos.push({ tipo: "DÉBITO", conta: "Provisão de CSLL (Resultado)", valor: v.csll });
			lancamentos.push({ tipo: "CRÉDITO", conta: "CSLL a Recolher (Passivo Circulante)", valor: v.csll });
		}
		
		return { metadata: { regime: v.regime }, partidas: lancamentos };
	}
    gerarLancamentosTexto(v) {
        let texto = `========================================================\n   [REGIME: ${v.regime}] - VALIDAÇÃO COMPLETA DE VALORES\n========================================================\n`;
        texto += `Valor Bruto: R$ ${v.valorBrutoServico.toFixed(2)} | Desconto: R$ ${v.desconto.toFixed(2)}\n`;
        texto += `Líquido Financeiro a Receber: R$ ${(v.valorAVista + v.valorAPrazo).toFixed(2)} (${v.metodoRecebimento})\n`;
        
        if (v.regime === 'REGULAR_LP') {
            texto += `-> IRPJ Base: R$ ${v.irpjBase.toFixed(2)} | Adicional 10%: R$ ${v.irpjAdicional.toFixed(2)} | Total IRPJ: R$ ${v.irpj.toFixed(2)}\n`;
        } else if (v.regime === 'SIMPLES' || v.regime === 'SIMPLES_ANEXO_IV') {
            texto += `-> Guia DAS (Simples): R$ ${v.valorDasSimples.toFixed(2)} (Taxa: ${v.taxaSimplesDescrita})\n`;
            if (v.issRetido > 0) texto += `⚠️ ISS Retido na Fonte destacado: R$ ${v.issRetido.toFixed(2)}\n`;
        } else if (v.regime === 'MEI') {
            texto += `-> Isenção completa de impostos incidentes em nota fiscal.\n`;
        }
        return texto;
    }
}
/*
const executor = new GerenciadorServicosContabil();

console.log("%c 🟢 INICIANDO BATERIA DE TESTES CONTÁBEIS REFATORADA ", "background: #222; color: #00ff00; font-weight: bold;");

// ==========================================================================================
// BLOCO DE TESTES: LUCRO PRESUMIDO (Utiliza Faturamento Bruto Acumulado)
// ==========================================================================================

console.log("\n--- TESTE 1: LUCRO PRESUMIDO (SUCESSO - SEM ADICIONAL) ---");
try {
    let t1 = executor.processarServico({
        regimeTributario: 'REGULAR_LP',
        valorTotalServico: 30000.00,
        faturamentoAcumuladoTrimestre: 40000.00, // Correto para Lucro Presumido
        percentualPresuncao: 32.0,
        aliquotaIss: 5.0,    
        aliquotaPis: 0.0065,   // Ajustado para o limite decimal (0.65%)
        aliquotaCofins: 3.0, 
        aliquotaIrpj: 15.0,  
        aliquotaCsll: 9.0,   
        percentualAVista: 100
    });
    console.log("Resultado JSON:", t1);
} catch (error) {
    console.error("❌ Falha inesperada no teste 1:", error.message);
}

console.log("\n--- TESTE 2: LUCRO PRESUMIDO (SUCESSO - GATILHO PARCIAL DO ADICIONAL) ---");
try {
    let t2 = executor.processarServico({
        regimeTributario: 'REGULAR_LP',
        valorTotalServico: 80000.00,
        faturamentoAcumuladoTrimestre: 150000.00, // Correto para Lucro Presumido
        percentualPresuncao: 32.0,
        aliquotaIss: 4.0, 
        aliquotaPis: 0.0065,   // Ajustado para o limite decimal (0.65%)
        aliquotaCofins: 3.0, 
        aliquotaIrpj: 15.0, 
        aliquotaCsll: 9.0,
        percentualAVista: 0
    });
    console.log("Resultado JSON:", t2);
} catch (error) {
    console.error("❌ Falha inesperada no teste 2:", error.message);
}

console.log("\n--- TESTE 3: LUCRO PRESUMIDO (SUCESSO - GATILHO INTEGRAL DO ADICIONAL) ---");
try {
    let t3 = executor.processarServico({
        regimeTributario: 'REGULAR_LP',
        valorTotalServico: 50000.00,
        faturamentoAcumuladoTrimestre: 250000.00, // Correto para Lucro Presumido
        percentualPresuncao: 32.0,
        aliquotaIss: 5.0, 
        aliquotaPis: 0.0065,   // Ajustado para o limite decimal (0.65%)
        aliquotaCofins: 3.0, 
        aliquotaIrpj: 15.0, 
        aliquotaCsll: 9.0,
        percentualAVista: 50
    });
    console.log("Resultado JSON:", t3);
} catch (error) {
    console.error("❌ Falha inesperada no teste 3:", error.message);
}

// ==========================================================================================
// BLOCO DE TESTES: SIMPLES NACIONAL E MEI
// ==========================================================================================

console.log("\n--- TESTE 4: SIMPLES NACIONAL (ALÍQUOTA INJETADA EXTERNA) ---");
try {
    let t4 = executor.processarServico({
        regimeTributario: 'SIMPLES',
        valorTotalServico: 12000.00,
        aliquotaSimplesEfetiva: 6.5,
        percentualAVista: 100
    });
    console.log("Resultado JSON:", t4);
} catch (error) {
    console.error("❌ Falha inesperada no teste 4:", error.message);
}

console.log("\n--- TESTE 5: SIMPLES ANEXO IV (OBRIGAÇÃO DE ALÍQUOTA DE ISS E RETENÇÃO) ---");
try {
    let t5 = executor.processarServico({
        regimeTributario: 'SIMPLES_ANEXO_IV',
        valorTotalServico: 45000.00,
        aliquotaSimplesEfetiva: 8.2,
        aliquotaIss: 3.0, 
        percentualAVista: 0
    });
    console.log("Resultado JSON:", t5);
} catch (error) {
    console.error("❌ Falha inesperada no teste 5:", error.message);
}

console.log("\n--- TESTE 6: MICROEMPREENDEDOR INDIVIDUAL (MEI) ---");
try {
    let t6 = executor.processarServico({
        regimeTributario: 'MEI',
        valorTotalServico: 3500.00,
        percentualAVista: 50
    });
    console.log("Resultado JSON:", t6);
} catch (error) {
    console.error("❌ Falha inesperada no teste 6:", error.message);
}

// ==========================================================================================
// BLOCO DE TESTES: RETENÇÕES NA FONTE E NOVO LUCRO REAL
// ==========================================================================================

console.log("\n--- TESTE 7: LUCRO PRESUMIDO COM RETENÇÃO NA FONTE (IRRF E CSRF) ---");
try {
    let t7 = executor.processarServico({
        regimeTributario: 'REGULAR_LP',
        valorTotalServico: 100000.00,
        faturamentoAcumuladoTrimestre: 0, 
        percentualPresuncao: 32.0,
        aliquotaIss: 5.0, 
        aliquotaPis: 0.0065, 
        aliquotaCofins: 3.0, 
        aliquotaIrpj: 15.0, 
        aliquotaCsll: 9.0,
        sofreRetencaoFonte: true,
        aliquotaRetIrrf: 1.5,   
        aliquotaRetCsrf: 4.65,  
        percentualAVista: 100
    });
    console.log("Resultado JSON:", t7);
} catch (error) {
    console.error("❌ Falha inesperada no teste 7:", error.message);
}

console.log("\n--- TESTE 8: LUCRO REAL (CONCEITO CORRIGIDO - LUCRO ACUMULADO) ---");
try {
    let t8 = executor.processarServico({
        regimeTributario: 'REGULAR_LR',
        valorTotalServico: 200000.00,
        custoServicoPrestado: 80000.00, 
        // PARAMETRO CORRIGIDO: Passando o lucro contábil real acumulado do período, não faturamento
        lucroRealAcumuladoPeriodo: 50000.00, 
        aliquotaIss: 5.0, 
        aliquotaPis: 1.65,     // Lucro Real (Regime Não Cumulativo) usa 1,65% puro
        aliquotaCofins: 7.60,  // Lucro Real (Regime Não Cumulativo) usa 7,60% puro
        aliquotaIrpj: 15.0,    
        aliquotaCsll: 9.0,     
        percentualAVista: 100
    });
    console.log("Resultado JSON:", t8);
} catch (error) {
    console.error("❌ Falha inesperada no teste 8:", error.message);
}

console.log("\n--- TESTE 9: REGULAR (SUCESSO - FOCO EM CSRF RETIDA A RECUPERAR) ---");
try {
    let t9 = executor.processarServico({
        regimeTributario: 'REGULAR_LP',
        valorTotalServico: 150000.00,        
        faturamentoAcumuladoTrimestre: 0, 
        percentualPresuncao: 32.0,
        aliquotaIss: 5.0,                    
        aliquotaPis: 0.0065, 
        aliquotaCofins: 3.0, 
        aliquotaIrpj: 15.0, 
        aliquotaCsll: 9.0,
        sofreRetencaoFonte: true,            
        aliquotaRetIrrf: 0,                  
        aliquotaRetCsrf: 4.65,               
        percentualAVista: 100                
    });
    console.log("Resultado JSON:", t9);
} catch (error) {
    console.error("❌ Falha inesperada no teste 9:", error.message);
}
*/