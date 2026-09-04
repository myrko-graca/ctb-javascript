import { Modal } from './util/util.js?v1';
import { ControleAba } from './util/util.js?v1';
import { ObjetoDOM } from './util/form.js?v1';
import { ModuloSistemaDOM } from './util/form.js?v1';
import { ConjuntoDOM } from './util/form.js?v1';
import { FichasDOM } from './util/form.js?v1';
import { ComboFiltroDOM } from './util/form.js?v1';
import { CampoDOM } from './util/form.js?v1';
import { CampoArquivo } from './util/form.js?v1';
import { CNPJCPF } from './util/form.js?v1';
import { IntervaloDOM } from './util/form.js?v1';

let ehCelular = window.innerWidth <= 768;

class ContaCTB extends ObjetoDOM {
	constructor(elemento, nome) {
		let qtdColunas = 8;
		if (ehCelular) {
			qtdColunas = 6;
		}
		super(elemento, nome, {qtdColunas: qtdColunas, spanV: qtdColunas});
		this.add(new CampoDOM(null, "codigo", {
			titulo: "Código",
			tipo: "input", 
			subtipo: "number",
			regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "descricao", {
			titulo: "Descrição", spanV: 4,
			regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "saldo", {
			titulo: "Saldo", 
			tipo: "input", 
			subtipo: "number", 
			//calculado: true,
			spanV: 2,
			atributos: {readonly: true},
		}).setVisibilidade(!ehCelular));
		this.add(new CampoDOM(null, "sintetica", {
			titulo: "Sintética", 
			tipo: "input", 
			subtipo: "checkbox",
		}));
	}
	setValor(valor) {
		//Se for o primeiro nível, não pode mudar o código nem se é Sintética
		if (this.pai.getTipo() == "modulo") {
			if (!valor) {
				valor = {};
			}
			valor.codigo = this.getComponente("codigo").getValor();
			valor.sintetica = this.getComponente("sintetica").getValor();
			if (!valor.descricao) {
				valor.descricao = this.getComponente("descricao").getValor();
			}
		}
		super.setValor(valor);
	}
	limpar() {
		//Se for o primeiro nível, não deixa limpar
		if (this.pai.getTipo() == "modulo") {
			valor = {};
			valor.codigo = this.getComponente("codigo").getValor();
			valor.sintetica = this.getComponente("sintetica").getValor();
			valor.descricao = this.getComponente("descricao").getValor();
		}
		super.limpar();
		if (this.pai.getTipo() == "modulo") {
			this.setValor(valor);
		}
	}
	init() {
		super.init();
		let conta = this.getComponente("codigo");
		let titulo = conta.getValor() + ".";
		let sub = new ConjuntoContaCTB(this, titulo);
		this.add(sub);
	}
	alterarSaldo(valor, natureza) {
		ContaCTB.alterarSaldo(this, valor, natureza);
	}
	static #alterarSaldo(componente, valor, natureza, primeiraConta) {
		while (componente instanceof ConjuntoDOM) {
			componente = componente.pai;
		}
		let compSaldo = componente.getComponente("saldo");
		if (compSaldo) {
			let saldo = compSaldo.getValor();
			if (saldo) {
				saldo = Number(saldo);
			} else {
				saldo = 0;
			}
			if (primeiraConta instanceof Ativos || primeiraConta instanceof Despesas) {
				saldo += (natureza === 'D') ? valor : -valor;
			} else {
				saldo += (natureza === 'C') ? valor : -valor;
			}
			compSaldo.setValor(saldo);
		}
		let contaPai = componente.pai;
		if (contaPai) {
			ContaCTB.#alterarSaldo(contaPai, valor, natureza, primeiraConta);
			contaPai = contaPai.pai;
		}
	}
	static alterarSaldo(componente, valor, natureza) {
		let primeiraConta = componente;
		while (!(primeiraConta instanceof ContaCTB)) {
			primeiraConta = primeiraConta.pai;
		}
		if (componente.getComponente("sintetica").getValor()) {
			throw new Error("Lançamento indevido em conta Sintética");
		}
		ContaCTB.#alterarSaldo(componente, valor, natureza, primeiraConta);
	}
	static #zerarSaldo(componente) {
		componente.getComponente("saldo").setValor("");
		let sub = componente.getComponente("sub");
		if (sub) {
			for (let c of sub.getListaComponentes()) {
				ContaCTB.#zerarSaldo(c);
			}
		}
	}
	zerarSaldo() {
		ContaCTB.#zerarSaldo(this);
	}
}
class ConjuntoContaCTB extends ConjuntoDOM {
	constructor(contaCTB, titulo) {
		let obj = structuredClone(contaCTB.obj);
		obj.titulo = titulo;
		obj.regras = {campoChave: "codigo"};
		obj.spanV += 2;
		super(null, "sub", obj);
		this.contaCTB =  contaCTB;
		for (let c of contaCTB.componentes) {
			if (c instanceof  CampoDOM) {
				this.add(c.clonar());
			}
		}
		this.add(new CampoDOM(null, "bt", {titulo: "\u00A0", tipo: "button"}));
		let legenda = this.elemento.querySelector("legend");
		const iconeSpan = document.createElement('span');
		iconeSpan.textContent = '\u26F6'; 
		iconeSpan.style.cursor = 'pointer';
		iconeSpan.style.marginRight = '8px';
		iconeSpan.title = "Clique para expandir";
		let descLegenda = legenda.textContent;
		iconeSpan.addEventListener("click", (e) => {
			event.stopPropagation();
			const estaExpandido = this.elemento.classList.toggle("tela-cheia");
			if (estaExpandido) {
				let desc = this.pai.getComponente("descricao").getValor();
				legenda.textContent = descLegenda + " (" + desc + ")";
				iconeSpan.title = "Clique para reduzir";
			} else {
				legenda.textContent = descLegenda;
				iconeSpan.title = "Clique para expandir";
			}
			legenda.prepend(iconeSpan);
			this.elemento.scrollIntoView({
				behavior: "smooth",
				block: "start"
			});
		});
		legenda.prepend(iconeSpan);
	}
	novo() {
		let n = super.novo();
		n.alterarSaldo = (valor, natureza) => {
			ContaCTB.alterarSaldo(n, valor, natureza);
		}
		n.getComponente("saldo").setVisibilidade(!ehCelular);
		n.elemento.style.gridTemplateColumns += " max-content";
		let bt = n.getComponente("bt");
		bt.campo.textContent = "criar";
		bt.campo.className = "btn btn-plus";
		bt.campo.title = "Cria um sub conjunto de contas";
		bt.campo.addEventListener("click", (e) => {
			if (bt.campo.textContent == "criar") {
				let codigo = n.getComponente("codigo").getValor();
				if (!codigo) {
					throw new Error("É necessário definir o código");
				}
				let titulo = this.obj.titulo + codigo + ".";
				n.add(new ConjuntoContaCTB(this.contaCTB, titulo));
				bt.campo.textContent = "remover";
				bt.campo.className = "btn btn-clear";
				bt.campo.title = "Remove o sub conjunto de contas criada";
			} else {
				if (confirm("Confirma remover?")) {
					let sub = n.getComponente("sub");
					n.remover(sub);
					bt.campo.textContent = "criar";
					bt.campo.title = "Cria um sub conjunto de contas";
					bt.campo.className = "btn btn-plus";
				}
			}
		});
		return n;
	}
	setValor(valor) {
		super.setValor(valor);
		let lista = this.getListaComponentes();
		//console.log("valor", valor);
		for (let v of valor) {
			if (v.sub) {
				let item = lista[valor.indexOf(v)];
				let titulo = this.obj.titulo + v.codigo + ".";
				let conj = new ConjuntoContaCTB(this.contaCTB, titulo);
				item.add(conj);
				let bt = item.getComponente("bt");
				bt.campo.textContent = "remover";
				bt.campo.className = "btn btn-clear";
				bt.campo.title = "Remove o sub conjunto de contas criada";
				conj.setValor(v.sub);
			}
		}
	}
	validar() {
		let lista = super.validar();
		let valor = this.getValor();
		const descricoes = valor.map(v => v.descricao);
		if (new Set(descricoes).size < descricoes.length) {
			let item = {};
			item.mensagem = "Descrição está repetida";
			item.componentes = [{componente: this}];
			lista.push(item);
		}
		return lista;
	}
}
class Ativos extends ContaCTB {
	constructor(aba) {
		super(document.getElementById("ativos"), "ativos");
		let codigo = this.getComponente("codigo");
		codigo.setValor(1);
		codigo.campo.setAttribute("readonly" , true);
		let descricao = this.getComponente("descricao");
		descricao.setValor("Ativo (Bens e Direitos)");
		let sintetica = this.getComponente("sintetica");
		sintetica.setValor(true);
		sintetica.campo.setAttribute("disabled" , true);
		this.aba = aba;
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaAtivo");
	}
}
class Passivos extends ContaCTB {
	constructor(aba) {
		super(document.getElementById("passivos"), "passivos");
		let codigo = this.getComponente("codigo");
		codigo.setValor(2);
		codigo.campo.setAttribute("readonly" , true);
		let descricao = this.getComponente("descricao");
		descricao.setValor("Passivo (Obrigações e Dívidas)");
		let sintetica = this.getComponente("sintetica");
		sintetica.setValor(true);
		sintetica.campo.setAttribute("disabled" , true);
		this.aba = aba;
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaPassivo");
	}
}
class Receitas extends ContaCTB {
	constructor(aba) {
		super(document.getElementById("receitas"), "receitas");
		let codigo = this.getComponente("codigo");
		codigo.setValor(3);
		codigo.campo.setAttribute("readonly" , true);
		let descricao = this.getComponente("descricao");
		descricao.setValor("Receitas ");
		let sintetica = this.getComponente("sintetica");
		sintetica.setValor(true);
		sintetica.campo.setAttribute("disabled" , true);
		this.aba = aba;
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaReceita");
	}
}
class Despesas extends ContaCTB {
	constructor(aba) {
		super(document.getElementById("despesas"), "despesas");
		let codigo = this.getComponente("codigo");
		codigo.setValor(4);
		codigo.campo.setAttribute("readonly" , true);
		let descricao = this.getComponente("descricao");
		descricao.setValor("Custos e Despesas");
		let sintetica = this.getComponente("sintetica");
		sintetica.setValor(true);
		sintetica.campo.setAttribute("disabled" , true);
		this.aba = aba;
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaDespesa");
	}
}
class ApuracaoResultado extends ContaCTB {
	constructor(aba) {
		super(document.getElementById("apuracaoResultado"), "apuracaoResultado");
		let codigo = this.getComponente("codigo");
		codigo.setValor(5);
		codigo.campo.setAttribute("readonly" , true);
		let descricao = this.getComponente("descricao");
		descricao.setValor("Apuração de Resultados (ARE)");
		let sintetica = this.getComponente("sintetica");
		sintetica.setValor(false);
		sintetica.campo.setAttribute("disabled" , true);
		this.add(new ComboFiltroDOM(null, "contaLucroPrejuizo", {
			titulo: "Conta de Lucro/Prejuízo",
			spanV: this.obj.qtdColunas - 1,
			regras: {obrigatorio: true}
		}));
		this.aba = aba;
		this.abaApuracao = new ControleAba(document.getElementById("abaApuracaoResultado"));
		this.add(new RealizarApuracao(this.abaApuracao));
	}
	preencherCombos() {
		let listaContas = this.pai.getListaContas();
		listaContas = listaContas.filter(lc => lc.codigo.startsWith("2."));
		let opcoes = listaContas.map(({ codigo, descricao }) => ({
			text: codigo + " - " + descricao,
			value: codigo
		}));
		this.getComponente("contaLucroPrejuizo").setOpcoes(opcoes);
	}
	setValor(valor) {
		this.preencherCombos();
		super.setValor(valor);
	}
	init() {
		//Não realiza o init de contaCTB
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaApuracaoResultado");
	}
}
class RealizarApuracao extends ObjetoDOM {
	constructor(aba) {
		super(document.getElementById("realizarApuracao"), "realizarApuracao", {qtdColunas: 5});
		this.aba = aba;
		this.add(new IntervaloDOM(null, "periodo", {
			titulo: "Período",
			spanV: 2,
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "saldoReceita", {
			titulo: "Receita",
			subtipo: "number",
			atributos: {readonly: true},
		}));
		this.add(new CampoDOM(null, "saldoCustoDespesa", {
			titulo: "Custo/Despesa",
			subtipo: "number",
			atributos: {readonly: true},
		}));
		this.add(new CampoDOM(null, "apenasRelatorio", {
			titulo: "Relatório",
			subtipo: "checkbox",
			atributos: {title: "Indica que a apuração está sendo usada apenas para gerar relatório DRE"},
		}));
		let btBuscar = document.createElement("button");
		btBuscar.textContent = "Buscar Lançamentos";
		btBuscar.className = "btn btn-plus";
		btBuscar.title = "Busca os valores de receita, custo e despesa para iniciar a apuração de resultado";
		this.elemento.appendChild(btBuscar);
		btBuscar.addEventListener("click", (e) => {
			this.calcularLancamentos();
		});
		let btEfetuar = document.createElement("button");
		btEfetuar.textContent = "Efetuar Apuração";
		btEfetuar.className = "btn btn-plus";
		this.elemento.appendChild(btEfetuar);
		btEfetuar.addEventListener("click", (e) => {
			this.efetuarLancamentosApuracao();
		});
	}
	calcularLancamentos() {
		let dataInicio = this.getComponente("periodo").inicio.getValor();
		let dataFim = this.getComponente("periodo").fim.getValor();
		if (dataInicio && dataFim) {
			let sistema = this.getModuloSistema();
			let lancamentos = sistema.lancamentos;
			let listaContas = sistema.getListaContas();
			lancamentos = lancamentos.filter(lc => lc.data >= dataInicio && lc.data <= dataFim);
			
			if (this.getComponente("apenasRelatorio").getValor()) {
				lancamentos = lancamentos.filter(item => {
					const debitosOk = item.debitos.every(d => d.conta !== "5");
					const creditosOk = item.creditos.every(c => c.conta !== "5");
					return debitosOk && creditosOk;
				});
			}
			let lista = [];
			for (let lanc of lancamentos) {
				let debitos = lanc.debitos.map(itens => ({
				  ...itens,
				  tipo: "D",
				  data: lanc.data
				}));
				lista.push(...debitos);
				let creditos = lanc.creditos.map(itens => ({
				  ...itens,
				  tipo: "C",
				  data: lanc.data
				}));
				lista.push(...creditos);
			}
			lancamentos = lista.filter(lc => lc.conta.startsWith("3") || lc.conta.startsWith("4") || lc.conta == "5");
			lista = {};
			for (let lanc of lancamentos) {
				if (!lista[lanc.conta]) {
					lista[lanc.conta] = 0;
				}
				if (lanc.conta[0] == '3') {
					if (lanc.tipo == "C") {
						lista[lanc.conta] += Number(lanc.valor);
					} else {
						lista[lanc.conta] -= Number(lanc.valor);
					}
				} else {
					if (lanc.tipo == "D") {
						lista[lanc.conta] += Number(lanc.valor);
					} else {
						lista[lanc.conta] -= Number(lanc.valor);
					}
				}
			}
			this.contasApuracao = [];
			for (let conta in lista) {
				if (conta !== "5") {
					let saldo = lista[conta];
					let aux = listaContas.find(lc => lc.codigo == conta);
					let descricao = aux.descricao;
					if (saldo) {
						this.contasApuracao.push({conta: conta, descricao: descricao, saldo: saldo});
					}
				}
			}
			this.gerarRelatorio();
			console.log("contasApuracao", this.contasApuracao);
			let totalizacao = this.contasApuracao.reduce((acumulador, item) => {
				const grupoPrincipal = item.conta[0]; 
				if (!acumulador[grupoPrincipal]) {
					acumulador[grupoPrincipal] = 0;
				}
				acumulador[grupoPrincipal] += item.saldo;
				return acumulador;
			}, {});
			totalizacao["5"] = (totalizacao["3"] ?? 0) - (totalizacao["4"] ?? 0);
			console.log("totalizacao", totalizacao);
			this.getComponente("saldoReceita").setValor((totalizacao["3"] ?? 0).toFixed(2));
			this.getComponente("saldoCustoDespesa").setValor((totalizacao["4"] ?? 0).toFixed(2));
		} else {
			new Modal().mostrar("Apuração de Resultado", "É necessário definir a data inicial e a data final");
		}
	}
	efetuarLancamentosApuracao() {
		if (this.getComponente("apenasRelatorio").getValor()) {
			new Modal().mostrar("Apuração de Resultado", "Está configurado apenas para gerar relatório");
			return;
		}
		if (!this.contasApuracao) {
			new Modal().mostrar("Apuração de Resultado", "É necessário buscar os lançamentos");
			return;
		}
		let contaLucroPrejuizo = this.pai.getComponente("contaLucroPrejuizo").getValor();
		if (!contaLucroPrejuizo) {
			new Modal().mostrar("Apuração de Resultado", "É necessário definir a conta de lucros/prejuízos");
			return;
		}
		//Primeiro passo: mover para conta transitória
		let sistema = this.getModuloSistema();
		let dataFim = this.getComponente("periodo").fim.getValor();
		let lancamento = {data: dataFim, descricao: "Apuração de Resultados", debitos: [], creditos: []}
		for (let ca of this.contasApuracao) {
			if (ca.conta[0] == "3") {
				lancamento.debitos.push({conta: ca.conta, valor: ca.saldo});
			} else if (ca.conta[0] == "4") {
				lancamento.creditos.push({conta: ca.conta, valor: ca.saldo});
			} else {
				throw new Error("Conta inválida");
			}
		}
		let saldoCustoDespesa = Number(this.getComponente("saldoCustoDespesa").getValor());
		lancamento.debitos.push({conta: "5", valor: saldoCustoDespesa});
		let saldoReceita = Number(this.getComponente("saldoReceita").getValor());;
		lancamento.creditos.push({conta: "5", valor: saldoReceita});
		lancamento.debitos.push({conta: "5", valor: saldoReceita - saldoCustoDespesa});
		lancamento.creditos.push({conta: contaLucroPrejuizo, valor: saldoReceita - saldoCustoDespesa});
		sistema.efetuarLancamento(lancamento);
		new Modal().mostrar("Apuração de Resultado", "Apuração de Resultados realizada com sucesso!");
		this.contasApuracao = [];
		this.getComponente("saldoCustoDespesa").setValor(0);
		this.getComponente("saldoReceita").setValor(0);
	}
	gerarRelatorio() {
		let div = document.getElementById("DRE");
		div.innerHTML = "";
		let pre = document.createElement("pre");
		div.appendChild(pre);
		let contasDebito = this.contasApuracao.filter(c => c.conta.startsWith("4"));
		let contasCredito = this.contasApuracao.filter(c => c.conta.startsWith("3"));
		let tam = Math.max(contasDebito.length, contasCredito.length);
		let largura = 120;
		if (ehCelular) {
			largura = 80;
		}
		let largSaldo = 14;
		let conteudo = "-".repeat((largura - 18) / 2) + " ARE (Transitória)" + "-".repeat((largura - 18) / 2) + "\n";
		conteudo += "-".repeat(largura) + "\n";
		conteudo += " Débitos " + " ".repeat((largura - 20)/ 2) + "|";
		conteudo += " Créditos" + " ".repeat((largura - 20)/ 2 + 1);
		conteudo += "\n";
		let totalDebitos = 0;
		let totalCreditos = 0;
		for (let i = 0; i < tam; i++) {
			let contaDebito = contasDebito[i];
			let contaCredito = contasCredito[i];
			if (contaDebito) {
				let tamDesc = Math.min(contaDebito.descricao.length, largura / 2 - largSaldo - 2);
				conteudo += " " + contaDebito.descricao.slice(0, tamDesc) + " ".repeat(largura / 2 - largSaldo - tamDesc - 1);
				let saldo = contaDebito.saldo.toFixed(2);
				totalDebitos += contaDebito.saldo;
				conteudo += "R$" + " ".repeat(largSaldo - saldo.length - 4) + saldo + " |";
			} else {
				conteudo += " ".repeat(largura / 2);
			}
			if (contaCredito) {
				let tamDesc = Math.min(contaCredito.descricao.length, largura / 2 - largSaldo - 2);
				conteudo += " " + contaCredito.descricao.slice(0, tamDesc) + " ".repeat(largura / 2 - largSaldo - tamDesc - 1);
				let saldo = contaCredito.saldo.toFixed(2);
				totalCreditos += contaCredito.saldo;
				conteudo += "R$" + " ".repeat(largSaldo - saldo.length - 2) + saldo;
			} else {
				conteudo += " ".repeat(largura / 2);
			}
			conteudo += "\n";
		}
		conteudo += "-".repeat(largura) + "\n";
		conteudo += " Total de Débitos " + " ".repeat(largura / 2 - largSaldo - 18);
		let saldo = totalDebitos.toFixed(2);
		conteudo += "R$" + " ".repeat(largSaldo - saldo.length - 4) + saldo + " |";
		conteudo += " Total de Créditos" + " ".repeat(largura / 2 - largSaldo - 18);
		saldo = totalCreditos.toFixed(2);
		conteudo += "R$" + " ".repeat(largSaldo - saldo.length - 2) + saldo;
		conteudo += "\n";
		conteudo += "-".repeat(largura) + "\n";
		if (totalDebitos > totalCreditos) {
			conteudo += " SALDO DEVEDOR (PREJUÍZO) " + " ".repeat(largura / 2 - largSaldo - 26);
			saldo = (totalDebitos - totalCreditos).toFixed(2);
			conteudo += "R$" + " ".repeat(largSaldo - saldo.length - 4) + saldo;
		} else {
			conteudo += " ".repeat(largura / 2 - 1) + "| SALDO CREDOR (LUCRO)     " + " ".repeat(largura / 2 - largSaldo - 26);
			saldo = (totalCreditos - totalDebitos).toFixed(2);
			conteudo += "R$" + " ".repeat(largSaldo - saldo.length - 2) + saldo;
		}
		conteudo += "\n";
		pre.textContent = conteudo;
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaApuracao");
	}
}
class ModuloSistemaContabil extends ModuloSistemaDOM {
	constructor(elemento) {
		super(elemento, "sistemaContabil", {titulo: "Sistema Contábil", qtdColunas: 10});
		this.aba = new ControleAba(document.body);
		this.add(new CNPJCPF(null, "identificacao", {
			titulo: "Identificação",
			spanV: 3,
			regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome ou Razão Social", 
			spanV: 4, 
			regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "ano", {
			titulo: "Ano", 
			subtipo: "number",
			regras: {obrigatorio: true}
		}));
		this.add(new CampoArquivo(null, "ultimoBalanco", {
			titulo: "Balanço",
			spanV: 2, 
		}));
		this.add(new Ativos(this.aba));
		this.add(new Passivos(this.aba));
		this.add(new Receitas(this.aba));
		this.add(new Despesas(this.aba));
		this.add(new LancamentoContabil(this.aba));
		this.add(new ApuracaoResultado(this.aba));
		let abaErros = this.aba.elemento.querySelector('[data-aba="abaErros"]');
		this.aba.aoAlterar = (aba) => {
			if (aba == "abaResumo") {
				this.mostrarResumo(document.getElementById("resumo"));
			} else if (aba == "abaLancamento") {
				let lancamento = this.getComponente("lancamentoContabil");
				let listaContas = this.getListaContas();
				lancamento.setListaContas(listaContas);
			} else if (aba == "abaApuracaoResultado") {
				let apuracaoResultado = this.getComponente("apuracaoResultado");
				apuracaoResultado.preencherCombos();
			}
		}
	}
	setValor(valor) {
		super.setValor(valor);
		if (valor.lancamentos) {
			this.lancamentos = valor.lancamentos;
		}
	}
	limparSaldos(removerLancamentos) {
		this.getComponente("ativos").zerarSaldo();
		this.getComponente("passivos").zerarSaldo();
		this.getComponente("receitas").zerarSaldo();
		this.getComponente("despesas").zerarSaldo();
		if (removerLancamentos) {
			this.lancamentos = null;
		}
	}
	refazerLancamentos() {
		if (this.lancamentos) {
			this.limparSaldos();
			let lancamentos = this.lancamentos;
			this.lancamentos = [];
			for (let lancamento of lancamentos) {
				this.efetuarLancamento(lancamento);
			}
		}
	}
	getValor() {
		let valor = super.getValor();
		if (this.lancamentos) {
			valor.lancamentos = this.lancamentos;
		}
		return valor;
	}
	mostrarResumo(elemento, mostraTudo) {
		elemento.innerHTML = "";
		let tab = document.createElement("table");
		tab.style.border = "1px solid";
		elemento.appendChild(tab);
		let lista = this.getListaContas();
		let r = tab.insertRow();
		r.insertCell().outerHTML = "<th>Código</th>";
		r.insertCell().outerHTML = "<th>Descrição</th>";
		r.insertCell().outerHTML = "<th>Valor</th>";
		let formatador = new Intl.NumberFormat('pt-BR')
		for (let item of lista) {
			if (item.saldo || mostraTudo) {
				let r = tab.insertRow();
				let c = r.insertCell();
				c.textContent = item.codigo;
				c = r.insertCell();
				c.textContent = item.descricao;
				c = r.insertCell();
				c.style.textAlign = "right";
				if (item.saldo != undefined) {
					c.textContent = formatador.format(Number(item.saldo));
				}
			}
		}
		if (!mostraTudo) {
			let bt = document.createElement("button");
			bt.textContent = "Mostrar todo plano de contas";
			bt.addEventListener("click", (e) => {
				this.mostrarResumo(elemento, true);
			});
			elemento.appendChild(bt);
		}
	}
	#getListaContas(reg, prefixoCodigo) {
		let lista = [];
		let codigo = prefixoCodigo + reg.codigo;
		lista.push({codigo: codigo, descricao: reg.descricao, saldo: reg.saldo, sintetica: reg.sintetica});
		if (reg.sub) {
			for (let sub of reg.sub) {
				lista.push(...this.#getListaContas(sub, codigo + "."));
			}
		}
		return lista;
	}
	getListaContas() {
		let lista = [];
		let conteudo = this.getValor();
		lista.push(...this.#getListaContas(conteudo.sistemaContabil.ativos, ""));
		lista.push(...this.#getListaContas(conteudo.sistemaContabil.passivos, ""));
		lista.push(...this.#getListaContas(conteudo.sistemaContabil.receitas, ""));
		lista.push(...this.#getListaContas(conteudo.sistemaContabil.despesas, ""));
		return lista;
	}
	focar() {
		super.focar();
		this.aba.alternar("abaPrincipal");
	}
	validar() {
		let lista = super.validar();
		let ul = document.getElementById("mensagens");
		ul.innerHTML = "";
		let abaErros = this.aba.elemento.querySelector('[data-aba="abaErros"]');
		if (lista.length > 0) {
			abaErros.hidden = false;
			this.aba.alternar("abaErros");
		} else {
			abaErros.hidden = true;
		}
		for (let item of lista) {
			let li = document.createElement("li");
			let a = document.createElement("a");
			a.href = "#";
			a.title = "Clique para ir para o campo";
			li.appendChild(a);
			a.textContent = item.mensagem;
			a.addEventListener('click', (e) => {
				e.preventDefault()
				for (let i = item.componentes.length - 1; i >= 0; i--) {
					let c = item.componentes[i];
					c.componente.focar(c.posicao);
				}
			});
			ul.appendChild(li);
		}
		return lista;
	}
	localizaConta(conta) {
		let auxContas = [];
		auxContas.push(this.getComponente("ativos"));
		auxContas.push(this.getComponente("passivos"));
		auxContas.push(this.getComponente("receitas"));
		auxContas.push(this.getComponente("despesas"));
		auxContas.push(this.getComponente("apuracaoResultado"));
		let arrayContas = conta.split(".");
		let saida = null;
		let cont = 0;
		for (let c of arrayContas) {
			cont += 1;
			for (let comp of auxContas) {
				if (c == comp.getComponente("codigo")?.getValor()) {
					//Se for o último da pesquisa
					if (cont == arrayContas.length) {
						saida = comp;
					} else {
						let sub = comp.getComponente("sub");
						if (sub) {
							auxContas = sub.componentes;
						}
					}
					break;
				}
			}
		}
		return saida;
	}
	efetuarLancamento(lancamento) {
		console.log("efetuarLancamento", lancamento);
		let data = lancamento.data;
		if (new Date(data).getTime() > new Date().getTime()) {
			throw new Error("Data não pode ser maior que a data de hoje");
		}
		let anoFiscal = Number(this.getComponente("ano").getValor());
		if (new Date(data).getFullYear() != anoFiscal) {
			throw new Error ("O ano do lançamento deve ser igual ao ano fiscal registrado");
		}
		const totalDebito = lancamento.debitos.reduce((sum, item) => sum + Number(item.valor), 0);
		const totalCredito = lancamento.creditos.reduce((sum, item) => sum + Number(item.valor), 0);
		if (totalDebito.toFixed(2) != totalCredito.toFixed(2)) {
			throw new Error("Total de débitos e créditos não batem iguais");
		}
		lancamento.debitos.forEach(item => {
			let conta = this.localizaConta(item.conta);
			if (conta) {
				let valor = Number(item.valor);
				conta.alterarSaldo(valor, "D");
			} else {
				throw new Error("Conta '" + item.conta + "' não encontrada");
			}
		});
		lancamento.creditos.forEach(item => {
			let conta = this.localizaConta(item.conta);
			if (conta) {
				let valor = Number(item.valor);
				conta.alterarSaldo(valor, "C");
			} else {
				throw new Error("Conta '" + item.conta + "' não encontrada");
			}
		});
		if (!this.lancamentos) {
			this.lancamentos = [];
		}
		lancamento.timestamp = Date.now();
		this.lancamentos.push(lancamento);
	}
	getListaQuantidade(conta) {
		let lancamentos = this.getLancamentos(conta);
		lancamentos.sort((a, b) => a.lancamento.data.localeCompare(b.lancamento.data));
		let lancamentosDebito = lancamentos.filter(a => a.tipo == "D");
		let lancamentosCredito = lancamentos.filter(a => a.tipo == "C");
		lancamentosDebito = lancamentosDebito.map(reg => {
			return {
				...reg,
				valorUnitario: Number(reg.valor) / Number(reg.lancamento.quantidade),
				quantidade: Number(reg.lancamento.quantidade),
				valor: Number(reg.valor),
				qtdUsada: 0
			};
		});
		//Ajusta a quantidade usada dos lancamentosDebito a partir dos lancamentosCredito
		for (let lc of lancamentosCredito) {
			lc.quantidade = Number(lc.lancamento.quantidade);
			for (let ld of lancamentosDebito) {
				if (ld.quantidade >= lc.quantidade) {
					ld.qtdUsada += lc.quantidade;
					ld.quantidade -= lc.quantidade;
					lc.quantidade = 0;
				} else {
					ld.qtdUsada += ld.quantidade;
					lc.quantidade -= ld.quantidade;
					ld.quantidade = 0;
				}
			}
		}
		lancamentosDebito = lancamentosDebito.map(reg => {
			return {
				...reg,
				quantidade: Number(reg.lancamento.quantidade),
				qtdDisponivel: reg.quantidade,
			};
		});
		return lancamentosDebito.filter(a => a.qtdDisponivel > 0);
	}
	calculoFIFO(conta, quantidade) {
		let lancamentosDebito = this.getListaQuantidade(conta)
		let saida = 0;
		let qtdRestante = Number(quantidade);
		for (let l of lancamentosDebito) {
			if (qtdRestante <= l.qtdDisponivel) {
				l.qtdDisponivel -= qtdRestante;
				saida += qtdRestante * l.valorUnitario;
				qtdRestante = 0;
				break;
			} else {
				qtdRestante -= l.qtdDisponivel;
				saida += l.qtdDisponivel * l.valorUnitario;;
				l.qtdDisponivel = 0;
			}
		}
		if (qtdRestante > 0) {
			throw new Error("A quantidade ultrapassou a quantidade disponível");
		}
		return saida;
	}
	getLancamentos(conta) {
		let saida = [];
		if (!this.lancamentos) {
			return saida;
		}
		for (let lanc of this.lancamentos) {
			for (let deb of lanc.debitos) {
				if (deb.conta == conta) {
					let reg = {
						conta: deb.conta,
						valor: deb.valor,
						tipo: "D",
						lancamento: lanc
					}
					saida.push(reg);
				}
			}
			for (let cred of lanc.creditos) {
				if (cred.conta == conta) {
					let reg = {
						conta: cred.conta,
						valor: cred.valor,
						tipo: "C",
						lancamento: lanc
					}
					saida.push(reg);
				}
			}
		}
		return saida;
	}
}
class ConjuntoTipoLancamentoContabil extends ConjuntoDOM {
	constructor(elemento, nome, obj) {
		obj.somentePrimeiroLabel = true;
		obj.qtdColunas = 1;
		obj.spanV = 10;
		obj.regras = {obrigatorio: true, campoChave: "conta"};
		super(elemento, nome, obj);
	}
	novo() {
		let n = super.novo();
		if (this.pai && this.pai.pai) {
			let conta = n.getComponente("conta");
			let listaContas = this.pai.pai.listaContas;
			conta.setOpcoes(listaContas);
		}
		return n;
	}
	atualizarCombos() {
		for (let comp of this.getListaComponentes()) {
			let conta = comp.getComponente("conta");
			let listaContas = this.pai.pai.listaContas;
			conta.setOpcoes(listaContas);
		}
	}
}
class TipoLancamentoContabil extends FichasDOM {
	constructor(aba) {
		let elemento = document.getElementById("tipoLancamentoContabil");
		super(elemento, "tipoLancamentoContabil", {titulo: "Tipos de Lançamentos", qtdColunas: 10, spanV: 2, ordem: "descricao"});
		this.aba = aba;
		this.add(new CampoDOM(null, "descricao", {
			titulo: "Descrição", spanV: 10, regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "observacoes", {
			tipo: "textarea",
			atributos: {rows: 4},
			titulo: "Observações", spanV: 10,
		}));
		let listaDebitos = new ConjuntoTipoLancamentoContabil(null, "debitos", {titulo: "Débitos"});
		listaDebitos.add(new ComboFiltroDOM(null, "conta", {
			titulo: "Conta", 
		}));
		this.add(listaDebitos);
		let listaCreditos = new ConjuntoTipoLancamentoContabil(null, "creditos", {titulo: "Créditos"});
		listaCreditos.add(new ComboFiltroDOM(null, "conta", {
			titulo: "Conta", 
		}));
		this.add(listaCreditos);
	}
	focar() {
		super.focar();
		this.aba.alternar("abaTipoLancamentoContabil");
	}
	atualizarCombos() {
		this.getComponente("debitos").atualizarCombos();
		this.getComponente("creditos").atualizarCombos();
	}
}
class ContasLancamentoContabil extends ConjuntoDOM {
	constructor(nome, titulo) {
		super(null, nome, {
			titulo: titulo, 
			qtdColunas: 10, 
			spanV: 10, 
			regras: {obrigatorio: true, campoChave: "conta"}, 
			somentePrimeiroLabel: true
		});
		this.add(new CampoDOM(null, "conta", {
			titulo: "Conta", 
			tipo: "select",
			spanV: 7,
			regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "valor", {
			titulo: "Valor", 
			subtipo: "number", 
			spanV: 3,
			regras: {obrigatorio: true}
		}));
	}
	preencherOpcoesConta(conta, listaContas, filtro) {
		if (filtro && filtro[this.nome]) {
			filtro = filtro[this.nome];
			const opcoesFiltradas = listaContas.filter(opcao => {
				if (opcao.value === "") return true;
				return filtro.some(prefixo => opcao.value.startsWith(prefixo.conta));
			});
			conta.setOpcoes(opcoesFiltradas);
		} else {
			conta.setOpcoes(listaContas);
		}
	}
	filtraListaContas(listaContas, filtro) {
		for (let comp of this.getListaComponentes()) {
			let conta = comp.getComponente("conta");
			let valorAnt = conta.getValor();
			this.preencherOpcoesConta(conta, listaContas, filtro);
			conta.setValor(valorAnt);
		}
	}
	aposIncluir(item) {
		let conta = item.getComponente("conta");
		let tipo = this.pai.getComponente("tipo");
		let filtro = this.pai.filtro[tipo.campo.value];
		let listaContas = this.pai.pai.listaContasNaoSinteticas;
		this.preencherOpcoesConta(conta, listaContas, filtro);
	}
}
class EfetuarLancamentoContabil extends ObjetoDOM {
	constructor(aba) {
		let elemento = document.getElementById("efetuarLancamento");
		super(elemento, "efetuarLancamento", {titulo: "Lançamento Contábil", qtdColunas: 10});
		this.filtro = {};
	}
	getTipos() {
		let saida =[];
		for (let key in this.filtro) {
			saida.push({text: key});
		}
		saida.push({text: "Extorno"});
		return saida;
	}
	init() {
		this.add(new CampoDOM(null, "data", {
			titulo: "Data", spanV: 2, subtipo: "date", regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "descricao", {
			titulo: "Descrição", spanV: 8, regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "quantidade", {
			titulo: "Quantidade", spanV: 2, subtipo: "number"
		}));
		let tipo = new ComboFiltroDOM(null, "tipo", {
			titulo: "Tipo", 
			opcoes: this.getTipos(),
			spanV: 8, 
		});
		this.add(tipo);
		let debitos = new ContasLancamentoContabil("debitos", "Débitos");
		this.add(debitos);
		let creditos = new ContasLancamentoContabil("creditos", "Créditos")
		this.add(creditos);
		tipo.campo.addEventListener("change", (e) => {
			let filtro = this.filtro[tipo.getValor()];
			debitos.filtraListaContas(this.pai.listaContasNaoSinteticas, filtro);
			creditos.filtraListaContas(this.pai.listaContasNaoSinteticas, filtro);
		});

		let bt = document.createElement("button");
		bt.textContent = "Efetuar";
		bt.addEventListener("click", (e) => {
			if (this.vazio()) {
				new Modal().mostrar("Lançamento", "Não há informação de lançamento");
			} else {
				let lista = this.validar();
				if (lista.length == 0) {
					this.getModuloSistema().efetuarLancamento(this.getValor().efetuarLancamento);
					new Modal().mostrar("Lançamento", "Lançamento efetuado com sucesso");
					this.setSomenteLeitura(false);
					this.limpar();
				} else {
					new Modal().mostrar("Lançamento", "Existem erros no lançamento");
				}
			}
		});
		this.elemento.appendChild(bt);
		
		bt = document.createElement("button");
		bt.id = "btBuscarValorQuantidade";
		bt.hidden = true;
		bt.textContent = "Obter valor";
		bt.title = "Tenta obter valor a partir de informações dos lançamentos nas contas";
		bt.addEventListener("click", (e) => {
			let conteudo = this.getValor().efetuarLancamento;
			if (!conteudo.quantidade) {
				new Modal().mostrar("Obter valores", "Para tenta obter valores, é necessário preencher a quantidade");
				return;
			}
			let contasQuantidade = this.pai.getComponente("contasRequeremQuantidade").getValor();
			if (conteudo.creditos) {
				const contasEncontradas = conteudo.creditos.filter(alvo => 
					contasQuantidade.some(filtro => alvo.conta.startsWith(filtro.conta))
				);
				for (let conta of contasEncontradas) {
					let valor = this.getModuloSistema().calculoFIFO(conta.conta, conteudo.quantidade);
					let cred = this.getComponente("creditos");
					for (let reg of cred.getListaComponentes()) {
						if (reg.getComponente("conta").getValor() == conta.conta) {
							reg.getComponente("valor").setValor(valor.toFixed(2));
						}
					}
					console.log("lançamentos", conta, valor);
				}
			}
		});
		this.elemento.appendChild(bt);
		
		bt = document.createElement("button");
		bt.id = "btBuscarValorDepreciacao";
		bt.hidden = true;
		bt.textContent = "Calcula";
		bt.title = "Calcula valor a partir de informações dos lançamentos nas contas e percentuais de depreciação";
		bt.addEventListener("click", (e) => {
			let conteudo = this.getValor().efetuarLancamento;
			let contasDepreciacao = this.pai.getComponente("contasDepreciacao").getValor();
			if (conteudo.creditos) {
				let contasEncontradas = contasDepreciacao.filter(alvo => 
					conteudo.creditos.some(filtro => alvo.contaValor == filtro.conta)
				);
				for (let conta of contasEncontradas) {
					let contaOrigem = this.getModuloSistema().localizaConta(conta.contaOrigem);
					let valor = Number(contaOrigem.getComponente("saldo").getValor());
					let perc = Number(conta.taxa) / 100.0;
					valor *= perc;
					let cred = this.getComponente("creditos");
					for (let reg of cred.getListaComponentes()) {
						if (reg.getComponente("conta").getValor() == conta.contaValor) {
							reg.getComponente("valor").setValor(valor.toFixed(2));
						}
					}
				}
			}
		});
		this.elemento.appendChild(bt);
		
		bt = document.createElement("button");
		bt.id = "btCalcularSimples";
		bt.hidden = true;
		bt.textContent = "Simples";
		bt.title = "Calcula valor a a pagar do simples";
		bt.addEventListener("click", (e) => {
			let conteudo = this.getValor().efetuarLancamento;
			let simplesNacional = this.pai.getComponente("simplesNacional").getValor().simplesNacional;
			if (conteudo.creditos) {
				if (conteudo.creditos.some(reg => simplesNacional.contaSimples == reg.conta)) {
					let contaReceita = this.getModuloSistema().localizaConta(simplesNacional.contaReceita);
					let valor = Number(contaReceita.getComponente("saldo").getValor());
					let perc = Number(simplesNacional.aliquotaEfetiva) / 100.0;
					valor *= perc;
					let cred = this.getComponente("creditos");
					for (let reg of cred.getListaComponentes()) {
						if (reg.getComponente("conta").getValor() == simplesNacional.contaSimples) {
							reg.getComponente("valor").setValor(valor.toFixed(2));
						}
					}
				}
			}
		});
		this.elemento.appendChild(bt);

		bt = document.createElement("button");
		bt.textContent = "Limpar";
		bt.addEventListener("click", (e) => {
			this.setSomenteLeitura(false);
			this.limpar();
		});
		this.elemento.appendChild(bt);
	}
	atualizarCombos() {
		let tipos = this.pai.getComponente("tipoLancamentoContabil").getValor();
		this.filtro = {};
		for (let t of tipos) {
			this.filtro[t.descricao] = t;
		}
		let tipo = this.getComponente("tipo");
		tipo.setOpcoes(this.getTipos());
		let filtro = this.filtro[tipo.getValor()];
		this.getComponente("debitos").filtraListaContas(this.pai.listaContasNaoSinteticas, filtro);
		this.getComponente("creditos").filtraListaContas(this.pai.listaContasNaoSinteticas, filtro);
	}
	setValor(valor) {
		this.atualizarCombos();
		super.setValor(valor);
	}
	aoModificar(ultimo) {
		super.aoModificar(this);
		if (ultimo.nome == "creditos") {
			//Verifica se mostra o botão de buscar valores com quantidade
			let creditos = ultimo.getValor();

			let contasQuantidade = this.pai.getComponente("contasRequeremQuantidade").getValor();
			let achou = false;
			for (let credito of creditos) {
				if (contasQuantidade.some(filtro => credito.conta.startsWith(filtro.conta))) {
					achou = true;
				}
			}
			let bt = document.getElementById("btBuscarValorQuantidade");
			if (achou) {
				bt.hidden = false;
			} else {
				bt.hidden = true;
			}
			//Verifica se mostra botão que calcula depreciação
			let contasDepreciacao = this.pai.getComponente("contasDepreciacao").getValor();
			achou = false;
			for (let credito of creditos) {
				if (contasDepreciacao.some(filtro => credito.conta.startsWith(filtro.contaValor))) {
					achou = true;
				}
			}
			bt = document.getElementById("btBuscarValorDepreciacao");
			if (achou) {
				bt.hidden = false;
			} else {
				bt.hidden = true;
			}
			//Verifica se mostra o botão para calcular simples nacional
			let simplesNacional = this.pai.getComponente("simplesNacional").getValor().simplesNacional;
			bt = document.getElementById("btCalcularSimples");
			if (creditos.some(reg => simplesNacional.contaSimples == reg.conta)) {
				bt.hidden = false;
			} else {
				bt.hidden = true;
			}
		}
	}
	validar() {
		let lista = super.validar();
		if (this.vazio()) {
			return lista;
		}
		let conteudo = this.getValor().efetuarLancamento;
		if (lista.length == 0) {
			let data = this.getComponente("data");
			if (new Date(data.getValor()).getTime() > new Date().getTime()) {
				let item = {
					mensagem: "A data do lançamento não pode ser futura",
					componentes: [{componente: data}, {componente: this}],
				}
				lista.push(item);
			}
			let anoFiscal = Number(this.getModuloSistema().getComponente("ano").getValor());
			if (new Date(data.getValor()).getFullYear() != anoFiscal) {
				let item = {
					mensagem: "O ano do lançamento deve ser igual ao ano fiscal registrado",
					componentes: [{componente: data}, {componente: this}],
				}
				lista.push(item);
			}
			let contasQuantidade = this.pai.getComponente("contasRequeremQuantidade").getValor();
			let temAlgumPrefixo = conteudo.debitos.some(alvo => 
				contasQuantidade.some(filtro => alvo.conta.startsWith(filtro.conta))
			);
			temAlgumPrefixo = temAlgumPrefixo || conteudo.creditos.some(alvo => 
				contasQuantidade.some(filtro => alvo.conta.startsWith(filtro.conta))
			);
			if (temAlgumPrefixo) {
				let qtd = this.getComponente("quantidade");
				if (!qtd.getValor()) {
					let item = {
						mensagem: "É necessário especificar a quantidade",
						componentes: [{componente: this}, {componente: qtd}],
					}
					lista.push(item);
				}
			}
			const totalDebito = conteudo.debitos.reduce((sum, item) => sum + Number(item.valor), 0);
			const totalCredito = conteudo.creditos.reduce((sum, item) => sum + Number(item.valor), 0);
			if (totalDebito.toFixed(2) != totalCredito.toFixed(2)) {
				let item = {
					mensagem: "Total de débitos e créditos não batem iguais",
					componentes: [{componente: this}],
				}
				lista.push(item);
			}
		}
		return lista;
	}
	focar() {
		super.focar();
		this.pai.abaLancamentos.alternar("abaEfetuarLancamento");
	}
}
class ContasRequeremQuantidade extends ConjuntoDOM {
	constructor() {
		super(null, "contasRequeremQuantidade", {
			titulo: "Controle de Quantidade",
			somentePrimeiroLabel: true,
			qtdColunas: 1
		});
		this.add(new ComboFiltroDOM(null, "conta", {
			titulo: "Conta", 
		}));
	}
	novo() {
		let n = super.novo();
		if (this.pai) {
			let conta = n.getComponente("conta");
			let listaContas = this.pai.listaContas.filter(lc => lc.value.startsWith("1."));
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
	}
}
class ContasDepreciacao extends FichasDOM {
	constructor() {
		super(null, "contasDepreciacao", {
			titulo: "Cálculo de Depreciação",
			qtdColunas: 10
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
	}
	atualizarCombos() {
		let listaContas = this.pai.listaContas.filter(lc => lc.value.startsWith("1."));
		this.getComponente("contaOrigem").setOpcoes(listaContas);
		this.getComponente("contaValor").setOpcoes(listaContas);
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
			spanV: 2
		}));
		this.add(new ComboFiltroDOM(null, "contaSimples", {
			titulo: "Conta Simples Nacional a Recolher", 
			regras: {obrigatorio: true},
			spanV: 2
		}));
	}
	atualizarCombos() {
		let listaContas = this.pai.listaContas;
		this.getComponente("contaReceita").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.")));
		listaContas = this.pai.listaContasNaoSinteticas;
		this.getComponente("contaSimples").setOpcoes(listaContas.filter(lc => lc.value.startsWith("2.")));
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
class VisualizarLancamentos extends ObjetoDOM {
	constructor(efetuarLancamentoContabil) {
		let elemento = document.getElementById("visualizarLancamentos");
		super(elemento, "visualizarLancamentos", {titulo: "Filtro", qtdColunas: 5});
		this.efetuarLancamentoContabil = efetuarLancamentoContabil;
		this.conta = new ComboFiltroDOM(null, "conta", {
			titulo: "Conta", 
			spanV: 3
		});
		this.add(this.conta);
		this.debitoCredito = new CampoDOM(null, "debitoCredito", {
			titulo: "Tipo", 
			tipo: "select",
			opcoes: [{text: "Débito", value: "D"},{text: "Crédito", value: "C"}]
		});
		this.add(this.debitoCredito);
		this.data = new CampoDOM(null, "data", {
			titulo: "Data", 
			subtipo: "date",
		});
		this.add(this.data);
	}
	init() {
		let bt = document.createElement("button");
		bt.textContent = "Mostrar";
		bt.addEventListener("click", (e) => {
			let listaLancamentos = document.getElementById("listaLancamentos");
			listaLancamentos.innerHTML = "";
			let sistema = this.getModuloSistema();
			if (!sistema.lancamentos) {
				new Modal().mostrar("Visualizar Lançamentos", "Não há lançamentos");
				return;
			}
			let conta = this.conta.getValor();
			let debitoCredito = this.debitoCredito.getValor();
			let data = this.data.getValor();
			let lancamentos = sistema.lancamentos.filter(reg => {
				let sai = true;
				if (conta) {
					if (debitoCredito == "D") {
						if (!reg.debitos.some(d => d.conta.startsWith(conta))) {
							sai = false;
						}
					} else if (debitoCredito == "C") {
						if (!reg.creditos.some(c => c.conta.startsWith(conta))) {
							sai = false;
						}
					} else {
						if (!reg.debitos.some(d => d.conta.startsWith(conta)) && !reg.creditos.some(c => c.conta.startsWith(conta))) {
							sai = false;
						}
					}
				}
				if (data && reg.data != data) {
					sai = false;
				}
				return sai;
			});
			lancamentos.sort((a, b) => {
				return b.data.localeCompare(a.data) || b.timestamp - a.timestamp;
			});
			for (let dados of lancamentos) {
				let f = document.createElement("fieldset");
				listaLancamentos.appendChild(f);
				let data = document.createElement("legend");
				data.textContent = dados.data;
				f.appendChild(data);
				let div = document.createElement("div");
				div.style.display = "grid";
				div.style.gridTemplateColumns = "repeat(6, 1fr)";
				div.style.gap = "5px";
				div.style.marginBottom = "3px";
				f.appendChild(div);
				let label = document.createElement("label");
				label.innerHTML = "<b>Descrição</b><br>" + dados.descricao;
				label.style.gridColumn = "span 3"
				div.appendChild(label);
				if (dados.quantidade) {
					label = document.createElement("label");
					label.innerHTML = "<b>Quantidade</b><br>" + dados.quantidade;
					div.appendChild(label);
				}
				if (dados.tipo) {
					label = document.createElement("label");
					label.innerHTML = "<b>Tipo</b><br>" + dados.tipo;
					label.style.gridColumn = "span 2"
					div.appendChild(label);
				}
				label = document.createElement("label");
				label.innerHTML = "<b>Débitos</b>";
				label.style.gridColumn = "span 6"
				div.appendChild(label);
				let tab = document.createElement("table");
				tab.style.gridColumn = "span 6"
				tab.style.border = "1px solid";
				let r = tab.insertRow();
				let c = r.insertCell();
				c.innerHTML = "<b>Código</b>";
				c = r.insertCell();
				c.innerHTML = "<b>Descrição</b>";
				c = r.insertCell();
				c.innerHTML = "<b>Valor</b>";
				for (let item of dados.debitos) {
					r = tab.insertRow();
					c = r.insertCell();
					c.style.width = "15%";
					c.textContent = item.conta;
					let conta = sistema.localizaConta(item.conta);
					let descricao = conta.getComponente("descricao");
					c = r.insertCell();
					c.style.width = "70%";
					c.textContent = descricao.getValor()
					c = r.insertCell();
					c.textContent = item.valor;
				}
				div.appendChild(tab);
				label = document.createElement("label");
				label.innerHTML = "<b>Créditos</b>";
				label.style.gridColumn = "span 6"
				div.appendChild(label);
				tab = document.createElement("table");
				tab.style.gridColumn = "span 6"
				tab.style.border = "1px solid";
				r = tab.insertRow();
				c = r.insertCell();
				c.innerHTML = "<b>Código</b>";
				c = r.insertCell();
				c.innerHTML = "<b>Descrição</b>";
				c = r.insertCell();
				c.innerHTML = "<b>Valor</b>";
				for (let item of dados.creditos) {
					r = tab.insertRow();
					c = r.insertCell();
					c.style.width = "15%";
					c.textContent = item.conta;
					let conta = sistema.localizaConta(item.conta);
					let descricao = conta.getComponente("descricao");
					c = r.insertCell();
					c.style.width = "70%";
					c.textContent = descricao.getValor()
					c = r.insertCell();
					c.textContent = item.valor;
				}
				div.appendChild(tab);
				let bt = document.createElement("button");
				bt.textContent = "refazer";
				bt.addEventListener("click", (e) => {
					this.efetuarLancamentoContabil.getComponente("descricao").setValor(dados.descricao);
					this.efetuarLancamentoContabil.getComponente("tipo").setValor(dados.tipo);
					this.efetuarLancamentoContabil.getComponente("quantidade").setValor(dados.quantidade);
					let debitos = this.efetuarLancamentoContabil.getComponente("debitos");
					this.efetuarLancamentoContabil.getComponente("debitos").setValor(dados.debitos);
					this.efetuarLancamentoContabil.getComponente("creditos").setValor(dados.creditos);
					this.efetuarLancamentoContabil.focar();
				});
				div.appendChild(bt);
				bt = document.createElement("button");
				bt.textContent = "estornar";
				bt.addEventListener("click", (e) => {
					this.efetuarLancamentoContabil.getComponente("data").setValor(dados.data);
					this.efetuarLancamentoContabil.getComponente("descricao").setValor(dados.descricao);
					this.efetuarLancamentoContabil.getComponente("tipo").setValor("Extorno");
					this.efetuarLancamentoContabil.getComponente("quantidade").setValor(dados.quantidade);
					let debitos = this.efetuarLancamentoContabil.getComponente("debitos");
					this.efetuarLancamentoContabil.getComponente("debitos").setValor(dados.creditos);
					this.efetuarLancamentoContabil.getComponente("creditos").setValor(dados.debitos);
					this.efetuarLancamentoContabil.setSomenteLeitura(true);
					this.efetuarLancamentoContabil.focar();
				});
				div.appendChild(bt);
			}
		});
		this.elemento.appendChild(bt);
	}
	preencherCombos() {
		let listaContas = this.pai.listaContas;
		listaContas.push({value: "5", text: "5 - Apuração de Resultados (AER)"});
		this.conta.setOpcoes(listaContas);
	}
}
class LancamentoContabil extends ObjetoDOM {
	constructor(aba) {
		let elemento = document.getElementById("lancamentos");
		super(elemento, "lancamentoContabil");
		this.aba = aba;
		this.abaLancamentos = new ControleAba(document.getElementById("abaLancamento"));
		this.listaContas = [];
		this.listaContasNaoSinteticas = [];
	}
	init() {
		let tipoLancamentoContabil = new TipoLancamentoContabil(this.abaLancamentos);
		this.add(tipoLancamentoContabil);
		let efetuarLancamentoContabil = new EfetuarLancamentoContabil(this.abaLancamentos);
		this.add(efetuarLancamentoContabil);
		let visualizarLancamentos = new VisualizarLancamentos(efetuarLancamentoContabil);
		this.add(visualizarLancamentos);
		let contasQuantidade = new ContasRequeremQuantidade();
		this.add(contasQuantidade);
		let contasDepreciacao = new ContasDepreciacao();
		this.add(contasDepreciacao);
		let simplesNacional = new SimplesNacional();
		this.add(simplesNacional);
		let sistema = this.getModuloSistema();
		this.abaLancamentos.aoAlterar = (aba) => {
			if (aba == "abaEfetuarLancamento") {
				efetuarLancamentoContabil.atualizarCombos();
			} else if (aba == "abaTipoLancamentoContabil") {
				tipoLancamentoContabil.atualizarCombos();
			} else if (aba == "abaDepreciacao") {
				let e = document.getElementById("depreciacoes");
				e.innerHTML = "";
				let tab = document.createElement("table");
				tab.style.border = "1px solid";
				let r = tab.insertRow();
				r.insertCell().innerHTML = "<b>Código</b>";
				r.insertCell().innerHTML = "<b>Descrição</b>";
				r.insertCell().innerHTML = "<b>Saldo</b>";
				r.insertCell().innerHTML = "<b>Periodiciade</b>";
				r.insertCell().innerHTML = "<b>Taxa (%)</b>";
				r.insertCell().innerHTML = "<b>Depreciação</b>";
				r.insertCell().innerHTML = "<b>Ultima depreciação</b>";
				e.appendChild(tab);
				let lista = contasDepreciacao.getValor();
				let listaContas = sistema.getListaContas();
				for (let reg of lista) {
					let contaOrigem = listaContas.find(lc => lc.codigo == reg.contaOrigem);
					let contaValor = listaContas.find(lc => lc.codigo == reg.contaValor);
					let lancamentosDepreciacao = sistema.getLancamentos(reg.contaValor);
					let maiorLancamento = "";
					if (lancamentosDepreciacao.length > 0) {
						let lanc = lancamentosDepreciacao.reduce((maior, atual) => {
							return atual.lancamento.data > maior.lancamento.data ? atual : maior;
						});
						maiorLancamento = lanc.lancamento.data;
					}
					let r = tab.insertRow();
					r.insertCell().textContent = contaOrigem.codigo;
					r.insertCell().textContent = contaOrigem.descricao;
					r.insertCell().textContent = contaOrigem.saldo;
					r.insertCell().textContent = reg.tipo;
					r.insertCell().textContent = reg.taxa;
					r.insertCell().textContent = contaValor.saldo;
					r.insertCell().textContent = maiorLancamento;
				}
			} else if (aba == "abaListaQuantidade") {
				let e = document.getElementById("listaQuantidade");
				e.innerHTML = "";
				let tab = document.createElement("table");
				tab.style.border = "1px solid";
				let r = tab.insertRow();
				r.insertCell().innerHTML = "<b>Código</b>";
				r.insertCell().innerHTML = "<b>Descrição</b>";
				r.insertCell().innerHTML = "<b>Saldo</b>";
				r.insertCell().innerHTML = "<b>Quantidade</b>";
				e.appendChild(tab);
				let listaContas = sistema.getListaContas().filter(lc => !lc.sintetica);
				let lista = contasQuantidade.getValor();
				for (let reg of lista) {
					let contas = listaContas.filter(lc => lc.codigo.startsWith(reg.conta));
					for (let conta of contas) {
						let listaQuantidade = sistema.getListaQuantidade(conta.codigo);
						conta.qtdDisponivel = listaQuantidade.reduce((soma, reg) => {
							return soma + reg.qtdDisponivel;
						}, 0); 
						if (conta.qtdDisponivel) {
							let r = tab.insertRow();
							r.insertCell().textContent = conta.codigo;
							r.insertCell().textContent = conta.descricao;
							r.insertCell().textContent = conta.saldo;
							r.insertCell().textContent = conta.qtdDisponivel;
						}
					}
				}
			} else if (aba == "abaVisualizarLancamentos") {
				visualizarLancamentos.preencherCombos();
			}
		}
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
	}
	focar() {
		super.focar();
		this.aba.alternar("abaLancamento");
	}
}
async function salvarComJanelaNativa(texto) {
  const opcoes = { types: [{ description: 'Arquivos JSON', accept: { 'application/json': ['.json'] } }] };
  const handle = await window.showSaveFilePicker(opcoes);
  const writable = await handle.createWritable();
  await writable.write(texto);
  await writable.close();
}
async function abrirComJanelaNativa() {
  try {
	const opcoes = {
	  types: [{ description: 'Arquivos JSON', accept: { 'application/json': ['.json'] } }]
	};
	const [handle] = await window.showOpenFilePicker(opcoes);
	const arquivo = await handle.getFile();
	const texto = await arquivo.text();
	return JSON.parse(texto); // Retorna o objeto JSON puro
  } catch (erro) {
	console.error(erro);
	return null;
  }
}

let contabilidade = new ModuloSistemaContabil(document.getElementById("principal"));
console.log("contabilidade", contabilidade);

document.getElementById("salvar").addEventListener("click", async (e) => {
	let conteudo = contabilidade.getValor();
	console.log("conteudo", conteudo);
	let str = JSON.stringify(conteudo);
	salvarComJanelaNativa(str);
});
document.getElementById("abrir").addEventListener("click", async (e) => {
	let obj = await abrirComJanelaNativa();
	console.log("abrir", obj);
	contabilidade.setValor(obj);
});
document.getElementById("validar").addEventListener("click", (e) => {
	let lista = contabilidade.validar();
	if (lista.length == 0) {
		new Modal().mostrar("Validação", "Validação não encontrou erros");
	}
});
document.getElementById("refazerLancamentos").addEventListener("click", (e) => {
	contabilidade.refazerLancamentos();
});
