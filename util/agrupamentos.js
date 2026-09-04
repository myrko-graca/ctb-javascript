export class Agrupamento {
	constructor(tabela, disponiveis, selecionados) {
		this.tabela = tabela;
		this.disponiveis = disponiveis;
		this.selecionados = selecionados;
		this.dadosAgrupados = null;
		this.aoAgrupar = null;
	}
	montarCamposAgrupamento(div, campos) {
		div.textContent = "";
		div.style.display = "flex";
		div.style.alignItems = "center";
		div.style.gap = "15px";
		let div1 = document.createElement("div");
		let label = document.createElement("label");
		label.textContent = "Disponíveis:";
		div1.appendChild(label);
		div1.appendChild(document.createElement("br"));
		let sel = document.createElement("select");
		this.disponiveis = sel;
		sel.multiple = true;
		sel.style.width = "150px"
		sel.style.height = "120px"
		for (let c in campos) {
			let op = new Option(campos[c].descricao, c);
			sel.add(op);
		}
		div1.appendChild(sel);
		div.appendChild(div1);
		let div2 = document.createElement("div");
		div2.style.display = "flex";
		div2.style.flexDirection = "column";
		div2.style.gap = "8px";
		let bt1 = document.createElement("button");
		bt1.innerText = " Adicionar > ";
		div2.appendChild(bt1);
		let bt2 = document.createElement("button");
		bt2.innerText = " < Remover ";
		div2.appendChild(bt2);
		div.appendChild(div2);
		let div3 = document.createElement("div");
		label = document.createElement("label");
		label.textContent = "Selecionados:";
		div3.appendChild(label);
		div3.appendChild(document.createElement("br"));
		sel = document.createElement("select");
		this.selecionados = sel;
		sel.multiple = true;
		sel.style.width = "150px"
		sel.style.height = "120px"
		div3.appendChild(sel);
		div.appendChild(div3);
		this.disponiveis.addEventListener('dblclick', () => {
			this.adicionar();
		});
		this.selecionados.addEventListener('dblclick', () => {
			this.remover();
		});
		bt1.addEventListener('click', (e) => {
			e.preventDefault();
			this.adicionar();
		});
		bt2.addEventListener('click', (e) => {
			e.preventDefault();
			this.remover();
		});
	}
	criar(dados, campos) {
		this.dados = dados;
		this.dadosAgrupados =  this.criarAgrupamento(dados, campos);
		this.criarTabela(this.dadosAgrupados, this.tabela);
		if (this.aoAgrupar) {
			this.aoAgrupar();
		}
	}
	setCampos(campos) {
		for (let c of campos) {
			const opcao = this.disponiveis.querySelector("option[value='" + c + "']");
			if (!opcao) {
				throw new Error("Campo não disponível para agrupamento: " + c);
			}
			opcao.selected = true;
			this.adicionar();
		}
	}
	criarAgrupamento(dados, campos) {
		if (!campos) {
			campos = Array.from(this.selecionados.options).map(opcao => opcao.value);
		}
		let agrupamento = new Object();
		for (let v of dados) {
			let a = agrupamento;
			for (let c of campos) {
				let valor = v[c];
				if (campos.indexOf(c) != campos.length - 1) { 
					if (!a[valor]) {
						a[valor] = {};
					}
					a = a[valor];
				} else { //último campo
					if (!a[valor]) {
						a[valor] = [];
					}
					a = a[valor];
					a.push(v);
				}
			}
		}
		return agrupamento;
	}
	criarTabela(dados, tb) {
		dados = Object.fromEntries(
			Object.entries(dados).sort((a, b) => a[0].localeCompare(b[0]))
		);
		if (tb) {
			tb.innerHTML = "";
		} else {
			tb = document.createElement("table");
			tb.style.width = "100%";
			tb.style.border = "none";
		}
		for (let key in dados) {
			let r = tb.insertRow();
			let ckey = r.insertCell();
			ckey.textContent = key;
			if (Array.isArray(dados[key])) {
				let c = r.insertCell();
				c.textContent = dados[key].length;
				c.style.textAlign = "right";
				ckey.style.width = "80%";
			} else {
				let tba = this.criarTabela(dados[key]);
				let c = r.insertCell();
				c.appendChild(tba);
				c.style.width = "80%";
			}
		}
		return tb;
	}
	adicionar() {
		const itensSelecionados = this.disponiveis.querySelectorAll('option:checked');
		itensSelecionados.forEach(opcao => {
			this.selecionados.appendChild(opcao);
		});
		this.criar(this.dados);
	}
	remover() {
		const itensSelecionados = this.selecionados.querySelectorAll('option:checked');
		itensSelecionados.forEach(opcao => {
			this.disponiveis.appendChild(opcao);
		});
		this.criar(this.dados);
	}
}
