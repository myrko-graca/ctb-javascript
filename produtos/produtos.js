import { Modal, ControleAba } from './util/util.js?vc1.1';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?vc1.1';

export class Produtos extends FichasDOM {
	constructor(aba) {
		let elemento = document.getElementById("produtos");
		super(elemento, "produtos", {
			titulo: "Produtos", 
			qtdColunas: 10,
			regras: {campoChave: "descricao"},
			ordem: "descricao",
		});
		this.abaProdutos = new ControleAba(document.getElementById("abaProdutos"));
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
				let res = await fetch("dados/ncms.json?vd1");
				let obj = await res.json();
				let opcoes = [];
				let ncms = obj.Nomenclaturas;
				for (let ncm of ncms) {
					/* código para salvar ajustado
					let desc = ncm.Descricao.replaceAll("<i>", "").replaceAll("</i>", "").replaceAll("<sup>", "").replaceAll("</sup>", "");
					let cod = ncm.Codigo.replaceAll(".", "");
					if (desc[0] == '-' || desc == "Outros" || desc == "Outras") {
						for (let i = cod.length - 1; i > 0; i--) {
							let ncmAux = ncms.find(n => n.Codigo.replaceAll(".", "") == cod.substring(0, i));
							if (ncmAux) {
								if (desc[0] == '-') {
									desc = ncmAux.Descricao + " " + desc;
								} else {
									desc = ncmAux.Descricao + " - " + desc;
								}
								break;
							}
						}
					}
					ncm.Descricao = desc;
					*/
					if (ncm.Codigo.length == 10) {
						opcoes.push({value: ncm.Codigo, text: ncm.Codigo + " - " + ncm.Descricao});
					}
				}				
				console.log("ncms", obj);
				this.getComponente("ncm").setOpcoes(opcoes);
			} catch(erro) {
				console.error('Erro ao ler ncms.json:', erro);
			}
		}		
		super.carregarDados();
	}
}
