import { Modal, ControleAba } from '../util/util.js?vc1.1';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from '../util/form.js?vc1.1';

class ContasRequeremQuantidade extends ConjuntoDOM {
	constructor() {
		super(null, "contasRequeremQuantidade", {
			titulo: "Controle de Quantidade",
			somentePrimeiroLabel: true,
			qtdColunas: 2,
			spanV: 2,
		});
		this.add(new ComboFiltroDOM(null, "conta", {
			titulo: "Conta", 
		}));
		this.add(new ComboFiltroDOM(null, "contaReferencia", {
			titulo: "Conta de referência", 
		}));
	}
	novo() {
		let n = super.novo();
		if (this.pai) {
			let conta = n.getComponente("conta");
			let listaContas = this.pai.listaContas.filter(lc => lc.value.startsWith("1."));
			conta.setOpcoes(listaContas);
			listaContas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
			conta = n.getComponente("contaReferencia");
			conta.setOpcoes(listaContas);
		}
		return n;
	}
	atualizarCombos() {
		let listaContas = this.pai.listaContas.filter(lc => lc.value.startsWith("1."));
		for (let comp of this.getListaComponentes()) {
			let conta = comp.getComponente("conta");
			conta.setOpcoes(listaContas);
		}
		listaContas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
		for (let comp of this.getListaComponentes()) {
			let conta = comp.getComponente("contaReferencia");
			conta.setOpcoes(listaContas);
		}
	}
}
class ContasDepreciacao extends FichasDOM {
	constructor() {
		super(null, "contasDepreciacao", {
			titulo: "Cálculo de Depreciação",
			qtdColunas: 10,
			regras: {campoChave: "contaOrigem"},
		});
		this.add(new ComboFiltroDOM(null, "contaOrigem", {
			titulo: "Conta para depreciação", 
			regras: {obrigatorio: true},
			spanV: 7,
		}));
		this.add(new CampoDOM(null, "tipo", {
			titulo: "Tipo", 
			tipo: "select",
			regras: {obrigatorio: true},
			opcoes: [{text: "Mensal", value: "M"}, {text: "Semestral", value: "S"}, {text: "Anual", value: "S"}],
			spanV: 3,
		}));
		this.add(new ComboFiltroDOM(null, "contaValor", {
			titulo: "Conta de depreciação", 
			regras: {obrigatorio: true},
			spanV: 7,
		}));
		this.add(new CampoDOM(null, "taxa", {
			titulo: "Taxa (%)", 
			subtipo: "number",
			regras: {obrigatorio: true},
			spanV: 3,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesa", {
			titulo: "Conta de despesa com depreciação", 
			regras: {obrigatorio: true},
			spanV: 7,
		}));
	}
	atualizarCombos() {
		let listaContas = this.pai.listaContas.filter(lc => lc.value.startsWith("1."));
		this.getComponente("contaOrigem").setOpcoes(listaContas);
		listaContas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("1."));
		this.getComponente("contaValor").setOpcoes(listaContas);
		listaContas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
		this.getComponente("contaDespesa").setOpcoes(listaContas);
	}
}
class SimplesNacional extends ObjetoDOM {
	constructor() {
		super(null, "simplesNacional", {
			titulo: "Simples Nacional",
			qtdColunas: 4,
		});
		this.add(new CampoDOM(null, "RBT12", {
			titulo: "RBT12 (R$)", 
			atributos: {title: "Faturamento bruto acumulado dos últimos 12 meses."},
			regras: {obrigatorio: true},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "brutoTributavelUltimos12Meses", {
			titulo: "Pagamentos Brutos Tributáveis (R$)", 
			atributos: {title: "A soma acumulada de todos os salários brutos tributáveis, pró-labores e encargos de FGTS pagos pela empresa nos últimos 12 meses anteriores ao mês de apuração."},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "anexo", {
			titulo: "Anexo", 
			tipo: "select",
			opcoes: [{value: "ANEXO_I", text: "Anexo I"}, {value: "ANEXO_II", text: "Anexo II"}, {value: "ANEXO_III", text: "Anexo III"}, {value: "ANEXO_IV", text: "Anexo IV"}, {value: "ANEXO_V", text: "Anexo V"}],
		}));
		this.add(new CampoDOM(null, "aliquotaNominal", {
			titulo: "Alíquota Nominal (%)", 
			regras: {obrigatorio: true},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "parcelaDeduzir", {
			titulo: "Parcela a Deduzir (R$)", 
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaEfetiva", {
			titulo: "Alíquota Efetiva (%)", 
			subtipo: "number",
			atributos: {readonly: true},
		}));
		this.add(new ComboFiltroDOM(null, "contaReceita", {
			titulo: "Conta de Receita para Cálculo", 
			regras: {obrigatorio: true},
			spanV: 2
		}));
		this.add(new ComboFiltroDOM(null, "contaSimplesRecolher", {
			titulo: "Conta Simples Nacional a Recolher", 
			regras: {obrigatorio: true},
			spanV: 2
		}));
		this.add(new ComboFiltroDOM(null, "contaSimplesAbatimento", {
			titulo: "Conta Simples Nacional de Abatimento", 
			regras: {obrigatorio: true},
			spanV: 2
		}));
		this.add(new ComboFiltroDOM(null, "contaCppRecolher", {
			titulo: "Conta INSS Patronal a Recolher", 
			spanV: 2
		}));
		this.add(new ComboFiltroDOM(null, "contaCppAbatimento", {
			titulo: "Conta de Despesa com INSS", 
			spanV: 2
		}));
		this.add(new ComboFiltroDOM(null, "recuperarISS", {
			titulo: "ISS Retido a Recuperar", 
			placeholder: "Usado quando for Simples Nacional com Anexo IV",
			spanV: 2,
		}));
	}
	atualizarCombos() {
		let listaContas = this.pai.pai.listaContas;
		this.getComponente("contaReceita").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.")));
		listaContas = this.pai.pai.listaContasNaoSinteticas;
		this.getComponente("contaSimplesRecolher").setOpcoes(listaContas.filter(lc => lc.value.startsWith("2.")));
		this.getComponente("contaCppRecolher").setOpcoes(listaContas.filter(lc => lc.value.startsWith("2.")));
		this.getComponente("contaSimplesAbatimento").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.") || lc.value.startsWith("4.")));
		this.getComponente("contaCppAbatimento").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.") || lc.value.startsWith("4.")));
		this.getComponente("recuperarISS").setOpcoes(listaContas.filter(lc => lc.value.startsWith("1.")));
	}
	aoModificar(item) {
		super.aoModificar(this);
		let RBT12 = this.getComponente("RBT12").getValor();
		if (!RBT12) {
			return;
		} else {
			RBT12 = Number(RBT12);
		}
		let aliquotaNominal = this.getComponente("aliquotaNominal").getValor();
		if (!aliquotaNominal) {
			return;
		} else {
			aliquotaNominal = Number(aliquotaNominal) / 100.0;
		}
		let parcelaDeduzir = this.getComponente("parcelaDeduzir").getValor();
		if (!parcelaDeduzir) {
			parcelaDeduzir = 0;
		} else {
			parcelaDeduzir = Number(parcelaDeduzir);
		}
		let aliquotaEfetiva = (RBT12 * aliquotaNominal - parcelaDeduzir) / RBT12;
		aliquotaEfetiva *= 100;
		this.getComponente("aliquotaEfetiva").setValor(aliquotaEfetiva.toFixed(2));
	}
	gerarLancamentosProvisao() {
		let simplesNacional = this.getValor().simplesNacional;
		let lancamentos = this.getModuloSistema().getComponente("lancamentoContabil").getComponente("efetuarLancamento");
		let contaReceita = this.getModuloSistema().localizaConta(simplesNacional.contaReceita);
		let contaSimples = this.getModuloSistema().localizaConta(simplesNacional.contaSimplesRecolher);
		if (Number(contaSimples.getComponente("saldo").getValor()) > 0) {
			throw new Error("Não é possível calcular o Simples Nacional, pois existe valor do imposto a recolher");
		}
		let valorFaturamentoMes = Number(contaReceita.getComponente("saldo").getValor());
		let rbt12 = Number(simplesNacional.faturamentoUltimos12Meses || 0);
		let folha12 = Number(simplesNacional.brutoTributavelUltimos12Meses || 0);
		let anexoEfetivo = (simplesNacional.anexo || '').toUpperCase();
		// Se a empresa for de uma atividade sujeita ao Fator R (flutua entre III e V)
		if (anexoEfetivo === 'ANEXO_III' || anexoEfetivo === 'ANEXO_V') {
			if (rbt12 > 0) {
				let proporcaoFatorR = folha12 / rbt12; // Divide os salários pelo faturamento
				// Se a folha for 28% ou mais do faturamento, força Anexo III (Barato), se não, Anexo V (Caro)
				anexoEfetivo = (proporcaoFatorR >= 0.28) ? 'ANEXO_III' : 'ANEXO_V';
			}
		}
		let perc = Number(simplesNacional.aliquotaEfetiva) / 100.0;
		let valorDasTotal = valorFaturamentoMes * perc;
		// Lançamento do Crédito Principal (DAS a Recolher)
		let reg = lancamentos.getComponenteConta(lancamentos.getComponente("creditos"), simplesNacional.contaSimplesRecolher);
		reg.getComponente("valor").setValor(valorDasTotal.toFixed(2));
		// Lançamento do Débito Principal (Abatimento/Dedução da Receita)
		if (simplesNacional.contaSimplesAbatimento) {
			let regDeb = lancamentos.getComponenteConta(lancamentos.getComponente("debitos"), simplesNacional.contaSimplesAbatimento);
			if (!regDeb) {
				regDeb = lancamentos.getComponente("debitos").novo();
			}
			regDeb.getComponente("conta").setValor(simplesNacional.contaSimplesAbatimento);
			regDeb.getComponente("valor").setValor(valorDasTotal.toFixed(2));
			lancamentos.getComponente("debitos").removerVazios();
		}
		// Segregação Contábil do INSS Patronal (CPP) embutido no DAS
		if (simplesNacional.contaCppRecolher) {
			const REPARTICAO_CPP = {
				ANEXO_I:   [{ limite: 180000, p: 0.4150 }, { limite: 360000, p: 0.4150 }, { limite: 720000, p: 0.4150 }, { limite: 1800000, p: 0.4150 }, { limite: 3600000, p: 0.4150 }, { limite: 4800000, p: 0.2300 }],
				ANEXO_II:  [{ limite: 180000, p: 0.2600 }, { limite: 360000, p: 0.2600 }, { limite: 720000, p: 0.2600 }, { limite: 1800000, p: 0.2600 }, { limite: 3600000, p: 0.2600 }, { limite: 4800000, p: 0.1450 }],
				ANEXO_III: [{ limite: 180000, p: 0.4340 }, { limite: 360000, p: 0.4340 }, { limite: 720000, p: 0.4340 }, { limite: 1800000, p: 0.4340 }, { limite: 3600000, p: 0.4340 }, { limite: 4800000, p: 0.3060 }],
				ANEXO_IV:  [{ limite: Infinity, p: 0.0000 }], 
				ANEXO_V:   [{ limite: 180000, p: 0.2885 }, { limite: 360000, p: 0.2885 }, { limite: 720000, p: 0.2885 }, { limite: 1800000, p: 0.2885 }, { limite: 3600000, p: 0.2885 }, { limite: 4800000, p: 0.2442 }]
			};
			const faixas = REPARTICAO_CPP[anexoEfetivo]; // Usa o anexo decidido pelo Fator R
			if (faixas) {
				let faixaCorrespondente = faixas[faixas.length - 1];
				for (let i = 0; i < faixas.length; i++) {
					if (rbt12 <= faixas[i].limite) {
						faixaCorrespondente = faixas[i];
						break;
					}
				}
				let valorCpp = valorDasTotal * faixaCorrespondente.p;
				if (valorCpp > 0) {
					let regCppCred = lancamentos.getComponenteConta(lancamentos.getComponente("creditos"), simplesNacional.contaCppRecolher);
					if (!regCppCred) {
						regCppCred = lancamentos.getComponente("creditos").novo();
					}
					regCppCred.getComponente("conta").setValor(simplesNacional.contaCppRecolher);
					regCppCred.getComponente("valor").setValor(valorCpp.toFixed(2));
					let novoValorSimplesRecolher = valorDasTotal - valorCpp;
					reg.getComponente("valor").setValor(novoValorSimplesRecolher.toFixed(2));
					if (simplesNacional.contaCppAbatimento) {
						let regCppDeb = lancamentos.getComponenteConta(lancamentos.getComponente("debitos"), simplesNacional.contaCppAbatimento);
						if (!regCppDeb) {
							regCppDeb = lancamentos.getComponente("debitos").novo();
						}
						regCppDeb.getComponente("conta").setValor(simplesNacional.contaCppAbatimento);
						regCppDeb.getComponente("valor").setValor(valorCpp.toFixed(2));
						let regDebOriginal = lancamentos.getComponenteConta(lancamentos.getComponente("debitos"), simplesNacional.contaSimplesAbatimento);
						if (regDebOriginal) {
							regDebOriginal.getComponente("valor").setValor(novoValorSimplesRecolher.toFixed(2));
						}
					}
					lancamentos.getComponente("creditos").removerVazios();
					lancamentos.getComponente("debitos").removerVazios();
				}
			}
		}
	}
}
class EmpresaRegular extends ObjetoDOM {
	constructor() {
		super(null, "empresaRegular", {titulo: "Empresa Regular", qtdColunas: 4});
		
		this.add(new ComboFiltroDOM(null, "despesaISS", {
			titulo: "ISS sobre Serviços", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "recolherISS", {
			titulo: "ISS a Recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "despesaPIS", {
			titulo: "PIS sobre Faturamento", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "recolherPIS", {
			titulo: "PIS a Recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "despesaCOFINS", {
			titulo: "COFINS sobre Faturamento", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "recolherCOFINS", {
			titulo: "COFINS a Recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "despesaIRPJ", {
			titulo: "IRPJ", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "recolherIRPJ", {
			titulo: "IRPJ a Recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "despesaCSLL", {
			titulo: "CSLL", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "recolherCSLL", {
			titulo: "CSLL a Recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "recuperarCSRF", {
			titulo: "CSRF Retida a Recuperar", 
			spanV: 2,
		}));
		this.add(new CampoDOM(null, "aliquotaIRPJ", {
			titulo: "IRPJ (%)",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "alioquotaCSLL", {
			titulo: "CSLL (%)",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaPIS", {
			titulo: "PIS (%)",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaCOFINS", {
			titulo: "COFINS (%)",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaRat", {
			titulo: "Alíquota RAT (%)",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaTerceiros", {
			titulo: "Alíquota de Terceiros (%)",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaFAP", {
			titulo: "FAP (%)",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "desonerada", {
			titulo: "Desonerada?",
			subtipo: "checkbox",
		}));
		this.add(new CampoDOM(null, "sofreRetencaoFonte", {
			titulo: "Sofre Retenção na Fonte?",
			subtipo: "checkbox",
		}));
		this.add(new CampoDOM(null, "aliquotaRetIRRF", {
			titulo: "IRRF Retido na Fonte (%)",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaRetCSRF", {
			titulo: "CSRF Retido na Fonte (%)",
			subtipo: "number",
		}));
	}
	atualizarCombos() {
		let listaContasResultado = this.pai.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("3.") || lc.value.startsWith("4."));
		let listaContasPassivo = this.pai.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("2."));
		let listaContasAtivo = this.pai.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("1."));
		this.getComponente("despesaISS").setOpcoes(listaContasResultado);
		this.getComponente("recolherISS").setOpcoes(listaContasPassivo);
		this.getComponente("despesaPIS").setOpcoes(listaContasResultado);
		this.getComponente("recolherPIS").setOpcoes(listaContasPassivo);
		this.getComponente("despesaCOFINS").setOpcoes(listaContasResultado);
		this.getComponente("recolherCOFINS").setOpcoes(listaContasPassivo);
		this.getComponente("despesaIRPJ").setOpcoes(listaContasResultado);
		this.getComponente("recolherIRPJ").setOpcoes(listaContasPassivo);
		this.getComponente("despesaCSLL").setOpcoes(listaContasResultado);
		this.getComponente("recolherCSLL").setOpcoes(listaContasPassivo);
		//TODO: ver outras contas "a recuperar"
		this.getComponente("recuperarCSRF").setOpcoes(listaContasAtivo);
	}
	setValor(valor) {
		this.atualizarCombos();
		super.setValor(valor);
	}
}
class EmpresaLucroPresumido extends ObjetoDOM {
	constructor() {
		super(null, "empresaLP", {titulo: "Empresa de Lucro Presumido", qtdColunas: 4});
		this.add(new CampoDOM(null, "faturamentoAcumuladoTrimestre", {
			titulo: "Faturamento Acumulado no Trimestre (R$)",
			subtipo: "number",
			spanV: 3,
		}));
		this.add(new CampoDOM(null, "percentualPresuncao", {
			titulo: "Percentual Presumido (%)",
			subtipo: "number",
		}));
	}
}
class RegimeTributario extends ObjetoDOM {
	constructor() {
		super(null, "regimeTributario", {titulo: "Regime Tributário"});
		this.add(new CampoDOM(null, "tipo", {
			titulo: "Tipo", 
			regras: {obrigatorio: true},
			tipo: "select",
			opcoes: [
				{value: "REGULAR_LP", text: "Lucro Presumido"}, 
				{value: "REGULAR_LR", text: "Lucro Real"}, 
				{value: "MEI", text: "MEI"}, 
				{value: "SIMPLES", text: "Simples Nacional"}, 
			]
		}));
		let simplesNacional = new SimplesNacional();
		this.add(simplesNacional);
		let empresaRegular = new EmpresaRegular();
		this.add(empresaRegular);
		let empresaLP = new EmpresaLucroPresumido();
		this.add(empresaLP);
	}
	init() {
		let tipo = this.getComponente("tipo");
		let simplesNacional = this.getComponente("simplesNacional");
		simplesNacional.setVisibilidade(false);
		let empresaRegular = this.getComponente("empresaRegular");
		empresaRegular.setVisibilidade(false);
		let empresaLP = this.getComponente("empresaLP");
		empresaLP.setVisibilidade(false);
		tipo.aoModificar = (item) => {
			super.aoModificar(tipo);
			let valor = tipo.getValor();
			if (valor.startsWith("SIMPLES")) {
				simplesNacional.setVisibilidade(true);
			} else {
				simplesNacional.setVisibilidade(false);
			}
			if (valor.startsWith("REGULAR")) {
				empresaRegular.setVisibilidade(true);
			} else {
				empresaRegular.setVisibilidade(false);
			}
			if (valor == "REGULAR_LP") {
				empresaLP.setVisibilidade(true);
			} else {
				empresaLP.setVisibilidade(false);
			}
		};
	}
	setValor(valor) {
		super.setValor(valor);
		this.getComponente("tipo").aoModificar(this.getComponente("tipo"));
	}
	atualizarCombos() {
		this.getComponente("simplesNacional").atualizarCombos();
	}
}
export class ParametrizacaoCTB extends ObjetoDOM {
	constructor(aba) {
		let elemento = document.getElementById("parametros");
		super(elemento, "parametrizacao");
		this.aba = aba;
		this.listaContas = [];
		this.listaContasNaoSinteticas = [];
		let regimeTributario = new RegimeTributario();
		this.add(regimeTributario);
		let contasDepreciacao = new ContasDepreciacao();
		this.add(contasDepreciacao);
		let contasQuantidade = new ContasRequeremQuantidade();
		this.add(contasQuantidade);
	}
	setValor(valor) {
		let listaContas = this.getModuloSistema().getListaContas();
		this.setListaContas(listaContas);
		super.setValor(valor);
	}
	setListaContas(listaContas) {
		this.listaContas = listaContas.map(({ codigo, descricao }) => ({
			text: codigo + " - " + descricao,
			value: codigo
		}));
		this.listaContasNaoSinteticas = listaContas.filter(item => !item.sintetica);
		this.listaContasNaoSinteticas = this.listaContasNaoSinteticas.map(({ codigo, descricao }) => ({
			text: codigo + " - " + descricao,
			value: codigo
		}));
		this.getComponente("regimeTributario").atualizarCombos();
		this.getComponente("contasRequeremQuantidade").atualizarCombos();
		this.getComponente("contasDepreciacao").atualizarCombos();
	}
	focar() {
		super.focar();
		this.aba.alternar("abaParametros");
	}
}