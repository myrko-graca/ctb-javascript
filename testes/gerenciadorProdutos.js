class GerenciadorProdutosContabil {
    constructor() {
        this.LIMITES_ICMS = { min: 0.0400, max: 0.2200 }; // Alíquotas estaduais (internas e interestaduais)
        this.LIMITES_IPI = { min: 0.0000, max: 0.6000 };  // Variação padrão da tabela TIPI
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
    processarProduto(dadosProduto) {
        const regime = (dadosProduto.regimeTributario || 'REGULAR_LP').toUpperCase();
        const valorMercadoria = dadosProduto.valorMercadoria || 0;
        const desconto = dadosProduto.descontoConcedido || 0; 
        const valorComDesconto = Math.max(0, valorMercadoria - desconto);
        const custoProducaoMercadoria = dadosProduto.custoProducaoMercadoria || 0; 

        let icms = 0, ipi = 0, pis = 0, cofins = 0, irpjBase = 0, irpjAdicional = 0, irpj = 0, csll = 0, valorDasSimples = 0;
        let statusRegime = "OK";
        let taxaSimplesDescrita = "0.0%";
        let valorTotalNota = valorComDesconto; 

        if (regime === 'MEI') {
            taxaSimplesDescrita = "Fixo Mensal (DAS-MEI)";
        } 
        else if (regime === 'SIMPLES') {
            if (dadosProduto.aliquotaSimplesEfetiva === undefined || dadosProduto.aliquotaSimplesEfetiva <= 0) {
                throw new Error("ERRO_ALIQUOTA_DAS_OBRIGATORIA: O campo 'aliquotaSimplesEfetiva' é obrigatório (Anexo II).");
            }
            const alDAS = dadosProduto.aliquotaSimplesEfetiva > 1 ? dadosProduto.aliquotaSimplesEfetiva / 100 : dadosProduto.aliquotaSimplesEfetiva;
            valorDasSimples = this._arredondar(valorComDesconto * alDAS);
            taxaSimplesDescrita = `${(alDAS * 100).toFixed(2)}%`;
        } 
        else if (regime === 'REGULAR_LP') {
            const obrigatorios = ['aliquotaIcms', 'aliquotaIpi', 'aliquotaPis', 'aliquotaCofins', 'aliquotaIrpj', 'aliquotaCsll'];
            for (let campo of obrigatorios) {
                if (dadosProduto[campo] === undefined || dadosProduto[campo] < 0) {
                    throw new Error(`ERRO_PARAMETRO_${campo.toUpperCase()}_OBRIGATORIO: O campo '${campo}' é exigido.`);
                }
            }

            const alICMS = dadosProduto.aliquotaIcms > 1 ? dadosProduto.aliquotaIcms / 100 : dadosProduto.aliquotaIcms;
            const alIPI = dadosProduto.aliquotaIpi > 1 ? dadosProduto.aliquotaIpi / 100 : dadosProduto.aliquotaIpi;
            const alPIS = dadosProduto.aliquotaPis > 1 ? dadosProduto.aliquotaPis / 100 : dadosProduto.aliquotaPis;
            const alCOFINS = dadosProduto.aliquotaCofins > 1 ? dadosProduto.aliquotaCofins / 100 : dadosProduto.aliquotaCofins;
            const alIRPJ = dadosProduto.aliquotaIrpj > 1 ? dadosProduto.aliquotaIrpj / 100 : dadosProduto.aliquotaIrpj;
            const alCSLL = dadosProduto.aliquotaCsll > 1 ? dadosProduto.aliquotaCsll / 100 : dadosProduto.aliquotaCsll;

            if (!this._validarTaxa(dadosProduto.aliquotaIcms, this.LIMITES_ICMS) || 
                !this._validarTaxa(dadosProduto.aliquotaIpi, this.LIMITES_IPI) ||
                !this._validarTaxa(dadosProduto.aliquotaPis, this.LIMITES_PIS) || 
                !this._validarTaxa(dadosProduto.aliquotaCofins, this.LIMITES_COFINS)) {
                throw new Error("ERRO_LIMITES_FISCAIS: Uma ou mais taxas violam os limites legais configurados.");
            }

            ipi = this._arredondar(valorComDesconto * alIPI);
            valorTotalNota = valorComDesconto + ipi;
            icms = this._arredondar(valorComDesconto * alICMS);
            pis = this._arredondar(valorComDesconto * alPIS);
            cofins = this._arredondar(valorComDesconto * alCOFINS);

            const presuncaoIrpjInput = dadosProduto.percentualPresuncaoIrpj || 8.0; 
            const presuncaoCsllInput = dadosProduto.percentualPresuncaoCsll || 12.0; 

            const alPresuncaoIrpj = presuncaoIrpjInput > 1 ? presuncaoIrpjInput / 100 : presuncaoIrpjInput;
            const alPresuncaoCsll = presuncaoCsllInput > 1 ? presuncaoCsllInput / 100 : presuncaoCsllInput;
            
            const basePresumidaIrpj = this._arredondar(valorComDesconto * alPresuncaoIrpj);
            const basePresumidaCsll = this._arredondar(valorComDesconto * alPresuncaoCsll);

            const fatAcumulado = dadosProduto.faturamentoAcumuladoTrimestre || 0;
            const baseIrpjAcumuladaAnterior = this._arredondar(fatAcumulado * alPresuncaoIrpj);
            const baseIrpjAcumuladaTotal = baseIrpjAcumuladaAnterior + basePresumidaIrpj;

            irpjBase = this._arredondar(basePresumidaIrpj * alIRPJ);
            csll = this._arredondar(basePresumidaCsll * alCSLL);

            if (baseIrpjAcumuladaTotal > this.LIMITE_LUCRO_TRIMESTRAL) {
                let parcelaExcedente = baseIrpjAcumuladaAnterior >= this.LIMITE_LUCRO_TRIMESTRAL 
                    ? basePresumidaIrpj 
                    : baseIrpjAcumuladaTotal - this.LIMITE_LUCRO_TRIMESTRAL;
                irpjAdicional = this._arredondar(parcelaExcedente * this.ALIQUOTA_ADICIONAL_IRPJ);
            }
            irpj = this._arredondar(irpjBase + irpjAdicional);
        }
        else if (regime === 'REGULAR_LR') {
            const alICMS = dadosProduto.aliquotaIcms > 1 ? dadosProduto.aliquotaIcms / 100 : dadosProduto.aliquotaIcms;
            const alIPI = dadosProduto.aliquotaIpi > 1 ? dadosProduto.aliquotaIpi / 100 : dadosProduto.aliquotaIpi;
            const alPIS = dadosProduto.aliquotaPis > 1 ? dadosProduto.aliquotaPis / 100 : dadosProduto.aliquotaPis;
            const alCOFINS = dadosProduto.aliquotaCofins > 1 ? dadosProduto.aliquotaCofins / 100 : dadosProduto.aliquotaCofins;
            const alIRPJ = dadosProduto.aliquotaIrpj > 1 ? dadosProduto.aliquotaIrpj / 100 : dadosProduto.aliquotaIrpj;
            const alCSLL = dadosProduto.aliquotaCsll > 1 ? dadosProduto.aliquotaCsll / 100 : dadosProduto.aliquotaCsll;

            ipi = this._arredondar(valorComDesconto * alIPI);
            valorTotalNota = valorComDesconto + ipi;
            icms = this._arredondar(valorComDesconto * alICMS);

            pis = this._arredondar(Math.max(0, (valorComDesconto * alPIS) - (custoProducaoMercadoria * alPIS)));
            cofins = this._arredondar(Math.max(0, (valorComDesconto * alCOFINS) - (custoProducaoMercadoria * alCOFINS)));
            
            const ipiDebito = ipi;
            const ipiCredito = this._arredondar(custoProducaoMercadoria * alIPI);
            ipi = this._arredondar(Math.max(0, ipiDebito - ipiCredito));

            const receitaLiquidaAproximada = valorComDesconto - (icms + pis + cofins);
            const lucroRealNota = Math.max(0, receitaLiquidaAproximada - custoProducaoMercadoria);

            const lucroRealAcumuladoPeriodo = dadosProduto.lucroRealAcumuladoPeriodo || 0;
            const lucroRealTotalAcumulado = lucroRealAcumuladoPeriodo + lucroRealNota;

            irpjBase = this._arredondar(lucroRealNota * alIRPJ);
            csll = this._arredondar(lucroRealNota * alCSLL);

            if (lucroRealTotalAcumulado > this.LIMITE_LUCRO_TRIMESTRAL) {
                let parcelaExcedente = lucroRealAcumuladoPeriodo >= this.LIMITE_LUCRO_TRIMESTRAL 
                    ? lucroRealNota 
                    : lucroRealTotalAcumulado - this.LIMITE_LUCRO_TRIMESTRAL;
                irpjAdicional = this._arredondar(parcelaExcedente * this.ALIQUOTA_ADICIONAL_IRPJ);
            }
            irpj = this._arredondar(irpjBase + irpjAdicional);
        }

        const deducoesReceita = icms + pis + cofins + valorDasSimples;
        const receitaLiquida = this._arredondar(valorComDesconto - deducoesReceita);
        const lucroBrutoProduto = this._arredondar(receitaLiquida - custoProducaoMercadoria);

        const percentualAVista = dadosProduto.percentualAVista || 0;
        const valorAVista = this._arredondar(valorTotalNota * (percentualAVista / 100));
        const valorAPrazo = this._arredondar(valorTotalNota - valorAVista);

        const produtoCalculado = {
            regime, valorMercadoria, desconto, valorComDesconto, valorTotalNota, custoProducaoMercadoria,
            icms, ipi, pis, cofins, irpjBase, irpjAdicional, irpj, csll, valorDasSimples, taxaSimplesDescrita,
            receitaLiquida, lucroBrutoProduto, valorAVista, valorAPrazo,
            metodoRecebimento: percentualAVista === 100 ? "À Vista" : (percentualAVista === 0 ? "A Prazo" : "Misto")
        };

        return {
            valores: produtoCalculado,
            lancamentosContabeis: this.gerarLancamentosTexto(produtoCalculado),
            lancamentosJSON: this.gerarLancamentosJSON(produtoCalculado)
        };
    }
    gerarLancamentosJSON(v) {
        const lancamentos = [];
        lancamentos.push({ tipo: "CRÉDITO", conta: "Receita de Venda de Produtos (Resultado)", valor: v.valorComDesconto });
        
        if (v.ipi > 0) lancamentos.push({ tipo: "CRÉDITO", conta: "IPI a Recolher (Passivo Circulante)", valor: v.ipi });
        if (v.valorAVista > 0) lancamentos.push({ tipo: "DÉBITO", conta: "Caixa / Bancos (Ativo Circulante)", valor: v.valorAVista });
        if (v.valorAPrazo > 0) lancamentos.push({ tipo: "DÉBITO", conta: "Clientes / Contas a Receber (Ativo Circulante)", valor: v.valorAPrazo });

        if (v.custoProducaoMercadoria > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "Custo dos Produtos Vendidos - CPV (Resultado)", valor: v.custoProducaoMercadoria });
            lancamentos.push({ tipo: "CRÉDITO", conta: "Estoque de Produtos Acabados (Ativo Circulante)", valor: v.custoProducaoMercadoria });
        }

        if (v.valorDasSimples > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "Simples Nacional (Dedução da Receita)", valor: v.valorDasSimples });
            lancamentos.push({ tipo: "CRÉDITO", conta: "Simples Nacional a Recolher (Passivo)", valor: v.valorDasSimples });
        }
        if (v.icms > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "ICMS sobre Vendas (Dedução da Receita)", valor: v.icms });
            lancamentos.push({ tipo: "CRÉDITO", conta: "ICMS a Recolher (Passivo Circulante)", valor: v.icms });
        }
        if (v.pis > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "PIS sobre Faturamento (Dedução da Receita)", valor: v.pis });
            lancamentos.push({ tipo: "CRÉDITO", conta: "PIS a Recolher (Passivo Circulante)", valor: v.pis });
        }
        if (v.cofins > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "COFINS sobre Faturamento (Dedução da Receita)", valor: v.cofins });
            lancamentos.push({ tipo: "CRÉDITO", conta: "COFINS a Recolher (Passivo Circulante)", valor: v.cofins });
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
        let texto = `========================================================\n   [PRODUTO - REGIME: ${v.regime}] - VALIDAÇÃO FISCAL\n========================================================\n`;
        texto += `Valor Mercadoria: R$ ${v.valorComDesconto.toFixed(2)} | IPI (Por Fora): R$ ${v.ipi.toFixed(2)} | Total Nota: R$ ${v.valorTotalNota.toFixed(2)}\n`;
        texto += `Líquido a Receber (Nota Total): R$ ${(v.valorAVista + v.valorAPrazo).toFixed(2)} (${v.metodoRecebimento})\n`;
        
        if (v.regime === 'REGULAR_LP') {
            texto += `-> Presunção aplicada: IRPJ 8% | CSLL 12%\n`;
            texto += `-> Total IRPJ: R$ ${v.irpj.toFixed(2)} (Base: R$ ${v.irpjBase.toFixed(2)} | Adicional: R$ ${v.irpjAdicional.toFixed(2)})\n`;
        } else if (v.regime === 'SIMPLES') {
            texto += `-> Guia DAS (Simples - Anexo II Indústria): R$ ${v.valorDasSimples.toFixed(2)}\n`;
        }
        return texto;
    }
}
// Instanciação do Executor para a Indústria
const executorIndustria = new GerenciadorProdutosContabil();

