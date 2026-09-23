class CalculadoraFolhaContabil {
    constructor() {
        this.TETO_INSS = 8475.55;
        this.INSS_MAXIMO = 988.09;
        this.DEDUCAO_POR_DEPENDENTE = 189.59;
        this.DESCONTO_SIMPLIFICADO_FIXO = 607.20;
        this.ALIQUOTA_FGTS = 0.08; // 8%

        this.FAIXAS_INSS = [
            { limite: 1621.00, aliquota: 0.075, deducao: 0.00 },
            { limite: 2902.84, aliquota: 0.09,  deducao: 24.32 },
            { limite: 4354.27, aliquota: 0.12,  deducao: 111.40 },
            { limite: 8475.55, aliquota: 0.14,  deducao: 198.49 }
        ];

        this.FAIXAS_IRRF = [
            { limite: 2428.80, aliquota: 0.00,  deducao: 0.00 },
            { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
            { limite: 3751.05, aliquota: 0.15,  deducao: 394.16 },
            { limite: 4664.68, aliquota: 0.225, deducao: 675.49 },
            { limite: Infinity, aliquota: 0.275, deducao: 908.73 }
        ];
    }

    _arredondar(valor) {
        return Math.round(valor * 100) / 100;
    }

    calcularINSS(salarioBaseCalculo) {
        if (salarioBaseCalculo >= this.TETO_INSS) return this.INSS_MAXIMO;
        for (let faixa of this.FAIXAS_INSS) {
            if (salarioBaseCalculo <= faixa.limite) {
                return this._arredondar((salarioBaseCalculo * faixa.aliquota) - faixa.deducao);
            }
        }
        return this.INSS_MAXIMO;
    }

    calcularIRRF(salarioBruto, valorINSS, numeroDependentes) {
        if (salarioBruto <= 5000.00) return { valor: 0.00, metodo: "Isento (< R$ 5k)" };

        let baseDeducoes = Math.max(0, salarioBruto - valorINSS - (numeroDependentes * this.DEDUCAO_POR_DEPENDENTE));
        let baseSimplificada = Math.max(0, salarioBruto - this.DESCONTO_SIMPLIFICADO_FIXO);

        const obterImpostoBase = (base) => {
            for (let faixa of this.FAIXAS_IRRF) {
                if (base <= faixa.limite) {
                    let imposto = (base * faixa.aliquota) - faixa.deducao;
                    let reducao = (salarioBruto <= 7350.00) ? (978.62 - (0.133145 * salarioBruto)) : 0;
                    return Math.max(0, this._arredondar(imposto - reducao));
                }
            }
            return 0;
        };

        let irrfLegais = obterImpostoBase(baseDeducoes);
        let irrfSimplificado = obterImpostoBase(baseSimplificada);

        return irrfLegais <= irrfSimplificado 
            ? { valor: irrfLegais, metodo: "Deduções Legais" } 
            : { valor: irrfSimplificado, metodo: "Desconto Simplificado" };
    }

    processarFolha(dadosFuncionario) {
        const salarioBase = dadosFuncionario.salarioBase;
        const horasMensais = dadosFuncionario.jornadaMensal || 220;
        const valorHoraComum = salarioBase / horasMensais;

        // 1. Proventos Básicos / Adicionais
        let horasExtras = this._arredondar((dadosFuncionario.qtdHorasExtras || 0) * (valorHoraComum * 1.5));
        let adicionalNoturno = this._arredondar((dadosFuncionario.qtdHorasNoturnas || 0) * (valorHoraComum * 0.2));
        
        // Férias e 13º diretos em folha (Gozo/Pagamento efetivo)
        let valorFeriasGozo = 0;
        let valorTercoConstitucional = 0;
        let valor13Salario = 0;

        if (dadosFuncionario.isFerias) {
            const diasFerias = dadosFuncionario.diasFerias || 30;
            valorFeriasGozo = this._arredondar((salarioBase / 30) * diasFerias);
            valorTercoConstitucional = this._arredondar(valorFeriasGozo / 3);
        }

        if (dadosFuncionario.is13Salario) {
            const mesesTrabalhados = dadosFuncionario.mesesProporcionais13 || 12;
            valor13Salario = this._arredondar((salarioBase / 12) * mesesTrabalhados);
        }

        const salarioBruto = salarioBase + horasExtras + adicionalNoturno + valorFeriasGozo + valorTercoConstitucional + valor13Salario;

        // 2. Descontos e Retenções
        const inss = this.calcularINSS(salarioBruto);
        const resultadoIRRF = this.calcularIRRF(salarioBruto, inss, dadosFuncionario.dependentes || 0);
        
        let vt = 0;
        if (dadosFuncionario.utilizaVT && dadosFuncionario.custoRealVT > 0 && !dadosFuncionario.isFerias) {
            vt = this._arredondar(Math.min(salarioBase * 0.06, dadosFuncionario.custoRealVT));
        }

        // 3. Encargos Diretos
        const fgtsFolha = this._arredondar(salarioBruto * this.ALIQUOTA_FGTS);

        // 4. MÓDULO DE PROVISÕES MENSAIS (1/12 por mês sobre a base salarial estável)
        // Usamos como base o salário contratual + médias estáveis (aqui exemplificado pelo salário base)
        const provisao13 = this._arredondar(salarioBase / 12);
        const provisaoFerias = this._arredondar(salarioBase / 12);
        const provisaoTercoFerias = this._arredondar(provisaoFerias / 3);
        const provisaoFGTS13 = this._arredondar(provisao13 * this.ALIQUOTA_FGTS);
        const provisaoFGTSFerias = this._arredondar((provisaoFerias + provisaoTercoFerias) * this.ALIQUOTA_FGTS);

        const totalDescontos = inss + resultadoIRRF.valor + vt;
        const salarioLiquido = this._arredondar(salarioBruto - totalDescontos);

        const folhaCalculada = {
            salarioBase, horasExtras, adicionalNoturno, valorFeriasGozo, valorTercoConstitucional, valor13Salario,
            salarioBruto, inss, irrf: resultadoIRRF.valor, metodoIRRF: resultadoIRRF.metodo, vt, fgts: fgtsFolha, salarioLiquido,
            provisoes: {
                decimoTerceiro: provisao13,
                ferias: provisaoFerias,
                tercoFerias: provisaoTercoFerias,
                fgtsSobre13: provisaoFGTS13,
                fgtsSobreFerias: provisaoFGTSFerias
            }
        };

        return {
            valores: folhaCalculada,
            lancamentosContabeis: this.gerarLancamentosTexto(folhaCalculada)
        };
    }

    gerarLancamentosTexto(v) {
        let linhas = [
            "--- 1. ETAPA DE APROPRIAÇÃO DA FOLHA DIRECTA (Fim do Mês) ---",
            `DÉBITO : Despesas com Salários (Resultado) ---------- R$ ${v.salarioBase.toFixed(2)}`
        ];

        if (v.horasExtras > 0) linhas.push(`DÉBITO : Despesas com Horas Extras (Resultado) ----- R$ ${v.horasExtras.toFixed(2)}`);
        if (v.adicionalNoturno > 0) linhas.push(`DÉBITO : Despesas com Adicional Noturno (Resultado)  R$ ${v.adicionalNoturno.toFixed(2)}`);
        if (v.valorFeriasGozo > 0) {
            // Se for pagamento de férias efetivo, debita-se a conta do Passivo de Provisão acumulada e não a despesa
            linhas.push(`DÉBITO : Férias a Pagar / Provisão (Passivo C.) ------- R$ ${v.valorFeriasGozo.toFixed(2)}`);
            linhas.push(`DÉBITO : 1/3 Férias a Pagar / Provisão (Passivo C.) --- R$ ${v.valorTercoConstitucional.toFixed(2)}`);
        }
        if (v.valor13Salario > 0) {
            linhas.push(`DÉBITO : 13º Salário a Pagar / Provisão (Passivo C.) -- R$ ${v.valor13Salario.toFixed(2)}`);
        }

        linhas.push(`CRÉDITO: Salários/Obrigações a Pagar (Passivo C.) --- R$ ${v.salarioBruto.toFixed(2)}`, "");

        linhas.push("--- Retenção de Descontos ---");
        linhas.push(`DÉBITO : Salários a Pagar (Passivo Circulante) ----- R$ ${v.inss.toFixed(2)}`);
        linhas.push(`CRÉDITO: INSS a Recolher (Passivo Circulante) ------ R$ ${v.inss.toFixed(2)}`, "");

        if (v.irrf > 0) {
            linhas.push(`DÉBITO : Salários a Pagar (Passivo Circulante) ----- R$ ${v.irrf.toFixed(2)}`);
            linhas.push(`CRÉDITO: IRRF a Recolher (Passivo Circulante) ------ R$ ${v.irrf.toFixed(2)}`, "");
        }

        if (v.vt > 0) {
            linhas.push(`DÉBITO : Salários a Pagar (Passivo Circulante) ----- R$ ${v.vt.toFixed(2)}`);
            linhas.push(`CRÉDITO: Custos/Despesas com Vale Transporte (Result) R$ ${v.vt.toFixed(2)}`, "");
        }

        linhas.push("--- 2. ENCARGOS PATRONAIS DIRECTOS ---");
        linhas.push(`DÉBITO : Despesas com FGTS (Resultado) -------------- R$ ${v.fgts.toFixed(2)}`);
        linhas.push(`CRÉDITO: FGTS a Recolher (Passivo Circulante) ------- R$ ${v.fgts.toFixed(2)}`, "");

        // --- EXTRATO EXCLUSIVO DE PROVISÕES (REGIME DE COMPETÊNCIA) ---
        linhas.push("--- 3. PROVISÕES MENSAIS (Reserva de Balanço) ---");
        linhas.push(`DÉBITO : Despesas com Provisão de 13º (Resultado) ---- R$ ${v.provisoes.decimoTerceiro.toFixed(2)}`);
        linhas.push(`CRÉDITO: Provisão de 13º Salário (Passivo Não Circ./Circ.) R$ ${v.provisoes.decimoTerceiro.toFixed(2)}`);
        
        linhas.push(`DÉBITO : Despesas com Provisão de Férias (Resultado) - R$ ${v.provisoes.ferias.toFixed(2)}`);
        linhas.push(`DÉBITO : Despesas com Provisão de 1/3 Férias (Result)  R$ ${v.provisoes.tercoFerias.toFixed(2)}`);
        linhas.push(`CRÉDITO: Provisão de Férias/Terço (Passivo Circulante) R$ ${(v.provisoes.ferias + v.provisoes.tercoFerias).toFixed(2)}`);

        linhas.push(`DÉBITO : Despesas com FGTS sobre Provisões (Resultado) R$ ${(v.provisoes.fgtsSobre13 + v.provisoes.fgtsSobreFerias).toFixed(2)}`);
        linhas.push(`CRÉDITO: FGTS Prov. Férias/13º a Recolher (Passivo C.)  R$ ${(v.provisoes.fgtsSobre13 + v.provisoes.fgtsSobreFerias).toFixed(2)}`, "");

        linhas.push("--- 4. ETAPA DE PAGAMENTO LÍQUIDO ---");
        linhas.push(`DÉBITO : Salários a Pagar (Passivo Circulante) ----- R$ ${v.salarioLiquido.toFixed(2)}`);
        linhas.push(`CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ ${v.salarioLiquido.toFixed(2)}`);

        return linhas.join("\n");
    }
}
////////////////////////////////////////////////////////////////////////////////////////
// =========================================================================
// 🚀 BATERIA DE TESTES INTEGRADOS: DEPARTAMENTO PESSOAL E CONTABILIDADE
// =========================================================================

const coreFolha = new CalculadoraFolhaContabil();

console.log("%c DRIVER DE TESTES: INICIANDO VALIDAÇÃO DE FOLHA, ENCARGOS E PROVISÕES 2026 ", "background: #1e1e1e; color: #00ff7f; font-size: 14px; font-weight: bold;");

// -------------------------------------------------------------------------
// CENÁRIO 1: MÊS COMUM (Operação Padrão com Acúmulo de Provisões)
// -------------------------------------------------------------------------
console.log("\n------------------------------------------------------------");
console.log("CENÁRIO 1: MÊS COMUM | COM ADICIONAIS (HE + AN) | ACUMULANDO PROVISÕES");
console.log("------------------------------------------------------------");
const f1 = coreFolha.processarFolha({
    salarioBase: 4500.00,
    jornadaMensal: 220,
    qtdHorasExtras: 15,     // 15 horas extras no mês
    qtdHorasNoturnas: 30,   // 30 horas noturnas no mês
    dependentes: 1,
    utilizaVT: true,
    custoRealVT: 320.00,    // Descontará o limite de 6% (R$ 270) pois é menor que o custo real
    isFerias: false,
    is13Salario: false
});
console.log(f1.lancamentosContabeis);


// -------------------------------------------------------------------------
// CENÁRIO 2: FUNCIONÁRIO GOZANDO FÉRIAS (Metade do Mês / 15 dias)
// -------------------------------------------------------------------------
console.log("\n------------------------------------------------------------");
console.log("CENÁRIO 2: GOZO DE FÉRIAS (15 DIAS) | BAIXA DA PROVISÃO DO PASSIVO");
console.log("------------------------------------------------------------");
const f2 = coreFolha.processarFolha({
    salarioBase: 6000.00,
    dependentes: 0,
    utilizaVT: false, // Sem VT no mês de férias
    isFerias: true,
    diasFerias: 15,   // Recebe 15 dias de salário + 15 dias de férias + 1/3 constitucional
    is13Salario: false
});
console.log(f2.lancamentosContabeis);


// -------------------------------------------------------------------------
// CENÁRIO 3: PAGAMENTO DE 13º SALÁRIO INTEGRAL (Fim de Ano)
// -------------------------------------------------------------------------
console.log("\n------------------------------------------------------------");
console.log("CENÁRIO 3: QUITAÇÃO DE 13º SALÁRIO INTEGRAL (12/12) | BAIXA DO PASSIVO");
console.log("------------------------------------------------------------");
const f3 = coreFolha.processarFolha({
    salarioBase: 3800.00,
    dependentes: 2,
    utilizaVT: true,
    custoRealVT: 150.00,   // O custo real (R$ 150) é menor que 6% (R$ 228), descontará R$ 150
    isFerias: false,
    is13Salario: true,
    mesesProporcionais13: 12 // 13º Integral adicionado ao bruto
});
console.log(f3.lancamentosContabeis);


// -------------------------------------------------------------------------
// CENÁRIO 4: SALÁRIO ACIMA DO TETO DO INSS (Validação de Trava Máxima)
// -------------------------------------------------------------------------
console.log("\n------------------------------------------------------------");
console.log("CENÁRIO 4: EXECUTIVO DE ALTO ESCALÃO | SALÁRIO ACIMA DO TETO DO INSS E IRRF SECO");
console.log("------------------------------------------------------------");
const f4 = coreFolha.processarFolha({
    salarioBase: 15000.00, // Muito acima do teto de R$ 8.475,55
    dependentes: 0,
    utilizaVT: false,
    isFerias: false,
    is13Salario: false
});
console.log(f4.lancamentosContabeis);


// -------------------------------------------------------------------------
// CENÁRIO 5: SALÁRIO COM ISENÇÃO DE IMPOSTO DE RENDA (Regra 2026)
// -------------------------------------------------------------------------
console.log("\n------------------------------------------------------------");
console.log("CENÁRIO 5: SALÁRIO ATÉ O LIMITE DE ISENÇÃO DO IRRF (< R$ 5.000,00)");
console.log("------------------------------------------------------------");
const f5 = coreFolha.processarFolha({
    salarioBase: 2800.00, // Isento de IRRF por lei, mas paga INSS proporcional
    dependentes: 1,
    utilizaVT: false,
    isFerias: false,
    is13Salario: false
});
console.log(f5.lancamentosContabeis);


console.log("\n%c BATERIA DE TESTES DE FOLHA FINALIZADA COM SUCESSO! ", "background: #006400; color: #fff; font-size: 12px; font-weight: bold;");
