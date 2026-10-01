import { Modal, ControleAba } from './util/util.js?v0.8';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?v0.8';
import { FolhaPagamento } from './folhaPagamento.js?v0.8';

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
			titulo: "RBT12", 
			atributos: {title: "Faturamento bruto acumulado dos últimos 12 meses."},
			regras: {obrigatorio: true},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "brutoTributavelUltimos12Meses", {
			titulo: "Pagamentos Brutos Tributáveis", 
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
			titulo: "Parcela a Deduzir", 
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
	}
	atualizarCombos() {
		let listaContas = this.pai.pai.listaContas;
		this.getComponente("contaReceita").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.")));
		listaContas = this.pai.pai.listaContasNaoSinteticas;
		this.getComponente("contaSimplesRecolher").setOpcoes(listaContas.filter(lc => lc.value.startsWith("2.")));
		this.getComponente("contaCppRecolher").setOpcoes(listaContas.filter(lc => lc.value.startsWith("2.")));
		this.getComponente("contaSimplesAbatimento").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.") || lc.value.startsWith("4.")));
		this.getComponente("contaCppAbatimento").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.") || lc.value.startsWith("4.")));
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
		super(null, "empresaRegular", {titulo: "Empresa Regular", qtdColunas: 2});
		this.add(new CampoDOM(null, "aliquotaRat", {
			titulo: "Alíquota RAT",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaTerceiros", {
			titulo: "Alíquota de Terceiros",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "fap", {
			titulo: "FAP",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "desonerada", {
			titulo: "Desonerada?",
			subtipo: "checkbox",
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
	}
	init() {
		let tipo = this.getComponente("tipo");
		let simplesNacional = this.getComponente("simplesNacional");
		simplesNacional.setVisibilidade(false);
		let empresaRegular = this.getComponente("empresaRegular");
		empresaRegular.setVisibilidade(false);
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
class Servicos extends FichasDOM {
	constructor(aba) {
		let elemento = document.getElementById("servicos");
		super(elemento, "servicos", {
			titulo: "Serviços", 
			qtdColunas: 10,
			regras: {campoChave: "descricao"},
			ordem: "descricao",
		});
		this.aba = aba;
		this.add(new CampoDOM(null, "descricao", {
			titulo: "Descrição", 
			spanV: 5,
			regras: {obrigatorio: true}
		}));
		this.add(new ComboFiltroDOM(null, "nbs", {
			titulo: "NBS", 
			spanV: 5,
			regras: {obrigatorio: true}
		}));
	}
	async carregarDados() {
		if (!this.carregandoDados) {
			try {
				this.carregandoDados = true;
				let res = await fetch("dados/nbs.json");
				let obj = await res.json();
				let opcoes = [];
				console.log("nbs", obj);
				for (let key in obj) {
					if (key.length == 12) {
						opcoes.push({value: key, text: key + " - " + obj[key]});
					}
				}				
				this.getComponente("nbs").setOpcoes(opcoes);
			} catch(erro) {
				console.error('Erro ao ler nbs.json:', erro);
			}
		}		
		super.carregarDados();
	}
}
class Produtos extends FichasDOM {
	constructor(aba) {
		let elemento = document.getElementById("produtos");
		super(elemento, "produtos", {
			titulo: "Produtos", 
			qtdColunas: 10,
			regras: {campoChave: "descricao"},
			ordem: "descricao",
		});
		this.aba = aba;
		this.add(new CampoDOM(null, "descricao", {
			titulo: "Descrição", 
			spanV: 5,
			regras: {obrigatorio: true}
		}));
		this.add(new ComboFiltroDOM(null, "ncm", {
			titulo: "NCM", 
			spanV: 5,
			regras: {obrigatorio: true}
		}));
	}
	async carregarDados() {
		if (!this.carregandoDados) {
			try {
				this.carregandoDados = true;
				let res = await fetch("dados/ncms.json");
				let obj = await res.json();
				let opcoes = [];
				let ncms = obj.Nomenclaturas;
				for (let ncm of ncms) {
					/* código para salvar ajustado
					let desc = ncm.Descricao.replaceAll("<i>", "").replaceAll("</i>", "").replaceAll("<sup>", "").replaceAll("</sup>", "");
					let cod = ncm.Codigo.replaceAll(".", "");
					if (desc[0] == '-' || desc == "Outros" || desc == "Outras") {
						for (let i = cod.length - 1; i > 0; i--) {
							let ncmAux = ncms.find(n => n.Codigo.replaceAll(".", "") == cod.substring(0, i));
							if (ncmAux) {
								if (desc[0] == '-') {
									desc = ncmAux.Descricao + " " + desc;
								} else {
									desc = ncmAux.Descricao + " - " + desc;
								}
								break;
							}
						}
					}
					ncm.Descricao = desc;
					*/
					if (ncm.Codigo.length == 10) {
						opcoes.push({value: ncm.Codigo, text: ncm.Codigo + " - " + ncm.Descricao});
					}
				}				
				console.log("ncms", obj);
				this.getComponente("ncm").setOpcoes(opcoes);
			} catch(erro) {
				console.error('Erro ao ler ncms.json:', erro);
			}
		}		
		super.carregarDados();
	}
}
export class ParametrizacaoCTB extends ObjetoDOM {
	constructor(aba) {
		let elemento = document.getElementById("parametros");
		super(elemento, "parametrizacao");
		this.aba = aba;
		this.abaLancamentos = new ControleAba(document.getElementById("abaParametros"));
		this.listaContas = [];
		this.listaContasNaoSinteticas = [];
		let regimeTributario = new RegimeTributario();
		this.add(regimeTributario);
		let folhaPagamento = new FolhaPagamento(this.abaLancamentos);
		this.add(folhaPagamento);
		let contasDepreciacao = new ContasDepreciacao();
		this.add(contasDepreciacao);
		let contasQuantidade = new ContasRequeremQuantidade();
		this.add(contasQuantidade);
		let servicos = new Servicos();
		this.add(servicos);
		let produtos = new Produtos();
		this.add(produtos);
		this.abaLancamentos.aoAlterar = (aba) => {
			if (aba == "abaFuncionarios") {
				folhaPagamento.atualizarFuncionarios();
			}
		};
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
		this.getComponente("folhaPagamento").atualizarCombos();
	}
	focar() {
		super.focar();
		this.aba.alternar("abaParametros");
		this.abaLancamentos.alternar("abaBasica");
	}
}