console.log("%c 🏭 INICIANDO BATERIA DE TESTES CONTÁBEIS INDUSTRIAIS ", "background: #111; color: #00ffff; font-weight: bold;");

// ==========================================================================================
// TESTE 1: LUCRO PRESUMIDO (PRODUTO PADRÃO - SEM ADICIONAL)
// ==========================================================================================
console.log("\n--- TESTE 1: LUCRO PRESUMIDO INDUSTRIAL (SUCESSO - SEM ADICIONAL) ---");
try {
    let t1 = executorIndustria.processarProduto({
        regimeTributario: 'REGULAR_LP',
        valorMercadoria: 50000.00,
        custoProducaoMercadoria: 20000.00,
        faturamentoAcumuladoTrimestre: 100000.00, // Não estoura o limite trimestral com a presunção de 8%
        aliquotaIcms: 18.0,   
        aliquotaIpi: 5.0,     // 5% de IPI por fora
        aliquotaPis: 0.65,    
        aliquotaCofins: 3.0, 
        aliquotaIrpj: 15.0,  
        aliquotaCsll: 9.0,   
        percentualAVista: 100 // Venda totalmente à vista
    });
    console.log(t1.lancamentosContabeis);
    console.log("Partidas Dobradas JSON:", t1.lancamentosJSON);
} catch (error) {
    console.error("❌ Falha inesperada no teste 1:", error.message);
}

