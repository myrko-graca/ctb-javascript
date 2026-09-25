import { Modal, ControleAba } from './util/util.js?v0.7';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?v0.7';
import { FolhaPagamento } from './folhaPagamento.js?v0.7';
const { jsPDF } = window.jspdf;

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
			atributos: {title: "Faturamento bruto acumulado dos últimos 12 meses"},
			regras: {obrigatorio: true},
			subtipo: "number",
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
			spanV: 4
		}));
		this.add(new ComboFiltroDOM(null, "contaSimplesRecolher", {
			titulo: "Conta Simples Nacional a Recolher", 
			regras: {obrigatorio: true},
			spanV: 4
		}));
		this.add(new ComboFiltroDOM(null, "contaSimplesAbatimento", {
			titulo: "Conta Simples Nacional de Abatimento", 
			regras: {obrigatorio: true},
			spanV: 4
		}));
	}
	atualizarCombos() {
		let listaContas = this.pai.pai.listaContas;
		this.getComponente("contaReceita").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.")));
		listaContas = this.pai.pai.listaContasNaoSinteticas;
		this.getComponente("contaSimplesRecolher").setOpcoes(listaContas.filter(lc => lc.value.startsWith("2.")));
		this.getComponente("contaSimplesAbatimento").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.") || lc.value.startsWith("4.")));
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
				{value: "SIMPLES_PADRAO", text: "Simples Nacional (padrão)"}, 
				{value: "SIMPLES_ANEXO_IV", text: "Simples Nacional (anexo IV)"},
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
					opcoes.push({value: key, text: key + " - " + obj[key]});
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
				console.log("ncms", obj);
				let ncms = obj.Nomenclaturas;
				for (let ncm of ncms) {
					opcoes.push({value: ncm.Codigo, text: ncm.Codigo + " - " + ncm.Descricao});
				}				
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