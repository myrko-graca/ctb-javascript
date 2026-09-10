import { Modal, ControleAba } from './util/util.js?v6';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?v6';

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
		super(elemento, "tipoLancamentoContabil", {
			titulo: "Tipos de Lançamentos", 
			qtdColunas: 10, 
			spanV: 2,
			regras: {campoChave: "descricao"},
			ordem: "descricao"
		});
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

			let contasQuantidade = this.getModuloSistema().getComponente("parametrizacao").getComponente("contasRequeremQuantidade").getValor();
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
			let contasDepreciacao = this.getModuloSistema().getComponente("parametrizacao").getComponente("contasDepreciacao").getValor();
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
			let simplesNacional = this.getModuloSistema().getComponente("parametrizacao").getComponente("simplesNacional").getValor().simplesNacional;
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
export class LancamentoContabil extends ObjetoDOM {
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
				let lista = sistema.getComponente("parametrizacao").getComponente("contasDepreciacao").getValor();
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
				let lista = sistema.getComponente("parametrizacao").getComponente("contasRequeremQuantidade").getValor();
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
	}
	focar() {
		super.focar();
		this.aba.alternar("abaLancamento");
	}
}
