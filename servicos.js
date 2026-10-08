import { Modal, ControleAba } from './util/util.js?vc1';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?vc1';
import { GerenciadorServicosContabil } from './gerenciadorServicos.js?v0.9';

class CadastroServicos extends FichasDOM {
	constructor(aba) {
		let elemento = document.getElementById("cadastroServicos");
		super(elemento, "cadastro", {
			titulo: "Serviços", 
			qtdColunas: 10,
			spanV: 10,
			regras: {campoChave: "descricao"},
			ordem: "descricao",
		});
		this.aba = aba;
		this.add(new CampoDOM(null, "descricao", {
			titulo: "Descrição", 
			spanV: 5,
			regras: {obrigatorio: true}
		}));
		this.add(new ComboFiltroDOM(null, "nbs", {
			titulo: "NBS", 
			spanV: 5,
			regras: {obrigatorio: true}
		}));
		this.add(new ComboFiltroDOM(null, "contaReceita", {
			titulo: "Receita de Prestação de Serviços", 
			spanV: 5,
			regras: {obrigatorio: true}
		}));
		//TODO: talvez separar em Mão de Obra Direta, Materiais Diretos, Serviços de Terceiros, Custos Indiretos
		this.add(new ComboFiltroDOM(null, "contaDespesa", {
			titulo: "Custo do Serviço Prestado", 
			spanV: 5,
			regras: {obrigatorio: true}
		}));
		this.add(new CampoDOM(null, "aliquotaISS", {
			titulo: "ISS (%)", 
			subtipo: "number",
			spanV: 2,
		}));
		let div = document.createElement("div");
		div.style = "grid-column: span 10; padding-left: 20px; padding-top: 20px";
		this.elemento.insertBefore(div, this.elemento.lastElementChild);	
		let bt = document.createElement("button");
		bt.className = "btn btn-plus";
		bt.textContent = "Registar serviço";
		div.appendChild(bt);
		bt.addEventListener("click", async (e) => {
			let lancamento = this.getModuloSistema().getComponente("lancamentoContabil").getComponente("efetuarLancamento");
			let regimeTributario = this.pai.pai.getComponente("regimeTributario").getValor().regimeTributario;
			let empresa = {
				regimeTributario: regimeTributario.tipo,
			};
			let servico = this.getAtual();
			const dadosDigitados = await this.obterValoresServico();
			console.log("dadosDigitados", dadosDigitados);
			let gerenciador = new GerenciadorServicosContabil();
			try {
				let t1 = gerenciador.processarServico({
					regimeTributario: regimeTributario.tipo,
					valorTotalServico: dadosDigitados.valorTotalServico,
					descontoConcedido: dadosDigitados.descontoConcedido,
					custoServicoPrestado: dadosDigitados.custoServicoPrestado, 
					faturamentoAcumuladoTrimestre: Number(regimeTributario.empresaLP.faturamentoAcumuladoTrimestre), 
					percentualPresuncao: Number(regimeTributario.empresaLP.percentualPresuncao),
					aliquotaIss: Number(servico.aliquotaISS), 
					aliquotaPis: Number(regimeTributario.empresaRegular.aliquotaPIS),    
					aliquotaCofins: Number(regimeTributario.empresaRegular.aliquotaCOFINS),  
					aliquotaIrpj: Number(regimeTributario.empresaRegular.aliquotaIRPJ),  
					aliquotaCsll: Number(regimeTributario.empresaRegular.alioquotaCSLL),  
					percentualAVista: 100,			
					//aliquotaSimplesEfetiva: 8.2, //Simples
					//sofreRetencaoFonte: true,
					//aliquotaRetIrrf
					//aliquotaRetCsrf
					percentualAVista: 100
				});
				console.log("t1", t1);
			} catch (error) {
				console.error("🔴 Bloqueado com sucesso:", error.message);
			}
			console.log("servico", lancamento, regimeTributario, servico, gerenciador);
		});
	}
	obterValoresServico() {
		return new Promise((resolve, reject) => {
			const modal = document.createElement('dialog');
			Object.assign(modal.style, {
				border: 'none',
				borderRadius: '8px',
				boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
				padding: '24px',
				width: '320px',
				fontFamily: 'Arial, sans-serif'
			});
			const estiloBackdrop = document.createElement('style');
			estiloBackdrop.textContent = `
				dialog::backdrop { background-color: rgba(0, 0, 0, 0.5); }
				.modal-field { margin-bottom: 15px; }
				.modal-field label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 14px; color: #333; }
				.modal-field input { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
				.modal-btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
				.modal-btns button { padding: 8px 16px; cursor: pointer; border-radius: 4px; border: none; font-weight: bold; }
				.btn-env { background-color: #28a745; color: white; }
				.btn-can { background-color: #dc3545; color: white; }
			`;
			document.head.appendChild(estiloBackdrop);
			modal.innerHTML = `
				<h3 style="margin-top: 0; color: #111;">Dados do Serviço</h3>
				<form method="dialog" id="jsModalForm">
					<div class="modal-field">
						<label>Valor do Serviço (R$):</label>
						<input type="number" id="jsValor" min="0" required autofocus>
					</div>
					<div class="modal-field">
						<label>Desconto Concedido (R$):</label>
						<input type="number" id="jsDesconto" min="0" required autofocus>
					</div>
					<div class="modal-field">
						<label>Custo do Serviço (R$):</label>
						<input type="number" id="jsCusto" min="0" required>
					</div>
					<div class="modal-btns">
						<button type="button" id="jsBtnCancelar" class="btn-can">Cancelar</button>
						<button type="submit" class="btn-env">Processar</button>
					</div>
				</form>
			`;
			document.body.appendChild(modal);
			modal.showModal();
			const form = modal.querySelector('#jsModalForm');
			const btnCancelar = modal.querySelector('#jsBtnCancelar');
			form.addEventListener('submit', () => {
				const dados = {
					valorTotalServico: parseFloat(modal.querySelector('#jsValor').value),
					custoServicoPrestado: parseFloat(modal.querySelector('#jsCusto').value),
					descontoConcedido: parseFloat(modal.querySelector('#jsDesconto').value),
				};
				fecharELimpar();
				resolve(dados); // Retorna os dados para quem chamou a função
			});
			btnCancelar.addEventListener('click', () => {
				fecharELimpar();
				reject(new Error("Operação cancelada pelo usuário."));
			});
			modal.addEventListener('cancel', () => {
				fecharELimpar();
				reject(new Error("Operação cancelada pelo usuário."));
			});
			function fecharELimpar() {
				modal.close();
				modal.remove();
				estiloBackdrop.remove();
			}
		});
	}
	async carregarDados() {
		if (!this.carregandoDados) {
			try {
				this.carregandoDados = true;
				let res = await fetch("dados/nbs.json?vd1");
				let obj = await res.json();
				let opcoes = [];
				//console.log("nbs", obj);
				for (let key in obj) {
					if (key.length == 12) {
						opcoes.push({value: key, text: key + " - " + obj[key]});
					}
				}				
				this.getComponente("nbs").setOpcoes(opcoes);
			} catch(erro) {
				console.error('Erro ao ler nbs.json:', erro);
			}
		}		
		super.carregarDados();
	}
	atualizarCombos() {
		let listaContasResultado = this.pai.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("3."));
		this.getComponente("contaReceita").setOpcoes(listaContasResultado);
		let listaContasDespesa = this.pai.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
		this.getComponente("contaDespesa").setOpcoes(listaContasDespesa);
	}
}
export class Servicos extends ObjetoDOM {
	constructor(aba) {
		let elemento = document.getElementById("servicos");
		super(elemento, "servicos", {
			titulo: "Serviços", 
			qtdColunas: 10,
		});
		this.aba = aba;
		this.abaServicos = new ControleAba(document.getElementById("abaServicos"));
		this.add(new ComboFiltroDOM(null, "despesaISS", {
			titulo: "ISS sobre Serviços", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "recolherISS", {
			titulo: "ISS a Recolher", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "despesaPIS", {
			titulo: "PIS sobre Faturamento", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "recolherPIS", {
			titulo: "PIS a Recolher", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "despesaCOFINS", {
			titulo: "COFINS sobre Faturamento", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "recolherCOFINS", {
			titulo: "COFINS a Recolher", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "despesaIRPJ", {
			titulo: "IRPJ", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "recolherIRPJ", {
			titulo: "IRPJ a Recolher", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "despesaCSLL", {
			titulo: "CSLL", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "recolherCSLL", {
			titulo: "CSLL a Recolher", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "recuperarCSRF", {
			titulo: "CSRF Retida a Recuperar", 
			spanV: 5,
		}));
		this.add(new ComboFiltroDOM(null, "recuperarISS", {
			titulo: "ISS Retido a Recuperar", 
			placeholder: "Usado quando for Simples Nacional com Anexo IV",
			spanV: 5,
		}));
		this.add(new CadastroServicos());
	}
	init() {
		this.abaServicos.aoAlterar = (aba) => {
			if (aba == "abaCadastroServicos") {
				this.getComponente("cadastro").atualizarCombos();
			}
		}
	}
	atualizarCombos() {
		let listaContasResultado = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("3.") || lc.value.startsWith("4."));
		let listaContasPassivo = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("2."));
		let listaContasAtivo = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("1."));
		this.getComponente("despesaISS").setOpcoes(listaContasResultado);
		this.getComponente("recolherISS").setOpcoes(listaContasPassivo);
		this.getComponente("despesaPIS").setOpcoes(listaContasResultado);
		this.getComponente("recolherPIS").setOpcoes(listaContasPassivo);
		this.getComponente("despesaCOFINS").setOpcoes(listaContasResultado);
		this.getComponente("recolherCOFINS").setOpcoes(listaContasPassivo);
		this.getComponente("despesaIRPJ").setOpcoes(listaContasResultado);
		this.getComponente("recolherIRPJ").setOpcoes(listaContasPassivo);
		this.getComponente("despesaCSLL").setOpcoes(listaContasResultado);
		this.getComponente("recolherCSLL").setOpcoes(listaContasPassivo);
		this.getComponente("recuperarCSRF").setOpcoes(listaContasAtivo);
		this.getComponente("recuperarISS").setOpcoes(listaContasAtivo);
	}
	setValor(valor) {
		this.atualizarCombos();
		this.getComponente("cadastro").atualizarCombos();
		super.setValor(valor);
	}
}
