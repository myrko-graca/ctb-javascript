import { Modal, ControleAba } from './util/util.js?v6';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?v6';
import { NavigationMenu } from './util/menu.js?v6';
import { ParametrizacaoCTB } from './parametrizacao.js?v6';
import { LancamentoContabil } from './lancamentoContabil.js?v6';

let ehCelular = window.innerWidth <= 768;
console.log("Sistema de contabilidade desenvolvido por Myrko I. da Graça");

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
	setValor(valor, forcado) {
		//Se for o primeiro nível, não pode mudar o código nem se é Sintética
		if (this.pai.getTipo() == "modulo" && !forcado) {
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
		let valor = {};
		if (this.pai.getTipo() == "modulo") {
			valor.codigo = this.getComponente("codigo").getValor();
			valor.sintetica = this.getComponente("sintetica").getValor();
			valor.descricao = this.getComponente("descricao").getValor();
		}
		super.limpar();
		if (this.pai.getTipo() == "modulo") {
			this.setValor(valor, true);
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
		let corOriginal = document.querySelector(".header").style.backgroundColor;
		iconeSpan.addEventListener("click", (e) => {
			event.stopPropagation();
			const estaExpandido = this.elemento.classList.toggle("tela-cheia");
			if (estaExpandido) {
				let desc = this.pai.getComponente("descricao").getValor();
				legenda.textContent = descLegenda + " (" + desc + ")";
				iconeSpan.title = "Clique para reduzir";
				document.querySelector(".header").style.backgroundColor = "white";
			} else {
				legenda.textContent = descLegenda;
				iconeSpan.title = "Clique para expandir";
				document.querySelector(".header").style.backgroundColor = corOriginal;
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
	setValor(valor, forcado) {
		this.preencherCombos();
		super.setValor(valor, forcado);
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
		this.add(new ParametrizacaoCTB(this.aba));
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
			} else if (aba == "abaParametrizacao") {
				let parametrizacao = this.getComponente("parametrizacao");
				let listaContas = this.getListaContas();
				parametrizacao.setListaContas(listaContas);
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
		if (lancamento.debitos.find(d => !d.valor)) {
			throw new Error("É necessário definir valor para todos os débitos");
		}
		if (lancamento.creditos.find(c => !c.valor)) {
			throw new Error("É necessário definir valor para todos os créditos");
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
document.body.hidden = false;
console.log("contabilidade", contabilidade);

async function executaAcao(linkDestino) {
	if (linkDestino === "#abrir") {
		let obj = await abrirComJanelaNativa();
		console.log("abrir", obj);
		contabilidade.setValor(obj);
	} else if (linkDestino === "#salvar") {
		let conteudo = contabilidade.getValor();
		console.log("conteudo", conteudo);
		let str = JSON.stringify(conteudo);
		salvarComJanelaNativa(str);
	} else if (linkDestino === "#novo") {
		if (confirm("Confirma apagar os dados e gerar um novo plano de contas?")) {
			contabilidade.limpar();
		}
	} else if (linkDestino === "#contas.json") {
		fetch("dados/contas.json?v6")
			.then(resposta => resposta.json())
			.then(obj => {
				console.log(obj);
				contabilidade.setValor(obj);
			}).catch(erro => console.error('Erro ao ler o JSON:', erro)
		);
	} else if (linkDestino === "#validar") {
		let lista = contabilidade.validar();
		if (lista.length == 0) {
			new Modal().mostrar("Validação", "Validação não encontrou erros");
		}
	} else if (linkDestino === "#refazerLancamentos") {
		contabilidade.refazerLancamentos();
	} else if (linkDestino === "#consolidarAno") {
		consolidarAno();
	} else if (linkDestino === "#ajuda") {
		fetch("ajuda.html?v6")
			.then(resposta => resposta.text())
			.then(html => {
				const parser = new DOMParser();
				const doc = parser.parseFromString(html, 'text/html');
				let textoAjuda = doc.body.innerHTML;
				textoAjuda += "<br><a href='ajuda.html' target='_blank'>Abrir ajuda em outra janela</a>";
				new Modal().mostrar("Ajuda da Contabilidade Simples em Javascript", textoAjuda); 
			}).catch(erro => console.error('Erro ao ler o help:', erro)
		);
	} else if (linkDestino === "#sobre") {
		new Modal().mostrar("Contabilidade Simples", "Sistema contábil para treinamento e para uso em pequenas empresas.<br>Em desenvolvimento por Myrko I. da Graça"); 
	}
}
const hash = window.location.hash;
if (hash) {
	executaAcao(hash);
}
async function acaoAoClicar(event, elementoClicado) {
	const textoDoLink = elementoClicado.textContent;
	const linkDestino = elementoClicado.getAttribute('href');
	console.log(`Você clicou no menu: ${textoDoLink} que aponta para: ${linkDestino}`);
	executaAcao(linkDestino);
}
function consolidarAno() {
	let ano = new Date().getFullYear() - 1;
	//TODO: ao consolidar as contas que requerem quantidade, observar as quantidades para não perder o valor de aquisição
	if (confirm("Confirma a consolidação até o ano de " + ano + "?  Lembre de salvar os dados atuais com outro nome antes de efetivar a consolidação dos lançamentos.")) {
		new Modal().mostrar("Consolidar Ano", "Em elaboração");
	}
}
const meuMenu = new NavigationMenu(
  'nav', 
  'btn-mobile', 
  '.dropdown-toggle', 
  '.dropdown-item', 
  acaoAoClicar
);
