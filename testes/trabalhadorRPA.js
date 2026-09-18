class CalculadoraPrestadorRPA {
    constructor() {
        this.TETO_INSS_2026 = 8475.55;
        this.INSS_MAX_RETIDO = 932.31; 
        this.INSS_PATRONAL_AL = 0.20;  

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

    processarRPA(dadosRPA) {
        // CORREÇÃO: Variável limpa sem caractere especial (valorServicoBruto)
        const valorBruto = dadosRPA.valorServicoBruto || 0;
        
        let inssAutonomo = this._arredondar(valorBruto * 0.11);
        if (inssAutonomo > this.INSS_MAX_RETIDO) {
            inssAutonomo = this.INSS_MAX_RETIDO;
        }

        const baseIRRF = Math.max(0, valorBruto - inssAutonomo);
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

        const alIss = dadosRPA.aliquotaIssMunicipal !== undefined ? (dadosRPA.aliquotaIssMunicipal / 100) : 0;
        const iss = this._arredondar(valorBruto * alIss);

        const totalRetidoDoAutonomo = inssAutonomo + irrf + iss;
        const valorLiquidoReceber = this._arredondar(valorBruto - totalRetidoDoAutonomo);
        const inssPatronalEmpresa = this._arredondar(valorBruto * this.INSS_PATRONAL_AL);

        const rpaCalculado = {
            valorBruto: valorBruto,
            inssAutonomo: inssAutonomo,
            irrf: irrf,
            iss: iss,
            totalRetidoDoAutonomo: totalRetidoDoAutonomo,
            valorLiquidoReceber: valorLiquidoReceber,
            inssPatronalEmpresa: inssPatronalEmpresa
        };

        return {
            valores: rpaCalculado,
            lancamentosContabeis: this.gerarLancamentosTexto(rpaCalculado)
        };
    }

    gerarLancamentosTexto(v) {
        let texto = "";
        texto += "========================================================\n";
        texto += "        LANÇAMENTOS CONTÁBEIS: EMISSÃO DE RPA           \n";
        texto += "========================================================\n\n";

        texto += "--- 1. REGISTRO DA DESPESA OPERACIONAL (Bruto) ---\n";
        texto += "DÉBITO : Despesas com Serviços de Autônomos (Result) R$ " + v.valorBruto.toFixed(2) + "\n";
        texto += "CRÉDITO: RPAs / Autônomos a Pagar (Passivo Circ.) --- R$ " + v.valorBruto.toFixed(2) + "\n\n";

        texto += "--- 2. RETENÇÕES EM FOLHA DE AUTÔNOMO ---\n";
        texto += "DÉBITO : RPAs / Autônomos a Pagar (Passivo Circ.) --- R$ " + v.inssAutonomo.toFixed(2) + "\n";
        texto += "CRÉDITO: INSS a Recolher - Autônomos (Passivo Circ.) R$ " + v.inssAutonomo.toFixed(2) + "\n\n";

        if (v.irrf > 0) {
            texto += "DÉBITO : RPAs / Autônomos a Pagar (Passivo Circ.) --- R$ " + v.irrf.toFixed(2) + "\n";
            texto += "CRÉDITO: IRRF a Recolher - Terceiros (Passivo Circ.) R$ " + v.irrf.toFixed(2) + "\n\n";
        }

        if (v.iss > 0) {
            texto += "DÉBITO : RPAs / Autônomos a Pagar (Passivo Circ.) --- R$ " + v.iss.toFixed(2) + "\n";
            texto += "CRÉDITO: ISS Retido a Recolher (Passivo Circulante) R$ " + v.iss.toFixed(2) + "\n\n";
        }

        texto += "--- 3. ENCARGOS PATRONAIS SOBRE O RPA (20%) ---\n";
        texto += "DÉBITO : Encargos Previdenciários - RPA (Resultado) -- R$ " + v.inssPatronalEmpresa.toFixed(2) + "\n";
        texto += "CRÉDITO: INSS a Recolher - Patronal (Passivo Circ.) - R$ " + v.inssPatronalEmpresa.toFixed(2) + "\n\n";

        texto += "--- 4. ETAPA DE LIQUIDAÇÃO FINANCEIRA ---\n";
        texto += "DÉBITO : RPAs / Autônomos a Pagar (Passivo Circ.) --- R$ " + v.valorLiquidoReceber.toFixed(2) + "\n";
        texto += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ " + v.valorLiquidoReceber.toFixed(2) + "\n";

        return texto;
    }
}
///// RPA
const engineRPA = new CalculadoraPrestadorRPA();

console.log("--- TESTE 1: RPA R$ 2.000,00 | ISS 2% ---");
const t1 = engineRPA.processarRPA({ valorServicoBruto: 2000.00, aliquotaIssMunicipal: 2 });
console.log(t1.lancamentosContabeis);

console.log("\n--- TESTE 2: RPA R$ 12.000,00 | ISS 5% ---");
const t2 = engineRPA.processarRPA({ valorServicoBruto: 12000.00, aliquotaIssMunicipal: 5 });
console.log(t2.lancamentosContabeis);
