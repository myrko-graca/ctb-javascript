class CalculadoraProLaboreContabil {
    constructor() {
        this.TETO_INSS_2026 = 8475.55;
        this.INSS_MAX_RETIDO = 932.31; // 11% do teto
        this.INSS_PATRONAL_AL = 0.20;  // 20% patronal da empresa

        this.FAIXAS_IRRF_2026 = [
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

    processarProLabore(dados) {
        const valorBruto = dados.proLaboreBruto || 0;
        const regimeEmpresa = (dados.regimeTributario || 'SIMPLES').toUpperCase();
        const anexoSimples = (dados.anexoSimples || 'III').toUpperCase();

        // 1. Desconto de INSS (11% retido do sócio)
        let inssSocio = this._arredondar(valorBruto * 0.11);
        if (inssSocio > this.INSS_MAX_RETIDO) {
            inssSocio = this.INSS_MAX_RETIDO;
        }

        // 2. Desconto de IRRF Progressivo 2026
        const baseIRRF = Math.max(0, valorBruto - inssSocio);
        let irrf = 0;

        if (valorBruto > 5000.00) { 
            for (let i = 0; i < this.FAIXAS_IRRF_2026.length; i++) {
                let faixa = this.FAIXAS_IRRF_2026[i];
                if (baseIRRF <= faixa.limite) {
                    let impostoBase = (baseIRRF * faixa.aliquota) - faixa.deducao;
                    let reducaoGradual = (valorBruto <= 7350.00) ? (978.62 - (0.133145 * valorBruto)) : 0;
                    irrf = this._arredondar(Math.max(0, impostoBase - reducaoGradual));
                    break;
                }
            }
        }

        // 3. Financeiro Líquido a pagar ao sócio
        const valorLiquido = this._arredondar(valorBruto - inssSocio - irrf);

        // 4. INSS Patronal (Custo se for Lucro Presumido/Real OU se for Simples Anexo IV)
        let inssPatronal = 0;
        if (regimeEmpresa === 'REGULAR' || (regimeEmpresa === 'SIMPLES' && anexoSimples === 'IV')) {
            inssPatronal = this._arredondar(valorBruto * this.INSS_PATRONAL_AL);
        }

        const resultado = {
            regime: regimeEmpresa,
            anexo: regimeEmpresa === 'SIMPLES' ? anexoSimples : 'N/A',
            bruto: valorBruto,
            inssSocio: inssSocio,
            irrf: irrf,
            patronal: inssPatronal,
            liquido: valorLiquido
        };

        return {
            valores: resultado,
            lancamentosContabeis: this.gerarLancamentosTexto(resultado)
        };
    }

    gerarLancamentosTexto(v) {
        let texto = "";
        texto += "========================================================\n";
        texto += "  LANÇAMENTOS: PRÓ-LABORE [" + v.regime + " - ANEXO: " + v.anexo + "]\n";
        texto += "========================================================\n\n";

        texto += "--- 1. APROPRIAÇÃO DA DESPESA (Fim do Mês) ---\n";
        texto += "DÉBITO : Despesas com Pró-Labore (Resultado) -------- R$ " + v.bruto.toFixed(2) + "\n";
        texto += "CRÉDITO: Pró-Labore a Pagar (Passivo Circulante) ---- R$ " + v.bruto.toFixed(2) + "\n\n";

        texto += "--- Retenções na Fonte do Sócio ---\n";
        texto += "DÉBITO : Pró-Labore a Pagar (Passivo Circulante) ---- R$ " + v.inssSocio.toFixed(2) + "\n";
        texto += "CRÉDITO: INSS a Recolher - Retido (Passivo Circ.) --- R$ " + v.inssSocio.toFixed(2) + "\n\n";

        if (v.irrf > 0) {
            texto += "DÉBITO : Pró-Labore a Pagar (Passivo Circulante) ---- R$ " + v.irrf.toFixed(2) + "\n";
            texto += "CRÉDITO: IRRF a Recolher - Dirigentes (Passivo Circ.) R$ " + v.irrf.toFixed(2) + "\n\n";
        }

        if (v.patronal > 0) {
            texto += "--- 2. ENCARGO PATRONAL DA EMPRESA (20%) ---\n";
            texto += "DÉBITO : Encargos sobre Pró-Labore (Resultado) ------ R$ " + v.patronal.toFixed(2) + "\n";
            texto += "CRÉDITO: INSS a Recolher - Patronal (Passivo Circ.) - R$ " + v.patronal.toFixed(2) + "\n\n";
        }

        texto += "--- 3. PAGAMENTO DA RETIRADA LÍQUIDA ---\n";
        texto += "DÉBITO : Pró-Labore a Pagar (Passivo Circulante) ---- R$ " + v.liquido.toFixed(2) + "\n";
        texto += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ " + v.liquido.toFixed(2) + "\n";
        texto += "Histórico: Pagamento líquido de pró-labore ref. competencia.\n";

        return texto;
    }
}

// =========================================================================
// 🚀 BATERIA DE TESTES DAS VARIAÇÕES DE ÁREA DE ATUAÇÃO E REGIMES
// =========================================================================
const enginePro = new CalculadoraProLaboreContabil();

console.log("--- TESTE 1: SIMPLES NACIONAL (Área: Tecnologia/Comércio - Anexo I/III) ---");
// Áreas como Lojas, TI e Clínicas são ISENTAS de INSS Patronal sobre o Pró-Labore
const t1 = enginePro.processarProLabore({ 
    proLaboreBruto: 6000.00, 
    regimeTributario: 'SIMPLES', 
    anexoSimples: 'III' 
});
console.log(t1.lancamentosContabeis);


console.log("\n--- TESTE 2: SIMPLES NACIONAL (Área: Advocacia/Construção - Anexo IV) ---");
// Áreas do Anexo IV pagam 20% de INSS Patronal por força de lei, mesmo no Simples
const t2 = enginePro.processarProLabore({ 
    proLaboreBruto: 6000.00, 
    regimeTributario: 'SIMPLES', 
    anexoSimples: 'IV' 
});
console.log(t2.lancamentosContabeis);


console.log("\n--- TESTE 3: REGIME REGULAR (Lucro Presumido ou Real) ---");
// Toda empresa fora do Simples recolhe os 20% Patronais independentemente da área
const t3 = enginePro.processarProLabore({ 
    proLaboreBruto: 10000.00, 
    regimeTributario: 'REGULAR' 
});
console.log(t3.lancamentosContabeis);
