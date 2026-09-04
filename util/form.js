if (!document.querySelector("style[id='estilo_form']")) {
	const estilo = document.createElement('style');
	estilo.id = "estilo_form";
	estilo.innerHTML = `
		select[disabled] {
			border-color: black;
		}
		[disabled] {
			background-color: white;
			color: black;
		}
		.file-group {
			display: inline-flex;
			overflow: hidden;
			border-radius: 12px;
			box-shadow: 0 2px 6px rgba(0,0,0,.15);
		}
		label:has(input[type="checkbox"]):focus-within, label:has(input[type="radio"]):focus-within {
			border-color: #007bff;
			box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
			outline: none;
		}
		.file-group button {
			border-radius: 0;
			padding: 4px 12px;
		}
		.btn {
			border: none;
			color: white;
			cursor: pointer;
			font-size: 12px;
			transition: filter .2s;
			border-radius: 12px;
		}
		.btn:hover {
			filter: brightness(1.1);
		}
		.btn-plus {
			background: #81bd60;
		}
		.btn-view {
			background: #7892c2;
		}
		.btn-clear {
			background: #bd6060;
		}
		fieldset:focus,div:focus {
			border-color: #007bff;
			box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
			outline: none; /* Remove a borda azul padrão do navegador se quiser customizar */
		}	
	`;
	document.head.appendChild(estilo);
}
export class ObjetoDOM {
	constructor(elemento, nome, obj) {
		if (!obj) {
			obj = {};
		}
		this.obj = obj;
		if (!obj.tipo) {
			obj.tipo = "FIELDSET";
		}
		if (!elemento) {
			if (this.getTipo() == "campo" || this.getTipo() == "arquivo") {
				elemento = document.createElement("div");
			} else {
				elemento = document.createElement(obj.tipo);
			}
		}
		if (obj.titulo) {
			let t = null;
			if (elemento.nodeName == "FIELDSET") {
				t = document.createElement("legend");
			} else {
				t = document.createElement("label");
			}
			t.textContent = obj.titulo;
			elemento.appendChild(t);
		}
		this.elemento = elemento;
		this.elemento.tabIndex = "-1";
		if (obj.qtdColunas) {
			this.elemento.style.display = "grid";
			this.elemento.style.gridTemplateColumns = "repeat(" + obj.qtdColunas + ", 1fr)";
			this.elemento.style.gap = "5px";
			this.elemento.style.marginBottom = "3px";
		}
		if (obj.spanV) {
			this.elemento.style.gridColumn = "span " + obj.spanV;
		}
		if (obj.spanH) {
			this.elemento.style.gridRow = "span " + obj.spanH;
		}
		this.nome = nome;
		this.componentes = [];
	}
	add(item) {
		this.componentes.push(item);
		if (item.getTipo() == "modulo") {
			throw new Error("Não é possível adicionar módulo");
		}
		if (!item.elemento.parentNode) {
			this.elemento.appendChild(item.elemento);
		}
		item.pai = this;
		item.init();
	}
	remover(item) {
		if (this.somenteLeitura) {
			throw new Error("Não é possível remover registro, pois está no modo de somente leitura");
		}
		let indice = this.componentes.indexOf(item);
		this.componentes.splice(indice, 1);
		item.elemento.remove();
	}
	getValor() {
		let lista = {};
		for (let item of this.componentes) {
			if (!item.vazio() && !item.obj.calculado) {
				let valor = item.getValor();
				if (typeof valor === "object" && !Array.isArray(valor)) {
					lista[item.nome] = valor[item.nome];
				} else {
					lista[item.nome] = valor;
				}
			}
		}
		let saida = {};
		saida[this.nome] = lista;
		return saida;
	}
	getHashArquivos() {
		let lista = [];
		for (let item of this.componentes) {
			if (item.getTipo() == "arquivo") {
				let hash = item.getValor();
				if (hash) {
					lista.push(hash);
				}
			} else {
				lista.push(...item.getHashArquivos());
			}
		}
		return lista;
	}
	setValor(valor) {
		if (this.somenteLeitura) {
			throw new Error("Não é possível atribuir valor, pois está no modo de somente leitura");
		}
		for (let item of this.componentes) {
			let v = valor[item.nome];
			if (v == null || v == undefined) {
				item.setValor("");
			} else {
				item.setValor(v);
			}
		}
	}
	getCampos() {
		let saida = {};
		saida[this.nome] = {};
		saida[this.nome].descricao = this.obj.titulo;
		saida[this.nome].tipo = this.getTipo();
		for (let item of this.componentes) {
			let camposFilho = item.getCampos(); 
			saida[this.nome][item.nome] = camposFilho[item.nome];
		}
		return saida;
	}
	vazio() {
		let saida = true;
		for (let item of this.componentes) {
			saida = saida && item.vazio();
		}
		return saida;
	}
	getTipo() {
		return "objeto";
	}
	clonar() {
		return new this.constructor(
			null,
			this.nome, 
			{...this.obj}
		);
	}
	init() {
		for (let item of this.componentes) {
			if (!item.inicializado) {
				item.init();
			}
		}
		this.inicializado = true;
	}
	regrasBasicas() {
		let lista = [];
		if (this.obj.regras) {
			let item = {};
			let nome = this.obj.titulo;
			if (!nome) {
				nome = this.nome;
			}
			let strObj = this.getTipo();
			strObj = strObj.charAt(0).toUpperCase() + strObj.slice(1);
			if (this.obj.regras.obrigatorio) {
				if (this.vazio()) {
					item.mensagem = strObj + " '" + nome + "' está vazio";
					item.componentes = [{componente: this}];
					lista.push(item);
				}
			}
			if (this.obj.regras.mascara) {
				if (!this.obj.regras.mascara.test(this.getValor())) {
					item.mensagem = strObj + " '" + nome + "' está não está com o valor de acordo com o formato esperado";
					item.componentes = [{componente: this}];
					lista.push(item);
				}
			}
		}
		return lista;
	}
	validar() {
		let lista = this.regrasBasicas();
		for (let item of this.componentes) {
			let validacoes = item.validar();
			for (let v of validacoes) {
				let obj = {componente: this};
				v.componentes.push(obj);
				lista.push(v);
			}
		}
		return lista;
	}
	getComponente(nome) {
		let c = null;
		for (let item of this.componentes) {
			if (item.nome == nome) {
				c = item;
			}
		}
		return c;
	}
	limpar() {
		if (this.somenteLeitura) {
			throw new Error("Não é possível limpar, pois está no modo de somente leitura");
		}
		for (let item of this.componentes) {
			item.limpar();
		}
	}
	setSomenteLeitura(valor) {
		this.somenteLeitura = valor;
		for (let item of this.componentes) {
			item.setSomenteLeitura(valor);
		}
	}
	getSomenteLeitura() {
		return this.somenteLeitura;
	}
	aoModificar(e) {
		//teria como cancelar a modificação? evento beforeinput?
		if (this.pai) {
			this.pai.aoModificar(this);
		}
	}
	focar() {
		this.elemento.focus();
	}
	getModuloSistema() {
		let modulo = this;
		while (modulo.pai && modulo.getTipo() != "modulo") {
			modulo = modulo.pai;
		}
		if (modulo.getTipo() != "modulo") {
			throw new Error("Não foi possível encontrar o módulo do sistema");
		}
		return modulo;
	}
}
export class ModuloSistemaDOM extends ObjetoDOM {
	constructor(elemento, nome, obj) {
		super(elemento, nome, obj);
	}
	getArquivo(hash) {
		return this._arquivos[hash];
	}
	setArquivo(hash, arquivo) {
		if (!this._arquivos) {
			this._arquivos = {};
		}
		this._arquivos[hash] = arquivo;
	}
	getValor() {
		let saida = super.getValor();
		if (this._arquivos) {
			let hashUsados = this.getHashArquivos();
			for (let h in this._arquivos) {
				if (!hashUsados.includes(h)) {
					delete this._arquivos[h];
				}
			}
			if (Object.keys(this._arquivos).length > 0) {
				saida._arquivos = this._arquivos;
			}
		}
		return saida;
	}
	setValor(valor) {
		if (valor._arquivos) {
			this._arquivos = valor._arquivos;
		}
		super.setValor(valor[this.nome]);
	}
	getTipo() {
		return "modulo";
	}
}
export class ConjuntoDOM extends ObjetoDOM {
	constructor(elemento, nome, obj) {
		super(elemento, nome, obj);
		this.btNovo = document.createElement("button");
		this.btNovo.addEventListener('click', (e) => {
			this.novo();
		});
		this.btNovo.className = "btn btn-plus";
		this.btNovo.textContent = "novo";
		this.btNovo.style.width = "50px";
		this.btNovo.style.gridColumn = "span " + obj.spanV;
		this.elemento.appendChild(this.btNovo);
	}
	init() {
		super.init();
		for (let item of this.componentes) {
			item.elemento.style.display = "none";
			item.modelo = true;
		}
		this.novo();
	}
	getValor() {
		let saida = [];
		for (let item of this.componentes) {
			if (!item.modelo && !item.vazio()) {
				saida.push(item.getValor()[this.nome]);
			}
		}
		return saida;
	}
	setValor(valor) {
		if (valor && !Array.isArray(valor)) {
			throw new Error("Valor atribuído a '" + this.nome + "' deve ser do tipo 'array'");
		}
		if (valor.length > 0) {
			this.limpar(true);
			for (let v of valor) {
				let n = this.novo();
				n.setValor(v);
			}
		} else {
			this.limpar();
		}
	}
	getTipo() {
		return "conjunto";
	}
	getTamanho() {
		let tam = 0;
		for (let item of this.componentes) {
			if (!item.modelo) {
				tam++;
			}
		}
		return tam;
	}
	novo() {
		if (this.somenteLeitura) {
			throw new Error("Não é possível incluir registro, pois está no modo de somente leitura");
		}
		let obj = structuredClone(this.obj);
		obj.tipo = "div";
		obj.titulo = "";
		let n = new ObjetoDOM(null, this.nome, obj);
		for (let item of this.componentes) {
			if (item.modelo) {
				let c = item.clonar();
				n.add(c);
				if (this.obj.somentePrimeiroLabel) {
					if (this.getTamanho() > 0) {
						let labels = n.elemento.querySelectorAll("label");
						labels.forEach(l => {
							l.style.fontSize = "0px"; 
						});
					}
				}
			}
		}
		n.btExcluir = document.createElement("button");
		n.btExcluir.className = "btn btn-clear";
		n.btExcluir.textContent = "-";
		n.btExcluir.style.width = "20px";
		n.btExcluir.style.height = "20px";
		n.btExcluir.style.alignSelf = "end";
		n.btExcluir.addEventListener('click', (e) => {
			this.remover(n);
		});
		n.elemento.style.gridTemplateColumns += " max-content";
		n.elemento.appendChild(n.btExcluir);
		this.add(n);
		this.elemento.appendChild(this.btNovo);
		n.init();
		return n;
	}
	remover(item) {
		let qtdModelo = 0;
		for (let item of this.componentes) {
			if (item.modelo) {
				qtdModelo++;
			}
		}
		if (this.somenteLeitura) {
			throw new Error("Não é possível remover registro, pois está no modo de somente leitura");
		}
		let indice = this.componentes.indexOf(item);
		this.componentes.splice(indice, 1);
		item.elemento.remove();
		if (indice == qtdModelo) {
			let n = this.componentes[indice];
			if (n) {
				let labels = n.elemento.querySelectorAll("label");
				labels.forEach(l => {
					l.style.fontSize = ""; 
				});
			}
		}
	}
	limpar(naoIncluir) {
		if (this.somenteLeitura) {
			throw new Error("Não é possível limpar, pois está no modo de somente leitura");
		}
		for (let i = this.componentes.length - 1; i >= 0; i--) {
			let item = this.componentes[i];
			if (!item.modelo) {
				this.remover(item);
			}
		}
		if (!naoIncluir) {
			this.novo();
		}
	}
	getCampos() {
		let saida = {};
		saida[this.nome] = {};
		saida[this.nome].descricao = this.obj.titulo;
		saida[this.nome].tipo = this.getTipo();
		for (let item of this.componentes) {
			if (item.modelo) {
				let camposFilho = item.getCampos(); 
				saida[this.nome][item.nome] = camposFilho[item.nome];
			}
		}
		return saida;
	}
	getListaComponentes() {
		let saida = [];
		for (let item of this.componentes) {
			if (!item.modelo) {
				saida.push(item);
			}
		}
		return saida;
	}
	vazio() {
		let saida = true;
		for (let item of this.componentes) {
			if (!item.modelo) {
				saida = saida && item.vazio();
			}
		}
		return saida;
	}
	setSomenteLeitura(valor) {
		super.setSomenteLeitura(valor);
		if (valor) {
			this.btNovo.style.display = "none";
		} else {
			this.btNovo.style.display = "";
		}
		for (let item of this.componentes) {
			if (item.btExcluir) {
				if (valor) {
					item.btExcluir.style.display = "none";
				} else {
					item.btExcluir.style.display = "";
				}
			}
		}
	}
	validar() {
		let lista = this.regrasBasicas();
		for (let item of this.componentes) {
			if (!item.modelo && !item.vazio()) {
				let validacoes = item.validar();
				for (let v of validacoes) {
					let obj = {componente: this};
					v.componentes.push(obj);
					lista.push(v);
				}
			}
		}
		return lista;
	}
}
export class FichasDOM extends ObjetoDOM {
	constructor(elemento, nome, obj) {
		super(elemento, nome, obj);
		this.div = document.createElement("div");
		this.div.style.gridColumn = "span " + obj.spanV;
		this.div.style.marginTop = "20px";
		let div = document.createElement("div");
		div.className = "file-group";
		this.div.appendChild(div);
		this.btNovo = document.createElement("button");
		this.btNovo.addEventListener('click', (e) => {
			this.novo();
		});
		this.btNovo.textContent = "+";
		this.btNovo.className = "btn btn-plus";
		this.btNovo.title = "Incluir novo elemento";
		this.btNovo.style.width = "30px";
		div.appendChild(this.btNovo);
		this.btAnterior = document.createElement("button");
		this.btAnterior.addEventListener('click', (e) => {
			this.anterior();
		});
		this.btAnterior.textContent = "<";
		this.btAnterior.className = "btn btn-view";
		this.btAnterior.title = "Ir para o elemento anterior";
		this.btAnterior.style.width = "30px";
		div.appendChild(this.btAnterior);
		this.btProximo = document.createElement("button");
		this.btProximo.addEventListener('click', (e) => {
			this.proximo();
		});
		this.btProximo.textContent = ">";
		this.btProximo.className = "btn btn-view";
		this.btProximo.title = "Ir para o próximo elemento";
		this.btProximo.style.width = "30px";
		div.appendChild(this.btProximo);
		this.btRemover = document.createElement("button");
		this.btRemover.addEventListener('click', (e) => {
			this.remover();
		});
		this.btRemover.textContent = "-";
		this.btRemover.className = "btn btn-clear";
		this.btRemover.title = "Excluir o elemento posicionado";
		this.btRemover.style.width = "30px";
		div.appendChild(this.btRemover);
		this.contador = document.createElement("label");
		this.contador.style.marginLeft = "5px";
		this.contador.textContent = "1/1";
		this.div.appendChild(this.contador);
		this.elemento.appendChild(this.div);
		this.lista = [{}];
		this.posicao = 0;
	}
	buscaValor() {
		let reg = super.getValor()[this.nome];
		this.lista[this.posicao] = reg;
	}
	mandaValor() {
		let aux = this.getSomenteLeitura();
		this.setSomenteLeitura(false);
		let reg = this.lista[this.posicao]
		super.setValor(reg);
		this.setSomenteLeitura(aux);
	}
	anterior() {
		if (this.posicao > 0) {
			this.buscaValor();
			this.posicao--;
			this.mandaValor();
		}
		this.atualizarContador();
	}
	proximo() {
		if (this.posicao < this.lista.length - 1) {
			this.buscaValor();
			this.posicao++;
			this.mandaValor();
		}
		this.atualizarContador();
	}
	getValor() {
		let saida = [];
		this.buscaValor();
		for (let item of this.lista) {
			let reg = item;
			if (Object.keys(reg).length > 0) {
				saida.push(reg);
			}
		}
		return saida;
	}
	setValor(valor) {
		if (valor && !Array.isArray(valor)) {
			throw new Error("Valor atribuído a '" + this.nome + "' deve ser do tipo 'array'");
		}
		if (valor.length > 0) {
			this.limpar();
			this.lista = valor;
		} else {
			this.limpar();
		}
		this.posicao = 0;
		this.mandaValor();
		this.atualizarContador();
	}
	getTipo() {
		return "fichas";
	}
	novo() {
		if (this.somenteLeitura) {
			throw new Error("Não é possível incluir registro, pois está no modo de somente leitura");
		}
		this.buscaValor();
		let novo = {};
		this.lista.push(novo);
		this.posicao = this.lista.length - 1;
		this.mandaValor();
		this.atualizarContador();
	}
	remover() {
		if (this.somenteLeitura) {
			throw new Error("Não é possível remover registro, pois está no modo de somente leitura");
		}
		this.lista.splice(this.posicao, 1);
		if (this.posicao == this.lista.length) {
			if (this.posicao > 0) {
				this.posicao--;
			} else {
				this.lista.push({});
			}
		}
		this.mandaValor();
		this.atualizarContador();
	}
	limpar() {
		if (this.somenteLeitura) {
			throw new Error("Não é possível limpar, pois está no modo de somente leitura");
		}
		this.lista = [{}];
		this.posicao = 0;
		this.mandaValor();
		this.atualizarContador();
	}
	atualizarContador() {
		this.contador.textContent = (this.posicao + 1) + "/" + this.lista.length;
	}
	vazio() {
		if (this.getValor().length > 0) {
			return false;
		} else {
			return true;
		}
	}
	setSomenteLeitura(valor) {
		super.setSomenteLeitura(valor);
		if (valor) {
			this.btNovo.style.display = "none";
			this.btRemover.style.display = "none";
		} else {
			this.btNovo.style.display = "";
			this.btRemover.style.display = "";
		}
	}
	add(item) {
		super.add(item);
		this.elemento.appendChild(this.div);
	}
	validar() {
		let lista = this.regrasBasicas();
		let posAtual = this.posicao;
		this.buscaValor();
		for (let item of this.lista) {
			if (Object.keys(item).length > 0)  { //Não está vazio
				this.posicao = this.lista.indexOf(item);
				this.mandaValor();
				let validacoes = super.validar();
				for (let v of validacoes) {
					let obj = {componente: this, posicao: this.posicao};
					v.componentes.push(obj);
					lista.push(v);
				}
			}
		}
		this.posicao = posAtual;
		this.mandaValor();
		return lista;
	}
	focar(ind) {
		super.focar(ind);
		if (ind !== undefined && ind !== null) {
			this.buscaValor();
			this.posicao = ind;
			this.mandaValor();
			this.atualizarContador();
		}
	}
}
export class CampoDOM extends ObjetoDOM {
	constructor(elemento, nome, obj) {
		if (!obj) {
			obj = {};
		}
		if (!obj.tipo) {
			obj.tipo = "INPUT";
			if (!obj.subtipo) {
				obj.subtipo = "text";
			}
		}
		let elementoPai = null;
		if (!elemento) {
			elemento = document.createElement(obj.tipo);
			if (obj.subtipo) {
				elemento.type = obj.subtipo;
			}
		} else {
			elementoPai = elemento.parentNode;
		}
		super(elementoPai, nome, obj);
		let label = this.elemento.querySelector("label");
		if (label) {
			label.appendChild(elemento);
		} else {
			this.elemento.appendChild(elemento);
		}
		this.campo = elemento;
		this.campo.name = nome;
		if (this.campo.type == "checkbox") {
			this.campo.style.width = "16px";
			this.campo.style.height = "16px";
			this.campo.style.display = "flex";
		} else {
			this.campo.style.width = "100%";
			this.campo.style.height = "20px";
		}
		if (obj.atributos) {
			for (let a in obj.atributos) {
				this.campo.setAttribute(a, obj.atributos[a]);
			}
		}
	}
	init() {
		super.init();
		this.campo.addEventListener("change", (e) => {
			this.aoModificar(this);
		});
		if (this.obj.opcoes) {
			if (this.campo.nodeName == "SELECT") {
				this.campo.add(new Option(""));
				this.obj.opcoes.forEach(({ text, value }) => {
					if (text && value) {
						this.campo.add(new Option(text, value));
					} else if (text) {
						this.campo.add(new Option(text));
					}
				});
			} else if (this.campo.nodeName == "INPUT") {
				let tipo = this.campo.type;
				if (tipo == "checkbox" || tipo == "radio") {
					this.campo.remove();
					this.campo = document.createElement("div");
					this.campo.tabIndex = "-1";
					this.elemento.appendChild(this.campo);
					let nome = this.nome;
					this.obj.opcoes.forEach(({ text, value }) => {
						let r = document.createElement("input");
						r.type = tipo;
						r.value = value;
						if (tipo == "radio") {
							r.name = nome  + "_" + new Date().getTime();
						} else {
							r.name = nome + "." + value;
						}
						r.addEventListener("change", (e) => {
							this.aoModificar(this, e);
						});
						let l = document.createElement("label");
						l.textContent = text;
						l.style.display = "block";
						l.prepend(r);
						this.campo.appendChild(l);
					});
				}
			}
		}
	}
	add() {
		throw new Error("Não é possível adicionar em 'CampoDOM'");
	}
	getValor() {
		if (this.campo.nodeName == "DIV") {
			let selecionados = this.elemento.querySelectorAll('input:checked');
			if (selecionados.length == 1 && selecionados[0].type == "radio") {
				return selecionados[0].value;
			} else if (selecionados.length > 0 && selecionados[0].type == "checkbox") {
				let sai = {};
				sai[this.nome] = {};
				selecionados.forEach(c => {
					sai[this.nome][c.value] = c.checked;
				});
				return sai;
			} else {
				return null;
			}
		} else if (this.campo.type == "checkbox" || this.campo.type == "radio") {
			return this.campo.checked;
		} else {
			return this.campo.value;
		}
	}
	setValor(valor) {
		if (this.campo.nodeName == "DIV") {
			let selecionados = this.elemento.querySelectorAll('input');
			selecionados.forEach(c => {
				if (c.type == "radio") {
					if (c.value == valor) {
						c.checked = true;
					} else {
						c.checked = false;
					}
				} else if (c.type == "checkbox") {
					if (valor[c.value]) {
						c.checked = true;
					} else {
						c.checked = false;
					}
				}
			});
		} else if (this.campo.type == "checkbox"|| this.campo.type == "radio") {
			this.campo.checked = valor;
		} else {
			this.campo.value = valor;
		}
	}
	vazio() {
		if (this.getValor()) {
			return false;
		} else {
			return true;
		}
	}
	getTipo() {
		return "campo";
	}
	limpar() {
		if (this.campo.nodeName == "DIV") {
			let selecionados = this.elemento.querySelectorAll('input:checked');
			selecionados.forEach(c => {
				c.checked = false;
			});
		} else if (this.campo.type == "checkbox" || this.campo.type == "radio") {
			this.campo.checked = false;
		} else {
			this.campo.value = "";
		}
	}
	setSomenteLeitura(valor) {
		if (valor) {
			if (this.campo.nodeName == "DIV") {
				let selecionados = this.elemento.querySelectorAll('input');
				selecionados.forEach(c => {
					c.setAttribute("disabled", true);
				});
			} else {
				this.campo.setAttribute("disabled", true);
			}
		} else {
			if (this.campo.nodeName == "DIV") {
				let selecionados = this.elemento.querySelectorAll('input');
				selecionados.forEach(c => {
					c.removeAttribute("disabled");
				});
			} else {
				this.campo.removeAttribute("disabled");
			}
		}
	}
	focar() {
		this.campo.focus();
	}
}
export class CampoArquivo extends CampoDOM {
	constructor(elemento, nome, obj) {
		if (!obj) {
			obj = {};
		}
		obj.tipo = "input";
		obj.subtipo = "file";
		super(elemento, nome, obj);
	}
	init() {
		super.init();
		this.campo.hidden = true;
		let div = document.createElement("div");
		div.tabIndex = "-1";
		div.className = "file-group";
		this.campo.parentNode.appendChild(div);
		this.campo.parentNode.style.display = "inline-grid";
		div.appendChild(this.campo);
		this.btnSelect = document.createElement("button");
		this.btnSelect.title = "Clique para anexar um arquivo";
		this.btnSelect.className = "btn btn-plus";
		this.btnSelect.textContent = "anexar";
		this.btnSelect.addEventListener("click", (e) => {
			this.campo.click();
		});
		this.campo.addEventListener("change", async (e) => {
			let arquivo = this.campo.files[0];
			if (arquivo) {
				try {
					const buffer = await arquivo.arrayBuffer();
					const hashUnico = await this.calcularHashNativo(buffer);
					const leitorBase64 = new FileReader();
					leitorBase64.readAsDataURL(arquivo);
					leitorBase64.onload = (evt64) => {
						const stringBase64 = evt64.target.result;
						let infoArquivo = {
							nome: arquivo.name,
							tipo: arquivo.type || 'application/octet-stream',
							tamanho_bytes: arquivo.size,
							hash_sha256: hashUnico,
							conteudo: stringBase64
						};
						this.hash = infoArquivo.hash_sha256;
						//Gravar a informação do arquivo no primeiro nível do Sistema
						let sistema = this.getModuloSistema();
						sistema.setArquivo(this.hash, infoArquivo);
						console.log("sistema", sistema)
						this.configuraBotoes(infoArquivo.nome);
					};
				} catch (erro) {
					console.error("Erro interno ao processar o arquivo selecionado:", erro);
					alert("Ocorreu um erro ao processar este arquivo. Verifique o console do navegador.");
				}
			} else {
				this.configuraBotoes();
			}
		});
		div.appendChild(this.btnSelect);
		this.btnView = document.createElement("button");
		this.btnView.className = "btn btn-view";
		this.btnView.textContent = "👁";
		this.btnView.hidden = true;
		this.btnView.addEventListener("click", (e) => {
			let sistema = this.getModuloSistema();
			let arquivo = sistema.getArquivo(this.hash);
			if (arquivo) {
				const linkTemporario = document.createElement('a');
				// Passa a string Base64 do JSON para a rota de download
				linkTemporario.href = arquivo.conteudo;
				linkTemporario.download = arquivo.nome;
				// Simula a ação automática de clique
				document.body.appendChild(linkTemporario);
				linkTemporario.click();
				document.body.removeChild(linkTemporario);
			} else {
				throw new Error("Arquivo não encontrado: " + this.hash);
			}
		});
		this.btnSelect.after(this.btnView);
		this.btnClear = document.createElement("button");
		this.btnClear.className = "btn btn-clear";
		this.btnClear.textContent = "🗑";
		this.btnClear.title = "Remove o arquivos selecionado";
		this.btnClear.hidden = true;
		this.btnClear.addEventListener("click", (e) => {
			this.campo.value = "";
			this.btnView.hidden = true;
			this.btnClear.hidden = true;
			this.btnSelect.textContent = "anexar";
			this.btnSelect.title = "Clique para anexar um arquivo";
			this.hash = null;
		});	
		this.btnView.after(this.btnClear);
	}
	configuraBotoes(nome) {
		const hasFile = !!this.hash;
		this.btnView.hidden = !hasFile;
		this.btnView.title = "Exibe o arquivo '" + nome + "'";
		this.btnClear.hidden = !hasFile;
		if (hasFile) {
			this.btnSelect.textContent = "alterar";
			this.btnSelect.title = "Clique para alterar o arquivo selecionado";
		} else {
			this.btnSelect.textContent = "anexar";
			this.btnSelect.title = "Clique para anexar um arquivo";
		}
	}
	async calcularHashNativo(buffer) {
		const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}
	setSomenteLeitura(valor) {
		this.btnSelect.disabled = valor;
		this.btnClear.disabled = valor;
	}
	focar() {
		this.btnSelect.parentNode.focus();
	}
	limpar(valor) {
		this.btnClear.click();
	}
	vazio() {
		if (this.hash) {
			return false;
		} else {
			return true;
		}
	}
	getValor() {
		return this.hash;
	}
	setValor(valor) {
		this.hash = valor;
		let sistema = this.getModuloSistema();
		if (valor) {
			let arquivo = sistema.getArquivo(valor);
			this.configuraBotoes(arquivo.nome);
		} else {
			this.configuraBotoes();
		}
	}
	getTipo() {
		return "arquivo";
	}
}
export class CampoCPF extends CampoDOM {
	constructor(elemento, nome, obj) {
		if (!obj) {
			obj = {};
		}
		obj.tipo = "input";
		obj.subtipo = "text";
		if (!obj.regras) {
			obj.regras = {};
		}
		obj.regras.mascara = /^\d{11}$/;
		super(elemento, nome, obj);
	}
	#formatar(cpf) {
		let valor = cpf.replace(/\D/g, '');
		return valor
			.replace(/^(\d{3})(\d)/, '$1.$2')
			.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
			.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
			.substring(0, 14); // Limita ao tamanho máximo do CPF mascarado
	}
	#validar(cpf) {
		if (cpf.length !== 11) return false;
		// Elimina CPFs com todos os números iguais (ex: 111.111.111-11)
		if (/^(\d)\1{10}$/.test(cpf)) return false;
		// Validação do 1º Dígito Verificador
		let soma = 0;
		for (let i = 0; i < 9; i++) {
			soma += parseInt(cpf.charAt(i)) * (10 - i);
		}
		let resto = (soma * 10) % 11;
		let digito1 = resto === 10 || resto === 11 ? 0 : resto;
		if (digito1 !== parseInt(cpf.charAt(9))) return false;
		// Validação do 2º Dígito Verificador
		soma = 0;
		for (let i = 0; i < 10; i++) {
			soma += parseInt(cpf.charAt(i)) * (11 - i);
		}
		resto = (soma * 10) % 11;
		let digito2 = resto === 10 || resto === 11 ? 0 : resto;
		if (digito2 !== parseInt(cpf.charAt(10))) return false;
		return true;
	}
	#limparValor() {
		let limpo = this.campo.value.replace(/[./-]/g, '');
		limpo = limpo.padStart(11, '0');
		return limpo;
	}
	validar() {
		let valor = this.getValor();
		this.setValor(valor);
		let lista = super.validar();
		if (this.#validar(valor)) {
			this.setValor(this.#formatar(valor));
		} else {
			let item = {};
			let nome = this.obj.titulo;
			if (!nome) {
				nome = this.nome;
			}
			item.mensagem = "CPF '" + nome + "' não está correto";
			item.componentes = [{componente: this}];
			lista.push(item);
		}
		return lista;
	}
	getValor() {
		let valor = this.#limparValor();
		return valor;
	}
	setValor(valor) {
		super.setValor(this.#formatar(valor));
	}
}
export class CampoCNPJ extends CampoDOM {
	constructor(elemento, nome, obj) {
		if (!obj) {
			obj = {};
		}
		obj.tipo = "input";
		obj.subtipo = "text";
		if (!obj.regras) {
			obj.regras = {};
		}
		obj.regras.mascara = /^[A-Z0-9]{12}\d{2}$/;
		super(elemento, nome, obj);
	}
	#formatar(cnpj) {
		let valor = cnpj.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
		if (valor.length > 0 && valor.length <= 4 && cnpj.includes('-')) {
			valor = valor.padStart(14, '0');
		}
		return valor
			.replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
			.replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
			.replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3/$4')
			.replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})\/([A-Z0-9]{4})([0-9])/, '$1.$2.$3/$4-$5')
			.substring(0, 18); // Limita ao tamanho máximo do CNPJ mascarado
	}
	#validar(cnpj) {
		cnpj = cnpj.replace(/[^\d]+/g, '');
		if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
			return false;
		}
		let tamanho = cnpj.length - 2;
		let numeros = cnpj.substring(0, tamanho);
		let digitos = cnpj.substring(tamanho);
		let soma = 0;
		let pos = tamanho - 7;
		for (let i = tamanho; i >= 1; i--) {
			soma += numeros.charAt(tamanho - i) * pos--;
			if (pos < 2) pos = 9;
		}
		let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
		if (resultado !== parseInt(digitos.charAt(0))) return false;
		tamanho = tamanho + 1;
		numeros = cnpj.substring(0, tamanho);
		soma = 0;
		pos = tamanho - 7;
		for (let i = tamanho; i >= 1; i--) {
			soma += numeros.charAt(tamanho - i) * pos--;
			if (pos < 2) pos = 9;
		}
		resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
		if (resultado !== parseInt(digitos.charAt(1))) return false;
		return true;
	}
	#limparValor() {
		let limpo = this.campo.value.replace(/[./-]/g, '');
		limpo = limpo.padStart(14, '0');
		return limpo
	}
	validar() {
		let valor = this.getValor();
		this.setValor(valor);
		let lista = super.validar();
		if (this.#validar(valor)) {
			this.setValor(this.#formatar(valor));
		} else {
			let item = {};
			let nome = this.obj.titulo;
			if (!nome) {
				nome = this.nome;
			}
			item.mensagem = "CNPJ '" + nome + "' não está correto";
			item.componentes = [{componente: this}];
			lista.push(item);
		}
		return lista;
	}
	getValor() {
		let valor = this.#limparValor();
		return valor;
	}
	setValor(valor) {
		super.setValor(this.#formatar(valor));
	}
}
export class CampoEMail extends CampoDOM {
	constructor(elemento, nome, obj) {
		if (!obj) {
			obj = {};
		}
		obj.tipo = "input";
		obj.subtipo = "text";
		if (!obj.regras) {
			obj.regras = {};
		}
		obj.regras.mascara = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		super(elemento, nome, obj);
	}
}
export class CampoTelefone extends CampoDOM {
	constructor(elemento, nome, obj) {
		if (!obj) {
			obj = {};
		}
		obj.tipo = "input";
		obj.subtipo = "text";
		if (!obj.regras) {
			obj.regras = {};
		}
		obj.regras.mascara = /^(\+?55\s?)?(\(?\d{2}\)?\s?)?(9?\d{4}-?\d{4}|\d{4}-?\d{4})$/;
		super(elemento, nome, obj);
	}
	#formatar(telefone) {
		if (!telefone) return "";
		const numeros = telefone.replace(/[^\d]+/g, '');
		const tam = numeros.length;
		switch (tam) {
			case 8:
				return `${numeros.substring(0, 4)}-${numeros.substring(4)}`;
			case 9:
				return `${numeros.substring(0, 5)}-${numeros.substring(5)}`;
			case 10:
				return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
			case 11:
				return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
			case 12:
				return `+${numeros.substring(0, 2)} (${numeros.substring(2, 4)}) ${numeros.substring(4, 8)}-${numeros.substring(8)}`;
			case 13:
				return `+${numeros.substring(0, 2)} (${numeros.substring(2, 4)}) ${numeros.substring(4, 9)}-${numeros.substring(9)}`;
			default:
				return telefone;
		}
	}
	#limparValor() {
		let valor = this.campo.value;
		let numeros = valor.replace(/[^\d]+/g, '');
		if (numeros.length <= 11) {
			numeros = "55" + numeros;
		}
		if (numeros.length === 11) { // 55 + 9 dígitos locais
			numeros = numeros.substring(0, 2) + "21" + numeros.substring(2);
		} else if (numeros.length === 10) { // 55 + 8 dígitos locais
			numeros = numeros.substring(0, 2) + "21" + numeros.substring(2);
		}
		return numeros; // Retorna sempre algo como "5511999999999"			
	}
	#validar(telefone) {
		const apenasNumeros = telefone.replace(/[^\d]+/g, '');
		if (/^(\d)\1+$/.test(apenasNumeros)) return false;
		// Validação extra de contexto brasileiro (opcional, mas altamente recomendada):
		// Se o usuário digitou o DDD, garantimos que o número não começa com 0 ou 1 no DDD (não existem DDDs começados com 0 ou 1)
		if (apenasNumeros.length >= 10) {
			// Se tem mais de 10 dígitos, isola os dígitos que representam o DDD
			const ddd = apenasNumeros.length === 13 || apenasNumeros.length === 12 
				? apenasNumeros.substring(2, 4) 
				: apenasNumeros.substring(0, 2);
			if (ddd.startsWith('0') || ddd.startsWith('1')) return false;
		}
		return true;
	}
	validar() {
		let valor = this.getValor();
		this.setValor(valor);
		let lista = super.validar();
		if (this.#validar(valor)) {
			this.setValor(this.#formatar(valor));
		} else {
			let item = {};
			let nome = this.obj.titulo;
			if (!nome) {
				nome = this.nome;
			}
			item.mensagem = "Telefone '" + nome + "' não está correto";
			item.componentes = [{componente: this}];
			lista.push(item);
		}
		return lista;
	}
	getValor() {
		let valor = this.#limparValor();
		return valor;
	}
	setValor(valor) {
		super.setValor(this.#formatar(valor));
	}
}