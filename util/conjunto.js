export class Conjunto {
	constructor(array = Array.of()) {
		this.itens = [...array];
		}
		adicionar(...novosItens) {
		novosItens.forEach(item => {
		  if (!this.itens.includes(item)) {
			this.itens.push(item);
		  }
		});
		return this;
	}
	remover(...itensParaRemover) {
		this.itens = this.itens.filter(item => !itensParaRemover.includes(item));
		return this;
	}
	e(outroArray) {
		const listaOutro = outroArray instanceof Conjunto ? outroArray.itens : outroArray;
		const resultado = this.itens.filter(item => listaOutro.includes(item));
		return new Conjunto(resultado);
	}
	ou(outroArray) {
		const listaOutro = outroArray instanceof Conjunto ? outroArray.itens : outroArray;
		const resultado = [...new Set([...this.itens, ...listaOutro])];
		return new Conjunto(resultado);
	}
	nao(outroArray) {
		const listaOutro = outroArray instanceof Conjunto ? outroArray.itens : outroArray;
		const resultado = this.itens.filter(item => !listaOutro.includes(item));
		return new Conjunto(resultado);
	}
	resultado() {
		return this.itens;
	}
}
