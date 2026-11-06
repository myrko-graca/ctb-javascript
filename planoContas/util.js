export class TransformaContas {
	#getListaContas(reg, prefixoCodigo) {
		let lista = [];
		let codigo = prefixoCodigo + reg.codigo;
		lista.push({codigo: codigo, descricao: reg.descricao, saldo: reg.saldo, sintetica: reg.sintetica});
		if (reg.sub) {
			for (let sub of reg.sub) {
				lista.push(...this.#getListaContas(sub, codigo + "."));
			}
		}
		return lista;
	}
	getLista(contas) {
		let lista = [];
		lista.push(...this.#getListaContas(contas.sistemaContabil.ativos, ""));
		lista.push(...this.#getListaContas(contas.sistemaContabil.passivos, ""));
		lista.push(...this.#getListaContas(contas.sistemaContabil.receitas, ""));
		lista.push(...this.#getListaContas(contas.sistemaContabil.despesas, ""));
		return lista;
	}
}