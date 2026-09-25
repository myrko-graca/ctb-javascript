import { Modal, ControleAba } from './util/util.js?v0.7';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?v0.7';
import { NavigationMenu } from './util/menu.js?v0.7';
import { ParametrizacaoCTB } from './parametrizacao.js?v0.7';
import { LancamentoContabil } from './lancamentoContabil.js?v0.7';
import { Ativos, Passivos, Receitas, Despesas, ApuracaoResultado } from './contas.js?v0.7';

console.log("Sistema de contabilidade desenvolvido por Myrko I. da Graça");

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
		this.add(new CampoDOM(null, "endereco", {
			titulo: "Endereço", 
			spanV: 7, 
			regras: {obrigatorio: true}
		}));
		this.add(new ComboFiltroDOM(null, "cidadeEstado", {
			titulo: "Cidade/Estado", 
			spanV: 3, 
			regras: {obrigatorio: true}
		}));
		this.add(new ComboFiltroDOM(null, "cnaePrincipal", {
			titulo: "CNAE Principal", 
			spanV: 5, 
			regras: {obrigatorio: true}
		}));
		this.add(new ComboFiltroDOM(null, "cnaeSecundario", {
			titulo: "CNAE Secundário", 
			spanV: 5, 
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
	async carregarDados() {
		super.carregarDados();
		if (!this.carregandoDados) {
			try {
				this.carregandoDados = true;
				let res = await fetch("dados/estados-cidades.json");
				let obj = await res.json();
				let opcoes = [];
				for (let estado of obj.estados) {
					for (let cidade of estado.cidades) {
						opcoes.push({text: cidade + "/" + estado.sigla});
					}
				}
				this.getComponente("cidadeEstado").setOpcoes(opcoes);
			} catch(erro) {
				console.error('Erro ao ler estados-cidades.json:', erro);
			}
			try {
				this.carregandoDados = true;
				let res = await fetch("dados/cnae.json");
				let obj = await res.json();
				let opcoes = [];
				for (let key in obj) {
					opcoes.push({value: key, text: key + " - " + obj[key]});
				}
				this.getComponente("cnaePrincipal").setOpcoes(opcoes);
				this.getComponente("cnaeSecundario").setOpcoes(opcoes);
			} catch(erro) {
				console.error('Erro ao ler cnae.json:', erro);
			}
		}
	}
	async novo() {
		this.limpar();
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
await contabilidade.carregarDados();
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
			contabilidade.novo();
		}
	} else if (linkDestino === "#contas.json") {
		fetch("dados/contas.json?v0.7")
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
		fetch("ajuda.html?v0.7")
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
		let versao = "?v0.7";
		new Modal().mostrar("Contabilidade Simples (versão " + versao.replace("?v", "") + ")", "Sistema contábil para treinamento e para uso em pequenas empresas.<br>Em desenvolvimento por Myrko I. da Graça"); 
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
