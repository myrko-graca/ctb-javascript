export class ControleHelp {
  constructor(listaArqHelp) {
	this.balaoAtivoPorClique = null;
	if (!document.querySelector("style[id='estilo_help']")) {
		const estilo = document.createElement('style');
		estilo.id = "estilo_help";
		estilo.innerHTML = `
			[data-help]::before {
			  content: "?";
			}
			[data-help] {
			  background-color: #007bff;
			  color: white;
			  border: none;
			  border-radius: 50%;
			  width: 12px;
			  height: 12px;
			  font-size: 9px;
			  font-weight: bold;
			  cursor: pointer;
			  display: inline-flex;
			  align-items: center;
			  justify-content: center;
			  vertical-align: top; 
			  transform: translateY(-2px);
			  margin-left: 5px;
			}
			.balao-help {
			  display: none; 
			  position: absolute !important; 
			  background-color: #ffffff;
			  color: #333333;
			  border: 1px solid #cccccc;
			  padding: 12px;
			  border-radius: 8px;
			  max-width: 50%;
			  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
			  z-index: 99999 !important; 
			  box-sizing: border-box;
			  font-style: oblique;
			}
			.balao-help.ativo {
			  display: block;
			}
			.balao-help::after {
			  content: "";
			  position: absolute;
			  border-width: 8px;
			  border-style: solid;
			}
			.balao-help.posicao-cima::after {
			  top: 100%;
			  border-color: #ffffff transparent transparent transparent;
			}
			.balao-help.posicao-baixo::after {
			  bottom: 100%;
			  border-color: transparent transparent #ffffff transparent;
			}
		`;
		document.head.appendChild(estilo);
	}
	this.init(listaArqHelp);
  }
  configuraBotao(btn) {
	  const idAlvo = btn.getAttribute("data-help");
	  const balao = document.getElementById(idAlvo);
	  if (!balao) {
		  throw new Error("Id. do help não encontrado: " + idAlvo);
	  }
	  // Evento: Passar o mouse
	  btn.addEventListener("mouseenter", () => {
		if (!this.balaoAtivoPorClique) {
		  this.fecharTodos();
		  balao.classList.add("ativo");
		  this.posicionarBalao(btn, balao);
		}
	  });
	  // Evento: Tirar o mouse
	  btn.addEventListener("mouseleave", () => {
		if (this.balaoAtivoPorClique !== balao) {
		  balao.classList.remove("ativo");
		}
	  });
	  // Evento: Clicar fixo
	  btn.addEventListener("click", (event) => {
		event.stopPropagation();
		if (this.balaoAtivoPorClique === balao) {
		  this.fecharTodos();
		} else {
		  this.fecharTodos();
		  balao.classList.add("ativo");
		  this.posicionarBalao(btn, balao);
		  this.balaoAtivoPorClique = balao;
		}
	  });
	}
	init(listaArqHelp) {
		let listaIds = [];
		document.querySelectorAll("[data-help]").forEach(btn => {
			listaIds.push(btn.getAttribute("data-help"));
		});
		// 1. Transformamos a lista de arquivos em uma lista de Promises usando .map()
		const promises = listaArqHelp.map(arqHelp => {
			return fetch(arqHelp)
				.then(response => {
					if (!response.ok) {
						throw new Error(`Erro ao carregar o arquivo: ${response.status}`);
					}
					return response.text();
				})
				.then(texto => {
					let div = document.createElement("div");
					div.innerHTML = texto;
					div.querySelectorAll("[id]").forEach(e => {
						if (listaIds.includes(e.id)) {
							e.className = "balao-help";
							document.body.appendChild(e);
						}
					});
				})
				.catch(erro => {
					console.error(`Falha no arquivo ${arqHelp}:`, erro);
				});
		});
		// 2. O Promise.all espera TODOS os arquivos carregarem e processarem
		Promise.all(promises).then(() => {
			// Este bloco SÓ executa quando todos os fetches e inserções terminaram
			document.querySelectorAll("[data-help]").forEach(btn => {
				this.configuraBotao(btn);
			});
		});
		// Evento global: Fechar ao clicar fora
		document.addEventListener("click", (event) => {
			const clicouEmBotao = event.target.closest("[data-help]");
			const clicouEmBalao = event.target.closest(".balao-help");
			if (!clicouEmBotao && !clicouEmBalao) {
				this.fecharTodos();
			}
		});
		// Eventos globais: Monitorar redimensionamento e rolagem
		const monitorarMovimento = () => {
			const balaoVisivel = document.querySelector(".balao-help.ativo");
			if (balaoVisivel) {
				const botaoCorrespondente = document.querySelector(`[data-help="${balaoVisivel.id}"]`);
			if (botaoCorrespondente) this.posicionarBalao(botaoCorrespondente, balaoVisivel);
			}
		};
		window.addEventListener("resize", monitorarMovimento);
		window.addEventListener("scroll", monitorarMovimento);
  }
  posicionarBalao(btn, balao) {
	const coordenadasBtn = btn.getBoundingClientRect();
	const larguraJanela = window.innerWidth;
	const larguraBalao = balao.offsetWidth;
	// 1. Posicionamento Vertical (Topo / Baixo)
	const topoScroll = coordenadasBtn.top + window.scrollY;
	balao.classList.remove("posicao-cima", "posicao-baixo");
	const espacoSuperiorDisponivel = coordenadasBtn.top;
	const alturaNecessariaBalao = balao.offsetHeight + 15;
	if (espacoSuperiorDisponivel < alturaNecessariaBalao) {
	  balao.style.top = (topoScroll + coordenadasBtn.height + 10) + "px";
	  balao.classList.add("posicao-baixo");
	} else {
	  balao.style.top = (topoScroll - balao.offsetHeight - 25) + "px";
	  balao.classList.add("posicao-cima");
	}
	// 2. Posicionamento Horizontal (Evitar corte lateral)
	const centroBtnX = coordenadasBtn.left + (coordenadasBtn.width / 2);
	let esquerdaFinal = centroBtnX - (larguraBalao / 2);
	const margemSeguranca = 10; 
	if (esquerdaFinal < margemSeguranca) {
	  esquerdaFinal = margemSeguranca;
	} else if ((esquerdaFinal + larguraBalao) > (larguraJanela - margemSeguranca)) {
	  esquerdaFinal = larguraJanela - larguraBalao - margemSeguranca;
	}
	balao.style.left = (esquerdaFinal + window.scrollX) + "px";
	// 3. Ajuste Dinâmico da Setinha
	const idEstilo = `estilo-seta-${balao.id}`;
	let estiloSeta = document.getElementById(idEstilo);
	if (!estiloSeta) {
	  estiloSeta = document.createElement('style');
	  estiloSeta.id = idEstilo;
	  document.head.appendChild(estiloSeta);
	}
	estiloSeta.innerHTML = `#${balao.id}::after { left: ${centroBtnX - esquerdaFinal - 7}px !important; }`;
  }
  fecharTodos() {
	document.querySelectorAll(".balao-help").forEach(b => b.classList.remove("ativo"));
	this.balaoAtivoPorClique = null;
  }
  criarElementoHelp(idHelp) {
	  let e = document.createElement("span");
	  e.setAttribute("data-help", idHelp);
	  this.configuraBotao(e);
	  return e;
  }
}
