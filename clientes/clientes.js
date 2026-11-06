import { Modal, ControleAba } from '../util/util.js?vc1.1';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM, CampoTelefone, CampoEMail } from '../util/form.js?vc1.1';
import { Endereco } from '../util/endereco.js?vc1.1';
import { NavigationMenu } from '../util/menu.js?vc1.1';


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
class Clientes extends FichasDOM {
	constructor(aba) {
		super(null, "clientes", {
			titulo: "Clientes",
			qtdColunas: 10,
			spanV: 4,
			regras: {campoChave: "identificacao"},
			ordem: "nome"
		});
		this.aba = aba;
		this.add(new CNPJCPF(null, "identificacao", {
			titulo: "Identificação",
			spanV: 3,
			regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome", 
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
class FiltroClientes extends ObjetoDOM {
	constructor() {
		super(null, "filtro", {
			titulo: "Filtro",
			qtdColunas: 3,
			spanV: 4
		});
		this.add(new CampoDOM(null, "nome", {
			titulo: "Por Nome", 
			calculado: true,
		}));
		this.add(new CampoDOM(null, "cidade", {
			titulo: "Por Cidade/Estado", 
			calculado: true,
		}));
		this.add(new CampoDOM(null, "observacoes", {
			titulo: "Por Observações", 
			calculado: true,
		}));
	}
	setClientes(clientes) {
		this.clientes = clientes;
	}
	aoModificar(comp) {
		let filtro = {}
		let nome = this.getComponente("nome").getValor();
		if (nome) {
			filtro.nome =  nome;
		}
		let cidade = this.getComponente("cidade").getValor();
		if (cidade) {
			filtro.endereco = {cidadeEstado: cidade};
		}
		let observacoes = this.getComponente("observacoes").getValor();
		if (observacoes) {
			filtro.endereco = {observacoes: observacoes};
		}
		this.clientes.filtrar(filtro);
	}
}
class Fornecedores extends FichasDOM {
	constructor(aba) {
		super(document.getElementById("fornecedores"), "fornecedores", {
			titulo: "Fornecedores",
			qtdColunas: 10,
			spanV: 4,
			regras: {campoChave: "identificacao"},
			ordem: "nome"
		});
		this.aba = aba;
		this.add(new CNPJCPF(null, "identificacao", {
			titulo: "Identificação",
			spanV: 3,
			regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome", 
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
		this.aba.alternar("abaFornecedores");
	}
}
class Avaliacoes extends FichasDOM {
	constructor(aba, clientes) {
		let elemento = document.getElementById("avaliacoes");
		super(elemento, "avaliacoes", {
			qtdColunas: 5,
			ordem: "data",
			ordemDesc: true,
		});
		this.aba = aba;
		this.clientes = clientes;
		this.add(new CampoDOM(null, "data", {
			titulo: "Data", 
			subtipo: "date",
			regras: {obrigatorio: true},
		}));
		this.add(new ComboFiltroDOM(null, "cliente", {
			titulo: "Cliente", 
			regras: {obrigatorio: true},
			spanV: 3,
		}));
		this.add(new CampoDOM(null, "nota", {
			titulo: "Nota", 
			tipo: "select",
			opcoes: [
				{value: 1, text: "Muito insatisfeito"},
				{value: 2, text: "Insatisfeito"},
				{value: 3, text: "Indiferente"},
				{value: 4, text: "Satisfeito"},
				{value: 5, text: "Muito satisfeito"},
			],
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "observacoes", {
			titulo: "Observações", 
			tipo: "textarea",
			spanV: 5,
			atributos: {rows: 4}
		}));
	}
	focar() {
		super.focar();
		this.aba.alternar("abaAvaliacoes");
	}
	preencherCombos() {
		let clientes = this.clientes.getValor();
		let opClientes = clientes.map(({ identificacao, nome }) => ({
			text: nome,
			value: identificacao.tipo + ":" + identificacao.documento
		}));
		this.getComponente("cliente").setOpcoes(opClientes);
	}
	setValor(valor) {
		this.preencherCombos();
		super.setValor(valor);
	}
}
class ModuloClientes extends ModuloSistemaDOM {
	constructor() {
		let elemento = document.getElementById("modulo_clientes");
		super(elemento, "sistemaClientes", {
			qtdColunas: 4,
			regras: {obrigatorio: true}
		});
		this.aba = new ControleAba(document.body);
		this.add(new FiltroClientes());
		let clientes = new Clientes(this.aba);
		this.add(clientes);
		this.getComponente("filtro").setClientes(clientes);
		this.add(new Fornecedores(this.aba));
		this.add(new Avaliacoes(this.aba, clientes));
		this.aba.aoAlterar = (aba) => {
			if (aba == "abaAvaliacoes") {
				this.getComponente("avaliacoes").preencherCombos();
			}
		}
	}
	focar() {
		super.focar();
		this.aba.alternar("abaClientes");
	}
}

let clientes = new ModuloClientes(document.getElementById("clientes"));
await clientes.carregarDados();
document.body.hidden = false;
const parametros = new URLSearchParams(window.location.search);
if (parametros.get("clientes")) {
	let arq = "dados/" + parametros.get("clientes") + "?v0.91";
	await clientes.carregar(arq);
	console.log("clientes");
}

async function executaAcao(linkDestino) {
	let versao = "?v0.91";
	if (linkDestino === "#abrir") {
		clientes.abrirArquivo();
	} else if (linkDestino === "#salvar") {
		clientes.salvarArquivo("clientes.json");
	} else if (linkDestino === "#novo") {
		clientes.novo();
	} else if (linkDestino === "#validar") {
		clientes.validar(clientes.aba);
	} else if (linkDestino === "#ajuda") {
		//clientes.mostrarAjuda("ajuda.html", "Contabilidade Simples em Javascript", versao);
	} else if (linkDestino === "#sobre") {
		clientes.sobre("Contabilidade Simples em Javascript", "Módulo de Clientes do Sistema contábil para treinamento e para uso em pequenas empresas.<br>Em desenvolvimento por Myrko I. da Graça", versao);
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
