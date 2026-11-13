import { Modal, ControleAba } from '../util/util.js?vc1.1';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM, CampoTelefone, CampoEMail } from '../util/form.js?vc1.1';
import { Endereco } from '../util/endereco.js?vc1.1';
import { NavigationMenu } from '../util/menu.js?vc1.1';
import { TransformaContas } from '../planoContas/util.js?v0.91';

let ehCelular = window.innerWidth <= 768;

class Contatos extends ConjuntoDOM {
	constructor(aba) {
		super(null, "contatos", {
			titulo: "Contatos",
			somentePrimeiroLabel: true,
			qtdColunas: 5,
			spanV: 10
		});
		this.aba = aba;
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome", 
			spanV: 3,
			regras: {obrigatorio: true},
		}));
		this.add(new CampoTelefone(null, "telefone", {
			titulo: "Telefone", 
		}));
		this.add(new CampoEMail(null, "email", {
			titulo: "E-mail", 
		}));
	}
}
class Sites extends FichasDOM {
	constructor(aba) {
		super(null, "sites", {
			titulo: "Localizações",
			qtdColunas: 10,
			spanV: 4,
			regras: {campoChave: "nome", obrigatorio: true},
			ordem: "nome"
		});
		this.aba = aba;
		this.add(new CampoDOM(null, "nome", {
			titulo: "Descrição", 
			spanV: 7,
			regras: {obrigatorio: true},
		}));
		this.add(new Endereco(null, "endereco", {
			spanV: 10, 
			regras: {obrigatorio: true}
		}));
		this.add(new Contatos());
		this.add(new CampoDOM(null, "observacoes", {
			titulo: "Observações", 
			spanV: 10,
			atributos: {rows: 5},
			tipo: "textarea"
		}));
	}
	focar() {
		super.focar();
		this.aba.alternar("abaClientes");
	}
}
class TipoBem extends ComboFiltroDOM {
	/* Para máquinas:
	• 1 Turno (8h): Coeficiente 1,0 (taxa normal da tabela)
	• 2 Turnos (16h): Coeficiente 1,5 (ex: uma máquina de 10% passa a depreciar 15% ao ano)
	• 3 Turnos (24h): Coeficiente 2,0 (ex: uma máquina de 10% passa a depreciar 20% ao ano)
	*/
	constructor(vidaUtilFiscal) {
		let categorias = [
			{cod: 1, nome: "Edificações e Construções", vidaUtilEstimada: 25},
			{cod: 2, nome: "Instalações", vidaUtilEstimada: 10},
			{cod: 3, nome: "Móveis e Utensílios", vidaUtilEstimada: 10},
			{cod: 4, nome: "Máquinas e Equipamentos", vidaUtilEstimada: 10},
			{cod: 5, nome: "Máquinas e Equipamentosd da Indústria Química", vidaUtilEstimada: 5},
			{cod: 6, nome: "Forno para Indústria de Vidro", vidaUtilEstimada: 3},
			{cod: 7, nome: "Equipamentos de Telefonia e Redes", vidaUtilEstimada: 5},
			{cod: 8, nome: "Ferramentas", vidaUtilEstimada: 5},
			{cod: 9, nome: "Instrumento de precisão", vidaUtilEstimada: 10},
			{cod: 10, nome: "Automóveis de Passageiros", vidaUtilEstimada: 5},
			{cod: 11, nome: "Caminhões e Tratores", vidaUtilEstimada: 4},
			{cod: 12, nome: "Ônibus", vidaUtilEstimada: 4},
			{cod: 13, nome: "Aeronave", vidaUtilEstimada: 10},
			{cod: 14, nome: "Embarcação", vidaUtilEstimada: 20},
			{cod: 15, nome: "Motocicletas", vidaUtilEstimada: 4},
			{cod: 16, nome: "Computadores e Periféricos", vidaUtilEstimada: 5},
			{cod: 17, nome: "Softwares ", vidaUtilEstimada: 5},
			{cod: 18, nome: "Animais de trabalho ou produção (Bovinos e Suínos)", vidaUtilEstimada: 5},
			{cod: 19, nome: "Aves domésticas", vidaUtilEstimada: 2},
			{cod: 20, nome: "Terreno"},
			{cod: 100, nome: "Outro ", vidaUtilEstimada: null},
		];
		let opCategorias = categorias.map(({ cod, nome }) => ({
			value: cod,
			text: nome,
		}));
		super(null, "tipoBem", {
			titulo: "Tipo",
			tipo: "select",
			regras: {obrigatorio: true},
			opcoes: opCategorias,
		});
		this.vidaUtilFiscal = vidaUtilFiscal;
		this.categorias = categorias;
	}
	aoModificar(comp) {
		super.aoModificar(comp);
		if (this.vidaUtilFiscal) {
			let valor = this.getValor();
			let categoria = this.categorias.find(c => c.cod == valor);
			if (categoria && categoria.vidaUtilEstimada) {
				this.vidaUtilFiscal.setValor(categoria.vidaUtilEstimada);
			}
		}
	}
}
class Bens extends FichasDOM {
	constructor(aba, sites) {
		let elemento = document.getElementById("bens");
		super(elemento, "bens", {
			qtdColunas: 4,
			regras: {campoChave: "nome", obrigatorio: true}
		});
		this.aba = aba;
		this.sites = sites;
		this.add(new CampoDOM(null, "codigo", {
			titulo: "Código", 
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "nome", {
			titulo: "Descrição", 
			spanV: 2,
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "site", {
			titulo: "Localização", 
			tipo: "select",
			regras: {obrigatorio: true},
		}));
		let vidaUtilFiscal = new CampoDOM(null, "vidaUtilFiscal", {
			titulo: "Vida útil fiscal (anos)", 
			subtipo: "number",
			regras: {obrigatorio: true},
		});
		this.add(new TipoBem(vidaUtilFiscal));
		this.add(vidaUtilFiscal);
		this.add(new CampoDOM(null, "vidaUtilContabil", {
			titulo: "Vida útil real (anos)", 
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "valorResidual", {
			titulo: "Valor residual (R$)", 
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "dataAquisicao", {
			titulo: "Data da aquisição", 
			subtipo: "date",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "valorAquisicao", {
			titulo: "Valor de compra (R$)", 
			subtipo: "number",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "valorMercado", {
			titulo: "Valor de mercado (R$)", 
			subtipo: "number",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "indRemovido", {
			titulo: "Removido?", 
			subtipo: "checkbox",
		}));
		this.add(new CampoDOM(null, "indComprado", {
			titulo: "Comprado?", 
			subtipo: "checkbox",
		}).setVisibilidade(false));
		this.add(new ComboFiltroDOM(null, "contaAtivo", {
			titulo: "Conta associada",
			spanV: 2,
			regras: {obrigatorio: true},
		}));
		this.add(new ComboFiltroDOM(null, "ncm", {
			titulo: "NCM",
			spanV: 2,
		}));
		this.add(new CampoDOM(null, "observacoes", {
			titulo: "Observações", 
			spanV: 4,
			atributos: {rows: 5},
			tipo: "textarea",
		}));
	}
	focar() {
		super.focar();
		this.aba.alternar("abaBens");
	}
	preencherCombos(listaContas) {
		let sites = this.sites.getValor();
		let opSites = sites.map(({ nome }) => ({
			text: nome,
		}));
		this.getComponente("site").setOpcoes(opSites);
		if (listaContas) {
			let contasAtivo = listaContas.filter(item => item.codigo.startsWith("1.") && !item.sintetica).map(({ codigo, descricao }) => ({
				text: codigo + " - " + descricao,
				value: codigo
			}));
			this.getComponente("contaAtivo").setOpcoes(contasAtivo);
		}
	}
	setValor(valor) {
		this.preencherCombos();
		super.setValor(valor);
	}
	async carregarDados() {
		if (!this.carregandoDados) {
			try {
				this.carregandoDados = true;
				let obj = await (await fetch("../produtos/dados/ncms.json?vd1")).json();
				let opcoes = obj.Nomenclaturas.filter(n => n.Codigo?.length === 10).map(n => ({ value: n.Codigo, text: `${n.Codigo} - ${n.Descricao}` }));
				//console.log("opcoes", opcoes);
				this.getComponente("ncm").setOpcoes(opcoes);
			} catch(erro) {
				console.error('Erro ao ler ncms.json:', erro);
			}
		}		
		super.carregarDados();
	}
}
class Itens extends ConjuntoDOM {
	constructor() {
		super(null, "itens", {
			somentePrimeiroLabel: true,
			tipo: "div",
			qtdColunas: 4,
			spanV: 6,
			regras: {campoChave: "bem"}
		});
		this.add(new ComboFiltroDOM(null, "bem", {
			titulo: "Bem relativo",
			spanV: 3,
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "valor", {
			titulo: "Valor (R$)", 
			subtipo: "number",
			regras: {obrigatorio: true},
		}));
	}
	aoModificar(item) {
		super.aoModificar(item);
		if (this.opcoesBens) {
			this.pai.aoModificarBem(item);
		}
	}
	preencherCombos(opcoes) {
		this.opcoesBens = opcoes;
		for (let item of this.componentes) {
			if (!item.modelo) {
				item.getComponente("bem").setOpcoes(opcoes);
			}
		}
	}
	novo() {
		let item = super.novo();
		item.getComponente("bem").setOpcoes(this.opcoesBens);
		return item;
	}
}
class CompraBens extends FichasDOM {
	constructor(aba, bens) {
		let elemento = document.getElementById("compras");
		super(elemento, "compras", {
			qtdColunas: 5,
			ordem: "data",
			ordemDesc: true,
		});
		this.aba = aba;
		this.bens = bens;
		this.add(new CampoDOM(null, "data", {
			titulo: "Data", 
			subtipo: "date",
			regras: {obrigatorio: true},
		}));
		this.add(new ComboFiltroDOM(null, "fornecedor", {
			titulo: "Fornecedor",
			spanV: 3,
			regras: {obrigatorio: true},
		}));
		this.add(new CampoArquivo(null, "notaFiscal", {
			titulo: "Nota fiscal", 
			regras: {obrigatorio: true},
		}));
		this.add(new Itens());
	}
	init() {
		this.bts = document.createElement("div");
		this.bts.hidden = true;
		this.bts.style = "grid-column: span 5; padding-left: 20px; padding-top: 20px";
		this.elemento.insertBefore(this.bts, this.elemento.lastElementChild);	
		let bt = document.createElement("button");
		bt.className = "btn btn-plus";
		bt.textContent = "Efetuar compra";
		this.bts.appendChild(bt);
		bt.addEventListener("click", async (e) => {
			let lista = this.validar();
			if (this.vazio(true)) {
				new Modal().mostrar("Gerar compra", "Os campos estão vazios");
			} else {
				if (lista.length == 0) {
					let nome = "Compra de " + this.getComponente("data").getValor() + ".json";
					this.getModuloSistema().salvarComJanelaNativa(compra, nome);
				} else {
					this.mostrarValidacao(lista, this.aba);
				new Modal().mostrar("Gerar compra", "Há erros que devem ser corrigidos antes de gerar a compra");
				}
			}
		});
	}
	focar() {
		super.focar();
		this.aba.alternar("abaCompras");
	}
	preencherCombos() {
		let bens = this.bens.getValor();
		let opcoes = bens.map(({ codigo, nome }) => ({
			value: codigo,
			text: codigo + "/" + nome,
		}));
		this.getComponente("itens").preencherCombos(opcoes);
		let fornecedores =  this.getModuloSistema().clientes?.sistemaClientes?.fornecedores;
		if (fornecedores) {
			let opCli = fornecedores.map(({ identificacao, nome }) => ({
				value: identificacao.tipo + identificacao.documento,
				text: nome,
			}));
			this.getComponente("cliente").setOpcoes(opCli);
		}
	}
	aoModificarBem(item) {
		// Verifica se foi removido ou já comprado e coloca o valor de aquisição para a compra
		let bem = item.getComponente("bem");
		let valor = bem.getValor();
		if (valor) {
			let bens = this.bens.getValor();
			let reg = bens.find(b => b.codigo == valor);
			if (reg) {
				if (reg.indRemovido) {
					bem.limpar();
					throw new Error("Item já foi removido");
				}
				if (reg.indComprado) {
					bem.limpar();
					throw new Error("Item já foi comprado");
				}
				if (reg.valorAquisicao) {
					item.getComponente("valor").setValor(reg.valorAquisicao);
				}
			}
			this.bts.hidden = false;
		}
	}
}
class VendaBens extends FichasDOM {
	constructor(aba, bens) {
		let elemento = document.getElementById("vendas");
		super(elemento, "vendas", {
			qtdColunas: 5,
			ordem: "data",
			ordemDesc: true,
		});
		this.aba = aba;
		this.bens = bens;
		this.add(new CampoDOM(null, "data", {
			titulo: "Data", 
			subtipo: "date",
			regras: {obrigatorio: true},
		}));
		this.add(new ComboFiltroDOM(null, "cliente", {
			titulo: "Cliente",
			spanV: 3,
			regras: {obrigatorio: true},
		}));
		this.add(new CampoArquivo(null, "notaFiscal", {
			titulo: "Nota fiscal", 
		}));
		this.add(new Itens());
	}
	focar() {
		super.focar();
		this.aba.alternar("abaVendas");
	}
	preencherCombos() {
		let bens = this.bens.getValor().filter(b => !b.indRemovido && b.indComprado);
		let opcoes = bens.map(({ codigo, nome }) => ({
			value: codigo,
			text: codigo + "/" + nome,
		}));
		this.getComponente("itens").preencherCombos(opcoes);
		let clientes =  this.getModuloSistema().clientes?.sistemaClientes?.clientes;
		if (clientes) {
			let opCli = clientes.map(({ identificacao, nome }) => ({
				value: identificacao.tipo + identificacao.documento,
				text: nome,
			}));
			this.getComponente("cliente").setOpcoes(opCli);
		}
	}
	aoModificarBem(item) {
		console.log("aoModificarBem", item);
	}
}
class ModuloPatrimonial extends ModuloSistemaDOM {
	constructor() {
		let elemento = document.getElementById("modulo_patrimonial");
		super(elemento, "sistemaPatrimonial", {
			qtdColunas: 4,
			regras: {obrigatorio: true}
		});
		this.aba = new ControleAba(document.body);
		let sites = new Sites(this.aba);
		this.add(sites);
		let bens = new Bens(this.aba, sites);
		this.add(bens);
		this.add(new CompraBens(this.aba, bens));
		this.add(new VendaBens(this.aba, bens));
		this.aba.aoAlterar = (aba) => {
			if (aba == "abaCompras") {
				this.getComponente("compras").preencherCombos();
			}
			if (aba == "abaVendas") {
				this.getComponente("vendas").preencherCombos();
			}
		}
	}
	focar() {
		super.focar();
		this.aba.alternar("abaPatrimonial");
	}
	setContas(contas) {
		let lista = new TransformaContas().getLista(contas);
		this.preencherCombos(lista);
	}
	setClientes(clientes) {
		this.clientes = clientes;
	}
	preencherCombos(listaContas) {
		this.getComponente("bens").preencherCombos(listaContas);
	}
}

let patrimonial = new ModuloPatrimonial();
await patrimonial.carregarDados();
const parametros = new URLSearchParams(window.location.search);
async function carregarPlanoContas(nome) {
	let arq = "../planoContas/dados/" + nome + "?vd1";
	await fetch(arq)
		.then(resposta => resposta.json())
		.then(obj => {
			patrimonial.setContas(obj);
		}).catch(erro => console.error('Erro ao ler o JSON:', erro)
	);
}
async function carregarClientes(nome) {
	let arq = "../clientes/dados/" + nome + "?vd1";
	await fetch(arq)
		.then(resposta => resposta.json())
		.then(obj => {
			patrimonial.setClientes(obj);
		}).catch(erro => console.error('Erro ao ler o JSON:', erro)
	);
}
if (parametros.get("contas")) {
	await carregarPlanoContas(parametros.get("contas"));
}
if (parametros.get("patrimonial")) {
	let arq = "dados/" + parametros.get("patrimonial") + "?v0.91";
	patrimonial.carregar(arq);
}
if (parametros.get("clientes")) {
	carregarClientes(parametros.get("clientes"));
}
async function executaAcao(linkDestino) {
	let versao = "?v0.91";
	if (linkDestino === "#abrir") {
		patrimonial.abrirArquivo();
	} else if (linkDestino === "#salvar") {
		patrimonial.salvarArquivo("patrimonial.json");
	} else if (linkDestino === "#novo") {
		patrimonial.novo();
	} else if (linkDestino === "#validar") {
		let lista = patrimonial.validar();
		patrimonial.mostrarValidacao(lista, patrimonial.aba);
	} else if (linkDestino === "#planoContas") {
		let obj = await patrimonial.abrirComJanelaNativa();
		patrimonial.setContas(obj);
	} else if (linkDestino === "#clientes") {
		let obj = await patrimonial.abrirComJanelaNativa();
		patrimonial.setClientes(obj);
	} else if (linkDestino === "#ajuda") {
		//patrimonial.mostrarAjuda("ajuda.html", "Contabilidade Simples em Javascript", versao);
	} else if (linkDestino === "#sobre") {
		patrimonial.sobre("Contabilidade Simples em Javascript", "Módulo Patrimonial do Sistema contábil para treinamento e para uso em pequenas empresas.<br>Em desenvolvimento por Myrko I. da Graça", versao);
	}
}
async function acaoAoClicar(event, elementoClicado) {
	const textoDoLink = elementoClicado.textContent;
	const linkDestino = elementoClicado.getAttribute('href');
	console.log(`Você clicou no menu: ${textoDoLink} que aponta para: ${linkDestino}`);
	executaAcao(linkDestino);
}
const meuMenu = new NavigationMenu(
  'nav', 
  'btn-mobile', 
  '.dropdown-toggle', 
  '.dropdown-item', 
  acaoAoClicar
);
document.body.hidden = false;
