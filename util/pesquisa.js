export class ControlePesquisa {
	constructor(elementoPesquisa, campos) {
		this.elementoPesquisa = elementoPesquisa;
		this.elementoCampos = document.createElement("div");
		this.elementoCampos.className = "div-pesquisa";
		this.elementoPesquisa.appendChild(this.elementoCampos);
		let botao = document.createElement("button");
		botao.textContent = "Pesquisar";
		botao.style.margin = "5px";
		botao.style.marginLeft = "30px";
		botao.addEventListener("click", e => {
			e.preventDefault()
			if (this.aoFiltrar) {
				this.aoFiltrar(this.getFiltro());
			}
		});
		this.elementoPesquisa.appendChild(botao);
		this.campos = campos;
		for (const key in this.campos) {
			this.campos[key].key = key;
		}
		this.operadores = {
			"igual": "igual",
			"diferente": "diferente",
			"contem": "contém",
			"nao_contem": "não contém",
			"pertence": "pertence",
			"nao_pertence": "não pertence",
			"vazio": "está vazio",
			"nao_vazio": "não está vazio",
			"maior": "maior",
			"menor": "menor",
			"comeca": "começa",
			"termina": "termina",
		}
		const estilo = document.createElement('style');
		estilo.textContent = '.div-pesquisa :is(input, select) { margin: 3px; height: 20px}';
		document.head.appendChild(estilo);
	}
	limpar(tudo) {
		this.elementoCampos.textContent = "";
		if (!tudo) {
			this.incluirLinha();
		}
	}
	setFiltro(filtro) {
		this.limpar(true);
		for (let f of filtro) {
			let sel = this.incluirLinha(f.campo);
			sel.span.children[0].value = f.op;
			sel.span.children[1].value = f.valor;
			sel.span.children[2].value = f.log;
		}
	}
	getFiltro() {
		let saida = [];
		this.elementoCampos.querySelectorAll(".selCampo").forEach(e => {
			if (e.span) {
				let op = e.span.children[0].value;
				let valor = e.span.children[1].value;
				let log = e.span.children[2].value;
				if (valor || ["vazio", "nao_vazio"].includes(op)) {
					saida.push({
						campo: e.value,
						op: op,
						valor: valor,
						log: log
					});
				}
			}
		});
		let ultimo = saida[saida.length - 1];
		for (let f of saida) {
			if (f != ultimo && !f.log) {
				throw new Error("É necessário definir o operador lógico do campo '" + f.campo + "'");
			}
		}
		return saida;
	}
	incluirLinha(campo) {
		let sel = document.createElement("select");
		sel.className = "selCampo";
		sel.addEventListener('change', e => {
			//console.log("change", e);
			let span = e.target.span;
			if (span) {
				e.target.span.textContent = "";
			} else {
				span = document.createElement("span")
				e.target.span = span;
				this.elementoCampos.appendChild(span);
				this.elementoCampos.appendChild(document.createElement('br'));
			}
			let campo = e.target.value;
			let op = document.createElement("select");
			for (const key in this.operadores) {
				if (!this.campos[campo].tiposPermitidos || this.campos[campo].tiposPermitidos.includes(key)) {
					let opt = document.createElement("option");
					opt.text = this.operadores[key];
					opt.value = key;
					op.add(opt);
				}
			}
			op.value = this.campos[campo].tipoPesquisa;
			span.appendChild(op);
			let valor = null;
			if (this.campos[campo].opcoes) {
				valor = document.createElement("select");
				valor.add(new Option(''));
				for (let vo of this.campos[campo].opcoes) {
					valor.add(new Option(vo));
				}
			} else {
				valor = document.createElement("input");
			}
			valor.style.width = "200px";
			span.appendChild(valor);
			let log = e.target.log;
			if (!log) {
				log = document.createElement("select");
				e.target.log = log;
				log.add(new Option(''));
				log.add(new Option('E'));
				log.add(new Option(') E'));
				log.add(new Option('E ('));
				log.add(new Option(') E ('));
				log.add(new Option('OU'));
				log.add(new Option(') OU'));
				log.add(new Option('OU ('));
				log.add(new Option(') OU ('));
				log.addEventListener('change', e => {
					if (!log.sel) {
						let r = this.incluirLinha();
						log.sel = r;
					}
				});
			}
			//No caso de inserir mais de um campo, evitar de criar novos campos na alteração de log nos anteriores
			let outrosSelects = this.elementoCampos.querySelectorAll(".selCampo");
			if (outrosSelects.length > 1) {
				let logAnt = outrosSelects[outrosSelects.length - 2].span.children[2];
				if (logAnt) {
					if (!logAnt.value) {
						logAnt.value = "E";
					}
					logAnt.sel = e.target;
				}
			}
			span.appendChild(log);
		});
		sel.add(document.createElement("option"));
		for (const key in this.campos) {
			sel.add(new Option(this.campos[key].descricao, key));
		}
		this.elementoCampos.appendChild(sel);
		if (campo) {
			sel.value = campo;
			const e = new Event('change', { bubbles: true });
			sel.dispatchEvent(e);
		}
		return sel;
	}
}