import { Conjunto } from './conjunto.js?v5';

export class ProcessadorLogico {
	// MÈTODO PRIVADO: Transforma o JSON bruto na Árvore de Sintaxe Abstrata (AST)
	static #gerarArvore(regrasJson) {
		if (!regrasJson || regrasJson.length === 0) return [];

		const tokens = [];

		regrasJson.forEach((regra, index) => {
		  tokens.push({ tipo: "REGRA", dados: regra });

		  const ehUltimo = index === regrasJson.length - 1;
		  
		  if (regra.log && !ehUltimo) {
			const partes = regra.log.match(/\)|\(|[^\s()]+/g) || [];
			partes.forEach(parte => {
			  const termo = parte.trim().toUpperCase();
			  if (termo === "(") tokens.push({ tipo: "ABRE_PAR" });
			  else if (termo === ")") tokens.push({ tipo: "FECHA_PAR" });
			  else if (["E", "OU", "NÃO"].includes(termo)) tokens.push({ tipo: "OPERADOR", valor: termo });
			});
		  }
		});

		const raiz = [];
		const pilha = [raiz];

		tokens.forEach(token => {
		  let grupoAtual = pilha[pilha.length - 1];

		  if (token.tipo === "ABRE_PAR") {
			const novoGrupo = [];
			grupoAtual.push(novoGrupo);
			pilha.push(novoGrupo);
		  } else if (token.tipo === "FECHA_PAR") {
			if (pilha.length > 1) pilha.pop();
		  } else {
			grupoAtual.push(token);
		  }
		});

		return raiz;
	}
	static filtrarEmMemoria(regrasJson, dadosOriginais, callbackFiltrar) {
		const raiz = this.#gerarArvore(regrasJson);
		if (raiz.length === 0) return dadosOriginais;

		function avaliar(elemento) {
		  if (!Array.isArray(elemento)) {
			return new Conjunto(callbackFiltrar(dadosOriginais, elemento.dados));
		  }
		  if (elemento.length === 0) return new Conjunto([]);

		  let itens = elemento.map(item => {
			if (Array.isArray(item) || item.tipo === "REGRA") {
			  return { tipo: "CONJUNTO", valor: avaliar(item) };
			}
			return item;
		  });

		  let i = 1;
		  while (i < itens.length) {
			const op = itens[i];
			if (op.tipo === "OPERADOR" && (op.valor === "E" || op.valor === "NÃO")) {
			  const esq = itens[i - 1].valor;
			  const dir = itens[i + 1].valor;
			  const result = op.valor === "E" ? esq.e(dir) : esq.nao(dir);
			  itens.splice(i - 1, 3, { tipo: "CONJUNTO", valor: result });
			} else {
			  i += 2;
			}
		  }

		  let conjuntoFinal = itens[0].valor;
		  for (let j = 1; j < itens.length; j += 2) {
			if (itens[j].tipo === "OPERADOR" && itens[j].valor === "OU") {
			  conjuntoFinal = conjuntoFinal.ou(itens[j + 1].valor);
			}
		  }
		  return conjuntoFinal;
	}

	return avaliar(raiz).resultado();
	}
	static paraSqlWhere(regrasJson) {
		const raiz = this.#gerarArvore(regrasJson);
		if (raiz.length === 0) return "";

		const mapearCondicaoSql = ({ campo, op, valor }) => {
		  const v = typeof valor === "string" ? `'${valor.replace(/'/g, "''")}'` : valor;
		  switch (op) {
			case "igual": return `${campo} = ${v}`;
			case "diferente": return `${campo} != ${v}`;
			case "contem": return `${campo} LIKE '%${valor}%'`;
			case "nao_contem": return `${campo} NOT LIKE '${valor}%'`;
			case "pertence": return `'${valor}' LIKE '%' + ${campo} + '%'`;
			case "nao_pertence": return `'${valor}' NOT LIKE '%' + ${campo} + '%'`;
			case "vazio": return `TRIM(COALESCE(${campo}, '')) = ''`;
			case "nao_vazio": return `TRIM(COALESCE(${campo}, '')) != ''`;
			case "maior": return `${campo} > ${v}`;
			case "menor": return `${campo} < ${v}`;
			case "comeca": return `${campo} LIKE '${valor}%'`;
			case "termina": return `${campo} LIKE '%${valor}'`;
			default: return `${campo} = ${v}`;
		  }
		};
		function processar(elemento) {
		  if (!Array.isArray(elemento)) {
			return mapearCondicaoSql(elemento.dados);
		  }
		  if (elemento.length === 0) return "";

		  let itens = elemento.map(item => {
			if (Array.isArray(item) || item.tipo === "REGRA") {
			  const str = processar(item);
			  return Array.isArray(item) ? `(${str})` : str;
			}
			return item.valor === "E" ? "AND" : item.valor === "OU" ? "OR" : "NOT";
		  });

		  if (itens.includes("AND") && itens.includes("OR")) {
			let i = 1;
			while (i < itens.length) {
			  if (itens[i] === "AND") {
				itens.splice(i - 1, 3, `(${itens[i - 1]} AND ${itens[i + 1]})`);
			  } else {
				i += 2;
			  }
			}
		  }
		  return itens.join(" ");
		}
		return processar(raiz);
	}
	// Filtro genérico pelo nome do campo
	static processaFiltroCampo(regra, dados) {
		let campo = regra.campo;
		let valor = regra.valor.toLowerCase();
		let temp = dados;
		switch (regra.op) {
			case "igual":
				temp = dados.filter(s => 
					s[campo] && s[campo].toLowerCase() === valor
				);
				break;
			case "diferente":
				temp = dados.filter(s => 
					s[campo] && s[campo].toLowerCase() !== valor
				);
				break;
			case "contem":
				temp = dados.filter(s => 
					s[campo] && s[campo].toLowerCase().includes(valor)
				);
				break;
			case "nao_contem":
				temp = dados.filter(s => 
					s[campo] && !s[campo].toLowerCase().includes(valor)
				);
				break;
			case "pertence":
				temp = dados.filter(s => 
					s[campo] && valor.includes(s[campo].toLowerCase())
				);
				break;
			case "nao_pertence":
				temp = dados.filter(s => 
					s[campo] && !valor.includes(s[campo].toLowerCase())
				);
				break;
			case "vazio":
				temp = dados.filter(s => 
					!s[campo]
				);
				break;
			case "nao_vazio":
				temp = dados.filter(s => 
					s[campo]
				);
				break;
			case "maior":
				temp = dados.filter(s => 
					s[campo] && s[campo].toLowerCase() < valor
				);
				break;
			case "menor":
				temp = dados.filter(s => 
					s[campo] && s[campo].toLowerCase() > valor
				);
				break;
			case "comeca":
				temp = dados.filter(s => 
					s[campo] && s[campo].toLowerCase().startsWith(valor)
				);
				break;
			case "termina":
				temp = dados.filter(s => 
					s[campo] && s[campo].toLowerCase().endsWith(valor)
				);
				break;
			default:
				throw new Error("Código não reconhecido");
				break;
		}
		return temp;
	}
}
