import { Modal, ControleAba } from './util/util.js?vc1.1';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?vc1.1';
import { NavigationMenu } from './util/menu.js?vc1.1';
import { GerenciadorServicosContabil } from './gerenciadorServicos.js?v0.91';

class Servicos extends ModuloSistemaDOM {
	constructor() {
		let elemento = document.getElementById("servicos");
		super(elemento);
		this.aba = new ControleAba(document.body);
		this.add(new TiposServicos());
	}
}
class TiposServicos extends FichasDOM {
	constructor() {
		let elemento = document.getElementById("tipos_servicos");
		super(elemento, "servicos", {
			titulo: "Tipos de Serviços", 
			qtdColunas: 10,
			regras: {campoChave: "descricao"},
			ordem: "descricao",
		});
		this.aba = new ControleAba(document.body);
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
		this.add(new ComboFiltroDOM(null, "contaAndamento", {
			titulo: "Serviços em Andamento / Aplicados", 
			spanV: 5,
		}));
		//TODO: talvez separar em Mão de Obra Direta, Materiais Diretos, Serviços de Terceiros, Custos Indiretos
		this.add(new ComboFiltroDOM(null, "contaDespesa", {
			titulo: "Custo do Serviço Prestado", 
			spanV: 5,
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
			let regimeTributario = this.pai.getComponente("regimeTributario").getValor().regimeTributario;
			let empresa = {
				regimeTributario: regimeTributario.tipo,
			};
			let servico = this.getAtual();
			const dadosDigitados = await this.obterValoresServico();
			console.log("dadosDigitados", dadosDigitados);
			let gerenciador = new GerenciadorServicosContabil();
			try {
				let proc = gerenciador.processarServico({
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
					aliquotaSimplesEfetiva: Number(regimeTributario.simplesNacional.aliquotaEfetiva),  
					sofreRetencaoFonte: regimeTributario.empresaRegular.sofreRetencaoFonte,
					aliquotaRetIrrf: regimeTributario.empresaRegular.aliquotaRetIRRF,
					aliquotaRetCsrf: regimeTributario.empresaRegular.aliquotaRetCSRF,
				});
				lancamento.getComponente("debitos").limpar(true);
				lancamento.getComponente("creditos").limpar(true);
				if (servico.contaReceita && proc.valores.valorComDesconto) {
					let reg = lancamento.getComponente("creditos").novo();
					reg.getComponente("conta").setValor(servico.contaDespesa);
					reg.getComponente("valor").setValor(proc.valores.valorComDesconto);
				}
				if (servico.contaDespesa && proc.valores.custoServicoPrestado) {
					let reg = lancamento.getComponente("debitos").novo();
					reg.getComponente("conta").setValor(servico.contaDespesa);
					reg.getComponente("valor").setValor(proc.valores.custoServicoPrestado);
				}
				if (servico.contaAndamento && proc.valores.custoServicoPrestado) {
					let reg = lancamento.getComponente("creditos").novo();
					reg.getComponente("conta").setValor(servico.contaAndamento);
					reg.getComponente("valor").setValor(proc.valores.custoServicoPrestado);
				}
				if (regimeTributario.empresaRegular.despesaISS && proc.valores.iss) {
					let reg = lancamento.getComponente("debitos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.despesaISS);
					reg.getComponente("valor").setValor(proc.valores.iss);
				}
				if (regimeTributario.empresaRegular.recolherISS && proc.valores.iss) {
					let reg = lancamento.getComponente("creditos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.recolherISS);
					reg.getComponente("valor").setValor(proc.valores.iss);
				}
				if (regimeTributario.empresaRegular.despesaPIS && proc.valores.pis) {
					let reg = lancamento.getComponente("debitos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.despesaPIS);
					reg.getComponente("valor").setValor(proc.valores.pis);
				}
				if (regimeTributario.empresaRegular.recolherPIS && proc.valores.pis) {
					let reg = lancamento.getComponente("creditos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.recolherPIS);
					reg.getComponente("valor").setValor(proc.valores.pis);
				}
				if (regimeTributario.empresaRegular.despesaCOFINS && proc.valores.cofins) {
					let reg = lancamento.getComponente("debitos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.despesaCOFINS);
					reg.getComponente("valor").setValor(proc.valores.cofins);
				}
				if (regimeTributario.empresaRegular.recolherCOFINS && proc.valores.cofins) {
					let reg = lancamento.getComponente("creditos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.recolherCOFINS);
					reg.getComponente("valor").setValor(proc.valores.cofins);
				}
				let irpj = proc.valores.irpj + proc.valores.irpjAdicional;
				if (regimeTributario.empresaRegular.despesaIRPJ && irpj) {
					let reg = lancamento.getComponente("debitos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.despesaIRPJ);
					reg.getComponente("valor").setValor(irpj);
				}
				if (regimeTributario.empresaRegular.recolherIRPJ && irpj) {
					let reg = lancamento.getComponente("creditos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.recolherIRPJ);
					reg.getComponente("valor").setValor(irpj);
				}
				if (regimeTributario.empresaRegular.despesaCSLL && proc.valores.csll) {
					let reg = lancamento.getComponente("debitos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.despesaCSLL);
					reg.getComponente("valor").setValor(proc.valores.csll);
				}
				if (regimeTributario.empresaRegular.recolherCSLL && proc.valores.csll) {
					let reg = lancamento.getComponente("creditos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.recolherCSLL);
					reg.getComponente("valor").setValor(proc.valores.csll);
				}
				/* TODO: ver outros retidos também
				if (regimeTributario.empresaRegular.recuperarCSRF && proc.valores.csrfRetido) {
					let reg = lancamento.getComponente("debitos").novo();
					reg.getComponente("conta").setValor(regimeTributario.empresaRegular.recuperarCSRF);
					reg.getComponente("valor").setValor(proc.valores.csrfRetido);
				}*/
				if (regimeTributario.simplesNacional.contaSimplesAbatimento && proc.valores.valorDasSimples) {
					let reg = lancamento.getComponente("debitos").novo();
					reg.getComponente("conta").setValor(regimeTributario.simplesNacional.contaSimplesAbatimento);
					reg.getComponente("valor").setValor(proc.valores.valorDasSimples);
				}
				if (regimeTributario.simplesNacional.contaSimplesRecolher && proc.valores.valorDasSimples) {
					let reg = lancamento.getComponente("creditos").novo();
					reg.getComponente("conta").setValor(regimeTributario.simplesNacional.contaSimplesRecolher);
					reg.getComponente("valor").setValor(proc.valores.valorDasSimples);
				}
				lancamento.focar();
				new Modal().mostrar("Lançamento Prestação de Serviço", "Complete com o pagamento recebido (caixa, bancos, clientes, etc.)");
				console.log("proc", proc);
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
		this.getComponente("contaReceita").setOpcoes(this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("3.")));
		this.getComponente("contaAndamento").setOpcoes(this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("1.")));
		this.getComponente("contaDespesa").setOpcoes(this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4.")));
	}
	setValor(valor) {
		this.atualizarCombos();
		super.setValor(valor);
	}
}
let servicos = new Servicos();
await servicos.carregarDados();
document.body.hidden = false;
async function executaAcao(linkDestino) {
	if (linkDestino === "#abrir") {
		if (contabilidade.haModificacoes && !confirm("Há modificações não salvas.  Confirma abrir?")) {
			return;
		}
		let obj = await abrirComJanelaNativa();
		console.log("abrir", obj);
		contabilidade.setValor(obj);
		contabilidade.haModificacoes = false;
	} else if (linkDestino === "#salvar") {
		let conteudo = contabilidade.getValor();
		console.log("conteudo", conteudo);
		let str = JSON.stringify(conteudo);
		salvarComJanelaNativa(str);
		contabilidade.haModificacoes = false;
	} else if (linkDestino === "#novo") {
		if (confirm("Confirma apagar os dados e gerar um novo plano de contas?")) {
			contabilidade.novo();
		}
	} else if (linkDestino === "#contas.json") {
		if (contabilidade.haModificacoes && !confirm("Há modificações não salvas.  Confirma carregar dados?")) {
			return;
		}
		fetch("dados/contas.json?v0.91")
			.then(resposta => resposta.json())
			.then(obj => {
				console.log(obj);
				contabilidade.setValor(obj);
				contabilidade.haModificacoes = false;
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
		fetch("ajuda.html?v0.91")
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
		let versao = "?v0.91";
		new Modal().mostrar("Contabilidade Simples (versão " + versao.replace("?v", "") + ")", "Sistema contábil para treinamento e para uso em pequenas empresas.<br>Em desenvolvimento por Myrko I. da Graça"); 
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
