export class Util {
	constructor() {
		this.nomeProjeto = window.location.pathname.split('/')[1];
	}
	async autenticacao(dados) {
		const url = `/${this.nomeProjeto}/util/autenticacao`;
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json; charset=UTF-8' },
				body: JSON.stringify(dados)
			});
			if (response.redirected) {
				console.log("O servidor redirecionou para:", response.url);
				window.location.href = response.url + "?origem=" + encodeURIComponent(window.location.href);
				return; 
			}
			if (!response.ok) {
				throw new Error(`Erro na requisição: ${response.status}`);
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Erro ao finalizar sessão:', error);
		}
	}
	async finalizarSessao() {
		const url = `/${this.nomeProjeto}/util/finalizar-sessao`;
		try {
			const response = await fetch(url, {
			method: 'GET',
			headers: {
			'Accept': 'application/json',
			}
		});
		if (response.redirected) {
			console.log("O servidor redirecionou para:", response.url);
			window.location.href = response.url + "?origem=" + encodeURIComponent(window.location.href);
			return; 
		}
		if (!response.ok) {
			throw new Error(`Erro na requisição: ${response.status}`);
		}
		const data = await response.json();
		if (data.status == "inativa") {
			console.log("Sessão inativa");
		}
		return data;
		} catch (error) {
			console.error('Erro ao finalizar sessão:', error);
		}
	}
	async verificarSessao() {
		const url = `/${this.nomeProjeto}/util/verificar-sessao`;
		try {
			const response = await fetch(url, {
			method: 'GET',
			headers: {
			'Accept': 'application/json',
			}
		});
		if (response.redirected) {
			console.log("O servidor redirecionou para:", response.url);
			window.location.href = response.url + "?origem=" + encodeURIComponent(window.location.href);
			return; 
		}
		if (!response.ok) {
			throw new Error(`Erro na requisição: ${response.status}`);
		}
		const data = await response.json();
		if (data.status == "inativa") {
			console.log("Sessão inativa");
		}
		return data;
		} catch (error) {
			console.error('Erro ao verificar sessão:', error);
		}
	}
	getValorBaseline(tipo, id) {
		let url = `/${this.nomeProjeto}/util/ValorBaseline?tipo=${tipo}`;
		if (id) {
			url += "&id=" + id;
		}
		return fetch(url, {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
			}
		})
		.then(response => {
			if (response.redirected) {
				console.log("O servidor redirecionou para:", response.url);
				window.location.href = response.url + "?origem=" + encodeURIComponent(window.location.href);
				return; 
			}
			if (!response.ok) {
				throw new Error(`Erro na requisição: ${response.status}`);
			}
			return response.json(); 
		})
		.then(res => {
			if (!res) return;
			let lista = new Object();
			let temValores = false;
			for (let reg of res) {
				if (reg.id_reg) {
					temValores = true;
					if (!lista[reg.id_reg]) {
						lista[reg.id_reg] = new Object();
						lista[reg.id_reg].id = reg.id_reg;
					}
					lista[reg.id_reg][reg.campo] = reg.valor;
				}
			}
			if (temValores && res.length > 0) {
				let sai = new Object();
				sai.id = res[0].id;
				sai.comentario = res[0].comentario;
				sai.data = res[0].data;
				if (res[0].filtro) {
					sai.filtro = JSON.parse(res[0].filtro);
				}
				sai.usuario = res[0].usuario;
				sai.valores = Object.values(lista);
				return sai;
			} else {
				return res; 
			}
		})
		.catch(error => {
			console.error('Erro ao buscar baseline:', error);
			throw error; 
		});
	}
	postValorBaseline(tipo, filtro, comentario, dados, campoId) {
		let baseline = new Object();
		if (!campoId) {
			campoId = "id";
		}
		baseline.tipo = tipo;
		baseline.filtro = filtro;
		baseline.comentario = comentario;
		let valores = [];
		for (let reg of dados) {
			let idReg = reg[campoId];
			for (let c in reg) {
				if (typeof reg[c] !== "object") {
					let v = new Object();
					v.id = idReg;
					v.campo = c;
					v.valor = reg[c];
					valores.push(v);
				}
			}
		}
		baseline.valores = valores;
		const url = `/${this.nomeProjeto}/util/ValorBaseline`;
		return fetch(url, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
			},
			body: JSON.stringify(baseline) 
		}).then(response => {
			if (response.redirected) {
				console.log("O servidor redirecionou para:", response.url);
				window.location.href = response.url + "?origem=" + encodeURIComponent(window.location.href);
				return; 
			}
			if (!response.ok) {
				throw new Error(`Erro na requisição: ${response.status}`);
			}
			return response.json(); 
		}).then(res => {
			return res; 
		}).catch(error => {
			console.error('Erro ao salvar baseline:', error);
			throw error; 
		});
	}
	async getCSV(arquivo, servidor) {
		let url = "readCsvJson?arquivo=" + arquivo + ".csv";
		if (servidor) {
			url += "&s=" + servidor;
		}
		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: {
				'Accept': 'application/json',
				}
			});
			if (response.redirected) {
				console.log("O servidor redirecionou para:", response.url);
				window.location.href = response.url + "?origem=" + encodeURIComponent(window.location.href);
				return; 
			}
			if (!response.ok) {
				throw new Error(`Erro na requisição: ${response.status}`);
			}
			const data = await response.json();
			return data;
		} catch (e) {
			console.error('Erro ao buscar csv:', e);
		} finally {
		}
	}
}
export class ControleAba {
	constructor(elemento, abaAtiva) {
		if (elemento) {
			this.elemento = elemento;
		} else {
			this.elemento = document.body;
		}
		this.aoAlterar = null;
		this.posicaoY = new Object();
		this.util = new Util();
		this.abaAtiva = null;
		if (abaAtiva) {
			this.alternar(abaAtiva);
		}
		if (!document.querySelector("style[id='estilo_aba']")) {
			const estilo = document.createElement('style');
			estilo.id = "estilo_aba";
			estilo.innerHTML = `
				.hidden {
					display: none;
					opacity: 0;
				}
				nav {
				  display: flex;
				  flex-wrap: wrap;
				  border-bottom: 2px solid #e0e0e0;
				  background-color: #f8f9fa;
				  gap: 4px;
				  padding: 8px 8px 0 8px;
				}
				nav button {
				  background: none;
				  border: 1px solid transparent;
				  border-bottom: none;
				  padding: 10px 20px;
				  font-size: 14px;
				  font-weight: 500;
				  cursor: pointer;
				  color: #5f6368;
				  border-top-left-radius: 6px;
				  border-top-right-radius: 6px;
				  transition: all 0.2s ease;
				  margin-bottom: -2px;
				}
				nav button:hover {
				  background-color: #f1f3f4;
				  color: #1a73e8;
				}
				body:has(nav ~ .aba:nth-child(1 of .aba):not(.hidden)) nav button:nth-child(1),
				body:has(nav ~ .aba:nth-child(2 of .aba):not(.hidden)) nav button:nth-child(2),
				body:has(nav ~ .aba:nth-child(3 of .aba):not(.hidden)) nav button:nth-child(3),
				body:has(nav ~ .aba:nth-child(4 of .aba):not(.hidden)) nav button:nth-child(4),
				body:has(nav ~ .aba:nth-child(5 of .aba):not(.hidden)) nav button:nth-child(5),
				body:has(nav ~ .aba:nth-child(6 of .aba):not(.hidden)) nav button:nth-child(6),
				body:has(nav ~ .aba:nth-child(7 of .aba):not(.hidden)) nav button:nth-child(7),
				body:has(nav ~ .aba:nth-child(8 of .aba):not(.hidden)) nav button:nth-child(8),
				body:has(nav ~ .aba:nth-child(9 of .aba):not(.hidden)) nav button:nth-child(9),
				body:has(nav ~ .aba:nth-child(10 of .aba):not(.hidden)) nav button:nth-child(10) {
				  background-color: #ffffff;
				  border-color: #e0e0e0;
				  color: #1a73e8;
				  font-weight: bold;
				  border-bottom: 2px solid #ffffff; /* Cobre a linha cinza do nav */
				}
				.aba {
				  padding: 20px;
				  background-color: #ffffff;
				  border: 1px solid #e0e0e0;
				  border-top: none;
				}
			`;
			document.head.appendChild(estilo);
			let bts = document.querySelectorAll("nav button[data-aba]");
			for (let bt of bts) {
				let aba = bt.getAttribute("data-aba");
				if (aba) {
					bt.addEventListener("click", (e) => {
						this.alternar(aba);
					});
				}
			};
		}
	}
	alternar(aba) {
		this.util.verificarSessao();
		this.elemento.querySelectorAll(":scope > .aba:not(.hidden)").forEach(botao => {
			this.posicaoY[botao.id] = window.scrollY;
			botao.classList.add("hidden");
		});
		let botao = this.elemento.querySelector(":scope > #" + aba + ".hidden");
		if (botao) {
			botao.classList.remove("hidden");
			if (this.aoAlterar) {
				this.aoAlterar(aba);
			}
			if (this.posicaoY[aba]) {
				window.scrollTo(0, this.posicaoY[aba]);
			} else {
				window.scrollTo(0, 0);
			}
			this.abaAtiva = aba;
		}
	}
}
export class Menu {
	constructor(elemento) {
		this.elemento = elemento;
		this.div = document.createElement("div");
		this.div.style.display = "none";
		this.div.className = "MenuClick";
		this.elemento.appendChild(this.div);
		this.ul = document.createElement("ul");
		this.div.appendChild(this.ul);
		this.elemento.addEventListener('click', (e) => {
			if (this.div.style.display == "none") {
				this.div.style.display = "";
				//var offsets = this.elemento.getBoundingClientRect();
				var posLeft = e.pageX - this.div.offsetWidth;
				var scroll = this.#getScroll();
				this.div.style.left = (posLeft - scroll[0]) + "px";
				this.div.style.top = (e.pageY - scroll[1]) + "px";
				let lis = elemento.getElementsByTagName("li");
				for (let i = 0; i < lis.length; i++) {
					let li = lis.item(i);
					//console.log("li", li, li.onexibir());
					if (li.onexibir) {
						li.style.display = li.onexibir()?"":"none";
					}
				}
			} else {
				this.div.style.display = "none";
			}
		});
		if (!document.querySelector("style[id='estilo_menu']")) {
			const estilo = document.createElement('style');
			estilo.id = "estilo_menu";
			estilo.innerHTML = `
				.MenuClick ul {
					list-style:none;
					margin:0px;
					margin-top:4px;
					padding-left:10px;
					padding-right:10px;
					padding-bottom:3px;
					font-size:17px;
					color: #333333;
				}
				.MenuClick hr {
					width: 85%;
					background-color:#E4E4E4;
					border-color:#E4E4E4;
					color:#E4E4E4;
				}
				.MenuClick{
					position:fixed;
					border:1px solid #B2B2B2;
					width:150px;
					background:#F9F9F9;
					box-shadow: 3px 3px 2px #E9E9E9;
					border-radius:4px;
				}
				.MenuClick li{
					padding: 3px;
					padding-left:10px;
					cursor: pointer;
				}
				.MenuClick li:hover{
					color: white;
					background:#284570;
					border-radius:2px;
				}
			`;
			document.head.appendChild(estilo);
		}
	}
	#getScroll() {
		if (window.pageYOffset != undefined) {
			return [pageXOffset, pageYOffset];
		} else {
			var sx, sy, d = document,
			r = d.documentElement,
			b = d.body;
			sx = r.scrollLeft || b.scrollLeft || 0;
			sy = r.scrollTop || b.scrollTop || 0;
			return [sx, sy];
		}
	}
	incluirItem(nome, hint, fnClick, fnExibir) {
		let li = document.createElement("li");
		li.textContent = nome;
		li.title = hint;
		li.onclick = fnClick;
		li.onexibir = fnExibir;
		this.ul.appendChild(li);
	}
}
export class Modal {
	constructor() {
		if (!document.querySelector("style[id='estilo_modal']")) {
			const estilo = document.createElement('style');
			estilo.id = "estilo_modal";
			estilo.innerHTML = `
				dialog {
				  border: none;
				  border-radius: 8px;
				  padding: 20px;
				  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
				}
				dialog::backdrop {
				  background-color: rgba(0, 0, 0, 0.5);
				}
			`;
			document.head.appendChild(estilo);
			const dialog = document.createElement('div');
			dialog.innerHTML = `
				<dialog id="meuModal" style="max-width: 70%;">
					<h3 id="modalTitulo" style="margin-top: 0;"></h3>
					<hr>
					<p id="modalConteudo"></p>
					<button onclick="document.getElementById('meuModal').close()">Fechar</button>
				</dialog>
			`;
			document.body.appendChild(dialog);
		}
	}
	mostrar(titulo, conteudo) {
		document.getElementById('modalTitulo').innerText = titulo;
		document.getElementById('modalConteudo').innerText = conteudo;
		document.getElementById('meuModal').showModal();
	}	
}
