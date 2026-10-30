import { Modal, ControleAba } from '../util/util.js?vc1';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from '../util/form.js?vc1';
import { NavigationMenu } from '../util/menu.js?vc1';
import { GerenciadorPagamentosContabil } from './gerenciadorPagamentos.js?v0.9';
const { jsPDF } = window.jspdf;

let ehCelular = window.innerWidth <= 768;

function calcularCRC16(payload) {
	let crc = 0xFFFF;
	for (let i = 0; i < payload.length; i++) {
		crc ^= payload.charCodeAt(i) << 8;
		for (let j = 0; j < 8; j++) {
			if ((crc & 0x8000) !== 0) {
				crc = (crc << 1) ^ 0x1021;
			} else {
				crc <<= 1;
			}
		}
	}
	crc = (crc & 0xFFFF).toString(16).toUpperCase();
	return crc.padStart(4, '0');
}
function gerarPayloadPix(chavePix, nomeRecebedor, cidadeRecebedor, valorPagar) {
	const pChave = `01${chavePix.length.toString().padStart(2, '0')}${chavePix}`;
	const pMerchant = `0014br.gov.bcb.pix${pChave}`;
	valorPagar += "";
	let payload = "000201"; 
	payload += `26${pMerchant.length.toString().padStart(2, '0')}${pMerchant}`;
	payload += "52040000"; 
	payload += "5303986"; 
	payload += `54${valorPagar.length.toString().padStart(2, '0')}${valorPagar}`;
	payload += "5802BR"; 
	payload += `59${nomeRecebedor.length.toString().padStart(2, '0')}${nomeRecebedor}`;
	payload += `60${cidadeRecebedor.length.toString().padStart(2, '0')}${cidadeRecebedor}`;
	payload += "62070503***"; 
	payload += "6304"; 

	const crc16 = calcularCRC16(payload);
	return payload + crc16;
}
function formatarTexto(texto, limite) {
	if (!texto) return "";
	const textoFormatado = texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase();
	return textoFormatado.substring(0, limite);
}
function formatarMoeda(numero) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero);
}
class FolhaPagamento extends ModuloSistemaDOM {
	constructor() {
		let elemento = document.getElementById("folhaPagamento");
		super(elemento, "folhaPagamento", {
			qtdColunas: 4,
			regras: {obrigatorio: true}
		});
		this.aba = new ControleAba(document.body);
		this.add(new ComboFiltroDOM(null, "contaFGTSARecolher", {
			titulo: "FGTS a recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaINSSARecolher", {
			titulo: "INSS a recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaIRRFARecolher", {
			titulo: "IRRF a recolher", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaValeTransporte", {
			titulo: "Vale transporte disponível", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaProvisao13o", {
			titulo: "Provisão de 13º Salário", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaProvisaoFeriasTerco", {
			titulo: "Provisão de Férias/Terço", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaProvisaoFGTSARecolher", {
			titulo: "FGTS Prov. Férias/Terço/13º a Recolher", 
			spanV: 2,
		}));
		this.add(new TiposFuncionarios(this.aba));
		this.add(new ProcessamentoFolha(this.aba));
		this.add(new Funcionarios(this.aba));
	}
	preencherCombos() {
		let listaContasAtivo = this.listaContas.filter(lc => lc.value.startsWith("1."));
		let listaContasPassivo = this.listaContas.filter(lc => lc.value.startsWith("2."));
		let listaContasDespesas = this.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
		this.getComponente("contaValeTransporte").setOpcoes(listaContasAtivo);
		listaContasPassivo = this.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("2."));
		this.getComponente("contaFGTSARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("contaINSSARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("contaIRRFARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("contaProvisao13o").setOpcoes(listaContasPassivo);
		this.getComponente("contaProvisaoFeriasTerco").setOpcoes(listaContasPassivo);
		this.getComponente("contaProvisaoFGTSARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("tiposFuncionarios").preencherCombos(this.listaContasNaoSinteticas);
		this.getComponente("funcionarios").preencherCombos(this.listaContasNaoSinteticas);
	}
	setValor(valor) {
		this.getComponente("funcionarios").preencherCombos(this.listaContasNaoSinteticas);
		this.getComponente("processamentoFolha").getComponente("colaboradoresProcessamento").preencherCombos(valor.folhaPagamento?.funcionarios);
		super.setValor(valor);
		console.log("ProcessamentoFolha", valor);
	}
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
	setContas(contas) {
		let lista = [];
		lista.push(...this.#getListaContas(contas.sistemaContabil.ativos, ""));
		lista.push(...this.#getListaContas(contas.sistemaContabil.passivos, ""));
		lista.push(...this.#getListaContas(contas.sistemaContabil.receitas, ""));
		lista.push(...this.#getListaContas(contas.sistemaContabil.despesas, ""));
		this.contas = contas.sistemaContabil;
		this.listaContas = lista.map(({ codigo, descricao }) => ({
			text: codigo + " - " + descricao,
			value: codigo
		}));
		this.listaContasNaoSinteticas = lista.filter(item => !item.sintetica).map(({ codigo, descricao }) => ({
			text: codigo + " - " + descricao,
			value: codigo
		}));
		this.preencherCombos();
	}
	focar() {
		super.focar();
		this.aba.alternar("abaParametrosFolha");
	}
}
class TiposFuncionarios extends FichasDOM {
	constructor() {
		super(null, "tiposFuncionarios", {
			titulo: "Tipos de Colaboradores",
			qtdColunas: 2,
			spanV: 4,
			regras: {campoChave: "nome"},
			ordem: "nome",
		});
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome", 
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "ehConstrucaoManutencao", {
			titulo: "É Construção e/ou Manutenção?", 
			subtipo: "checkbox",
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaSalario", {
			titulo: "Despesa com salário", 
			regras: {obrigatorio: true},
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaHorasExtras", {
			titulo: "Despesa com horas extras", 
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaAdicionalNoturno", {
			titulo: "Despesa com com adicional noturno", 
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaFGTS", {
			titulo: "Despesa com FGTS", 
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaVT", {
			titulo: "Despesa com Vale Transporte", 
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesa13o", {
			titulo: "Despesas com Provisão de 13º", 
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaFeriasTerco", {
			titulo: "Despesas com Provisão de Férias/Terço", 
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaFGTSProvisoes", {
			titulo: "Despesas com FGTS sobre Provisões", 
		}));
	}
	preencherCombos(listaContasNaoSinteticas) {
		let lista = listaContasNaoSinteticas.filter(lc => lc.value.startsWith("1.") || lc.value.startsWith("4."));
		this.getComponente("contaDespesaSalario").setOpcoes(lista);
		this.getComponente("contaDespesaHorasExtras").setOpcoes(lista);
		this.getComponente("contaDespesaAdicionalNoturno").setOpcoes(lista);
		this.getComponente("contaDespesaFGTS").setOpcoes(lista);
		this.getComponente("contaDespesaVT").setOpcoes(lista);
		this.getComponente("contaDespesa13o").setOpcoes(lista);
		this.getComponente("contaDespesaFeriasTerco").setOpcoes(lista);
		this.getComponente("contaDespesaFGTSProvisoes").setOpcoes(lista);
	}
	focar() {
		super.focar();
		this.aba("abaParametrosFolha");
	}
}
class FeriasFuncionario extends ConjuntoDOM {
	constructor() {
		super(null, "ferias", {
			titulo: "Férias",
			qtdColunas: 2,
			spanV: 6,
			somentePrimeiroLabel: true
		});
		this.add(new IntervaloDOM(null, "periodo", {
			titulo: "Período", 
			spanV: 2,
			regras: {obrigatorio: true},
		}));
	}
}
class Funcionarios extends FichasDOM {
	constructor(aba) {
		let elemento = document.getElementById("funcionarios");
		super(elemento, "funcionarios", {
			titulo: "Funcionários",
			qtdColunas: 8,
			regras: {campoChave: "codigo"},
			ordem: "nome"
		});
		this.aba = aba;
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome", 
			spanV: 3,
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "chavePix", {
			titulo: "Chave PIX", 
			spanV: 3,
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "tipo", {
			titulo: "Tipo", 
			spanV: 3,
			regras: {obrigatorio: true},
			tipo: "select",
		}));
		this.add(new ComboFiltroDOM(null, "contaPassivo", {
			titulo: "Conta", 
			regras: {obrigatorio: true},
			spanV: 3,
		}));
		this.add(new CampoDOM(null, "salarioBase", {
			titulo: "Salário base", 
			regras: {obrigatorio: true},
			subtipo: "number",
			spanV: 2,
		}));
		this.add(new CampoDOM(null, "dependentes", {
			titulo: "Dependentes", 
			regras: {obrigatorio: true},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "utilizaVT", {
			titulo: "Utiliza VT?", 
			subtipo: "checkbox",
		}));
		this.add(new CampoDOM(null, "custoRealVT", {
			titulo: "Custo real do VT", 
			subtipo: "number",
			spanV: 2,
		}));
		this.add(new CampoDOM(null, "cargo", {
			titulo: "Cargo", 
			spanV: 2
		}));
		this.add(new CampoDOM(null, "regime", {
			titulo: "Regime", 
			tipo: "select",
			opcoes: [{value: "CLT", text: "CLT"}, {value: "MEI", text: "MEI"}, {value: "RPA", text: "AUTÔNOMO"}, {value: "PJ_REGULAR", text: "PJ"}, {value: "PRO_LABORE", text: "PRÓ-LABORE"}],
		}));
		this.add(new CampoDOM(null, "jornadaMensal", {
			titulo: "Jornada mensal", 
			atributos: {title: "Quantidade de horas mensais trabalhadas"},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "qtdHorasNoturnas", {
			titulo: "Horas noturnas", 
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "qtdHorasExtras", {
			titulo: "Horas extras", 
			subtipo: "number",
		}));
		this.add(new FeriasFuncionario());
	}
	preencherCombos(listaContasNaoSinteticas) {
		let listaContasSalarios = listaContasNaoSinteticas.filter(lc => lc.value.startsWith("2."));
		this.getComponente("contaPassivo").setOpcoes(listaContasSalarios);
		let listaTipos = this.pai.getComponente("tiposFuncionarios").getValor();
		listaTipos = listaTipos.map(({ nome }) => ({
			text: nome,
		}));
		this.getComponente("tipo").setOpcoes(listaTipos);
	}
	setValor(valor) {
		let listaTipos = this.pai.getComponente("tiposFuncionarios").getValor();
		listaTipos = listaTipos.map(({ nome }) => ({
			text: nome,
		}));
		this.getComponente("tipo").setOpcoes(listaTipos);
		super.setValor(valor);
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaFuncionarios");
	}
}
class ColaboradoresProcessamento extends ConjuntoDOM {
	constructor(aba) {
		super(null, "colaboradoresProcessamento", {
			titulo: "Colaboradores",
			qtdColunas: 5,
			spanV: 5,
			regras: {campoChave: "colaborador"},
			ordem: "colaborador",
			somentePrimeiroLabel: true
		});
		this.aba = aba;
		this.add(new ComboFiltroDOM(null, "colaborador", {
			titulo: "Nome", 
			spanV: 4,
			regras: {obrigatorio: true}
		}));
		this.add(new CampoArquivo(null, "contracheque", {
			titulo: "Contracheque", 
		}));
		this.getComponente("contracheque").setSomenteLeitura(true);
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaFolha");
	}
	preencherCombos(colaboradores) {
		console.log("colaboradores", colaboradores);
		this.opColaboradores = colaboradores.map(({ nome, contaPassivo }) => ({
			text: nome,
			value: contaPassivo
		}));
		for (let item of this.componentes) {
			if (!item.modelo) {
				item.getComponente("colaborador").setOpcoes(this.opColaboradores);
			}
		}
	}
	novo() {
		let reg = super.novo();
		reg.getComponente("colaborador").setOpcoes(this.opColaboradores);
		this.getComponente("contracheque").setSomenteLeitura(true);
		return reg;
	}
}
class ProcessamentoFolha extends FichasDOM {
	constructor(aba) {
		super(document.getElementById("processamentoPagamento"), "processamentoFolha", {
			titulo: "Folha de Pagamento",
			qtdColunas: 6,
			regras: {campoChave: "data"},
			ordem: "nome",
		});
		this.aba = aba;
		this.add(new CampoDOM(null, "mes", {
			titulo: "Mês de referência", 
			regras: {obrigatorio: true},
			subtipo: "number"
		}));
		this.add(new CampoDOM(null, "ano", {
			titulo: "Ano de referência", 
			regras: {obrigatorio: true},
			subtipo: "number"
		}));
		this.add(new CampoDOM(null, "data", {
			titulo: "Data de Pagamento", 
			regras: {obrigatorio: true},
			subtipo: "date"
		}));
		this.add(new CampoDOM(null, "ind13", {
			titulo: "Décimo Terceiro?", 
			subtipo: "checkbox"
		}));
		this.add(new CampoDOM(null, "indFeriasColetivas", {
			titulo: "Férias coletivas?", 
			subtipo: "checkbox"
		}));
		this.add(new ColaboradoresProcessamento());
	}
	init() {
		let div = document.createElement("div");
		div.style = "grid-column: span 5; padding-left: 20px; padding-top: 20px";
		this.elemento.insertBefore(div, this.elemento.lastElementChild);	
		let bt = document.createElement("button");
		bt.className = "btn btn-plus";
		bt.textContent = "Trazer Colaboradores";
		div.appendChild(bt);
		bt.addEventListener("click", async (e) => {
			let colaboradoresProcessamento = this.getComponente("colaboradoresProcessamento");
			colaboradoresProcessamento.limpar(true);
			for (let colaborador of colaboradoresProcessamento.opColaboradores) {
				let reg = colaboradoresProcessamento.novo();
				reg.getComponente("colaborador").setValor(colaborador.value);
			}
		});

		bt = document.createElement("button");
		bt.className = "btn btn-plus";
		bt.textContent = "Gerar pagamento";
		div.appendChild(bt);
		bt.addEventListener("click", async (e) => {
			this.gerarLancamentos();
		});
	}
	async gravarPdfNoCampo(docJsPdf, nomeArquivo, componenteCampoArquivo) {
		const buffer = docJsPdf.output('arraybuffer');
		const hashUnico = await componenteCampoArquivo.calcularHashNativo(buffer);
		const blob = new Blob([buffer], { type: 'application/pdf' });
		const stringBase64 = await new Promise((resolve) => {
		const leitor = new FileReader();
		leitor.readAsDataURL(blob);
			leitor.onloadend = () => resolve(leitor.result);
		});
		let infoArquivo = {
			nome: nomeArquivo.endsWith('.pdf') ? nomeArquivo : nomeArquivo + '.pdf',
			tipo: 'application/pdf',
			tamanho_bytes: buffer.byteLength,
			hash_sha256: hashUnico,
			conteudo: stringBase64
		};
		let sistema = componenteCampoArquivo.getModuloSistema();
		sistema.setArquivo(hashUnico, infoArquivo);
		componenteCampoArquivo.setValor(hashUnico);
		componenteCampoArquivo.aoModificar();
	}
	async gerarLancamentos() {
		let contas = this.getModuloSistema().contas;
		let folhaPagamento = this.pai.getValor().folhaPagamento;
		let regimeTributario = contas.parametrizacao.regimeTributario;
		let regime = regimeTributario.tipo;
		if (regimeTributario.anexo) {
			regime += "_" + regimeTributario.anexo;
		}
		let empresa = {
			regimeTributario: regime,
			aliquotaRat: regimeTributario.empresaRegular.aliquotaRat,
			aliquotaTerceiros: regimeTributario.empresaRegular.aliquotaTerceiros,
			fap: regimeTributario.empresaRegular.fap,
		};
		console.log("Gerar pagamento", contas, folhaPagamento, empresa);
		let proc = this.getAtual();
		let ano = proc.ano;
		let mes = proc.mes;
		let data = proc.data;
		let lancamentos = [];
		let colaboradores = this.getComponente("colaboradoresProcessamento");
		for (let c of proc.colaboradoresProcessamento) {
			let reg = colaboradores.localizarRegistro(c.colaborador);
			console.log("reg", reg);
			let func = folhaPagamento.funcionarios.find(f => f.contaPassivo == c.colaborador);
			let lancamento = {
				data: data,
				descricao: "Pagamento de " + func.nome + " referente a " + mes + "/" + ano,
				debitos: [],
				creditos: []
			}
			let tipoFuncionario = folhaPagamento.tiposFuncionarios.find(t => t.nome == func.tipo);
			let valor = Number(func.salarioBase);
			lancamento.debitos.push({conta: func.contaPassivo, valor: valor});
			lancamento.creditos.push({conta: tipoFuncionario.contaDespesaSalario, valor: valor});
			let calculadora = new GerenciadorPagamentosContabil();
			let processamento = calculadora.processarPagamento(func.regime, {
				salarioBase: valor,
				valorContrato: valor,
				isConstrucaoOuManutencao: tipoFuncionario.ehConstrucaoManutencao,
				jornadaMensal: Number(func.jornadaMensal),
				qtdHorasExtras: Number(func.qtdHorasExtras),
				qtdHorasNoturnas: Number(func.qtdHorasNoturnas),
				dependentes: Number(func.dependentes),
				utilizaVT: func.utilizaVT,
				custoRealVT: Number(func.custoRealVT),
			}, empresa);
			console.log("processamento", processamento, func);
			this.gerarPDF(func, processamento, proc, contas, reg.getComponente("contracheque"));
			
			if (tipoFuncionario.contaDespesaHorasExtras && processamento.valores.horasExtras) {
				let valor = processamento.valores.horasExtras;
				lancamento.debitos.push({conta: tipoFuncionario.contaDespesaHorasExtras, valor: valor});
				lancamento.creditos.push({conta: func.contaPassivo, valor: valor});
			}
			if (tipoFuncionario.contaDespesaAdicionalNoturno && processamento.valores.adicionalNoturno) {
				let valor = processamento.valores.adicionalNoturno;
				lancamento.debitos.push({conta: tipoFuncionario.contaDespesaAdicionalNoturno, valor: valor});
				lancamento.creditos.push({conta: func.contaPassivo, valor: valor});
			}
			if (folhaPagamento.contaFGTSARecolher && tipoFuncionario.contaDespesaFGTS && processamento.valores.fgts) {
				let valor = processamento.valores.fgts;
				lancamento.debitos.push({conta: tipoFuncionario.contaDespesaFGTS, valor: valor});
				lancamento.creditos.push({conta: folhaPagamento.contaFGTSARecolher, valor: valor});
			}
			if (folhaPagamento.contaINSSARecolher && processamento.valores.inss) {
				let valor = processamento.valores.inss;
				lancamento.debitos.push({conta: func.contaPassivo, valor: valor});
				lancamento.creditos.push({conta: folhaPagamento.contaINSSARecolher, valor: valor});
			}
			if (folhaPagamento.contaIRRFARecolher && processamento.valores.irrf) {
				let valor = processamento.valores.irrf;
				lancamento.debitos.push({conta: func.contaPassivo, valor: valor});
				lancamento.creditos.push({conta: folhaPagamento.contaIRRFARecolher, valor: valor});
			}
			if (folhaPagamento.contaValeTransporte && processamento.valores.vt) {
				let valor = processamento.valores.vt;
				lancamento.debitos.push({conta: func.contaPassivo, valor: valor});
				lancamento.creditos.push({conta: folhaPagamento.contaValeTransporte, valor: valor});
			}
			if (folhaPagamento.contaValeTransporte && tipoFuncionario.contaDespesaVT && processamento.valores.vtPatrao) {
				let valor = processamento.valores.vtPatrao;
				lancamento.debitos.push({conta: tipoFuncionario.contaDespesaVT, valor: valor});
				lancamento.creditos.push({conta: folhaPagamento.contaValeTransporte, valor: valor});
			}
			if (folhaPagamento.contaProvisao13o && tipoFuncionario.contaDespesa13o && processamento.valores.provisoes?.decimoTerceiro) {
				let valor = processamento.valores.provisoes.decimoTerceiro;
				lancamento.debitos.push({conta: tipoFuncionario.contaDespesa13o, valor: valor});
				lancamento.creditos.push({conta: folhaPagamento.contaProvisao13o, valor: valor});
			}
			if (folhaPagamento.contaProvisaoFeriasTerco && tipoFuncionario.contaDespesaFeriasTerco && processamento.valores.provisoes?.ferias) {
				let valor = processamento.valores.provisoes.ferias;
				lancamento.debitos.push({conta: tipoFuncionario.contaDespesaFeriasTerco, valor: valor});
				lancamento.creditos.push({conta: folhaPagamento.contaProvisaoFeriasTerco, valor: valor});
			}
			if (folhaPagamento.contaProvisaoFeriasTerco && tipoFuncionario.contaDespesaFeriasTerco && processamento.valores.provisoes?.tercoFerias) {
				let valor = processamento.valores.provisoes.tercoFerias;
				lancamento.debitos.push({conta: tipoFuncionario.contaDespesaFeriasTerco, valor: valor});
				lancamento.creditos.push({conta: folhaPagamento.contaProvisaoFeriasTerco, valor: valor});
			}
			if (folhaPagamento.contaProvisaoFGTSARecolher && tipoFuncionario.contaDespesaFGTSProvisoes && processamento.valores.provisoes?.fgtsProvisoes) {
				let valor = processamento.valores.provisoes.fgtsProvisoes;
				lancamento.debitos.push({conta: tipoFuncionario.contaDespesaFGTSProvisoes, valor: valor});
				lancamento.creditos.push({conta: folhaPagamento.contaProvisaoFGTSARecolher, valor: valor});
			}
			lancamentos.push(lancamento);
		}
		console.log("lancamentos", lancamentos);
		let nome = "Folha de Pagamento referente a " + mes + "-" + ano + ".json";
		this.getModuloSistema().salvarComJanelaNativa(lancamentos, nome);
	}
	async gerarPDF(func, processamento, proc, contas, campoArquivo) {
		let nomeEmpresa = contas.nome;
		let identificacao = contas.identificacao.documento;
		let endereco = contas.endereco;
		let cidade = contas.cidadeEstado;
		
		let ano = proc.ano;
		let mes = proc.mes;
		let codigo = func.contaPassivo.split(".").reverse()[0];
		let nomePix = formatarTexto(func.nome, 25);
		let cidadePix = formatarTexto(cidade, 15);
		const payloadPixFinal = gerarPayloadPix(func.chavePix, nomePix, cidadePix, processamento.valores.liquido);
		const qrContainer = document.getElementById('qrcode-hidden');
		qrContainer.innerHTML = ''; 
		const qrcode = new QRCode(qrContainer, {
			text: payloadPixFinal,
			width: 250, 
			height: 250,
			correctLevel: QRCode.CorrectLevel.M
		});
		setTimeout(() => {
			const canvas = qrContainer.querySelector('canvas');
			if (!canvas) return alert("Erro ao gerar QR Code");
			const qrImageBase64 = canvas.toDataURL('image/png');
			const doc = new jsPDF({
				orientation: "portrait",
				unit: "mm",
				format: "a4"
			});
			// Cabeçalho da Empresa
			doc.setFont("courier", "normal");
			doc.rect(10, 10, 190, 20); 
			doc.setFontSize(12);
			doc.setFont("courier", "bold");
			doc.text(nomeEmpresa, 12, 16);
			doc.setFontSize(9);
			doc.setFont("courier", "normal");
			doc.text(identificacao, 12, 21);
			doc.text(endereco + " - " + cidade, 12, 26);
			doc.rect(160, 10, 40, 20);
			doc.setFont("courier", "bold");
			doc.text("REFERÊNCIA", 162, 15);
			doc.setFont("courier", "normal");
			doc.setFontSize(12);
			doc.text(mes + "/" + ano, 162, 24);
			// Dados do Funcionário
			doc.rect(10, 32, 190, 15);
			doc.setFontSize(9);
			doc.text("Código", 12, 37);
			doc.text("Nome do Funcionário", 32, 37);
			doc.text("Função", 140, 37);
			doc.setFont("courier", "bold");
			doc.text(codigo, 12, 43);
			doc.text(func.nome.substring(0, 32), 32, 43);
			doc.text(func.cargo, 140, 43);
			// Corpo da Tabela
			doc.rect(10, 49, 190, 80);
			doc.line(10, 55, 200, 55); 
			doc.setFont("courier", "bold");
			doc.text("Cód", 12, 53);
			doc.text("Descrição", 24, 53);
			doc.text("Ref.", 88, 53, { align: "right" });
			doc.text("Vencimentos", 148, 53, { align: "right" });
			doc.text("Descontos", 198, 53, { align: "right" });
			doc.line(22, 49, 22, 129); doc.line(75, 49, 75, 129); doc.line(100, 49, 100, 129); doc.line(150, 49, 150, 129);
			let posy = 61;
			let totalPagamentos = 0;
			let totalDescontos = 0;
			doc.setFont("courier", "normal");
			doc.text("001", 12, posy); 
			doc.text("SALARIO BASE", 24, posy); 
			doc.text(func.jornadaMensal + "H", 98, posy, { align: "right" }); 
			doc.text(formatarMoeda(func.salarioBase), 148, posy, { align: "right" });
			totalPagamentos += Number(func.salarioBase);
			if (processamento.valores.horasExtras) {
				posy += 5;
				doc.text("050", 12, posy); 
				doc.text("HORA EXTRA 50%", 24, posy); 
				doc.text(func.qtdHorasExtras + "H", 98, posy, { align: "right" }); 
				doc.text(formatarMoeda(processamento.valores.horasExtras), 148, posy, { align: "right" });
				totalPagamentos += processamento.valores.horasExtras;
			}
			if (processamento.valores.adicionalNoturno) {
				posy += 5;
				doc.text("050", 12, posy); 
				doc.text("ADICIONAL NOTURNO", 24, posy); 
				doc.text(func.qtdHorasNoturnas + "H", 98, posy, { align: "right" }); 
				doc.text(formatarMoeda(processamento.valores.adicionalNoturno), 148, posy, { align: "right" });
				totalPagamentos += processamento.valores.horasExtras;
			}
			if (processamento.valores.inss) {
				posy += 5;
				doc.text("901", 12, posy); 
				doc.text("INSS", 24, posy);
				let perc = processamento.valores.inss / processamento.valores.bruto * 100;
				doc.text(formatarMoeda(perc) + "%", 98, posy, { align: "right" }); 
				doc.text(formatarMoeda(processamento.valores.inss), 198, posy, { align: "right" });
				totalDescontos += processamento.valores.inss;
			}
			if (processamento.valores.irrf) {
				posy += 5;
				doc.text("905", 12, posy); 
				doc.text("IRRF", 24, posy);
				let perc = processamento.valores.irrf / processamento.valores.bruto * 100;
				doc.text(formatarMoeda(perc) + "%", 98, posy, { align: "right" }); 
				doc.text(formatarMoeda(processamento.valores.irrf), 198, posy, { align: "right" });
				totalDescontos += processamento.valores.irrf;
			}
			if (processamento.valores.vt) {
				posy += 5;
				doc.text("912", 12, posy); 
				doc.text("VALE TRANSPORTE", 24, posy);
				let perc = processamento.valores.vt / processamento.valores.bruto * 100;
				doc.text(formatarMoeda(perc) + "%", 98, posy, { align: "right" }); 
				doc.text(formatarMoeda(processamento.valores.vt), 198, posy, { align: "right" });
				totalDescontos += processamento.valores.vt;
			}
			// Rodapé de Totais
			doc.rect(10, 129, 190, 9);
			doc.line(100, 129, 100, 138); 
			doc.line(150, 129, 150, 138);
			doc.setFont("courier", "bold");
			doc.text("Total", 88, 134); 
			doc.setFont("courier", "normal");
			doc.text(formatarMoeda(totalPagamentos), 148, 134, { align: "right" }); 
			doc.text(formatarMoeda(totalDescontos), 198, 134, { align: "right" });
			// Bloco do Valor Líquido
			doc.rect(140, 140, 60, 12);
			doc.setFont("courier", "bold");
			doc.text("VALOR LÍQUIDO A RECEBER", 142, 144);
			doc.setFontSize(11);
			doc.text("R\$ " + formatarMoeda(processamento.valores.liquido), 142, 150);

			doc.rect(10, 140, 120, 40);
			doc.line(10, 146, 130, 146);
			doc.setFontSize(9);
			doc.setFont("courier", "bold");
			doc.text("Obrigações patronais (R$)", 12, 144);
			doc.setFont("courier", "normal");
			posy = 150;
			let total = 0;
			if (processamento.valores.fgts) {
				doc.text("FGTS", 12, posy);
				doc.text(formatarMoeda(processamento.valores.fgts), 125, posy, { align: "right" });
				posy += 5;
				total += processamento.valores.fgts;
			}
			if (processamento.valores.patronal) {
				doc.text("INSS", 12, posy);
				doc.text(formatarMoeda(processamento.valores.patronal), 125, posy, { align: "right" });
				posy += 5;
				total += processamento.valores.patronal;
			}
			if (processamento.valores.vtPatrao) {
				doc.text("VALE TRANSPORTE", 12, posy);
				doc.text(formatarMoeda(processamento.valores.vtPatrao), 125, posy, { align: "right" });
				posy += 5;
				total += processamento.valores.vtPatrao;
			}
			let provisoes = 0;
			for (let key in processamento.valores.provisoes) {
				provisoes += processamento.valores.provisoes[key];
			}
			if (provisoes) {
				doc.text("PROVISÕES (FÉRIAS/FGTS/13)", 12, posy);
				doc.text(formatarMoeda(provisoes), 125, posy, { align: "right" });
				posy += 5;
				total += provisoes;
			}
			if (total) {
				total += totalPagamentos;
				doc.text("CUSTO TOTAL", 12, posy);
				doc.text(formatarMoeda(total), 125, posy, { align: "right" });
				posy += 5;
			}
			doc.setFontSize(8);
			doc.setFont("courier", "bold");
			doc.text("PAGAMENTO VIA PIX", 143, 186);
			doc.addImage(qrImageBase64, 'PNG', 157, 189, 26, 26);
			doc.setFontSize(6);
			doc.setFont("courier", "normal");
			const linhasPix = doc.splitTextToSize(payloadPixFinal, 56); // 56mm de largura máxima interna
			doc.text(linhasPix, 142, 219);
			doc.line(10, 205, 100, 205);
			doc.setFontSize(8);
			doc.text("Assinatura do Funcionário", 10, 209);
			doc.text("Data: ____/____/______", 10, 215);
			let nomeArq = "contracheque-" + ano + "." + mes + "-" + func.nome + ".pdf"
			if (campoArquivo) {
				this.gravarPdfNoCampo(doc, nomeArq, campoArquivo);
			} else {
				doc.save(nomeArq);
			}
		}, 100);
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaFolha");
	}
}

let folha = new FolhaPagamento(document.getElementById("folhaPagamento"));
await folha.carregarDados();
document.body.hidden = false;
console.log("folha", folha);
const parametros = new URLSearchParams(window.location.search);
if (parametros.get("contas")) {
	let arq = "../planoContas/dados/" + parametros.get("contas") + "?v0.9";
	fetch(arq)
		.then(resposta => resposta.json())
		.then(obj => {
			console.log(obj);
			folha.setContas(obj);
			if (parametros.get("folha")) {
				let arq = "dados/" + parametros.get("folha") + "?v0.9";
				folha.carregar(arq);
			}
		}).catch(erro => console.error('Erro ao ler o JSON:', erro)
	);
}
async function executaAcao(linkDestino) {
	let versao = "?v0.9";
	if (linkDestino === "#abrir") {
		folha.abrirArquivo();
	} else if (linkDestino === "#salvar") {
		folha.salvarArquivo();
	} else if (linkDestino === "#novo") {
		folha.novo();
	} else if (linkDestino === "#planoContas") {
		let obj = await folha.abrirComJanelaNativa();
		folha.setContas(obj);
	} else if (linkDestino === "#validar") {
		folha.validar(folha.aba);
	} else if (linkDestino === "#ajuda") {
		//folha.mostrarAjuda("ajuda.html", "Contabilidade Simples em Javascript", versao);
	} else if (linkDestino === "#sobre") {
		folha.sobre("Contabilidade Simples em Javascript", "Módulo de Pagamentos do Sistema contábil para treinamento e para uso em pequenas empresas.<br>Em desenvolvimento por Myrko I. da Graça", versao);
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
