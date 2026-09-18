export class GerenciadorPagamentosContabil {
    constructor() {
        this.TETO_INSS = 8475.55;
        this.INSS_MAX_RETIDO_PF = 932.31; 
        this.INSS_MAX_RETIDO_CLT = 988.09; 
        this.DEDUCAO_POR_DEPENDENTE = 189.59;
        this.DESCONTO_SIMPLIFICADO_FIXO = 607.20;
        this.ALIQUOTA_FGTS = 0.08;
        this.INSS_PATRONAL_AL = 0.20; // 20% padrão

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

    _obterAliquotaPatronalEmpresa(emp, tipoTrabalhador) {
        const regime = (emp.regimeTributario || 'SIMPLES_PADRAO').toUpperCase();
        
        if (regime === 'MEI') {
            return tipoTrabalhador === 'CLT' ? { patronal: 0.03, rat: 0, terceiros: 0 } : { patronal: 0, rat: 0, terceiros: 0 };
        }

        if (regime === 'SIMPLES_PADRAO') {
            return { patronal: 0, rat: 0, terceiros: 0 };
        }

        if (regime === 'REGULAR' || regime === 'SIMPLES_ANEXO_IV') {
            // REGRA DA DESONERAÇÃO: Se a empresa for desonerada, a alíquota patronal da folha (20%) vira ZERO.
            const patronalEfetiva = emp.isDesonerada ? 0.00 : this.INSS_PATRONAL_AL;
            return {
                patronal: patronalEfetiva, 
                recolheGps: true
            };
        }

        return { patronal: 0, rat: 0, terceiros: 0 };
    }
    _processarCLT(d, emp) {
        const valorHora = d.salarioBase / (d.jornadaMensal || 220);
        const he = this._arredondar((d.qtdHorasExtras || 0) * (valorHora * 1.5));
        const an = this._arredondar((d.qtdHorasNoturnas || 0) * (valorHora * 0.2));
        
        let feriasGozo = 0, tercoFerias = 0, decimoTerceiro = 0;
        let abonoPecuniario = 0, tercoAbono = 0;
        let avisoColetivas = "";

        // TRATAMENTO DE FÉRIAS (COMUNS OU COLETIVAS)
        if (d.isFerias) { 
            let diasFeriasTotal = d.diasFerias || 30;
            let vendeAbonoEfetivo = d.vendeAbono || false;

            // VALIDAÇÕES ESPECÍFICAS DE FÉRIAS COLETIVAS
            if (d.isColetivas) {
                if (diasFeriasTotal < 10) {
                    avisoColetivas = "⚠️ ALERTA LEGAL: Férias coletivas não podem ser menores que 10 dias (Art. 139 CLT). Forçando piso de 10 dias.\n";
                    diasFeriasTotal = 10;
                }
                
                // Em férias coletivas, o abono pecuniário depende de acordo coletivo prévio.
                // Se a flag 'acordoSindicatoAbonoColetivo' não for enviada como true, o sistema bloqueia a venda de 10 dias.
                if (vendeAbonoEfetivo && !d.acordoSindicatoAbonoColetivo) {
                    avisoColetivas += "⚠️ TRAVA DE DEPARTAMENTO PESSOAL: O abono pecuniário em férias coletivas foi desconsiderado pois exige Acordo Coletivo/Sindical (Art. 143, § 2º CLT).\n";
                    vendeAbonoEfetivo = false;
                }
            }

            const diasVendidos = vendeAbonoEfetivo ? 10 : 0;
            const diasGozo = diasFeriasTotal - diasVendidos;

            feriasGozo = this._arredondar((d.salarioBase / 30) * diasGozo); 
            tercoFerias = this._arredondar(feriasGozo / 3); 

            if (vendeAbonoEfetivo) {
                abonoPecuniario = this._arredondar((d.salarioBase / 30) * diasVendidos);
                tercoAbono = this._arredondar(abonoPecuniario / 3);
            }
        }
        
        if (d.is13Salario) { 
            decimoTerceiro = this._arredondar((d.salarioBase / 12) * (d.meses13 || 12)); 
        }

        // SEPARAÇÃO HISTÓRICA DE REMUNERAÇÕES
        const brutoTributavel = d.salarioBase + he + an + feriasGozo + tercoFerias + decimoTerceiro;
        const brutoTotal = brutoTributavel + abonoPecuniario + tercoAbono;

        const inss = this._calcularInssClt(brutoTributavel);
        const irrf = this._calcularIrrfGlobal(brutoTributavel, inss, d.dependentes || 0);
        const vt = (d.utilizaVT && !d.isFerias) ? this._arredondar(Math.min(d.salarioBase * 0.06, d.custoRealVT || 0)) : 0;
        const vtPatrao = this._arredondar(d.custoRealVT - vt);
        
        const fgts = this._arredondar(brutoTributavel * this.ALIQUOTA_FGTS);
        const liquido = this._arredondar(brutoTotal - (inss + irrf.valor + vt));

        // Validação e cálculo do FAP e RAT Ajustado
        const fapBruto = d.fap !== undefined ? d.fap : (emp.fap !== undefined ? emp.fap : 1.0);
        const fapValido = Math.max(0.5, Math.min(2.0, fapBruto));
        const configPatronal = this._obterAliquotaPatronalEmpresa(emp, 'CLT');
        
        const ratBase = configPatronal.recolheGps ? (emp.aliquotaRat || 0) : 0;
        const ratAjustado = ratBase * fapValido; 
        const terceirosReal = configPatronal.recolheGps ? (emp.aliquotaTerceiros || 0) : 0;
        
        const inssPatronalCalculado = this._arredondar(brutoTributavel * configPatronal.patronal);
        const ratCalculado = this._arredondar(brutoTributavel * ratAjustado);
        const terceirosCalculado = this._arredondar(brutoTributavel * terceirosReal);
        const totalInssPatronal = this._arredondar(inssPatronalCalculado + ratCalculado + terceirosCalculado);

        // Provisões mensais normais
        const prov13 = this._arredondar(d.salarioBase / 12);
        const provFerias = this._arredondar(d.salarioBase / 12);
        const provTerco = this._arredondar(provFerias / 3);
        const provFgts13 = this._arredondar(prov13 * this.ALIQUOTA_FGTS);
        const provFgtsFerias = this._arredondar((provFerias + provTerco) * this.ALIQUOTA_FGTS);
        const totalFgtsProvisoes = this._arredondar(provFgts13 + provFgtsFerias);

        let txt = "========================================================\n";
        txt += d.isColetivas ? "  LANÇAMENTOS: FÉRIAS COLETIVAS CLT\n" : "  LANÇAMENTOS: FUNCIONÁRIO CLT\n";
        txt += "========================================================\n";
        
        if (avisoColetivas !== "") {
            txt += avisoColetivas + "--------------------------------------------------------\n";
        }

        txt += "--- 1. ETAPA DE APROPRIAÇÃO DA FOLHA DIRETA ---\n";
        txt += "DÉBITO : Despesas com Salários (Resultado) ---------- R\$ " + d.salarioBase.toFixed(2) + "\n";
        if (he > 0) txt += "DÉBITO : Despesas com Horas Extras (Resultado) ----- R\$ " + he.toFixed(2) + "\n";
        if (an > 0) txt += "DÉBITO : Despesas com Adicional Noturno (Resultado)  R\$ " + an.toFixed(2) + "\n";
        if (feriasGozo > 0) txt += "DÉBITO : Provisão de Férias/Terço Acumulada (Passivo) R\$ " + (feriasGozo+tercoFerias).toFixed(2) + "\n";
        
        if (abonoPecuniario > 0) {
            txt += "DÉBITO : Despesas com Abono Pecuniário (Resultado) -- R\$ " + abonoPecuniario.toFixed(2) + "\n";
            txt += "DÉBITO : Despesas com 1/3 s/ Abono (Resultado) ------ R\$ " + tercoAbono.toFixed(2) + "\n";
        }
        if (decimoTerceiro > 0) txt += "DÉBITO : Provisão de 13º Salário Acumulada (Passivo)  R\$ " + decimoTerceiro.toFixed(2) + "\n";
        
        txt += "CRÉDITO: Salários/Obrigações a Pagar (Passivo C.) --- R\$ " + brutoTotal.toFixed(2) + "\n\n";
        txt += "--- Retenções na Fonte e Descontos ---\n";
        txt += "DÉBITO : Salários a Pagar (Passivo Circulante) ----- R\$ " + (inss + irrf.valor + vt).toFixed(2) + "\n";
        txt += "CRÉDITO: INSS/IRRF/VT a Recolher (Passivo Circ.) ---- R\$ " + (inss + irrf.valor + vt).toFixed(2) + "\n\n";
        txt += "--- 2. ENCARGOS PATRONAIS DIRETOS ---\n";
        txt += "DÉBITO : Despesas com FGTS (Resultado) -------------- R\$ " + fgts.toFixed(2) + "\n";
        txt += "CRÉDITO: FGTS a Recolher (Passivo Circulante) ------- R\$ " + fgts.toFixed(2) + "\n";
        if (vtPatrao > 0) {
			txt += "DÉBITO : Despesas com VT Patrão (Resultado) ---------- R\$ " + vtPatrao.toFixed(2) + "\n";
			txt += "CRÉDITO: Despesas adiantadas com VT (Ativo) ---------- R\$ " + vtPatrao.toFixed(2) + "\n";
		}
        if (totalInssPatronal > 0 || emp.isDesonerada) {
            txt += `NOTA   : Desoneração da Folha (CPRB): ${emp.isDesonerada ? "ATIVA (Alíquota Patronal 0%)" : "INATIVA (Alíquota Patronal 20%)"}\n`;
            txt += `NOTA   : RAT Efetivo Ajustado pelo FAP: ${(ratAjustado*100).toFixed(4)}%\n`;
            txt += `DÉBITO : Encargos INSS Patronal Folha (Resultado) -- R$ ${totalInssPatronal.toFixed(2)}\n`;
            txt += `CRÉDITO: INSS Patronal a Recolher (Passivo Circ.) --- R$ ${totalInssPatronal.toFixed(2)}\n`;
        }
        txt += "\n--- 3. PROVISÕES MENSAIS (Regime de Competência) ---\n";
        txt += "DÉBITO : Despesas com Provisão de 13º (Resultado) ---- R\$ " + prov13.toFixed(2) + "\n";
        txt += "CRÉDITO: Provisão de 13º Salário (Passivo Circulante) R\$ " + prov13.toFixed(2) + "\n";
        txt += "DÉBITO : Despesas com Provisão de Férias (Resultado) - R\$ " + provFerias.toFixed(2) + "\n";
        txt += "DÉBITO : Despesas com Provisão de 1/3 Férias (Result)  R\$ " + provTerco.toFixed(2) + "\n";
        txt += "CRÉDITO: Provisão de Férias/Terço (Passivo Circulante) R\$ " + (provFerias + provTerco).toFixed(2) + "\n";
        txt += "DÉBITO : Despesas com FGTS s/ Provisões (Resultado) -- R\$ " + totalFgtsProvisoes.toFixed(2) + "\n";
        txt += "CRÉDITO: FGTS Prov. Férias/13º a Recolher (Passivo) - R\$ " + totalFgtsProvisoes.toFixed(2) + "\n\n";
        txt += "--- 4. ETAPA DE PAGAMENTO FINANCEIRO ---\n";
        txt += "DÉBITO : Salários a Pagar (Passivo Circulante) ----- R\$ " + liquido.toFixed(2) + "\n";
        txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R\$ " + liquido.toFixed(2) + "\n";

        return { 
            valores: { 
                bruto: brutoTotal, inss, irrf: irrf.valor, vt, vtPatrao, fgts, patronal: totalInssPatronal, liquido,
                provisoes: { decimoTerceiro: prov13, ferias: provFerias, tercoFerias: provTerco, fgtsProvisoes: totalFgtsProvisoes }
            }, 
            lancamentosContabeis: txt 
        };
    }
    _processarMEI(d, emp) {
        const bruto = d.valorContrato || 0;
        const configPatronal = this._obterAliquotaPatronalEmpresa(emp, 'MEI');
        // A desoneração não afeta o MEI Civil, que segue a trava constitucional dos 20%
        const patronal = (d.isConstrucaoOuManutencao && emp.regimeTributario === 'REGULAR') ? this._arredondar(bruto * this.INSS_PATRONAL_AL) : 0;

        let txt = "========================================================\n  LANÇAMENTOS: PRESTADOR MEI\n========================================================\n";
        txt += "DÉBITO : Despesas com Serviços de Terceiros (Result) R\$ " + bruto.toFixed(2) + "\n";
        txt += "CRÉDITO: Fornecedores a Pagar (Passivo Circulante) -- R\$ " + bruto.toFixed(2) + "\n\n";
        if (patronal > 0) {
            txt += "DÉBITO : INSS Patronal s/ Terceiros (Resultado) ---- R\$ " + patronal.toFixed(2) + "\n";
            txt += "CRÉDITO: INSS a Recolher (Passivo Circulante) ------- R\$ " + patronal.toFixed(2) + "\n\n";
        }
        txt += "DÉBITO : Fornecedores a Pagar (Passivo Circulante) -- R\$ " + bruto.toFixed(2) + "\n";
        txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R\$ " + bruto.toFixed(2) + "\n";

        return { valores: { bruto, liquido: bruto, patronal }, lancamentosContabeis: txt };
    }

    _processarRPA(d, emp) {
        const bruto = d.valorServicoBruto || 0;
        let inss = this._arredondar(bruto * 0.11);
        if (inss > this.INSS_MAX_RETIDO_PF) inss = this.INSS_MAX_RETIDO_PF;

        let irrf = this._calcularIrrfGlobal(bruto, inss, 0);
        let iss = this._arredondar(bruto * ((d.aliquotaIss || 0) / 100));
        
        // A Desoneração da Folha (CPRB) também zera os 20% patronais sobre a contratação de RPA
        const configPatronal = this._obterAliquotaPatronalEmpresa(emp, 'RPA');
        let patronal = this._arredondar(bruto * configPatronal.patronal);
        let liquido = this._arredondar(bruto - (inss + irrf.valor + iss));

        let txt = "========================================================\n  LANÇAMENTOS: EMISSÃO DE RPA (AUTÔNOMO)\n========================================================\n";
        txt += "DÉBITO : Despesas com Serviços de Autônomos (Result) R\$ " + bruto.toFixed(2) + "\n";
        txt += "CRÉDITO: RPAs a Pagar (Passivo Circulante) ---------- R\$ " + bruto.toFixed(2) + "\n\n";
        txt += "DÉBITO : RPAs a Pagar (Passivo Circulante) ---------- R\$ " + (inss + irrf.valor + iss).toFixed(2) + "\n";
        txt += "CRÉDITO: Impostos Retidos a Recolher (Passivo C.) --- R\$ " + (inss + irrf.valor + iss).toFixed(2) + "\n\n";
        
        if (patronal > 0 || emp.isDesonerada) {
            txt += `NOTA   : Desoneração da Folha s/ RPA: ${emp.isDesonerada ? "ATIVA (Patronal 0%)" : "INATIVA (Patronal 20%)"}\n`;
            txt += "DÉBITO : Encargos Previdenciários s/ RPA (Resultado)  R\$ " + patronal.toFixed(2) + "\n";
            txt += "CRÉDITO: INSS a Recolher - Patronal (Passivo Circ.) - R\$ " + patronal.toFixed(2) + "\n\n";
        }
        
        txt += "DÉBITO : RPAs a Pagar (Passivo Circulante) ---------- R\$ " + liquido.toFixed(2) + "\n";
        txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R\$ " + liquido.toFixed(2) + "\n";
        return { valores: { bruto, inss, irrf: irrf.valor, iss, patronal, liquido }, lancamentosContabeis: txt };
    }

    _processarPJ(d, emp) {
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
        txt += "DÉBITO : Despesas com Serviços de Terceiros - PJ ---- R\$ " + bruto.toFixed(2) + "\n";
        if (retencoes > 0) txt += "CRÉDITO: Tributos Retidos na Fonte (Passivo Circ.) -- R\$ " + retencoes.toFixed(2) + "\n";
        txt += "CRREDITO: Fornecedores a Pagar (Passivo Circulante) -- R\$ " + liquido.toFixed(2) + "\n\n";
        txt += "DÉBITO : Fornecedores a Pagar (Passivo Circulante) -- R\$ " + liquido.toFixed(2) + "\n";
        txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R\$ " + liquido.toFixed(2) + "\n";
        return { valores: { bruto, pis, cofins, csll, irrf, iss, liquido }, lancamentosContabeis: txt };
    }
    _processarProLabore(d, emp) {
        const bruto = d.proLaboreBruto || 0;
        let inss = this._arredondar(bruto * 0.11);
        if (inss > this.INSS_MAX_RETIDO_PF) inss = this.INSS_MAX_RETIDO_PF;
        let irrf = this._calcularIrrfGlobal(bruto, inss, 0);
        let liquido = this._arredondar(bruto - (inss + irrf.valor));
        
        // A Desoneração da Folha (CPRB) zera os 20% patronais sobre a retirada de Pró-Labore
        const configPatronal = this._obterAliquotaPatronalEmpresa(emp, 'PRO_LABORE');
        let patronal = this._arredondar(bruto * configPatronal.patronal);

        let txt = "========================================================\n  LANÇAMENTOS: RETIRADA DE PRÓ-LABORE\n========================================================\n";
        txt += "DÉBITO : Despesas com Pró-Labore (Resultado) -------- R\$ " + bruto.toFixed(2) + "\n";
        txt += "CRÉDITO: Pró-Labore a Pagar (Passivo Circulante) ---- R\$ " + bruto.toFixed(2) + "\n\n";
        txt += "DÉBITO : Pró-Labore a Pagar (Passivo Circulante) ---- R\$ " + (inss + irrf.valor).toFixed(2) + "\n";
        txt += "CRÉDITO: INSS/IRRF s/ Pró-Labore a Recolher (Passivo) R\$ " + (inss + irrf.valor).toFixed(2) + "\n\n";
        if (patronal > 0 || emp.isDesonerada) {
            txt += `NOTA   : Desoneração da Folha s/ Pró-Labore: ${emp.isDesonerada ? "ATIVA (Patronal 0%)" : "INATIVA (Patronal 20%)"}\n`;
            txt += "DÉBITO : Encargos Patronais s/ Pró-Labore (Result) -- R\$ " + patronal.toFixed(2) + "\n";
            txt += "CRÉDITO: INSS a Recolher - Patronal (Passivo Circ.) - R\$ " + patronal.toFixed(2) + "\n\n";
        }
        txt += "DÉBITO : Pró-Labore a Pagar (Passivo Circulante) ---- R\$ " + liquido.toFixed(2) + "\n";
        txt += "CRÉDITO: Caixa / Bancos (Ativo Circulante) --------- R\$ " + liquido.toFixed(2) + "\n";
        return { valores: { bruto, inss, irrf: irrf.valor, patronal, liquido }, lancamentosContabeis: txt };
    }

    processarPagamento(tipoPagamento, payload, dadosEmpresa = {}) {
        const tipo = (tipoPagamento || '').toUpperCase();
        const empresa = {
            regimeTributario: dadosEmpresa.regimeTributario || 'SIMPLES_PADRAO',
            aliquotaRat: dadosEmpresa.aliquotaRat || 0,
            aliquotaTerceiros: dadosEmpresa.aliquotaTerceiros || 0,
            isDesonerada: dadosEmpresa.isDesonerada || false
        };

        switch (tipo) {
            case 'CLT':        return this._processarCLT(payload, empresa);
            case 'MEI':        return this._processarMEI(payload, empresa);
            case 'RPA':        return this._processarRPA(payload, empresa);
            case 'PJ_REGULAR': return this._processarPJ(payload, empresa);
            case 'PRO_LABORE': return this._processarProLabore(payload, empresa);
            default: throw new Error("Tipo de pagamento '" + tipoPagamento + "' não é suportado pelo motor contábil.");
        }
    }
}
// ============================================================================
// SIMULADOR DE CENÁRIOS CONTÁBEIS NO CONSOLE (SEM ASSERT)
// ============================================================================

const motor = new GerenciadorPagamentosContabil();

console.log("\n%c 🎛️  INICIANDO DEMONSTRAÇÃO VISUAL DE CENÁRIOS - MOTOR 2026 ", "background: #111; color: #00ffcc; font-size: 13px; font-weight: bold;");

// ============================================================================
// CENÁRIO 1: Funcionário CLT em Empresa de Lucro Presumido (Com FAP Redutor)
// ============================================================================
console.log("\n🔹 [CENÁRIO 1] Funcionário CLT | Empresa: Lucro Presumido (REGULAR)");
console.log("   👉 Regra: Deve cobrar INSS Patronal (20%) + Terceiros (5.8%) + RAT Ajustado pelo FAP.");

const empresaPresumido = {
    regimeTributario: 'REGULAR',
    aliquotaRat: 0.02,        // 2%
    aliquotaTerceiros: 0.058, // 5.8%
    fap: 0.7500               // FAP menor que 1.0 (Bônus por boa segurança)
};

const funcionarioClt1 = {
    salarioBase: 5000.00,
    qtdHorasExtras: 10,
    utilizaVT: true,
    custoRealVT: 250.00
};

const c1 = motor.processarPagamento('CLT', funcionarioClt1, empresaPresumido);
console.log(c1.lancamentosContabeis);

// ============================================================================
// CENÁRIO 2: O Mesmo Funcionário CLT, mas em Empresa do Simples Nacional
// ============================================================================
console.log("\n🔹 [CENÁRIO 2] Funcionário CLT | Empresa: Simples Nacional Geral");
console.log("   👉 Regra: O INSS Patronal, RAT e Terceiros devem sumir dos encargos diretos da folha.");

const empresaSimples = {
    regimeTributario: 'SIMPLES_PADRAO'
};

const c2 = motor.processarPagamento('CLT', funcionarioClt1, empresaSimples);
console.log(c2.lancamentosContabeis);


// ============================================================================
// CENÁRIO 3: Retirada de Pró-Labore de Sócio (Acima do Teto do INSS)
// ============================================================================
console.log("\n🔹 [CENÁRIO 3] Pró-Labore de Sócio (R$ 12.000) | Empresa: Lucro Real");
console.log("   👉 Regra: INSS do Sócio deve travar no Teto. Empresa paga 20% patronal sobre o total sem teto.");

const empresaLucroReal = {
    regimeTributario: 'REGULAR'
};

const socioProLabore = {
    proLaboreBruto: 12000.00
};

const c3 = motor.processarPagamento('PRO_LABORE', socioProLabore, empresaLucroReal);
console.log(c3.lancamentosContabeis);


// ============================================================================
// CENÁRIO 4: Contratação de Autônomo (RPA) por Empresa de Lucro Presumido
// ============================================================================
console.log("\n🔹 [CENÁRIO 4] Emissão de RPA (Autônomo Pessoa Física)");
console.log("   👉 Regra: Retém 11% de INSS do prestador e cobra 20% de encargo patronal da empresa.");

const autonomoRpa = {
    valorServicoBruto: 4000.00,
    aliquotaIss: 5.0 // 5% de ISS municipal
};

const c4 = motor.processarPagamento('RPA', autonomoRpa, empresaPresumido);
console.log(c4.lancamentosContabeis);


// ============================================================================
// CENÁRIO 5: Pagamento de MEI Prestador de Serviços de Pintura/Manutenção
// ============================================================================
console.log("\n🔹 [CENÁRIO 5] Prestador MEI (Exceção de Obras/Manutenção Predial)");
console.log("   👉 Regra: MEI comum não gera encargo, mas serviços civis para empresas do Lucro Real/Presumido geram 20% patronal.");

const meiPrestador = {
    valorContrato: 3500.00,
    isConstrucaoOuManutencao: true // Ativa a regra de exceção do Anexo IV / GPS
};

const c5 = motor.processarPagamento('MEI', meiPrestador, empresaPresumido);
console.log(c5.lancamentosContabeis);

console.log("\n=================================================================");
console.log(" 🚀 TODOS OS CENÁRIOS FORAM PROCESSADOS E EXIBIDOS NO CONSOLE! ");
console.log("=================================================================\n");

/*


import { GerenciadorPagamentosContabil } from './GerenciadorPagamentosContabil.js';

const motor = new GerenciadorPagamentosContabil();

// CENÁRIO A: Venda de férias (Abono Pecuniário)
console.log("\n🔥 [TESTE FÉRIAS] Trabalhador vendendo 10 dias de férias (Com Abono Pecuniário)");
const funcComAbono = {
    salarioBase: 6000.00,
    isFerias: true,
    diasFerias: 30,
    vendeAbono: true // Ativa os 10 dias vendidos + 1/3 sem INSS/IR/FGTS
};
const empComum = { regimeTributario: 'REGULAR', aliquotaRat: 0.02, aliquotaTerceiros: 0.045 };
const resAbono = motor.processarPagamento('CLT', funcComAbono, empComum);
console.log(resAbono.lancamentosContabeis);


// CENÁRIO B: Empresa Desonerada (CPRB Ativa)
console.log("\n🔥 [TESTE DESONERAÇÃO] O mesmo cálculo, mas em Empresa DESONERADA (TI / Indústria)");
const empDesonerada = {
    regimeTributario: 'REGULAR',
    aliquotaRat: 0.02,
    aliquotaTerceiros: 0.045,
    isDesonerada: true // Zera os 20% patronais, mantendo apenas RAT ajustado e terceiros
};
const resDesonera = motor.processarPagamento('CLT', funcComAbono, empDesonerada);
console.log(resDesonera.lancamentosContabeis);

import { GerenciadorPagamentosContabil } from './GerenciadorPagamentosContabil.js';

const motor = new GerenciadorPagamentosContabil();
const empComum = { regimeTributario: 'REGULAR', aliquotaRat: 0.02, aliquotaTerceiros: 0.045 };

// CENÁRIO 1: Erro de Departamento Pessoal - Férias Coletivas menores que o piso de 10 dias
console.log("\n🔥 [CENÁRIO 1] Testando erro de dias abaixo do piso legal (Ex: Empresa envia 7 dias de coletivas)");
const casoErroDias = {
    salarioBase: 3000.00,
    isFerias: true,
    isColetivas: true,
    diasFerias: 7 // Inválido! O sistema deve alertar e forçar 10 dias.
};
const res1 = motor.processarPagamento('CLT', casoErroDias, empComum);
console.log(res1.lancamentosContabeis);


// CENÁRIO 2: Erro de DP - Tentativa de abono pecuniário automático nas Coletivas sem Acordo Sindical
console.log("\n🔥 [CENÁRIO 2] Testando bloqueio de Abono Pecuniário sem Acordo com Sindicato nas Coletivas");
const casoErroAbono = {
    salarioBase: 4500.00,
    isFerias: true,
    isColetivas: true,
    diasFerias: 20,
    vendeAbono: true,
    acordoSindicatoAbonoColetivo: false // Não houve acordo! O sistema deve ignorar o abono.
};
const res2 = motor.processarPagamento('CLT', casoErroAbono, empComum);
console.log(res2.lancamentosContabeis);


// CENÁRIO 3: Sucesso Total - Férias Coletivas com Acordo Sindical aprovado para a venda de dias
console.log("\n🔥 [CENÁRIO 3] Execução com Sucesso - Férias Coletivas com Acordo Sindical Liberado");
const casoSucesso = {
    salarioBase: 4500.00,
    isFerias: true,
    isColetivas: true,
    diasFerias: 30,
    vendeAbono: true,
    acordoSindicatoAbonoColetivo: true // Válido! O sistema liberará o cálculo do Abono Pecuniário Indenizado.
};
const res3 = motor.processarPagamento('CLT', casoSucesso, empComum);
console.log(res3.lancamentosContabeis);

*/