import { ObjetoDOM, ComboFiltroDOM, CampoDOM } from './form.js?vc1.1';

export class Endereco extends ObjetoDOM {
	constructor(elemento, nome, obj) {
		if (!obj) {
			obj = {};
		}
		obj.qtdColunas = 3;
		if (!obj.tipo) {
			obj.tipo = "div";
		}
		let aux = obj;
		obj = structuredClone(obj);
		delete obj.titulo;
		super(elemento, nome, obj);
		this.obj = aux;
		
		this.add(new CampoDOM(null, "endereco", {
			titulo: "Endereço", 
			spanV: 2, 
			regras: {obrigatorio: true}
		}));
		this.add(new ComboFiltroDOM(null, "cidadeEstado", {
			titulo: "Cidade/Estado", 
			spanV: 1, 
			regras: {obrigatorio: true}
		}));
	}
	async carregarDados() {
		super.carregarDados();
		if (!this.carregandoDados) {
			try {
				this.carregandoDados = true;
				const urlAtual = new URL(import.meta.url);
				const pastaDoScript = urlAtual.pathname.substring(0, urlAtual.pathname.lastIndexOf('/'));
				let res = await fetch(pastaDoScript + "/dados/estados-cidades.json");
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
		}
	}
}