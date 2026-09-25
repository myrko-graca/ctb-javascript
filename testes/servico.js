class MotorContabilValidacao {
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
        const desconto = dadosServico.descontoConcedido || 0; // CORRIGIDO: de 'descuento' para 'desconto'
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
                return { valores: null, statusRegime: "ERRO_ALIQUOTA_DAS_OBRIGATORIA", lancamentosContabeis: "ERRO: 'aliquotaSimplesEfetiva' obrigatória." };
            }
            if (regime === 'SIMPLES_ANEXO_IV' && !this._validarTaxa(dadosServico.aliquotaIss, this.LIMITES_ISS)) {
                return { valores: null, statusRegime: "ERRO_ISS_INVALIDO", lancamentosContabeis: "ERRO: 'aliquotaIss' obrigatória no Anexo IV." };
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
                    return { valores: null, statusRegime: `ERRO_PARAMETRO_${campo.toUpperCase()}_OBRIGATORIO`, lancamentosContabeis: `ERRO: Campo '${campo}' exigido.` };
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
                return { valores: null, statusRegime: "ERRO_LIMITES_FISCAIS", lancamentosContabeis: "ERRO: Taxas violam limites legais." };
            }

            iss = this._arredondar(valorComDesconto * alISS);
            pis = this._arredondar(valorComDesconto * alPIS);
            cofins = this._arredondar(valorComDesconto * alCOFINS);
            csll = this._arredondar(valorComDesconto * alCSLL);
            
            irpjBase = this._arredondar(valorComDesconto * alIRPJ);
            
            if (regime === 'REGULAR_LP') {
                const presuncaoInput = dadosServico.percentualPresuncao || 32.0; 
                const alPresuncao = presuncaoInput > 1 ? presuncaoInput / 100 : presuncaoInput;
                const fatAcumulado = dadosServico.faturamentoAcumuladoTrimestre || 0;
                
                const lucroPresumidoAnterior = this._arredondar(fatAcumulado * alPresuncao);
                const lucroPresumidoDaNota = this._arredondar(valorComDesconto * alPresuncao);
                const lucroPresumidoTotalAcumulado = lucroPresumidoAnterior + lucroPresumidoDaNota;

                if (lucroPresumidoTotalAcumulado > this.LIMITE_LUCRO_TRIMESTRAL) {
                    let parcelaExcedenteTributavel = 0;

                    if (lucroPresumidoAnterior >= this.LIMITE_LUCRO_TRIMESTRAL) {
                        parcelaExcedenteTributavel = lucroPresumidoDaNota;
                    } else {
                        parcelaExcedenteTributavel = lucroPresumidoTotalAcumulado - this.LIMITE_LUCRO_TRIMESTRAL;
                    }
                    irpjAdicional = this._arredondar(parcelaExcedenteTributavel * this.ALIQUOTA_ADICIONAL_IRPJ);
                }
            }

            irpj = this._arredondar(irpjBase + irpjAdicional);

            if (issRetidoFonte) { issRetido = iss; iss = 0; }

            if (dadosServico.sofreRetencaoFonte) {
                if (dadosServico.aliquotaRetIrrf === undefined || dadosServico.aliquotaRetCsrf === undefined) {
                    return { valores: null, statusRegime: "ERRO_TAXAS_RETENCAO", lancamentosContabeis: "ERRO: Taxas de retenção obrigatórias." };
                }
                const alRetIRRF = dadosServico.aliquotaRetIrrf > 1 ? dadosServico.aliquotaRetIrrf / 100 : dadosServico.aliquotaRetIrrf;
                const alRetCSRF = dadosServico.aliquotaRetCsrf > 1 ? dadosServico.aliquotaRetCsrf / 100 : dadosServico.aliquotaRetCsrf;

                irrfRetido = this._arredondar(valorComDesconto * alRetIRRF);
                csrfRetido = this._arredondar(valorComDesconto * alRetCSRF);
            }
        }

        const totalImpostosNota = iss + pis + cofins + irpj + csll + valorDasSimples;
        const totalRetencoes = irrfRetido + csrfRetido + issRetido; 
        const percentualAVista = dadosServico.percentualAVista || 0;
        const valorLiquidoReceber = valorComDesconto - totalRetencoes;
        const valorAVista = this._arredondar(valorLiquidoReceber * (percentualAVista / 100));
        const valorAPrazo = this._arredondar(valorLiquidoReceber - valorAVista);
        const receivable = valorComDesconto - totalImpostosNota - issRetido;
        const receitaLiquida = this._arredondar(receivable);
        const lucroBrutoServico = this._arredondar(receitaLiquida - custoServicoPrestado);

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
        if (v.statusRegime !== "OK") return { erro: v.statusRegime };
        const lancamentos = [];
        
        // 1. RECEBIMENTOS E RETENÇÕES NA FONTE (DÉBITOS)
        if (v.valorAVista > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "Caixa / Bancos (Ativo Circulante)", valor: v.valorAVista });
        }
        if (v.valorAPrazo > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "Clientes / Contas a Receber (Ativo Circulante)", valor: v.valorAPrazo });
        }
        if (v.issRetido > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "ISS Retido a Recuperar (Ativo Circulante)", valor: v.issRetido });
        }
        if (v.irrfRetido > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "IRRF Retido a Recuperar (Ativo Circulante)", valor: v.irrfRetido });
        }
        if (v.csrfRetido > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "CSRF Retida a Recuperar (Ativo Circulante)", valor: v.csrfRetido });
        }

        // 2. PROVISÃO DE IMPOSTOS SOBRE O FATURAMENTO
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
            lancamentos.push({ tipo: "CRÉDITO", conta: "COFINS a Recolher (Passivo Circulante)", valor: v.cofins });
        }
        if (v.irpj > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "IRPJ (Despesa Tributária / Resultado)", valor: v.irpj });
            lancamentos.push({ tipo: "CRÉDITO", conta: "IRPJ a Recolher (Passivo Circulante)", valor: v.irpj });
        }
        if (v.csll > 0) {
            lancamentos.push({ tipo: "DÉBITO", conta: "CSLL (Despesa Tributária / Resultado)", valor: v.csll });
            lancamentos.push({ tipo: "CRÉDITO", conta: "CSLL a Recolher (Passivo Circulante)", valor: v.csll });
        }

        // 3. RECONHECIMENTO DA RECEITA BRUTA (CRÉDITO)
        lancamentos.push({ tipo: "CRÉDITO", conta: "Receita de Prestação de Serviços (Resultado)", valor: v.valorBrutoServico });
        
        return { metadata: { regime: v.regime }, partidas: lancamentos };
    }

    gerarLancamentosTexto(v) {
        let texto = `========================================================\n   [REGIME: ${v.regime}] - VALIDAÇÃO COMPLETA DE VALORES\n========================================================\n`;
        texto += `Valor Bruto: R$ ${v.valorBrutoServico.toFixed(2)} | Desconto: R$ ${v.desconto.toFixed(2)}\n`;
        texto += `Líquido a Receber: R$ ${(v.valorAVista + v.valorAPrazo).toFixed(2)} (${v.metodoRecebimento})\n`;
        
        if (v.regime === 'REGULAR_LP') {
            texto += `-> IRPJ Base: R$ ${v.irpjBase.toFixed(2)} | Adicional 10%: R$ ${v.irpjAdicional.toFixed(2)} | Total IRPJ: R$ ${v.irpj.toFixed(2)}\n`;
        } else if (v.regime === 'SIMPLES' || v.regime === 'SIMPLES_ANEXO_IV') {
            texto += `-> Guia DAS (Simples): R$ ${v.valorDasSimples.toFixed(2)} (Taxa: ${v.taxaSimplesDescrita})\n`;
            if (v.issRetido > 0) texto += `⚠️ ISS Retido na Fonte destacado: R$ ${v.issRetido.toFixed(2)}\n`;
        } else if (v.regime === 'MEI') {
            texto += `-> Isenção completa de impostos retidos ou incidentes em nota fiscal.\n`;
        }
        return texto;
    }
}
const executor = new MotorContabilValidacao();

