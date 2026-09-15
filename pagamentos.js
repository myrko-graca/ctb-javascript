class GerenciadorPagamentosContabil {
    constructor() {
        this.TETO_INSS = 8475.55;
        this.INSS_MAX_RETIDO_PF = 932.31; 
        this.INSS_MAX_RETIDO_CLT = 988.09; 
        this.DEDUCAO_POR_DEPENDENTE = 189.59;
        this.DESCONTO_SIMPLIFICADO_FIXO = 607.20;
        this.ALIQUOTA_FGTS = 0.08;
        this.INSS_PATRONAL_AL = 0.20;

        this.FAIXAS_INSS_CLT = [
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

    _calcularInssClt(base) {
        if (base >= this.TETO_INSS) return this.INSS_MAX_RETIDO_CLT;
        for (let i = 0; i < this.FAIXAS_INSS_CLT.length; i++) {
            let faixa = this.FAIXAS_INSS_CLT[i];
            if (base <= faixa.limite) return this._arredondar((base * faixa.aliquota) - faixa.deducao);
        }
        return this.INSS_MAX_RETIDO_CLT;
    }

    _calcularIrrfGlobal(salarioBruto, valorINSS, dependentes) {
        if (salarioBruto <= 5000.00) return { valor: 0.00, metodo: "Isento (< R$ 5k)" };
        let baseDeducoes = Math.max(0, salarioBruto - valorINSS - (dependentes * this.DEDUCAO_POR_DEPENDENTE));
        let baseSimplificada = Math.max(0, salarioBruto - this.DESCONTO_SIMPLIFICADO_FIXO);

        const calcularBase = (base) => {
            for (let i = 0; i < this.FAIXAS_IRRF.length; i++) {
                let faixa = this.FAIXAS_IRRF[i];
                if (base <= faixa.limite) {
                    let imposto = (base * faixa.aliquota) - faixa.deducao;
                    let reducao = (salarioBruto <= 7350.00) ? (978.62 - (0.133145 * salarioBruto)) : 0;
                    return Math.max(0, this._arredondar(imposto - reducao));
                }
            }
            return 0;
        };

        let irrfLegais = calcularBase(baseDeducoes);
        let irrfSimplificado = calcularBase(baseSimplificada);

        return irrfLegais <= irrfSimplificado 
            ? { valor: irrfLegais, metodo: "Deduções Legais" } 
            : { valor: irrfSimplificado, metodo: "Desconto Simplificado" };
    }

    _processarCLT(d) {
        const valorHora = d.salarioBase / (d.jornadaMensal || 220);
        const he = this._arredondar((d.qtdHorasExtras || 0) * (valorHora * 1.5));
        const an = this._arredondar((d.qtdHorasNoturnas || 0) * (valorHora * 0.2));
        
        let ferias = 0, terco = 0, decimoTerceiro = 0;
        if (d.isFerias) { 
            ferias = this._arredondar((d.salarioBase / 30) * (d.diasFerias || 30)); 
            terco = this._arredondar(ferias / 3); 
        }
        if (d.is13Salario) { 
            decimoTerceiro = this._arredondar((d.salarioBase / 12) * (d.meses13 || 12)); 
        }

        const bruto = d.salarioBase + he + an + ferias + terco + decimoTerceiro;
        const inss = this._calcularInssClt(bruto);
        const irrf = this._calcularIrrfGlobal(bruto, inss, d.dependentes || 0);
        const vt = (d.utilizaVT && !d.isFerias) ? this._arredondar(Math.min(d.salarioBase * 0.06, d.custoRealVT || 0)) : 0;
        
        const fgts = this._arredondar(bruto * this.ALIQUOTA_FGTS);
        const liquido = this._arredondar(bruto - (inss + irrf.valor + vt));

        // --- CÁLCULO ADICIONADO: PROVISÕES MENSAIS (1/12 AVOS) ---
        const prov13 = this._arredondar(d.salarioBase / 12);
        const provFerias = this._arredondar(d.salarioBase / 12);
        const provTerco = this._arredondar(provFerias / 3);
        const provFgts13 = this._arredondar(prov13 * this.ALIQUOTA_FGTS);
        const provFgtsFerias = this._arredondar((provFerias + provTerco) * this.ALIQUOTA_FGTS);
        const totalFgtsProvisoes = this._arredondar(provFgts13 + provFgtsFerias);

        let txt = "========================================================\n  LANÇAMENTOS: FUNCIONÁRIO CLT\n========================================================\n";
        txt += "--- 1. ETAPA DE APROPRIAÇÃO DA FOLHA DIRETA ---\n";
        txt += "DÉBITO : Despesas com Salários (Resultado) ---------- R$ " + d.salarioBase.toFixed(2) + "\n";
        if (he > 0) txt += "DÉBITO : Despesas com Horas Extras (Resultado) ----- R$ " + he.toFixed(2) + "\n";
        if (an > 0) txt += "DÉBITO : Despesas com Adicional Noturno (Resultado)  R$ " + an.toFixed(2) + "\n";
        
        // Ajuste de débito: se for pagamento efetivo, debita do Passivo de Provisão acumulado
        if (ferias > 0) txt += "DÉBITO : Provisão de Férias/Terço Acumulada (Passivo) R$ " + (ferias+terco).toFixed(2) + "\n";
        if (decimoTerceiro > 0) txt += "DÉBITO : Provisão de 13º Salário Acumulada (Passivo)  R$ " + decimoTerceiro.toFixed(2) + "\n";
        
        txt += "CRÉDITO: Salários a Pagar (Passivo Circulante) ----- R$ " + bruto.toFixed(2) + "\n\n";
        
        txt += "--- Retenções na Fonte e Descontos ---\n";
        txt += "DÉBITO : Salários a Pagar (Passivo Circulante) ----- R$ " + (inss + irrf.valor + vt).toFixed(2) + "\n";
        txt += "CRÉDITO: INSS/IRRF/VT a Recolher (Passivo Circ.) ---- R$ " + (inss + irrf.valor + vt).toFixed(2) + "\n\n";
        
        txt += "--- 2. ENCARGOS PATRONAIS DIRETOS ---\n";
        txt += "DÉBITO : Despesas com FGTS (Resultado) -------------- R$ " + fgts.toFixed(2) + "\n";
        txt += "CRÉDITO: FGTS a Recolher (Passivo Circulante) ------- R$ " + fgts.toFixed(2) + "\n\n";

        // --- BLOCO ADICIONADO: RELATÓRIO CONTÁBIL DAS PROVISÕES ---
        txt += "--- 3. PROVISÕES MENSAIS (Regime de Competência) ---\n";
        txt += "DÉBITO : Despesas com Provisão de 13º (Resultado) ---- R$ " + prov13.toFixed(2) + "\n";
        txt += "CRÉDITO: Provisão de 13º Salário (Passivo Circulante) R$ " + prov13.toFixed(2) + "\n";
        txt += "DÉBITO : Despesas com Provisão de Férias (Resultado) - R$ " + provFerias.toFixed(2) + "\n";
        txt += "DÉBITO : Despesas com Provisão de 1/3 Férias (Result)  R$ " + provTerco.toFixed(2) + "\n";
        txt += "CRÉDITO: Provisão de Férias/Terço (Passivo Circulante) R$ " + (provFerias + provTerco).toFixed(2) + "\n";
        txt += "DÉBITO : Despesas com FGTS s/ Provisões (Resultado) -- R$ " + totalFgtsProvisoes.toFixed(2) + "\n";
        txt += "CRÉDITO: FGTS Prov. Férias/13º a Recolher (Passivo) - R$ " + totalFgtsProvisoes.toFixed(2) + "\n\n";

        txt += "--- 4. ETAPA DE PAGAMENTO FINANCEIRO ---\n";
        txt += "DÉBITO : Salários a Pagar (Passivo Circulante) ----- R$ " + liquido.toFixed(2) + "\n";
        txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ " + liquido.toFixed(2) + "\n";

        return { 
            valores: { 
                bruto, inss, irrf: irrf.valor, vt, fgts, liquido,
                provisoes: { decimoTerceiro: prov13, ferias: provFerias, tercoFerias: provTerco, fgtsProvisoes: totalFgtsProvisoes }
            }, 
            lancamentosContabeis: txt 
        };
    }

    _processarMEI(d) {
        const bruto = d.valorContrato || 0;
        const patronal = d.isConstrucaoOuManutencao ? this._arredondar(bruto * this.INSS_PATRONAL_AL) : 0;

        let txt = "========================================================\n  LANÇAMENTOS: PRESTADOR MEI\n========================================================\n";
        txt += "DÉBITO : Despesas com Serviços de Terceiros (Result) R$ " + bruto.toFixed(2) + "\n";
        txt += "CRÉDITO: Fornecedores a Pagar (Passivo Circulante) -- R$ " + bruto.toFixed(2) + "\n\n";
        if (patronal > 0) {
            txt += "DÉBITO : INSS Patronal s/ Terceiros (Resultado) ---- R$ " + patronal.toFixed(2) + "\n";
            txt += "CRÉDITO: INSS a Recolher (Passivo Circulante) ------- R$ " + patronal.toFixed(2) + "\n\n";
        }
        txt += "DÉBITO : Fornecedores a Pagar (Passivo Circulante) -- R$ " + bruto.toFixed(2) + "\n";
        txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ " + bruto.toFixed(2) + "\n";

        return { valores: { bruto, liquido: bruto, patronal }, lancamentosContabeis: txt };
    }

    _processarRPA(d) {
        const bruto = d.valorServicoBruto || 0;
        let inss = this._arredondar(bruto * 0.11);
        if (inss > this.INSS_MAX_RETIDO_PF) inss = this.INSS_MAX_RETIDO_PF;

        let irrf = this._calcularIrrfGlobal(bruto, inss, 0);
        let iss = this._arredondar(bruto * ((d.aliquotaIss || 0) / 100));
        
        let patronal = this._arredondar(bruto * this.INSS_PATRONAL_AL);
        let liquido = this._arredondar(bruto - (inss + irrf.valor + iss));

        let txt = "========================================================\n  LANÇAMENTOS: EMISSÃO DE RPA (AUTÔNOMO)\n========================================================\n";
        txt += "DÉBITO : Despesas com Serviços de Autônomos (Result) R$ " + bruto.toFixed(2) + "\n";
        txt += "CRÉDITO: RPAs a Pagar (Passivo Circulante) ---------- R$ " + bruto.toFixed(2) + "\n\n";
        txt += "DÉBITO : RPAs a Pagar (Passivo Circulante) ---------- R$ " + (inss + irrf.valor + iss).toFixed(2) + "\n";
        txt += "CRÉDITO: Impostos Retidos a Recolher (Passivo C.) --- R$ " + (inss + irrf.valor + iss).toFixed(2) + "\n\n";
        txt += "DÉBITO : Encargos Previdenciários s/ RPA (Resultado)  R$ " + patronal.toFixed(2) + "\n";
        txt += "CRÉDITO: INSS a Recolher - Patronal (Passivo Circ.) - R$ " + patronal.toFixed(2) + "\n\n";
        txt += "DÉBITO : RPAs a Pagar (Passivo Circulante) ---------- R$ " + liquido.toFixed(2) + "\n";
		txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ " + liquido.toFixed(2) + "\n";
		return { valores: { bruto, inss, irrf: irrf.valor, iss, patronal, liquido }, lancamentosContabeis: txt };
	}
	_processarPJ(d) {
		const bruto = d.valorNotaBruto || 0;
		let pis = 0, cofins = 0, csll = 0, irrf = 0;
		if ((d.regimePrestador || 'REGULAR').toUpperCase() === 'REGULAR') {
			if (bruto > 215.05) {
				pis = this._arredondar(bruto * 0.0065);
				cofins = this._arredondar(bruto * 0.0300); 
				csll = this._arredondar(bruto * 0.0100);
			}
			irrf = this._arredondar(bruto * 0.0150);
		}
		let iss = this._arredondar(bruto * ((d.aliquotaIss || 0) / 100));
		let retencoes = pis + cofins + csll + irrf + iss;
		let liquido = this._arredondar(bruto - retencoes);
		let txt = "========================================================\n  LANÇAMENTOS: PAGAMENTO PRESTADOR CNPJ\n========================================================\n";
		txt += "DÉBITO : Despesas com Serviços de Terceiros - PJ ---- R$ " + bruto.toFixed(2) + "\n";
		if (retencoes > 0) txt += "CRÉDITO: Tributos Retidos na Fonte (Passivo Circ.) -- R$ " + retencoes.toFixed(2) + "\n";
		txt += "CRÉDITO: Fornecedores a Pagar (Passivo Circulante) -- R$ " + liquido.toFixed(2) + "\n\n";
		txt += "DÉBITO : Fornecedores a Pagar (Passivo Circulante) -- R$ " + liquido.toFixed(2) + "\n";
		txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ " + liquido.toFixed(2) + "\n";
		return { valores: { bruto, pis, cofins, csll, irrf, iss, liquido }, lancamentosContabeis: txt };
	}
	_processarProLabore(d) {
		const bruto = d.proLaboreBruto || 0;
		let inss = this._arredondar(bruto * 0.11);
		if (inss > this.INSS_MAX_RETIDO_PF) inss = this.INSS_MAX_RETIDO_PF;
		let irrf = this._calcularIrrfGlobal(bruto, inss, 0);
		let liquido = this._arredondar(bruto - (inss + irrf.valor));
		let patronal = 0;
		if ((d.regimeEmpresa || 'SIMPLES').toUpperCase() === 'REGULAR' || (d.anexoSimples || '') === 'IV') {
			patronal = this._arredondar(bruto * this.INSS_PATRONAL_AL);
		}
		let txt = "========================================================\n  LANÇAMENTOS: RETIRADA DE PRÓ-LABORE\n========================================================\n";
		txt += "DÉBITO : Despesas com Pró-Labore (Resultado) -------- R$ " + bruto.toFixed(2) + "\n";
		txt += "CRÉDITO: Pró-Labore a Pagar (Passivo Circulante) ---- R$ " + bruto.toFixed(2) + "\n\n";
		txt += "DÉBITO : Pró-Labore a Pagar (Passivo Circulante) ---- R$ " + (inss + irrf.valor).toFixed(2) + "\n";
		txt += "CRÉDITO: INSS/IRRF s/ Pró-Labore a Recolher (Passivo) R$ " + (inss + irrf.valor).toFixed(2) + "\n\n";
		if (patronal > 0) {
			txt += "DÉBITO : Encargos Patronais s/ Pró-Labore (Result) -- R$ " + patronal.toFixed(2) + "\n";
			txt += "CRÉDITO: INSS a Recolher - Patronal (Passivo Circ.) - R$ " + patronal.toFixed(2) + "\n\n";
		}
		txt += "DÉBITO : Pró-Labore a Pagar (Passivo Circulante) ---- R$ " + liquido.toFixed(2) + "\n";
		txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R$ " + liquido.toFixed(2) + "\n";
		return { valores: { bruto, inss, irrf: irrf.valor, patronal, liquido }, lancamentosContabeis: txt };
	}
	processarPagamento(tipoPagamento, payload) {
		const tipo = (tipoPagamento || '').toUpperCase();
		switch (tipo) {
			case 'CLT':        return this._processarCLT(payload);
			case 'MEI':        return this._processarMEI(payload);
			case 'RPA':        return this._processarRPA(payload);
			case 'PJ_REGULAR': return this._processarPJ(payload);
			case 'PRO_LABORE': return this._processarProLabore(payload);
			default:throw new Error("Tipo de pagamento '" + tipoPagamento + "' não é suportado pelo motor contábil.");
		}
	}
}
console.log("%c 🎛️ INICIANDO SUPER MOTOR CENTRALIZADOR CONTÁBIL 2026 ", "background: #222; color: #ff00ff; font-size: 14px; font-weight: bold;");
const motorCentral = new GerenciadorPagamentosContabil();

// 1. Teste Funcionário CLT
console.log("\n[EXECUÇÃO 1] Tipo: CLT");
const resCLT = motorCentral.processarPagamento('CLT', { salarioBase: 5000.00, qtdHorasExtras: 10, utilizaVT: true, custoRealVT: 200.00,
	isFerias: false,  // Mês de trabalho comum, acumulando 1/12 para o futuro
    is13Salario: false});
console.log(resCLT.lancamentosContabeis);

// 2. Teste Prestador MEI
console.log("\n[EXECUÇÃO 2] Tipo: MEI (Eletricista / Predial)");
const resMEI = motorCentral.processarPagamento('MEI', { valorContrato: 3000.00, isConstrucaoOuManutencao: true });
console.log(resMEI.lancamentosContabeis);

// 3. Teste Autônomo RPA
console.log("\n[EXECUÇÃO 3] Tipo: RPA (Pessoa Física Eventual)");
const resRPA = motorCentral.processarPagamento('RPA', { valorServicoBruto: 4000.00, aliquotaIss: 5 });
console.log(resRPA.lancamentosContabeis);

// 4. Teste Consultoria PJ Regular
console.log("\n[EXECUÇÃO 4] Tipo: PJ_REGULAR (Prestador de TI)");
const resPJ = motorCentral.processarPagamento('PJ_REGULAR', { valorNotaBruto: 10000.00, regimePrestador: 'REGULAR', aliquotaIss: 2 });
console.log(resPJ.lancamentosContabeis);

// 5. Teste Pró-Labore de Sócio
console.log("\n[EXECUÇÃO 5] Tipo: PRO_LABORE (Retirada Diretores)");
const resPro = motorCentral.processarPagamento('PRO_LABORE', { proLaboreBruto: 8000.00, regimeTributario: 'REGULAR' });
console.log(resPro.lancamentosContabeis);

console.log("%c 🚀 TODOS OS LANÇAMENTOS DO BACKEND FORAM CONSOLIDADOS COM SUCESSO! ", "background: #004d40; color: #fff; font-weight: bold;");