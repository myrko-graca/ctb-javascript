import { Modal, ControleAba } from './util/util.js?v0.7';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM } from './util/form.js?v0.7';
import { GerenciadorPagamentosContabil } from './pagamentos.js?v0.7';
const { jsPDF } = window.jspdf;

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
		.normalize("NFD")                    // Separa os acentos das letras (ex: "ã" vira "a" + "~")
		.replace(/[\u0300-\u036f]/g, "")    // Remove os acentos usando Regex
		.toUpperCase();                     // Coloca tudo em maiúsculo
	return textoFormatado.substring(0, limite);
}
function formatarMoeda(numero) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numero);
}
class ContasRequeremQuantidade extends ConjuntoDOM {
	constructor() {
		super(null, "contasRequeremQuantidade", {
			titulo: "Controle de Quantidade",
			somentePrimeiroLabel: true,
			qtdColunas: 2,
			spanV: 2,
		});
		this.add(new ComboFiltroDOM(null, "conta", {
			titulo: "Conta", 
		}));
		this.add(new ComboFiltroDOM(null, "contaReferencia", {
			titulo: "Conta de referência", 
		}));
	}
	novo() {
		let n = super.novo();
		if (this.pai) {
			let conta = n.getComponente("conta");
			let listaContas = this.pai.listaContas.filter(lc => lc.value.startsWith("1."));
			conta.setOpcoes(listaContas);
			listaContas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
			conta = n.getComponente("contaReferencia");
			conta.setOpcoes(listaContas);
		}
		return n;
	}
	atualizarCombos() {
		let listaContas = this.pai.listaContas.filter(lc => lc.value.startsWith("1."));
		for (let comp of this.getListaComponentes()) {
			let conta = comp.getComponente("conta");
			conta.setOpcoes(listaContas);
		}
		listaContas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
		for (let comp of this.getListaComponentes()) {
			let conta = comp.getComponente("contaReferencia");
			conta.setOpcoes(listaContas);
		}
	}
}
class ContasDepreciacao extends FichasDOM {
	constructor() {
		super(null, "contasDepreciacao", {
			titulo: "Cálculo de Depreciação",
			qtdColunas: 10,
			regras: {campoChave: "contaOrigem"},
		});
		this.add(new ComboFiltroDOM(null, "contaOrigem", {
			titulo: "Conta para depreciação", 
			regras: {obrigatorio: true},
			spanV: 7,
		}));
		this.add(new CampoDOM(null, "tipo", {
			titulo: "Tipo", 
			tipo: "select",
			regras: {obrigatorio: true},
			opcoes: [{text: "Mensal", value: "M"}, {text: "Semestral", value: "S"}, {text: "Anual", value: "S"}],
			spanV: 3,
		}));
		this.add(new ComboFiltroDOM(null, "contaValor", {
			titulo: "Conta de depreciação", 
			regras: {obrigatorio: true},
			spanV: 7,
		}));
		this.add(new CampoDOM(null, "taxa", {
			titulo: "Taxa (%)", 
			subtipo: "number",
			regras: {obrigatorio: true},
			spanV: 3,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesa", {
			titulo: "Conta de despesa com depreciação", 
			regras: {obrigatorio: true},
			spanV: 7,
		}));
	}
	atualizarCombos() {
		let listaContas = this.pai.listaContas.filter(lc => lc.value.startsWith("1."));
		this.getComponente("contaOrigem").setOpcoes(listaContas);
		listaContas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("1."));
		this.getComponente("contaValor").setOpcoes(listaContas);
		listaContas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
		this.getComponente("contaDespesa").setOpcoes(listaContas);
	}
}
class SimplesNacional extends ObjetoDOM {
	constructor() {
		super(null, "simplesNacional", {
			titulo: "Simples Nacional",
			qtdColunas: 4,
		});
		this.add(new CampoDOM(null, "RBT12", {
			titulo: "RBT12", 
			atributos: {title: "Faturamento bruto acumulado dos últimos 12 meses"},
			regras: {obrigatorio: true},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaNominal", {
			titulo: "Alíquota Nominal (%)", 
			regras: {obrigatorio: true},
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "parcelaDeduzir", {
			titulo: "Parcela a Deduzir", 
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaEfetiva", {
			titulo: "Alíquota Efetiva (%)", 
			subtipo: "number",
			atributos: {readonly: true},
		}));
		this.add(new ComboFiltroDOM(null, "contaReceita", {
			titulo: "Conta de Receita para Cálculo", 
			regras: {obrigatorio: true},
			spanV: 4
		}));
		this.add(new ComboFiltroDOM(null, "contaSimplesRecolher", {
			titulo: "Conta Simples Nacional a Recolher", 
			regras: {obrigatorio: true},
			spanV: 4
		}));
		this.add(new ComboFiltroDOM(null, "contaSimplesAbatimento", {
			titulo: "Conta Simples Nacional de Abatimento", 
			regras: {obrigatorio: true},
			spanV: 4
		}));
	}
	atualizarCombos() {
		let listaContas = this.pai.pai.listaContas;
		this.getComponente("contaReceita").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.")));
		listaContas = this.pai.pai.listaContasNaoSinteticas;
		this.getComponente("contaSimplesRecolher").setOpcoes(listaContas.filter(lc => lc.value.startsWith("2.")));
		this.getComponente("contaSimplesAbatimento").setOpcoes(listaContas.filter(lc => lc.value.startsWith("3.") || lc.value.startsWith("4.")));
	}
	aoModificar(item) {
		super.aoModificar(this);
		let RBT12 = this.getComponente("RBT12").getValor();
		if (!RBT12) {
			return;
		} else {
			RBT12 = Number(RBT12);
		}
		let aliquotaNominal = this.getComponente("aliquotaNominal").getValor();
		if (!aliquotaNominal) {
			return;
		} else {
			aliquotaNominal = Number(aliquotaNominal) / 100.0;
		}
		let parcelaDeduzir = this.getComponente("parcelaDeduzir").getValor();
		if (!parcelaDeduzir) {
			parcelaDeduzir = 0;
		} else {
			parcelaDeduzir = Number(parcelaDeduzir);
		}
		let aliquotaEfetiva = (RBT12 * aliquotaNominal - parcelaDeduzir) / RBT12;
		aliquotaEfetiva *= 100;
		this.getComponente("aliquotaEfetiva").setValor(aliquotaEfetiva.toFixed(2));
	}
}
class FolhaPagamento extends ObjetoDOM {
	constructor(aba) {
		let elemento = document.getElementById("folhaPagamento");
		super(elemento, "folhaPagamento", {
			titulo: "Folha de Pagamento",
			qtdColunas: 4
		});
		this.aba = aba;
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
		this.add(new Funcionarios(this.aba));
	}
	atualizarCombos() {
		let listaContasAtivo = this.pai.listaContas.filter(lc => lc.value.startsWith("1."));
		let listaContasPassivo = this.pai.listaContas.filter(lc => lc.value.startsWith("2."));
		let listaContasDespesas = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("4."));
		this.getComponente("contaValeTransporte").setOpcoes(listaContasAtivo);
		listaContasPassivo = this.pai.listaContasNaoSinteticas.filter(lc => lc.value.startsWith("2."));
		this.getComponente("contaFGTSARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("contaINSSARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("contaIRRFARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("contaProvisao13o").setOpcoes(listaContasPassivo);
		this.getComponente("contaProvisaoFeriasTerco").setOpcoes(listaContasPassivo);
		this.getComponente("contaProvisaoFGTSARecolher").setOpcoes(listaContasPassivo);
		this.getComponente("tiposFuncionarios").atualizarCombos(this.pai.listaContasNaoSinteticas);
		this.atualizarFuncionarios();
	}
	atualizarFuncionarios() {
		this.getComponente("funcionarios").atualizarCombos(this.pai.listaContasNaoSinteticas);
	}
	setValor(valor) {
		this.getComponente("funcionarios").atualizarCombos(this.pai.listaContasNaoSinteticas);
		super.setValor(valor);
	}
	focar() {
		super.focar();
		this.aba.alternar("abaFolha");
	}
}
class TiposFuncionarios extends FichasDOM {
	constructor() {
		super(null, "tiposFuncionarios", {
			titulo: "Tipos de Colaboradores",
			qtdColunas: 4,
			spanV: 4,
			regras: {campoChave: "nome"},
			ordem: "nome",
		});
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome", 
			regras: {obrigatorio: true},
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaSalario", {
			titulo: "Despesa com salário", 
			regras: {obrigatorio: true},
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaHorasExtras", {
			titulo: "Despesa com horas extras", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaAdicionalNoturno", {
			titulo: "Despesa com com adicional noturno", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaFGTS", {
			titulo: "Despesa com FGTS", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaVT", {
			titulo: "Despesa com Vale Transporte", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesa13o", {
			titulo: "Despesas com Provisão de 13º", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaFeriasTerco", {
			titulo: "Despesas com Provisão de Férias/Terço", 
			spanV: 2,
		}));
		this.add(new ComboFiltroDOM(null, "contaDespesaFGTSProvisoes", {
			titulo: "Despesas com FGTS sobre Provisões", 
			spanV: 2,
		}));
	}
	atualizarCombos(listaContasNaoSinteticas) {
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
			qtdColunas: 6,
			spanV: 4,
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
		let bt = document.createElement("button");
		bt.className = "btn btn-plus";
		bt.textContent = "Gerar pdf";
		this.elemento.insertBefore(bt, this.elemento.lastElementChild);
		bt.addEventListener("click", (e) => {
			let regimeTributario = this.pai.pai.getComponente("regimeTributario").getValor().regimeTributario;
			let func = this.getAtual();
			let empresa = {
				regimeTributario: regimeTributario.tipo,
				//aliquotaRat: 0.02,        // 2%
				//aliquotaTerceiros: 0.058, // 5.8%
				//fap: 0.7500               // FAP menor que 1.0 (Bônus por boa segurança)
			};
			let calculadora = new GerenciadorPagamentosContabil();
			let processamento = calculadora.processarPagamento(func.regime, {
				salarioBase: Number(func.salarioBase),
				valorContrato: Number(func.salarioBase),
				//isConstrucaoOuManutencao: true,
				jornadaMensal: Number(func.jornadaMensal),
				qtdHorasExtras: Number(func.qtdHorasExtras),
				qtdHorasNoturnas: Number(func.qtdHorasNoturnas),
				dependentes: Number(func.dependentes),
				utilizaVT: func.utilizaVT,
				custoRealVT: Number(func.custoRealVT),
			}, empresa);
			console.log("processamento", processamento, func);
			let sistema = this.getModuloSistema();
			let nomeEmpresa = sistema.getComponente("nome").getValor();
			let identificacao = sistema.getComponente("identificacao").toString();
			let endereco = sistema.getComponente("endereco").getValor();
			let cidade = sistema.getComponente("cidadeEstado").getValor();
			let ano = sistema.getComponente("ano").getValor();
			let mes = document.getElementById("mes_processamento").value;
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
				doc.rect(10, 129, 190, 18);
				doc.line(100, 129, 100, 147); 
				doc.line(150, 129, 150, 147);
				doc.setFont("courier", "bold");
				doc.text("Total de Vencimentos", 102, 134); 
				doc.text("Total de Descontos", 152, 134);
				doc.setFont("courier", "normal");
				doc.text(formatarMoeda(totalPagamentos), 148, 142, { align: "right" }); 
				doc.text(formatarMoeda(totalDescontos), 198, 142, { align: "right" });

				// Bloco do Valor Líquido
				doc.rect(140, 150, 60, 12);
				doc.setFont("courier", "bold");
				doc.text("VALOR LÍQUIDO A RECEBER", 142, 154);
				doc.setFontSize(11);
				doc.text("R\$ " + formatarMoeda(processamento.valores.liquido), 142, 160);

				// Bases de Cálculo
				doc.rect(10, 165, 190, 12);
				doc.line(45, 165, 45, 177); 
				doc.line(85, 165, 85, 177); 
				doc.line(125, 165, 125, 177);
				doc.setFontSize(8); 
				doc.setFont("courier", "bold");
				doc.text("Salário Base", 12, 169); 
				doc.text("Base Cálc. INSS", 47, 169); 
				doc.text("Base Cálc. FGTS", 87, 169); 
				doc.text("FGTS do Mês", 127, 169);
				doc.setFont("courier", "normal");
				doc.text(formatarMoeda(func.salarioBase), 12, 174); 
				doc.text(formatarMoeda(processamento.valores.bruto), 47, 174); 
				doc.text(formatarMoeda(processamento.valores.bruto), 87, 174); 
				doc.text(formatarMoeda(processamento.valores.fgts), 127, 174);

				// --- 4. ADICIONANDO O QR CODE PIX ---
				doc.setFontSize(8);
				doc.setFont("courier", "bold");
				doc.text("PAGAMENTO VIA PIX", 143, 186);
				
				// Renderiza a imagem do QR Code com maior qualidade
				doc.addImage(qrImageBase64, 'PNG', 157, 189, 26, 26);
				
				// Pix Copia e Cola
				doc.setFontSize(6);
				doc.setFont("courier", "normal");
				const linhasPix = doc.splitTextToSize(payloadPixFinal, 56); // 56mm de largura máxima interna
				doc.text(linhasPix, 142, 219);
				
				// Campo de Assinatura
				doc.line(10, 205, 100, 205);
				doc.setFontSize(8);
				doc.text("Assinatura do Funcionário", 10, 209);
				doc.text("Data: ____/____/______", 10, 215);

				doc.save("contracheque-" + ano + "." + mes + "-" + func.nome + ".pdf");
			}, 100);
		});
		bt = document.createElement("button");
		bt.className = "btn btn-plus";
		bt.textContent = "Gerar pagamento";
		this.elemento.insertBefore(bt, this.elemento.lastElementChild);
		
		let edMes = document.createElement("input");
		edMes.id = "mes_processamento";
		edMes.type = "number";
		edMes.title = "Mês para processamento";
		edMes.value = new Date().getMonth();
		this.elemento.insertBefore(edMes, this.elemento.lastElementChild);
		
		bt.addEventListener("click", (e) => {
			let lancamento = this.getModuloSistema().getComponente("lancamentoContabil").getComponente("efetuarLancamento");
			let folhaPagamento = this.pai.getValor().folhaPagamento;
			let regimeTributario = this.pai.pai.getComponente("regimeTributario").getValor().regimeTributario;
			let empresa = {
				regimeTributario: regimeTributario.tipo,
			};
			let func = this.getAtual();
			let ano = this.getModuloSistema().getComponente("ano").getValor();
			let mes = document.getElementById("mes_processamento").value;
			let data = new Date(ano, mes, 0);
			lancamento.getComponente("data").setValor(data.toISOString().slice(0, 10));
			lancamento.getComponente("descricao").setValor("Pagamento de " + func.nome);
			lancamento.getComponente("creditos").limpar(true);			
			let reg = lancamento.getComponente("creditos").novo();
			let valor = Number(func.salarioBase);
			reg.getComponente("conta").setValor(func.contaPassivo);
			reg.getComponente("valor").setValor(valor.toFixed(2));
			let tipoFuncionario = folhaPagamento.tiposFuncionarios.find(t => t.nome == func.tipo);
			if (tipoFuncionario.contaDespesaSalario) {
				lancamento.getComponente("debitos").limpar(true);
				let regDeb = lancamento.getComponente("debitos").novo();
				regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesaSalario);
				regDeb.getComponente("valor").setValor(valor.toFixed(2));
				let calculadora = new GerenciadorPagamentosContabil();
				let processamento = calculadora.processarPagamento(func.regime, {
					salarioBase: valor,
					valorContrato: valor,
					//isConstrucaoOuManutencao: true,
					jornadaMensal: Number(func.jornadaMensal),
					qtdHorasExtras: Number(func.qtdHorasExtras),
					qtdHorasNoturnas: Number(func.qtdHorasNoturnas),
					dependentes: Number(func.dependentes),
					utilizaVT: func.utilizaVT,
					custoRealVT: Number(func.custoRealVT),
				}, empresa);
				console.log("processamento", processamento, func);
				if (tipoFuncionario.contaDespesaHorasExtras && processamento.valores.horasExtras) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesaHorasExtras);
					regDeb.getComponente("valor").setValor(processamento.valores.horasExtras.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(func.contaPassivo);
					regCred.getComponente("valor").setValor(processamento.valores.horasExtras.toFixed(2));
				}
				if (tipoFuncionario.contaDespesaAdicionalNoturno && processamento.valores.adicionalNoturno) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesaAdicionalNoturno);
					regDeb.getComponente("valor").setValor(processamento.valores.adicionalNoturno.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(func.contaPassivo);
					regCred.getComponente("valor").setValor(processamento.valores.adicionalNoturno.toFixed(2));
				}
				if (folhaPagamento.contaFGTSARecolher && tipoFuncionario.contaDespesaFGTS && processamento.valores.fgts) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesaFGTS);
					regDeb.getComponente("valor").setValor(processamento.valores.fgts.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaFGTSARecolher);
					regCred.getComponente("valor").setValor(processamento.valores.fgts.toFixed(2));
				}
				if (folhaPagamento.contaINSSARecolher && processamento.valores.inss) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(func.contaPassivo);
					regDeb.getComponente("valor").setValor(processamento.valores.inss.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaINSSARecolher);
					regCred.getComponente("valor").setValor(processamento.valores.inss.toFixed(2));
				}
				if (folhaPagamento.contaIRRFARecolher && processamento.valores.irrf) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(func.contaPassivo);
					regDeb.getComponente("valor").setValor(processamento.valores.irrf.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaIRRFARecolher);
					regCred.getComponente("valor").setValor(processamento.valores.irrf.toFixed(2));
				}
				if (folhaPagamento.contaValeTransporte && processamento.valores.vt) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(func.contaPassivo);
					regDeb.getComponente("valor").setValor(processamento.valores.vt.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaValeTransporte);
					regCred.getComponente("valor").setValor(processamento.valores.vt.toFixed(2));
				}
				if (folhaPagamento.contaValeTransporte && tipoFuncionario.contaDespesaVT && processamento.valores.vtPatrao) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesaVT);
					regDeb.getComponente("valor").setValor(processamento.valores.vtPatrao.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaValeTransporte);
					regCred.getComponente("valor").setValor(processamento.valores.vtPatrao.toFixed(2));
				}
				if (folhaPagamento.contaValeTransporte && tipoFuncionario.contaDespesaVT && processamento.valores.vtPatrao) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesaVT);
					regDeb.getComponente("valor").setValor(processamento.valores.vtPatrao.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaValeTransporte);
					regCred.getComponente("valor").setValor(processamento.valores.vtPatrao.toFixed(2));
				}
				if (folhaPagamento.contaProvisao13o && tipoFuncionario.contaDespesa13o && processamento.valores.provisoes?.decimoTerceiro) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesa13o);
					regDeb.getComponente("valor").setValor(processamento.valores.provisoes.decimoTerceiro.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaProvisao13o);
					regCred.getComponente("valor").setValor(processamento.valores.provisoes.decimoTerceiro.toFixed(2));
				}
				if (folhaPagamento.contaProvisaoFeriasTerco && tipoFuncionario.contaDespesaFeriasTerco && processamento.valores.provisoes?.ferias) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesaFeriasTerco);
					regDeb.getComponente("valor").setValor(processamento.valores.provisoes.ferias.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaProvisaoFeriasTerco);
					regCred.getComponente("valor").setValor(processamento.valores.provisoes.ferias.toFixed(2));
				}
				if (folhaPagamento.contaProvisaoFeriasTerco && tipoFuncionario.contaDespesaFeriasTerco && processamento.valores.provisoes?.tercoFerias) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesaFeriasTerco);
					regDeb.getComponente("valor").setValor(processamento.valores.provisoes.tercoFerias.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaProvisaoFeriasTerco);
					regCred.getComponente("valor").setValor(processamento.valores.provisoes.tercoFerias.toFixed(2));
				}
				if (folhaPagamento.contaProvisaoFGTSARecolher && tipoFuncionario.contaDespesaFGTSProvisoes && processamento.valores.provisoes?.fgtsProvisoes) {
					let regDeb = lancamento.getComponente("debitos").novo();
					regDeb.getComponente("conta").setValor(tipoFuncionario.contaDespesaFGTSProvisoes);
					regDeb.getComponente("valor").setValor(processamento.valores.provisoes.fgtsProvisoes.toFixed(2));
					let regCred = lancamento.getComponente("creditos").novo();
					regCred.getComponente("conta").setValor(folhaPagamento.contaProvisaoFGTSARecolher);
					regCred.getComponente("valor").setValor(processamento.valores.provisoes.fgtsProvisoes.toFixed(2));
				}
				console.log("processamento", processamento);
				console.log(processamento.lancamentosContabeis);
			}
			lancamento.focar();
		});
	}
	atualizarCombos(listaContasNaoSinteticas) {
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
class EmpresaRegular extends ObjetoDOM {
	constructor() {
		super(null, "empresaRegular", {titulo: "Empresa Regular", qtdColunas: 2});
		this.add(new CampoDOM(null, "aliquotaRat", {
			titulo: "Alíquota RAT",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "aliquotaTerceiros", {
			titulo: "Alíquota de Terceiros",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "fap", {
			titulo: "FAP",
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "desonerada", {
			titulo: "Desonerada?",
			subtipo: "checkbox",
		}));
	}
}
class RegimeTributario extends ObjetoDOM {
	constructor() {
		super(null, "regimeTributario", {titulo: "Regime Tributário"});
		this.add(new CampoDOM(null, "tipo", {
			titulo: "Tipo", 
			regras: {obrigatorio: true},
			tipo: "select",
			opcoes: [
				{value: "REGULAR_LP", text: "Lucro Presumido"}, 
				{value: "REGULAR_LR", text: "Lucro Real"}, 
				{value: "MEI", text: "MEI"}, 
				{value: "SIMPLES_PADRAO", text: "Simples Nacional (padrão)"}, 
				{value: "SIMPLES_ANEXO_IV", text: "Simples Nacional (anexo IV)"},
			]
		}));
		let simplesNacional = new SimplesNacional();
		this.add(simplesNacional);
		let empresaRegular = new EmpresaRegular();
		this.add(empresaRegular);
	}
	init() {
		let tipo = this.getComponente("tipo");
		let simplesNacional = this.getComponente("simplesNacional");
		simplesNacional.setVisibilidade(false);
		let empresaRegular = this.getComponente("empresaRegular");
		empresaRegular.setVisibilidade(false);
		tipo.aoModificar = (item) => {
			super.aoModificar(tipo);
			let valor = tipo.getValor();
			if (valor.startsWith("SIMPLES")) {
				simplesNacional.setVisibilidade(true);
			} else {
				simplesNacional.setVisibilidade(false);
			}
			if (valor.startsWith("REGULAR")) {
				empresaRegular.setVisibilidade(true);
			} else {
				empresaRegular.setVisibilidade(false);
			}
		};
	}
	setValor(valor) {
		super.setValor(valor);
		this.getComponente("tipo").aoModificar(this.getComponente("tipo"));
	}
	atualizarCombos() {
		this.getComponente("simplesNacional").atualizarCombos();
	}
}
export class ParametrizacaoCTB extends ObjetoDOM {
	constructor(aba) {
		let elemento = document.getElementById("parametros");
		super(elemento, "parametrizacao");
		this.aba = aba;
		this.abaLancamentos = new ControleAba(document.getElementById("abaParametros"));
		this.listaContas = [];
		this.listaContasNaoSinteticas = [];
		let regimeTributario = new RegimeTributario();
		this.add(regimeTributario);
		let folhaPagamento = new FolhaPagamento(this.abaLancamentos);
		this.add(folhaPagamento);
		let contasDepreciacao = new ContasDepreciacao();
		this.add(contasDepreciacao);
		let contasQuantidade = new ContasRequeremQuantidade();
		this.add(contasQuantidade);
		this.abaLancamentos.aoAlterar = (aba) => {
			if (aba == "abaFuncionarios") {
				folhaPagamento.atualizarFuncionarios();
			}
		};
	}
	setValor(valor) {
		let listaContas = this.getModuloSistema().getListaContas();
		this.setListaContas(listaContas);
		super.setValor(valor);
	}
	setListaContas(listaContas) {
		this.listaContas = listaContas.map(({ codigo, descricao }) => ({
			text: codigo + " - " + descricao,
			value: codigo
		}));
		this.listaContasNaoSinteticas = listaContas.filter(item => !item.sintetica);
		this.listaContasNaoSinteticas = this.listaContasNaoSinteticas.map(({ codigo, descricao }) => ({
			text: codigo + " - " + descricao,
			value: codigo
		}));
		this.getComponente("regimeTributario").atualizarCombos();
		this.getComponente("contasRequeremQuantidade").atualizarCombos();
		this.getComponente("contasDepreciacao").atualizarCombos();
		this.getComponente("folhaPagamento").atualizarCombos();
	}
	focar() {
		super.focar();
		this.aba.alternar("abaParametros");
		this.abaLancamentos.alternar("abaBasica");
	}
}