console.log("%c 🟢 EXECUTANDO BATERIA PARAMETRIZADA POR BLOCOS ", "background: #222; color: #00ff00; font-weight: bold;");

// TESTE 1: Lucro Presumido sem Adicional
console.log("\n--- TESTE 1: LUCRO PRESUMIDO (ISENTO DE ADICIONAL DE IRPJ) ---");
let t1 = executor.processarServico({
    regimeTributario: 'REGULAR_LP',
    valorTotalServico: 30000.00,
    faturamentoAcumuladoTrimestre: 40000.00, 
    percentualPresuncao: 32.0,
    aliquotaIss: 5.0, 
    aliquotaPis: 0.0065, // Ajustado para decimal puro para respeitar o motor original
    aliquotaCofins: 3.0, 
    aliquotaIrpj: 4.8, 
    aliquotaCsll: 2.88,
    percentualAVista: 100
});
console.log(t1.lancamentosContabeis);
console.log(t1);

// TESTE 2: Lucro Presumido cruzando o teto no meio da operação
console.log("\n--- TESTE 2: LUCRO PRESUMIDO (GATILHO PARCIAL DO ADICIONAL 10%) ---");
let t2= executor.processarServico({
    regimeTributario: 'REGULAR_LP',
    valorTotalServico: 80000.00,
    faturamentoAcumuladoTrimestre: 150000.00, 
    percentualPresuncao: 32.0,
    aliquotaIss: 4.0, aliquotaPis: 0.0065, aliquotaCofins: 3.0, aliquotaIrpj: 4.8, aliquotaCsll: 2.88,
    percentualAVista: 0
});
console.log(t2.lancamentosContabeis);
console.log(t2);

