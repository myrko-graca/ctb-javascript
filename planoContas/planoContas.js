import { Modal, ControleAba } from '../util/util.js?vc1.1';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from '../util/form.js?vc1.1';
import { Endereco } from '../util/endereco.js?vc1.1';
import { NavigationMenu } from '../util/menu.js?vc1.1';
import { ParametrizacaoCTB } from './parametrizacao.js?v0.91';
import { LancamentoContabil } from './lancamentoContabil.js?v0.91';
import { Ativos, Passivos, Receitas, Despesas, ApuracaoResultado } from './contas.js?v0.91';

console.log("Sistema de contabilidade desenvolvido por Myrko I. da Graça");

class CnaeSecundario extends ConjuntoDOM {
	constructor() {
		super(null, "cnaeSecundario", {
			titulo: "CNAE Secundário", 
			spanV: 6,
			somentePrimeiroLabel: true,
			qtdColunas: 1,
		});
		this.add(new ComboFiltroDOM(null, "codigo", {
			titulo: "Código", 
			regras: {obrigatorio: true}
		}));
	}
	setOpcoesCnae(opcoes) {
		this.opcoes = opcoes;
		for (let item of this.componentes) {
			if (!item.modelo) {
				item.getComponente("codigo").setOpcoes(this.opcoes);
			}
		}
	}
	novo() {
		let n = super.novo();
		n.getComponente("codigo").setOpcoes(this.opcoes);
		return n;
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
		this.add(new Endereco(null, "endereco", {
			spanV: 10, 
			regras: {obrigatorio: true}
		}));
		this.add(new ComboFiltroDOM(null, "cnaePrincipal", {
			titulo: "CNAE Principal", 
			spanV: 6, 
			regras: {obrigatorio: true}
		}));
		let cnaeSecundario = new CnaeSecundario();
		this.add(cnaeSecundario);
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
	async carregarDados() {
		super.carregarDados();
		if (!this.carregandoDados) {
			try {
				this.carregandoDados = true;
				let res = await fetch("dados/cnae.json");
				let obj = await res.json();
				let opcoes = [];
				for (let key in obj) {
					opcoes.push({value: key, text: key + " - " + obj[key]});
				}
				this.getComponente("cnaePrincipal").setOpcoes(opcoes);
				this.getComponente("cnaeSecundario").setOpcoesCnae(opcoes);
			} catch(erro) {
				console.error('Erro ao ler cnae.json:', erro);
			}
		}
	}
	async setValor(valor) {
		await this.carregarDados();
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
		this.haModificacoesLancamentos = true;
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
	setLancamentos(lancamentos) {
		this.lancamentos = lancamentos;
	}
}
let contabilidade = new ModuloSistemaContabil(document.getElementById("principal"));
await contabilidade.carregarDados();
document.body.hidden = false;
console.log("contabilidade", contabilidade);

const parametros = new URLSearchParams(window.location.search);
if (parametros.get("contas")) {
	let arq = "dados/" + parametros.get("contas") + "?v0.91";
	await contabilidade.carregar(arq);
	if (parametros.get("lancamentos")) {
		let arq = "dados/" + parametros.get("lancamentos") + "?v0.91";
		fetch(arq)
			.then(resposta => resposta.json())
			.then(obj => {
				console.log(obj);
				contabilidade.setLancamentos(obj);
			}).catch(erro => console.error('Erro ao ler o JSON:', erro)
		);
	}
}
async function executaAcao(linkDestino) {
	let versao = "?v0.91";
	if (linkDestino === "#abrir") {
		contabilidade.abrirArquivo();
	} else if (linkDestino === "#salvar") {
		contabilidade.salvarArquivo();
	} else if (linkDestino === "#novo") {
		contabilidade.novo();
	} else if (linkDestino === "#incluirLancamentos") {
		let obj = await contabilidade.abrirComJanelaNativa();
		for (let lancamento of obj) {
			contabilidade.efetuarLancamento(lancamento);
		}
	} else if (linkDestino === "#salvarLancamentos") {
		let obj = contabilidade.lancamentos;
		let str = JSON.stringify(obj);
		await contabilidade.salvarComJanelaNativa(str);
		contabilidade.haModificacoesLancamentos = false;
	} else if (linkDestino === "#carregarLancamentos") {
		let obj = await contabilidade.abrirComJanelaNativa();
		contabilidade.setLancamentos(obj);
		contabilidade.refazerLancamentos();
		contabilidade.haModificacoesLancamentos = false;
	} else if (linkDestino === "#contas.json") {
		contabilidade.carregar("dados/contas.json" + versao);
	} else if (linkDestino === "#validar") {
		contabilidade.validar(contabilidade.aba);
	} else if (linkDestino === "#consolidarAno") {
		consolidarAno();
	} else if (linkDestino === "#ajuda") {
		contabilidade.mostrarAjuda("ajuda.html", "Contabilidade Simples em Javascript", versao);
	} else if (linkDestino === "#sobre") {
		contabilidade.sobre("Contabilidade Simples em Javascript", "Sistema contábil para treinamento e para uso em pequenas empresas.<br>Em desenvolvimento por Myrko I. da Graça", versao);
	}
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
