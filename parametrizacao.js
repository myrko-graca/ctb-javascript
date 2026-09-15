import { Modal, ControleAba } from './util/util.js?v6';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?v6';

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
			qtdColunas: 4
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
		let listaContas = this.pai.listaContas;
		this.getComponente("contaReceita").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.")));
		listaContas = this.pai.listaContasNaoSinteticas;
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
class FolhaPagamento extends ObjetoDOM {
	constructor(aba) {
		let elemento = document.getElementById("folhaPagamento");
		super(elemento, "folhaPagamento", {
			titulo: "Folha de Pagamento",
			qtdColunas: 4
		});
		this.aba = aba;
		this.add(new ComboFiltroDOM(null, "contaSalarios", {
			titulo: "Salários", 
			regras: {obrigatorio: true},
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaFGTSARecolher", {
			titulo: "FGTS a recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaINSSARecolher", {
			titulo: "INSS a recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaIRRFARecolher", {
			titulo: "IRRF a recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaProvisao13o", {
			titulo: "Provisão de 13º Salário", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaProvisaoFeriasTerco", {
			titulo: "Provisão de Férias/Terço", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaProvisaoFGTSARecolher", {
			titulo: "FGTS Prov. Férias/Terço/13º a Recolher", 
			spanV: 2,
		}));
		this.add(new TiposFuncionarios());
		this.add(new Funcionarios());
	}
	aoModificar(ultimo) {
		super.aoModificar(this);
		if (ultimo == this.getComponente("contaSalarios")) {
			this.getComponente("funcionarios").atualizarCombos(this.pai.listaContasNaoSinteticas);
		}
	}
	atualizarCombos() {
		let listaContasPassivo = this.pai.listaContas.filter(lc => lc.value.startsWith("2."));
		let listaContasDespesas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
		this.getComponente("contaSalarios").setOpcoes(listaContasPassivo);
		listaContasPassivo = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("2."));
		this.getComponente("contaFGTSARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("contaProvisao13o").setOpcoes(listaContasPassivo);
		this.getComponente("contaProvisaoFeriasTerco").setOpcoes(listaContasPassivo);
		this.getComponente("contaProvisaoFGTSARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("tiposFuncionarios").atualizarCombos(this.pai.listaContasNaoSinteticas);
		this.atualizarFuncionarios();
	}
	atualizarFuncionarios() {
		this.getComponente("funcionarios").atualizarCombos(this.pai.listaContasNaoSinteticas);
	}
	setValor(valor) {
		this.getComponente("funcionarios").atualizarCombos(this.pai.listaContasNaoSinteticas);
		super.setValor(valor);
	}
	focar() {
		super.focar();
		this.aba.alternar("abaFolha");
	}
}
class TiposFuncionarios extends FichasDOM {
	constructor() {
		super(null, "tiposFuncionarios", {
			titulo: "Tipos de Colaboradores",
			qtdColunas: 4,
			spanV: 4,
			regras: {campoChave: "nome"},
			ordem: "nome",
		});
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome", 
			regras: {obrigatorio: true},
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaSalario", {
			titulo: "Despesa com salário", 
			regras: {obrigatorio: true},
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaHorasExtras", {
			titulo: "Despesa com horas extras", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaAdicionalNoturno", {
			titulo: "Despesa com com adicional noturno", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaFGTS", {
			titulo: "Despesa com FGTS", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaINSS", {
			titulo: "Despesa com INSS", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaIRRF", {
			titulo: "Despesa com IRRF", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaVT", {
			titulo: "Despesa com Vale Transporte", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesa13o", {
			titulo: "Despesas com Provisão de 13º", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaFeriasTerco", {
			titulo: "Despesas com Provisão de Férias/Terço", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaFGTSProvisoes", {
			titulo: "Despesas com FGTS sobre Provisões", 
			spanV: 2,
		}));
	}
	atualizarCombos(listaContasNaoSinteticas) {
		let lista = listaContasNaoSinteticas.filter(lc => lc.value.startsWith("1.") || lc.value.startsWith("4."));
		this.getComponente("contaDespesaSalario").setOpcoes(lista);
		this.getComponente("contaDespesaHorasExtras").setOpcoes(lista);
		this.getComponente("contaDespesaAdicionalNoturno").setOpcoes(lista);
		this.getComponente("contaDespesaFGTS").setOpcoes(lista);
		this.getComponente("contaDespesaINSS").setOpcoes(lista);
		this.getComponente("contaDespesaIRRF").setOpcoes(lista);
		this.getComponente("contaDespesaVT").setOpcoes(lista);
		this.getComponente("contaDespesa13o").setOpcoes(lista);
		this.getComponente("contaDespesaFeriasTerco").setOpcoes(lista);
		this.getComponente("contaDespesaFGTSProvisoes").setOpcoes(lista);
	}
}
class FeriasFuncionario extends ConjuntoDOM {
	constructor() {
		super(null, "ferias", {
			titulo: "Férias",
			qtdColunas: 2,
			spanV: 3,
			spanH: 3,
			regras: {campoChave: "inicio"},
			ordem: "inicio",
			somentePrimeiroLabel: true
		});
		this.add(new IntervaloDOM(null, "periodo", {
			titulo: "Período", 
			spanV: 2,
			regras: {obrigatorio: true},
		}));
	}
}
class Funcionarios extends FichasDOM {
	constructor(aba) {
		let elemento = document.getElementById("funcionarios");
		super(elemento, "funcionarios", {
			titulo: "Funcionários",
			qtdColunas: 6,
			spanV: 4,
			regras: {campoChave: "codigo"},
			ordem: "nome"
		});
		this.aba = aba;
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome", 
			spanV: 6,
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "tipo", {
			titulo: "Tipo", 
			spanV: 3,
			regras: {obrigatorio: true},
			tipo: "select",
		}));
		this.add(new ComboFiltroDOM(null, "contaPassivo", {
			titulo: "Conta", 
			regras: {obrigatorio: true},
			spanV: 3,
		}));
		this.add(new CampoDOM(null, "salarioBase", {
			titulo: "Salário base", 
			regras: {obrigatorio: true},
			subtipo: "number",
			spanV: 2,
		}));
		this.add(new CampoDOM(null, "dependentes", {
			titulo: "Dependentes", 
			regras: {obrigatorio: true},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "utilizaVT", {
			titulo: "Utiliza VT?", 
			subtipo: "checkbox",
		}));
		this.add(new CampoDOM(null, "custoRealVT", {
			titulo: "Custo real do VT", 
			subtipo: "number",
			spanV: 2,
		}));
		this.add(new CampoDOM(null, "cargo", {
			titulo: "Cargo", 
			spanV: 2
		}));
		this.add(new CampoDOM(null, "regime", {
			titulo: "Regime", 
			tipo: "select",
			opcoes: [{value: "CLT", text: "CLT"}, {value: "PJ", text: "PJ"}, {value: "MEI", text: "MEI"}],
		}));
		this.add(new FeriasFuncionario());
		this.add(new CampoDOM(null, "jornadaMensal", {
			titulo: "Jornada mensal", 
			atributos: {title: "Quantidade de horas mensais trabalhadas"},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "qtdHorasNoturnas", {
			titulo: "Horas noturnas", 
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "qtdHorasExtras", {
			titulo: "Horas extras", 
			subtipo: "number",
		}));
	}
	atualizarCombos(listaContasNaoSinteticas) {
		let contaSalario = this.pai.getComponente("contaSalarios").getValor();
		if (contaSalario) {
			let listaContasSalarios = listaContasNaoSinteticas.filter(lc => lc.value.startsWith(contaSalario));
			this.getComponente("contaPassivo").setOpcoes(listaContasSalarios);
		} else {
			this.getComponente("contaPassivo").setOpcoes(listaContasNaoSinteticas);
		}
		let listaTipos = this.pai.getComponente("tiposFuncionarios").getValor();
		listaTipos = listaTipos.map(({ nome }) => ({
			text: nome,
		}));
		this.getComponente("tipo").setOpcoes(listaTipos);
	}
	setValor(valor) {
		let listaTipos = this.pai.getComponente("tiposFuncionarios").getValor();
		listaTipos = listaTipos.map(({ nome }) => ({
			text: nome,
		}));
		this.getComponente("tipo").setOpcoes(listaTipos);
		super.setValor(valor);
	}
	focar() {
		super.focar();
		this.aba.alternar("abaFuncionarios");
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
		let folhaPagamento = new FolhaPagamento(this.abaLancamentos);
		this.add(folhaPagamento);
		let contasDepreciacao = new ContasDepreciacao();
		this.add(contasDepreciacao);
		let simplesNacional = new SimplesNacional();
		this.add(simplesNacional);
		let contasQuantidade = new ContasRequeremQuantidade();
		this.add(contasQuantidade);
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
		this.getComponente("contasRequeremQuantidade").atualizarCombos();
		this.getComponente("contasDepreciacao").atualizarCombos();
		this.getComponente("simplesNacional").atualizarCombos();
		this.getComponente("folhaPagamento").atualizarCombos();
	}
	focar() {
		super.focar();
		this.aba.alternar("abaParametros");
		this.abaLancamentos.alternar("abaBasica");
	}
}