class CalculadoraPrestadorMEI {
    _arredondar(valor) {
        return Math.round(valor * 100) / 100;
    }

    processarPagamentoMEI(dadosMEI) {
        const valorNota = dadosMEI.valorContratoServico;
        const atividadeEspecificaINSS = dadosMEI.isConstrucaoOuManutencao || false;

        // O MEI não sofre nenhuma retenção na fonte. O valor líquido é igual ao bruto da nota.
        const valorLiquidoAPagar = valorNota;

        // Se for atividade de alvenaria/manutenção, gera o encargo de 20% para a empresa contratante
        let inssPatronalEmpresa = 0;
        if (atividadeEspecificaINSS) {
            inssPatronalEmpresa = this._arredondar(valorNota * 0.20);
        }

        const dadosCalculados = {
            valorNota,
            valorLiquidoAPagar,
            inssPatronalEmpresa,
            temEncargoPatronal: atividadeEspecificaINSS
        };

        return {
            valores: dadosCalculados,
            lancamentosContabeis: this.gerarLancamentosTexto(dadosCalculados)
        };
    }

    gerarLancamentosTexto(v) {
        let texto = "========================================================\n";
        texto += "        LANÇAMENTOS CONTÁBEIS: PAGAMENTO PRESTADOR MEI  \n";
        texto += "========================================================\n\n";
        
        texto += "--- 1. REGISTRO DA PROVISÃO DA NOTA FISCAL ---\n";
        texto += `DÉBITO : Despesas com Serviços de Terceiros (Result) R$ ${v.valorNota.toFixed(2)}\n`;
        texto += `CRÉDITO: Fornecedores a Pagar (Passivo Circulante) -- R$ ${v.valorNota.toFixed(2)}\n`;
        texto += "Histórico: Provisão ref. serviços prestados por MEI conforme NFS-e.\n\n";

        if (v.temEncargoPatronal) {
            texto += "--- 2. ENCARGO PREVIDENCIÁRIO PATRONAL (20% ANEXO IV) ---\n";
            texto += `DÉBITO : Encargos Sociais / INSS Patronal (Result) -- R$ ${v.inssPatronalEmpresa.toFixed(2)}\n`;
            texto += `CRÉDITO: INSS a Recolher (Passivo Circulante) ------- R$ ${v.inssPatronalEmpresa.toFixed(2)}\n`;
            texto += "Histórico: INSS Patronal sobre serviços de hidráulica/elétrica/alvenaria ref. MEI.\n\n";
        }

        texto += "--- 3. ETAPA DE PAGAMENTO FINANCEIRO ---\n";
        texto += `DÉBITO : Fornecedores a Pagar (Passivo Circulante) -- R$ ${v.valorLiquidoAPagar.toFixed(2)}\n`;
        texto += `CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ ${v.valorLiquidoAPagar.toFixed(2)}\n`;
        texto += "Histórico: Liquidação de pagamento ref. prestação de serviço MEI.\n";

        return texto;
    }
}

// --- EXEMPLO RÁPIDO DE TESTE ---
const gerenciadorMEI = new CalculadoraPrestadorMEI();
const serviceMEI = gerenciadorMEI.processarPagamentoMEI({
    valorContratoServico: 3500.00,
    isConstrucaoOuManutencao: false // Ex: Serviço de Marketing, TI, Design
});
console.log(serviceMEI.lancamentosContabeis);