// ==========================================================================================
// TESTE 2: LUCRO PRESUMIDO (GRANDE ESCALA - GATILHO INTEGRAL DO ADICIONAL IRPJ)
// ==========================================================================================
console.log("\n--- TESTE 2: LUCRO PRESUMIDO INDUSTRIAL (SUCESSO - COM ADICIONAL DE IRPJ) ---");
try {
    let t2 = executorIndustria.processarProduto({
        regimeTributario: 'REGULAR_LP',
        valorMercadoria: 900000.00,
        custoProducaoMercadoria: 400000.00,
        faturamentoAcumuladoTrimestre: 800000.00, // Estoura o limite trimestral (Presunção 8% de 900k = 72k já passa de 60k)
        aliquotaIcms: 12.0,   // Alíquota interestadual
        aliquotaIpi: 10.0,    // 10% de IPI por fora
        aliquotaPis: 0.0065,  
        aliquotaCofins: 3.0, 
        aliquotaIrpj: 15.0, 
        aliquotaCsll: 9.0,
        percentualAVista: 0   // Venda totalmente a prazo
    });
    console.log(t2.lancamentosContabeis);
    console.log("Partidas Dobradas JSON:", t2.lancamentosJSON);
} catch (error) {
    console.error("❌ Falha inesperada no teste 2:", error.message);
}

