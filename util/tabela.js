import { Util } from './util.js?v5';

export class ControleTabela {
	constructor(tb, campos, camposExclusaoComparacao) {
		this.tb = tb;
		this.campos = campos;
		for (const key in this.campos) {
			this.campos[key].key = key;
		}
		this.camposExclusaoComparacao = camposExclusaoComparacao;
		this.util = new Util();
	}
	#inserirCabecalho(row, nome, ajuda) {
		if (ajuda) {
			row.insertCell().outerHTML  = "<th title='" + ajuda + "'>" + nome + "</th>";
		} else {
			row.insertCell().outerHTML  = "<th>" + nome + "</th>";
		}
	}
	#inserirColuna(row, campo, obj, objComparacao) {
		let nome = campo.key;
		let valor = obj[nome];
		if (typeof valor == "undefined") {
			valor = "";
		} else if (campo.tipo == "date") {
			valor = new Date(valor).toLocaleDateString()
		} 
		let c = row.insertCell();
		if (campo.metodo) {
			c.innerHTML = "<a href='javascript:void(0)')>" + valor + "</a>";
			c.addEventListener('click', () => {
				this.util.verificarSessao();
				campo.metodo(obj, objComparacao);
			});
		} else {
			c.textContent = valor;
		}
		if (objComparacao) {
			let valorComparacao = objComparacao[nome];
			if (typeof valorComparacao == "undefined") {
				valorComparacao = "";
			} else if (campo.tipo == "date") {
				valorComparacao = new Date(valorComparacao).toLocaleDateString()
			} 
			if (valor != valorComparacao) {
				c.title = valorComparacao;
				if (this.camposExclusaoComparacao && this.camposExclusaoComparacao.includes(campo.key)) {
					c.style.backgroundColor = "lightyellow";
				} else {
					c.style.backgroundColor = "lightcoral";
				}
			}
		}
	}
	static verificaAlteracao(reg1, reg2, listaExclusao) {
		let alteracao = false;
		for (const chave in reg1) {
			if (listaExclusao && listaExclusao.includes(chave)) {
			} else if (String(reg1[chave]) != String(reg2[chave])) {
				alteracao = true;
			}
		}
		return alteracao;
	}
	criar(dados, dadosComp, somenteNaoIguais) {
		this.tb.innerHTML = "";
		let campoChave = null;
		let r = this.tb.insertRow();
		for (let c in this.campos) {
			if (this.campos[c].descricao) {
				this.#inserirCabecalho(r, this.campos[c].descricao);
			} else {
				this.#inserirCabecalho(r, c);
			}
			if (this.campos[c].tipo == "chave") {
				campoChave = c;
			}
		}
		if (dadosComp) {
			this.#inserirCabecalho(r, "Comparação", "Resultado da comparação dos dados salvos com os dados atuais");
		}
		for (let reg of dados) {
			let aux = null;
			let situacao = null;
			if (dadosComp) {
				aux = dadosComp.find(item => item[campoChave] == reg[campoChave]);
				if (aux) {
					if (ControleTabela.verificaAlteracao(reg, aux, this.camposExclusaoComparacao)) {
						situacao = "Diferente";
					} else {
						situacao = "Igual";
					}
				} else {
					situacao = "Não está na comparação.";
				}
			}
			if (!somenteNaoIguais || situacao != "Igual") {
				let r = this.tb.insertRow();
				for (let c in this.campos) {
					this.#inserirColuna(r, this.campos[c], reg, aux);
				}
				if (dadosComp) {
					let c = r.insertCell();
					c.textContent = situacao;
					if (situacao == "Diferente") {
						c.title = "Passe o mouse por cima para ver a diferença na célula marcada";
						c.style.backgroundColor = "lightcoral";
					} else if (situacao != "Igual") {
						r.style.backgroundColor = "lightblue";
					}
				}
			}
		}
		if (dadosComp) {
			for (let reg of dadosComp) {
				let aux = dados.find(item => item[campoChave] == reg[campoChave]);
				if (!aux) {
					let r = this.tb.insertRow();
					for (let c in this.campos) {
						this.#inserirColuna(r, this.campos[c], reg, aux);
					}
					let c = r.insertCell();
					c.textContent = "Não está no primeiro";
					r.style.backgroundColor = "lightblue";
				}
			}
		}		
	}
	static gerarTabelaVertical(objeto, comp, camposIgnorar, camposExclusaoComparacao) {
		var listaIgnorar = Array.isArray(camposIgnorar) ? camposIgnorar : [];
		if (!objeto || Object.keys(objeto).length === 0) {
			return '<p>Nenhum dado disponível para exibição.</p>';
		}
		// 1. Extrai as chaves e filtra os campos que devem ser ignorados
		var chavesFiltradas = Object.keys(objeto).filter(function(chave) {
			return listaIgnorar.indexOf(chave) === -1;
		});
		// 2. Ordena as chaves restantes em ordem alfabética (A-Z)
		// O localeCompare garante a ordenação correta mesmo com acentos ou caracteres especiais
		chavesFiltradas.sort(function(a, b) {
			return a.localeCompare(b);
		});
		// 3. Monta a estrutura da tabela HTML
		var html = '<table>';
		html += '<thead style="background-color: #f2f2f2;"><tr>';
		html += '<th style="width: 30%;">Atributo</th>';
		html += '<th style="width: 70%;">Valor</th>';
		html += '</tr></thead>';
		html += '<tbody>';
		// 4. Varre as chaves já filtradas e ordenadas para construir as linhas
		chavesFiltradas.forEach(function(chave) {
			var valor = (objeto[chave] !== undefined && objeto[chave] !== null) ? objeto[chave] : '';
			var valorTratado = (typeof valor === 'object') ? JSON.stringify(valor) : valor;
			if (comp) {
				let valComp = (comp[chave] !== undefined && comp[chave] !== null) ? comp[chave] : '';
				if (valComp != valor) {
				}
			}
			html += '<tr>';
			html += '<td style="font-weight: bold; background-color: #fafafa;">' + chave + '</td>';
			if (comp) {
				let valComp = (comp[chave] !== undefined && comp[chave] !== null) ? comp[chave] : '';
				if (valComp != valor) {
					if (camposExclusaoComparacao && camposExclusaoComparacao.includes(chave)) {
						html += '<td style="background-color:lightyellow" title="' + valComp + '">' + valorTratado + '</td>';
					} else {
						html += '<td style="background-color:lightcoral" title="' + valComp + '">' + valorTratado + '</td>';
					}
				} else {
					html += '<td>' + valorTratado + '</td>';
				}
			} else {
				html += '<td>' + valorTratado + '</td>';
			}
			html += '</tr>';
		});
		html += '</tbody></table>';
		return html;
	}
	static jsonParaTabela(dados, colunasRemover) {
		if (!dados || dados.length === 0) return "<table><tr><td>Sem dados</td></tr></table>";
		// 1. Pegamos as chaves e FILTRAMOS o que não queremos mostrar
		const colunas = Object.keys(dados[0]).filter(col => !colunasRemover.includes(col));
		// 2. Montamos o cabeçalho apenas com as colunas filtradas
		const cabecalho = '<thead><tr>' + 
			colunas.map(col => '<th>' + col + '</th>').join('') + '</tr></thead>';
		// 3. Montamos o corpo usando apenas as colunas que restaram no array 'colunas'
		const corpo = '<tbody>' + dados.map(item => {
			const celulas = colunas.map(col => '<td>' + (item[col] ?? '') + '</td>').join('');
			return '<tr>' + celulas + '</tr>';
		}).join('') + '</tbody>';

		return '<table border="1">' + cabecalho + corpo + '</table>';
	}
	gerarCSV(listaDados, nomeArquivo = 'exportacao.csv') {
	  const conteudoCSV = [];
		  // 1. Extrai as chaves dos dados e mapeia os títulos a partir de 'descricao'
		  const chaves = Object.keys(this.campos);
		  const titulosCabecalho = chaves.map(chave => this.campos[chave].descricao);
		  
		  // Adiciona a primeira linha (cabeçalho) com ponto e vírgula
		  conteudoCSV.push(titulosCabecalho.join(';'));

		  // 2. Varre o array de dados para montar as linhas do arquivo
		  listaDados.forEach(item => {
			const linhaFormatada = chaves.map(chave => {
			  // Busca o valor no objeto usando a chave correspondente
			  let valor = item[chave] !== undefined && item[chave] !== null ? String(item[chave]) : '';
			  if (this.campos[chave].tipo == "date") {
				valor = new Date(valor).toLocaleDateString();
			  }
			  // Limpa quebras de linha internas e escapa aspas duplas (padrão RFC 4180)
			  valor = valor.replace(/"/g, '""');
			  
			  // Tratamento PT-BR: se o texto contiver ponto e vírgula ou quebras de linha, envolve em aspas
			  if (valor.includes(';') || valor.includes('\n') || valor.includes('\r')) {
				valor = `"${valor}"`;
			  }
			  
			  return valor;
			});

			conteudoCSV.push(linhaFormatada.join(';'));
		  });

		  // 3. Junta as linhas. O prefixo '\uFEFF' (BOM UTF-8) obriga o Excel a abrir sem quebrar acentos (como 'Inventário')
		  const csvFinal = '\uFEFF' + conteudoCSV.join('\n');

		  // 4. Cria o arquivo na memória e força o download no navegador
		  const blob = new Blob([csvFinal], { type: 'text/csv;charset=utf-8;' });
		  const link = document.createElement('a');
		  link.href = URL.createObjectURL(blob);
		  link.setAttribute('download', nomeArquivo);
		  
		  link.style.visibility = 'hidden';
		  document.body.appendChild(link);
		  link.click();
		  document.body.removeChild(link);
	}
}