// TESTE 3: Lucro Presumido com teto já estourado previamente
console.log("\n--- TESTE 3: LUCRO PRESUMIDO (GATILHO INTEGRAL DO ADICIONAL 10%) ---");
let t3 = executor.processarServico({
    regimeTributario: 'REGULAR_LP',
    valorTotalServico: 50000.00,
    faturamentoAcumuladoTrimestre: 250000.00, 
    percentualPresuncao: 32.0,
    aliquotaIss: 5.0, aliquotaPis: 0.0065, aliquotaCofins: 3.0, aliquotaIrpj: 4.8, aliquotaCsll: 2.88,
    percentualAVista: 50
});
console.log(t3.lancamentosContabeis);
console.log(t3);

// TESTE 4: Simples Nacional Tradicional
console.log("\n--- TESTE 4: SIMPLES NACIONAL (ALÍQUOTA INJETADA EXTERNA) ---");
let t4 = executor.processarServico({
    regimeTributario: 'SIMPLES',
    valorTotalServico: 12000.00,
    aliquotaSimplesEfetiva: 6.5,
    percentualAVista: 100
});
console.log(t4.lancamentosContabeis);
console.log(t4);

// TESTE 5: Simples Nacional Anexo IV com retenção de ISS
console.log("\n--- TESTE 5: SIMPLES ANEXO IV (OBRIGAÇÃO DE ALÍQUOTA DE ISS E RETENÇÃO) ---");
let t5 = executor.processarServico({
    regimeTributario: 'SIMPLES_ANEXO_IV',
    valorTotalServico: 45000.00,
    aliquotaSimplesEfetiva: 8.2,
    aliquotaIss: 3.0,
    percentualAVista: 0
})
console.log(t5.lancamentosContabeis);
console.log(t5);

// TESTE 6: Microempreendedor Individual (MEI)
console.log("\n--- TESTE 6: MICROEMPREENDEDOR INDIVIDUAL (MEI) ---");
let t6 = executor.processarServico({
    regimeTributario: 'MEI',
    valorTotalServico: 3500.00,
    percentualAVista: 50
});
console.log(t6.lancamentosContabeis);
console.log(t6);

// TESTE 7: Lucro Presumido com Retenção na Fonte completa
console.log("\n--- TESTE 7: LUCRO PRESUMIDO COM RETENÇÃO NA FONTE (IRRF E CSRF) ---");
let t7 = executor.processarServico({
    regimeTributario: 'REGULAR_LP',
    valorTotalServico: 100000.00,
    faturamentoAcumuladoTrimestre: 0, 
    percentualPresuncao: 32.0,
    aliquotaIss: 5.0, 
    aliquotaPis: 0.0065, // Formato correto decimal aceito pelo motor (< 1)
    aliquotaCofins: 3.0, 
    aliquotaIrpj: 4.8, 
    aliquotaCsll: 2.88,
    sofreRetencaoFonte: true,
    aliquotaRetIrrf: 1.5,   
    aliquotaRetCsrf: 4.65,  
    percentualAVista: 100
});
console.log(t7.lancamentosContabeis);
console.log(t7);