// ==========================================================================================
// TESTE 3: SIMPLES NACIONAL (INDÚSTRIA - ANEXO II)
// ==========================================================================================
console.log("\n--- TESTE 3: SIMPLES NACIONAL INDÚSTRIA (ANEXO II) ---");
try {
    let t3 = executorIndustria.processarProduto({
        regimeTributario: 'SIMPLES',
        valorMercadoria: 25000.00,
        custoProducaoMercadoria: 11000.00,
        aliquotaSimplesEfetiva: 8.5, // Alíquota da faixa do Anexo II injetada
        percentualAVista: 50 // Venda mista (metade à vista, metade a prazo)
    });
    console.log(t3.lancamentosContabeis);
    console.log("Partidas Dobradas JSON:", t3.lancamentosJSON);
} catch (error) {
    console.error("❌ Falha inesperada no teste 3:", error.message);
}

// ==========================================================================================
// TESTE 4: LUCRO REAL (REGIME NÃO CUMULATIVO COM ABATIMENTO DE CRÉDITO DE MP)
// ==========================================================================================
console.log("\n--- TESTE 4: LUCRO REAL (NÃO CUMULATIVO - CRÉDITOS DE PIS/COFINS/IPI) ---");
try {
    let t4 = executorIndustria.processarProduto({
        regimeTributario: 'REGULAR_LR',
        valorMercadoria: 150000.00,
        custoProducaoMercadoria: 70000.00, 
        lucroRealAcumuladoPeriodo: 15000.00, 
        aliquotaIcms: 18.0, 
        aliquotaIpi: 12.0,     // IPI industrial gera direito a crédito nas entradas se houver insumos creditáveis
        aliquotaPis: 1.65,     // Alíquota cheia do Lucro Real
        aliquotaCofins: 7.60,  // Alíquota cheia do Lucro Real
        aliquotaIrpj: 15.0,    
        aliquotaCsll: 9.0,     
        percentualAVista: 100
    });
    console.log(t4.lancamentosContabeis);
    console.log("Partidas Dobradas JSON:", t4.lancamentosJSON);
} catch (error) {
    console.error("❌ Falha inesperada no teste 4:", error.message);
}

// ==========================================================================================
// TESTE 5: MICROEMPREENDEDOR INDIVIDUAL (MEI INDUSTRIAL / FABRICAÇÃO ANTES DA VENDA)
// ==========================================================================================
console.log("\n--- TESTE 5: MICROEMPREENDEDOR INDIVIDUAL (MEI INDUSTRIAL) ---");
try {
    let t5 = executorIndustria.processarProduto({
        regimeTributario: 'MEI',
        valorMercadoria: 4200.00,
        custoProducaoMercadoria: 1500.00,
        percentualAVista: 100
    });
    console.log(t5.lancamentosContabeis);
    console.log("Partidas Dobradas JSON:", t5.lancamentosJSON);
} catch (error) {
    console.error("❌ Falha inesperada no teste 5:", error.message);
}

console.log("%c 🟢 BATERIA DE TESTES INDUSTRIAIS FINALIZADA COM SUCESSO ", "background: #111; color: #00ff00; font-weight: bold;");
