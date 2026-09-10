class CalculadoraPrestadorCNPJ {
    _arredondar(valor) {
        return Math.round(valor * 100) / 100;
    }

    processarPagamentoPJ(dadosPJ) {
        const valorBruto = dadosPJ.valorNotaBruto || 0;
        const regimePrestador = (dadosPJ.regimeDoPrestador || 'REGULAR').toUpperCase();

        let pisRetido = 0;
        let cofinsRetido = 0;
        let csllRetido = 0;
        let irrfRetido = 0;

        // Regra de Retenção: Só ocorre se for Regime Regular (Lucro Presumido/Real)
        if (regimePrestador === 'REGULAR') {
            // Retenção Federal CSRF (4,65% se a nota passar de R$ 215,05)
            if (valorBruto > 215.05) {
                pisRetido = this._arredondar(valorBruto * 0.0065);    // 0,65%
                cofinsRetido = this._arredondar(valorBruto * 0.0300); // 3,00%
                csllRetido = this._arredondar(valorBruto * 0.0100);   // 1,00%
            }
            // Retenção de IRRF (1,5% padrão para serviços profissionais)
            irrfRetido = this._arredondar(valorBruto * 0.0150);
        }

        // Retenção de ISS Municipal (Se houver a flag informando)
        const alIss = dadosPJ.aliquotaIssRetido !== undefined ? (dadosPJ.aliquotaIssRetido / 100) : 0;
        const issRetido = this._arredondar(valorBruto * alIss);

        const totalRetencoes = pisRetido + cofinsRetido + csllRetido + irrfRetido + issRetido;
        const valorLiquidoAPagar = this._arredondar(valorBruto - totalRetencoes);

        const dadosCalculados = {
            regime: regimePrestador,
            valorBruto: valorBruto,
            pis: pisRetido,
            cofins: cofinsRetido,
            csll: csllRetido,
            irrf: irrfRetido,
            iss: issRetido,
            totalRetencoes: totalRetencoes,
            valorLiquido: valorLiquidoAPagar
        };

        return {
            valores: dadosCalculados,
            lancamentosContabeis: this.gerarLancamentosTexto(dadosCalculados)
        };
    }

    gerarLancamentosTexto(v) {
        let texto = "";
        texto += "========================================================\n";
        texto += "        LANÇAMENTOS: PAGAMENTO PRESTADOR CNPJ [" + v.regime + "]\n";
        texto += "========================================================\n\n";
        
        texto += "--- 1. REGISTRO DA ENTRADA DA DESPESA (BRUTO) ---\n";
        texto += "DÉBITO : Despesas com Serviços de Terceiros (Result) R$ " + v.valorBruto.toFixed(2) + "\n";
        
        if (v.totalRetencoes > 0) {
            texto += "CRÉDITO: PIS Retido a Recolher (Passivo Circ.) ------ R$ " + v.pis.toFixed(2) + "\n";
            texto += "CRÉDITO: COFINS Retido a Recolher (Passivo Circ.) --- R$ " + v.cofins.toFixed(2) + "\n";
            texto += "CRÉDITO: CSLL Retido a Recolher (Passivo Circ.) ----- R$ " + v.csll.toFixed(2) + "\n";
            texto += "CRÉDITO: IRRF Retido a Recolher (Passivo Circ.) ----- R$ " + v.irrf.toFixed(2) + "\n";
            if (v.iss > 0) {
                texto += "CRÉDITO: ISS Retido a Recolher (Passivo Circ.) ------ R$ " + v.iss.toFixed(2) + "\n";
            }
        }
        
        texto += "CRÉDITO: Fornecedores a Pagar (Passivo Circulante) -- R$ " + v.valorLiquido.toFixed(2) + "\n";
        texto += "Histórico: Provisão ref. serv. de pejotização conf. documento fiscal.\n\n";

        texto += "--- 2. ETAPA DE LIQUIDAÇÃO FINANCEIRA ---\n";
        texto += "DÉBITO : Fornecedores a Pagar (Passivo Circulante) -- R$ " + v.valorLiquido.toFixed(2) + "\n";
        texto += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ " + v.valorLiquido.toFixed(2) + "\n";

        return texto;
    }
}

// --- BATERIA DE TESTES DO MÓDULO CNPJ ---
const enginePJ = new CalculadoraPrestadorCNPJ();

console.log("--- TESTE 1: PRESTADOR SIMPLES NACIONAL (SEM RETENÇÕES) ---");
const tcnpj1 = enginePJ.processarPagamentoPJ({ valorNotaBruto: 5000.00, regimeDoPrestador: 'SIMPLES' });
console.log(tcnpj1.lancamentosContabeis);

console.log("\n--- TESTE 2: PRESTADOR LUCRO PRESUMIDO (COM RETENÇÕES COMPLETAS) ---");
const tcnpj2 = enginePJ.processarPagamentoPJ({ valorNotaBruto: 5000.00, regimeDoPrestador: 'REGULAR', aliquotaIssRetido: 2 });
console.log(tcnpj2.lancamentosContabeis);
