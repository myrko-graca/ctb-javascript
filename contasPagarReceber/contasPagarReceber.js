import { Modal, ControleAba } from '../util/util.js?vc1.1';
import { ObjetoDOM, ModuloSistemaDOM, ConjuntoDOM, FichasDOM, ComboFiltroDOM, CampoDOM, CampoArquivo, CNPJCPF, IntervaloDOM, CampoTelefone, CampoEMail } from '../util/form.js?vc1.1';
import { NavigationMenu } from '../util/menu.js?vc1.1';
import { TransformaContas } from '../planoContas/util.js?v0.91';

let ehCelular = window.innerWidth <= 768;

class Pagamentos extends ConjuntoDOM {
	constructor() {
		super(null, "pagamentos", {
			titulo: "Pagamentos",
			somentePrimeiroLabel: true,
			qtdColunas: 2,
			spanV: 3
		});
		this.add(new CampoDOM(null, "data", {
			titulo: "Data da conta", 
			subtipo: "date",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "valor", {
			titulo: "Valor (R$)", 
			subtipo: "number",
			regras: {obrigatorio: true},
		}));
	}
}
class ContasPagarReceberBasico extends FichasDOM {
	constructor(elemento, nome, obj) {
		if (!obj.regras) {
			obj.regras = {};
		}
		obj.regras.campoChave = "id";
		super(elemento, nome, obj);
		this.add(new CampoDOM(null, "id", {
			titulo: "Identificador", 
			subtipo: "number",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "data", {
			titulo: "Data da conta", 
			subtipo: "date",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "dataPrimeiroPagamento", {
			titulo: "Data do primeiro pagamento", 
			subtipo: "date",
		}));
		this.add(new CampoDOM(null, "valor", {
			titulo: "Valor (R$)", 
			subtipo: "number",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "taxa", {
			titulo: "Taxa (%)", 
			subtipo: "number",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "tipoTaxa", {
			titulo: "Tipo de taxa", 
			tipo: "select",
			opcoes: [
				{value:1, text:"Simples mensal"}, {value:2, text:"Composto mensal"}, {value:3, text:"Composto mensal dias úteis"},
				{value:4, text:"Simples anual"}, {value:5, text:"Composto anual"}, {value:6, text:"Composto anual dias úteis"},
			],
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "parcelas", {
			titulo: "Quantidade de parcelas", 
			subtipo: "number",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "periodicidade", {
			titulo: "Periodicidade", 
			tipo: "select",
			opcoes: [{value:1, text:"Mensal"}, {value:6, text:"Semestral"}, {value:12, text:"Anual"},],
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "tipo", {
			titulo: "Tipo", 
			tipo: "select",
			opcoes: [{value:"sac", text:"SAC"},{value:"price", text:"Price"},],
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "multa", {
			titulo: "Multa (%)", 
			subtipo: "number",
		}));
		this.add(new CampoDOM(null, "mora", {
			titulo: "Mora (% simples mensal)", 
			subtipo: "number",
		}));
		this.add(new Pagamentos());
	}
	init() {
		this.bts = document.createElement("div");
		this.bts.style = "grid-column: span 5; padding-left: 20px; padding-top: 20px";
		this.elemento.insertBefore(this.bts, this.elemento.lastElementChild);	
		let bt = document.createElement("button");
		bt.className = "btn btn-plus";
		bt.textContent = "Calcular projeção";
		this.bts.appendChild(bt);
		let tb = document.createElement("table");
		tb.id = "projetivo_gerado";
		this.elemento.appendChild(tb);
		bt.addEventListener("click", async (e) => {
			const formatadorBRL = new Intl.NumberFormat('pt-BR', {
			  style: 'currency',
			  currency: 'BRL'
			});
			let lista = this.validar(true);
			if (this.vazio(true)) {
				new Modal().mostrar("Gerar projetivo", "Os campos estão vazios");
			} else {
				if (lista.length == 0) {
					let atual = this.getAtual();
					let projetivo = this.calcularProjetivo(atual);
					//console.log("atual", atual);
					//console.log("projetivo", projetivo);
					let tb = document.getElementById("projetivo_gerado");
					tb.innerHTML = "";
					let r = tb.insertRow();
					r.insertCell().innerText = "Data";
					r.insertCell().innerText = "Valor";
					for (let p of projetivo) {
						r = tb.insertRow();
						r.insertCell().innerText = p.vencimento.toISOString().split('T')[0];
						r.insertCell().innerText = formatadorBRL.format(p.valorParcela);
					}
				} else {
					this.mostrarValidacao(lista, this.aba);
					new Modal().mostrar("Gerar projetivo", "Há erros que devem ser corrigidos antes de gerar o projetivo");
				}
			}
		});
	}
	calcularProjetivo(reg, dataCorte = new Date()) {
		const dataAtual = this.normalizarData(dataCorte);
		const dataBase = this.normalizarData(reg.data);
		const valorTotal = Number(reg.valor);
		const taxaInformada = Number(reg.taxa) / 100;
		const tipoTaxa = Number(reg.tipoTaxa);
		const qtdTotal = Number(reg.parcelas);
		const periodicidadeMeses = Number(reg.periodicidade);
		const tipoAmortizacao = reg.tipo.toLowerCase();

		const multaPct = Number(reg.multa || 0) / 100;
		const moraMensalPct = Number(reg.mora || 0) / 100;

		// Considera apenas pagamentos realizados até a data de corte informada
		const pagamentosEfetuados = Array.isArray(reg.pagamentos)
			? reg.pagamentos
				.filter(p => this.normalizarData(p.data) <= dataAtual)
				.sort((a, b) => this.normalizarData(a.data) - this.normalizarData(b.data))
			: [];

		const dataPrimeiroPagamento = reg.dataPrimeiroPagamento
			? this.normalizarData(reg.dataPrimeiroPagamento)
			: null;

		// 1. Gera o cronograma inicial completo
		let cronograma = this.gerarCronograma(
			valorTotal, taxaInformada, tipoTaxa, qtdTotal,
			dataBase, dataPrimeiroPagamento, periodicidadeMeses, tipoAmortizacao
		);

		// 2. Processa cada pagamento efetuado até a data de corte
		let residuoTransferido = 0;

		for (const pgto of pagamentosEfetuados) {
			let valorPago = Number(pgto.valor);

			for (let i = 0; i < cronograma.length; i++) {
				if (valorPago <= 0) break;

				const parcela = cronograma[i];
				if (parcela.paga) continue;

				const valorDevido = this.arredondar(parcela.valorParcela + residuoTransferido);
				residuoTransferido = 0;

				// CASO A: Pagamento exato ou parcial
				if (valorPago <= valorDevido) {
					const saldoRestanteParcela = this.arredondar(valorDevido - valorPago);
					valorPago = 0;

					if (saldoRestanteParcela < 1.00) {
						parcela.paga = true;
						residuoTransferido = saldoRestanteParcela;
					} else {
						parcela.valorParcela = saldoRestanteParcela;
					}
					break;
				}

				// CASO B: Pagamento SUPERIOR à parcela (abate excedente do saldo devedor)
				const excedente = this.arredondar(valorPago - valorDevido);
				parcela.paga = true;
				valorPago = 0;

				const parcelasRestantes = cronograma.slice(i + 1);
				if (parcelasRestantes.length > 0) {
					const novoSaldoDevedor = Math.max(0, this.arredondar(parcela.saldoDevedor - excedente));

					if (novoSaldoDevedor === 0) {
						parcelasRestantes.forEach(p => (p.paga = true));
					} else {
						const novoCronogramaFuturo = this.gerarCronograma(
							novoSaldoDevedor,
							taxaInformada,
							tipoTaxa,
							parcelasRestantes.length,
							parcela.vencimento,
							parcelasRestantes[0].vencimento,
							periodicidadeMeses,
							tipoAmortizacao,
							parcela.numero
						);

						cronograma = [
							...cronograma.slice(0, i + 1),
							...novoCronogramaFuturo
						];
					}
				}
				break;
			}
		}

		// 3. Filtra apenas parcelas não pagas e aplica multa/mora usando a dataCorte como referência
		const projetivoFinal = [];

		for (let i = 0; i < cronograma.length; i++) {
			const parcela = cronograma[i];
			if (parcela.paga) continue;

			const valorBaseParcela = this.arredondar(parcela.valorParcela + residuoTransferido);
			residuoTransferido = 0;

			const diasAtraso = this.calcularDiasCorridos(parcela.vencimento, dataAtual);

			if (diasAtraso > 0) {
				const valorMulta = valorBaseParcela * multaPct;
				const valorMora = valorBaseParcela * (moraMensalPct / 30) * diasAtraso;
				const valorAtualizado = valorBaseParcela + valorMulta + valorMora;

				projetivoFinal.push({
					numero: parcela.numero,
					vencimento: parcela.vencimento,
					status: 'vencida',
					diasAtraso,
					valorOriginal: valorBaseParcela,
					multa: this.arredondar(valorMulta),
					mora: this.arredondar(valorMora),
					valorParcela: this.arredondar(valorAtualizado),
					amortizacao: parcela.amortizacao,
					juros: parcela.juros,
					saldoDevedor: parcela.saldoDevedor
				});
			} else {
				projetivoFinal.push({
					numero: parcela.numero,
					vencimento: parcela.vencimento,
					status: 'a_vencer',
					diasAtraso: 0,
					valorOriginal: valorBaseParcela,
					multa: 0,
					mora: 0,
					valorParcela: valorBaseParcela,
					amortizacao: parcela.amortizacao,
					juros: parcela.juros,
					saldoDevedor: parcela.saldoDevedor
				});
			}
		}

		return projetivoFinal;
	}
	calcularTabelaSAC(saldoInicial, taxaInformada, tipoTaxa, qtdParcelas, dataBase, dataPrimeiroPagamento, periodicidadeMeses) {
		const parcelas = [];
		const amortizacao = saldoInicial / qtdParcelas;
		let saldoDevedor = saldoInicial;

		const inicioBase = dataPrimeiroPagamento || this.adicionarMeses(dataBase, periodicidadeMeses);
		let dataAnterior = dataBase;

		for (let i = 0; i < qtdParcelas; i++) {
			const vencimentoTeorico = this.adicionarMeses(inicioBase, i * periodicidadeMeses);
			const vencimento = this.ajustarParaProximoDiaUtil(vencimentoTeorico);

			// Na 1ª parcela com dataPrimeiroPagamento customizada, calcula juros pro-rata exatos desde dataBase
			const taxaPeriodo = (i === 0 && dataPrimeiroPagamento)
				? this.obterTaxaProRata(taxaInformada, tipoTaxa, dataAnterior, vencimento)
				: this.obterTaxaDoPeriodo(taxaInformada, tipoTaxa, periodicidadeMeses, dataAnterior, vencimento);

			const juros = saldoDevedor * taxaPeriodo;
			const valorParcela = amortizacao + juros;
			saldoDevedor -= amortizacao;

			parcelas.push({
				numero: i + 1,
				vencimento,
				valorParcela: this.arredondar(valorParcela),
				amortizacao: this.arredondar(amortizacao),
				juros: this.arredondar(juros),
				saldoDevedor: this.arredondar(Math.max(0, saldoDevedor))
			});

			dataAnterior = vencimento;
		}

		return parcelas;
	}

	calcularTabelaPrice(saldoInicial, taxaInformada, tipoTaxa, qtdParcelas, dataBase, dataPrimeiroPagamento, periodicidadeMeses) {
		const parcelas = [];
		let saldoDevedor = saldoInicial;

		const taxaMediaPeriodo = this.obterTaxaMediaPeriodo(taxaInformada, tipoTaxa, periodicidadeMeses);
		const fator = Math.pow(1 + taxaMediaPeriodo, qtdParcelas);
		const valorParcelaFixa = taxaMediaPeriodo === 0
			? saldoInicial / qtdParcelas
			: saldoInicial * ((taxaMediaPeriodo * fator) / (fator - 1));

		const inicioBase = dataPrimeiroPagamento || this.adicionarMeses(dataBase, periodicidadeMeses);
		let dataAnterior = dataBase;

		for (let i = 0; i < qtdParcelas; i++) {
			const vencimentoTeorico = this.adicionarMeses(inicioBase, i * periodicidadeMeses);
			const vencimento = this.ajustarParaProximoDiaUtil(vencimentoTeorico);

			const taxaPeriodo = (i === 0 && dataPrimeiroPagamento)
				? this.obterTaxaProRata(taxaInformada, tipoTaxa, dataAnterior, vencimento)
				: this.obterTaxaDoPeriodo(taxaInformada, tipoTaxa, periodicidadeMeses, dataAnterior, vencimento);

			const juros = saldoDevedor * taxaPeriodo;
			const ehUltima = i === qtdParcelas - 1;
			const amortizacao = ehUltima ? saldoDevedor : (valorParcelaFixa - juros);
			const valorParcela = ehUltima ? (amortizacao + juros) : valorParcelaFixa;
			saldoDevedor -= amortizacao;

			parcelas.push({
				numero: i + 1,
				vencimento,
				valorParcela: this.arredondar(valorParcela),
				amortizacao: this.arredondar(amortizacao),
				juros: this.arredondar(juros),
				saldoDevedor: this.arredondar(Math.max(0, saldoDevedor))
			});

			dataAnterior = vencimento;
		}

		return parcelas;
	}
	obterTaxaDoPeriodo(taxa, tipoTaxa, meses, dataInicio, dataFim) {
		const diasUteis = this.contarDiasUteis(dataInicio, dataFim);

		switch (tipoTaxa) {
			case 1: return taxa * meses;
			case 2: return Math.pow(1 + taxa, meses) - 1;
			case 3: return diasUteis > 0 ? Math.pow(1 + taxa, diasUteis / 21) - 1 : Math.pow(1 + taxa, meses) - 1;
			case 4: return (taxa / 12) * meses;
			case 5: return Math.pow(1 + taxa, meses / 12) - 1;
			case 6: return diasUteis > 0 ? Math.pow(1 + taxa, diasUteis / 252) - 1 : Math.pow(1 + taxa, meses / 12) - 1;
			default: return taxa;
		}
	}

	obterTaxaProRata(taxa, tipoTaxa, dataInicio, dataFim) {
		const diasCorridos = this.calcularDiasCorridos(dataInicio, dataFim);
		if (diasCorridos <= 0) return 0;

		const diasUteis = this.contarDiasUteis(dataInicio, dataFim);

		switch (tipoTaxa) {
			case 1: return (taxa / 30) * diasCorridos;
			case 2: return Math.pow(1 + taxa, diasCorridos / 30) - 1;
			case 3: return Math.pow(1 + taxa, diasUteis / 21) - 1;
			case 4: return (taxa / 360) * diasCorridos;
			case 5: return Math.pow(1 + taxa, diasCorridos / 365) - 1;
			case 6: return Math.pow(1 + taxa, diasUteis / 252) - 1;
			default: return taxa;
		}
	}

	obterTaxaMediaPeriodo(taxa, tipoTaxa, meses) {
		switch (tipoTaxa) {
			case 1: return taxa * meses;
			case 2:
			case 3: return Math.pow(1 + taxa, meses) - 1;
			case 4: return (taxa / 12) * meses;
			case 5:
			case 6: return Math.pow(1 + taxa, meses / 12) - 1;
			default: return taxa;
		}
	}

	ehDiaUtil(data, cacheFeriados = {}) {
		const diaSemana = data.getDay();
		if (diaSemana === 0 || diaSemana === 6) return false;

		const ano = data.getFullYear();
		if (!cacheFeriados[ano]) {
			cacheFeriados[ano] = this.obterFeriadosRJ(ano);
		}

		return !cacheFeriados[ano].has(this.formatarDataISO(data));
	}

	ajustarParaProximoDiaUtil(data) {
		const dataAjustada = new Date(data.getTime());
		const cacheFeriados = {};

		while (!this.ehDiaUtil(dataAjustada, cacheFeriados)) {
			dataAjustada.setDate(dataAjustada.getDate() + 1);
		}

		return dataAjustada;
	}

	contarDiasUteis(dataInicio, dataFim) {
		let count = 0;
		const atual = new Date(dataInicio.getTime());
		atual.setDate(atual.getDate() + 1);
		const cacheFeriados = {};

		while (atual <= dataFim) {
			if (this.ehDiaUtil(atual, cacheFeriados)) {
				count++;
			}
			atual.setDate(atual.getDate() + 1);
		}

		return count;
	}

	obterFeriadosRJ(ano) {
		const feriados = new Set([
			`${ano}-01-01`, `${ano}-04-21`, `${ano}-04-23`, `${ano}-05-01`,
			`${ano}-09-07`, `${ano}-10-12`, `${ano}-11-02`, `${ano}-11-15`,
			`${ano}-11-20`, `${ano}-12-25`
		]);

		const a = ano % 19;
		const b = Math.floor(ano / 100);
		const c = ano % 100;
		const d = Math.floor(b / 4);
		const e = b % 4;
		const f = Math.floor((b + 8) / 25);
		const g = Math.floor((b - f + 1) / 3);
		const h = (19 * a + b - d - g + 15) % 30;
		const i = Math.floor(c / 4);
		const k = c % 4;
		const l = (32 + 2 * e + 2 * i - h - k) % 7;
		const m = Math.floor((a + 11 * h + 22 * l) / 451);
		const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31) - 1;
		const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;

		const pascoa = new Date(ano, mesPascoa, diaPascoa);
		[
			this.adicionarDias(pascoa, -48),
			this.adicionarDias(pascoa, -47),
			this.adicionarDias(pascoa, -2),
			this.adicionarDias(pascoa, 60)
		].forEach(data => feriados.add(this.formatarDataISO(data)));

		return feriados;
	}
	calcularDiasCorridos(dataInicio, dataFim) {
		const msPorDia = 1000 * 60 * 60 * 24;
		return Math.floor((dataFim - dataInicio) / msPorDia);
	}

	normalizarData(dataInput) {
		if (dataInput instanceof Date) {
			return new Date(dataInput.getFullYear(), dataInput.getMonth(), dataInput.getDate());
		}
		const apenasData = String(dataInput).split('T')[0];
		const [ano, mes, dia] = apenasData.split('-').map(Number);
		return new Date(ano, mes - 1, dia);
	}

	formatarDataISO(data) {
		const ano = data.getFullYear();
		const mes = String(data.getMonth() + 1).padStart(2, '0');
		const dia = String(data.getDate()).padStart(2, '0');
		return `${ano}-${mes}-${dia}`;
	}

	adicionarDias(data, dias) {
		const novaData = new Date(data.getTime());
		novaData.setDate(novaData.getDate() + dias);
		return novaData;
	}

	adicionarMeses(data, meses) {
		const novaData = new Date(data.getTime());
		const diaOriginal = novaData.getDate();
		novaData.setMonth(novaData.getMonth() + meses);
		if (novaData.getDate() < diaOriginal) novaData.setDate(0);
		return novaData;
	}

	arredondar(valor) {
		return Math.round((valor + Number.EPSILON) * 100) / 100;
	}

	gerarCronograma(saldoInicial, taxaInformada, tipoTaxa, qtdParcelas, dataBase, dataPrimeiroPagamento, periodicidadeMeses, tipoAmortizacao, offsetNumero = 0) {
		const lista = tipoAmortizacao === 'sac'
			? this.calcularTabelaSAC(saldoInicial, taxaInformada, tipoTaxa, qtdParcelas, dataBase, dataPrimeiroPagamento, periodicidadeMeses)
			: this.calcularTabelaPrice(saldoInicial, taxaInformada, tipoTaxa, qtdParcelas, dataBase, dataPrimeiroPagamento, periodicidadeMeses);

		return lista.map((item, idx) => ({
			...item,
			numero: offsetNumero + idx + 1,
			paga: false
		}));
	}
	gerarResumoContrato(reg, proj, dataCorte = new Date()) {
		const dataAtual = this.normalizarData(dataCorte);
		const dataLimiteCirculante = this.adicionarMeses(dataAtual, 12);
		let projetivo;
		if (proj) {
			projetivo =  proj;
		} else {
			projetivo = this.calcularProjetivo(reg, dataAtual);
		}
		const pagamentosAteCorte = Array.isArray(reg.pagamentos)
			? reg.pagamentos.filter(p => this.normalizarData(p.data) <= dataAtual)
			: [];

		const totalPago = pagamentosAteCorte.reduce((acc, p) => acc + Number(p.valor || 0), 0);

		let totalVencido = 0;
		let totalAVencer = 0;
		let totalMulta = 0;
		let totalMora = 0;
		let totalJurosFuturos = 0;
		let qtdVencidas = 0;
		let qtdAVencer = 0;

		const contabil = {
			passivoCirculante: {
				principal: 0,
				juros: 0,
				encargosAtraso: 0,
				total: 0,
				qtdParcelas: 0
			},
			passivoNaoCirculante: {
				principal: 0,
				juros: 0,
				total: 0,
				qtdParcelas: 0
			}
		};

		for (const parcela of projetivo) {
			totalMulta += parcela.multa;
			totalMora += parcela.mora;
			totalJurosFuturos += parcela.juros;

			if (parcela.status === 'vencida') {
				totalVencido += parcela.valorParcela;
				qtdVencidas++;
			} else {
				totalAVencer += parcela.valorParcela;
				qtdAVencer++;
			}

			const ehCirculante = parcela.status === 'vencida' || parcela.vencimento <= dataLimiteCirculante;

			if (ehCirculante) {
				contabil.passivoCirculante.principal += parcela.amortizacao;
				contabil.passivoCirculante.juros += parcela.juros;
				contabil.passivoCirculante.encargosAtraso += (parcela.multa + parcela.mora);
				contabil.passivoCirculante.total += parcela.valorParcela;
				contabil.passivoCirculante.qtdParcelas++;
			} else {
				contabil.passivoNaoCirculante.principal += parcela.amortizacao;
				contabil.passivoNaoCirculante.juros += parcela.juros;
				contabil.passivoNaoCirculante.total += parcela.valorParcela;
				contabil.passivoNaoCirculante.qtdParcelas++;
			}
		}

		contabil.passivoCirculante.principal = this.arredondar(contabil.passivoCirculante.principal);
		contabil.passivoCirculante.juros = this.arredondar(contabil.passivoCirculante.juros);
		contabil.passivoCirculante.encargosAtraso = this.arredondar(contabil.passivoCirculante.encargosAtraso);
		contabil.passivoCirculante.total = this.arredondar(contabil.passivoCirculante.total);

		contabil.passivoNaoCirculante.principal = this.arredondar(contabil.passivoNaoCirculante.principal);
		contabil.passivoNaoCirculante.juros = this.arredondar(contabil.passivoNaoCirculante.juros);
		contabil.passivoNaoCirculante.total = this.arredondar(contabil.passivoNaoCirculante.total);

		const saldoDevedorPrincipal = contabil.passivoCirculante.principal + contabil.passivoNaoCirculante.principal;
		const totalRestanteAtualizado = totalVencido + totalAVencer;

		let statusContrato = 'em_dia';
		if (projetivo.length === 0) {
			statusContrato = 'quitado';
		} else if (qtdVencidas > 0) {
			statusContrato = 'inadimplente';
		}

		return {
			dataCorte: dataAtual,
			statusContrato,
			valorContratado: this.arredondar(Number(reg.valor)),
			totalPago: this.arredondar(totalPago),
			saldoDevedorPrincipal: this.arredondar(saldoDevedorPrincipal),
			totalVencido: this.arredondar(totalVencido),
			totalAVencer: this.arredondar(totalAVencer),
			totalMulta: this.arredondar(totalMulta),
			totalMora: this.arredondar(totalMora),
			totalJurosFuturos: this.arredondar(totalJurosFuturos),
			totalRestanteAtualizado: this.arredondar(totalRestanteAtualizado),
			contabil,
			parcelas: {
				total: Number(reg.parcelas),
				pagas: Number(reg.parcelas) - projetivo.length,
				vencidas: qtdVencidas,
				aVencer: qtdAVencer,
				restantes: projetivo.length
			},
			proximoVencimento: projetivo.length > 0 ? projetivo[0].vencimento : null,
			valorProximaParcela: projetivo.length > 0 ? projetivo[0].valorParcela : 0,
			cronogramaProjetivo: projetivo
		};
	}
}
class ContasPagar extends ContasPagarReceberBasico {
	constructor(aba) {
		let elemento = document.getElementById("contasPagar");
		super(elemento, "contasPagar", {
			titulo: "Contas a Pagar",
			qtdColunas: 5,
			spanV: 4,
		});
		this.aba = aba;
		this.add(new ComboFiltroDOM(null, "tipoContabil", {
			titulo: "Tipo contábil",
			regras: {obrigatorio: true},
		}), true);
		this.add(new ComboFiltroDOM(null, "fornecedor", {
			titulo: "Fornecedor",
			spanV: 3,
			regras: {obrigatorio: true},
		}), true);		
	}
	preencherCombos(fornecedor) {
		if (fornecedor) {
			let op = fornecedor.map(({ identificacao, nome }) => ({
				value: identificacao.tipo + identificacao.documento,
				text: nome,
			}));
			this.getComponente("fornecedor").setOpcoes(op);
		}
	}
	preencherTipos(tipos) {
		if (tipos) {
			let op = tipos.map(({ id, nome }) => ({
				value: id,
				text: nome,
			}));
			this.getComponente("tipoContabil").setOpcoes(op);
		}
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaContasPagar");
	}
}
class ContasReceber extends ContasPagarReceberBasico {
	constructor(aba) {
		let elemento = document.getElementById("contasReceber");
		super(elemento, "contasReceber", {
			titulo: "Contas a Receber",
			qtdColunas: 5,
			spanV: 4,
		});
		this.aba = aba;
		this.add(new ComboFiltroDOM(null, "tipoContabil", {
			titulo: "Tipo contábil",
			regras: {obrigatorio: true},
		}), true);
		this.add(new ComboFiltroDOM(null, "cliente", {
			titulo: "Cliente",
			spanV: 3,
			regras: {obrigatorio: true},
		}), true);
	}
	preencherCombos(clientes) {
		if (clientes) {
			let op = clientes.map(({ identificacao, nome }) => ({
				value: identificacao.tipo + identificacao.documento,
				text: nome,
			}));
			this.getComponente("cliente").setOpcoes(op);
		}
	}
	preencherTipos(tipos) {
		if (tipos) {
			let op = tipos.map(({ id, nome }) => ({
				value: id,
				text: nome,
			}));
			this.getComponente("tipoContabil").setOpcoes(op);
		}
	}
	focar(ind) {
		super.focar(ind);
		this.aba.alternar("abaContasReceber");
	}
}
class TiposContas extends FichasDOM {
	constructor(elemento, nome, titulo, aba) {
		let elem = document.createElement("fieldset");
		elemento.appendChild(elem);
		super(elem, nome, {
			titulo: titulo,
			tipo: "fieldset", 
			qtdColunas: 4,
			spanV: 4,
			regras: {obrigatorio: true, campoChave: "id"}
		});
		this.aba = aba;
		this.add(new CampoDOM(null, "id", {
			titulo: "Identificador",
			subtipo: "number",
			regras: {obrigatorio: true},
		}));
		this.add(new CampoDOM(null, "nome", {
			titulo: "Nome",
			spanV: 3,
			regras: {obrigatorio: true},
		}));
		this.add(new ComboFiltroDOM(null, "contaTotalCirculante", {
			titulo: "Total Circulante",
			spanV: 2,
			regras: {obrigatorio: true},
		}));
		this.add(new ComboFiltroDOM(null, "contaJurosCirculante", {
			titulo: "Juros Circulante",
			spanV: 2,
			regras: {obrigatorio: true},
		}));
		this.add(new ComboFiltroDOM(null, "contaTotalNaoCirculante", {
			titulo: "Total Não Circulante",
			spanV: 2,
			regras: {obrigatorio: true},
		}));
		this.add(new ComboFiltroDOM(null, "contaJurosNaoCirculante", {
			titulo: "Juros Não Circulante",
			spanV: 2,
			regras: {obrigatorio: true},
		}));
	}
	preencherCombos(contas) {
		let op = contas.map(({ codigo, descricao }) => ({
			text: codigo + " - " + descricao,
			value: codigo
		}));
		this.getComponente("contaTotalCirculante").setOpcoes(op);
		this.getComponente("contaJurosCirculante").setOpcoes(op);
		this.getComponente("contaTotalNaoCirculante").setOpcoes(op);
		this.getComponente("contaJurosNaoCirculante").setOpcoes(op);
	}
	focar() {
		super.focar();
		this.aba.alternar("abaParametros");
	}
}
class TiposContasPagar extends TiposContas {
	constructor(elemento, aba) {
		super(elemento, "tiposContasPagar", "Tipos de Contas a Pagar", aba);
	}
	setValor(valor) {
		super.setValor(valor);
		this.pai.getComponente("contasPagar").preencherTipos(valor);
	}
}
class TiposContasReceber extends TiposContas {
	constructor(elemento, aba) {
		super(elemento, "tiposContasReceber", "Tipos de Contas a Receber", aba);
	}
	setValor(valor) {
		super.setValor(valor);
		this.pai.getComponente("contasReceber").preencherTipos(valor);
	}
}
class FechamentoContabil extends ObjetoDOM {
	constructor() {
		super(null, "fechamentoContabil", {
			titulo: "Fechamento Contábil",
			qtdColunas: 4,
			spanV: 4,
			calculado: true,
		});
		this.add(new CampoDOM(null, "data", {
			titulo: "Data",
			subtipo: "date",
			regras: {obrigatorio: true},
		}));
	}
	init() {
		this.bts = document.createElement("div");
		this.bts.style = "grid-column: span 4; padding-left: 20px; padding-top: 20px";
		this.elemento.appendChild(this.bts);	
		let bt = document.createElement("button");
		bt.className = "btn btn-plus";
		bt.textContent = "Gerar lançamentos";
		this.bts.appendChild(bt);
		bt.addEventListener("click", async (e) => {
			let sistema = this.getModuloSistema();
			let lista = sistema.validar();
			sistema.mostrarValidacao(lista, sistema.aba);
			if (lista.length == 0) {
				lista = this.validar(true);
				if (this.vazio(true)) {
					new Modal().mostrar("Fechamento Contábil", "Os campos estão vazios");
				} else {
					if (lista.length == 0) {
						let tiposContasPagar = this.pai.getComponente("tiposContasPagar").getValor();
						let contasPagar = this.pai.getComponente("contasPagar");
						let data =  this.getComponente("data").getValor();
						for (let cp of contasPagar.getValor()) {
							let tipoContabil = tiposContasPagar.find(t => t.id == cp.tipoContabil);
							let resumo = contasPagar.gerarResumoContrato(cp, null, data);
							if (!tipoContabil.resumos) {
								tipoContabil.resumos = [];
							}
							tipoContabil.resumos.push(resumo);
						}
						console.log("tiposContasPagar", tiposContasPagar);
					} else {
						this.mostrarValidacao(lista, this.pai.aba);
						new Modal().mostrar("Fechamento Contábil", "Há erros que devem ser corrigidos antes de gerar o projetivo");
					}
				}
			}
		});
	}
}
class ModuloContasPagarReceber extends ModuloSistemaDOM {
	constructor() {
		let elemento = document.getElementById("principal");
		super(elemento, "sistemaContasPagarReceber", {
			qtdColunas: 4,
			regras: {obrigatorio: true}
		});
		this.aba = new ControleAba(document.body);
		this.add(new FechamentoContabil());
		let elementoParametros = document.getElementById("parametros");
		this.add(new TiposContasPagar(elementoParametros, this.aba));
		this.add(new TiposContasReceber(elementoParametros, this.aba));
		this.add(new ContasPagar(this.aba));
		this.add(new ContasReceber(this.aba));
		this.aba.aoAlterar = (aba) => {
			if (aba == "abaContasPagar") {
				let tipos = this.getComponente("tiposContasPagar").getValor();
				this.getComponente("contasPagar").preencherTipos(tipos);
			} else if (aba == "abaContasReceber") {
				let tipos = this.getComponente("tiposContasReceber").getValor();
				this.getComponente("contasReceber").preencherTipos(tipos);
			}
		};
	}
	setContas(contas) {
		let lista = new TransformaContas().getLista(contas);
		let contasAtivo = lista.filter(conta => conta.codigo.startsWith("1.") && !conta.sintetica);
		this.getComponente("tiposContasReceber").preencherCombos(contasAtivo);
		let contasPassivo = lista.filter(conta => conta.codigo.startsWith("2.") && !conta.sintetica);
		this.getComponente("tiposContasPagar").preencherCombos(contasPassivo);
	}
	setClientes(clientes) {
		this.clientes = clientes.sistemaClientes;
		this.preencherCombos(this.clientes);
	}
	preencherCombos(clientes) {
		this.getComponente("contasPagar").preencherCombos(clientes.fornecedores);
		this.getComponente("contasReceber").preencherCombos(clientes.clientes);
	}
	focar() {
		super.focar();
		this.aba.alternar("abaPrincipal");
	}
}

let contasPagarReceber = new ModuloContasPagarReceber();
await contasPagarReceber.carregarDados();
const parametros = new URLSearchParams(window.location.search);
async function carregarPlanoContas(nome) {
	let arq = "../planoContas/dados/" + nome + "?vd1";
	await fetch(arq)
		.then(resposta => resposta.json())
		.then(obj => {
			contasPagarReceber.setContas(obj);
		}).catch(erro => console.error('Erro ao ler o JSON:', erro)
	);
}
async function carregarClientes(nome) {
	let arq = "../clientes/dados/" + nome + "?vd1";
	await fetch(arq)
		.then(resposta => resposta.json())
		.then(obj => {
			contasPagarReceber.setClientes(obj);
		}).catch(erro => console.error('Erro ao ler o JSON:', erro)
	);
}
if (parametros.get("contas")) {
	await carregarPlanoContas(parametros.get("contas"));
}
if (parametros.get("clientes")) {
	await carregarClientes(parametros.get("clientes"));
}
if (parametros.get("dados")) {
	let arq = "dados/" + parametros.get("dados") + "?v0.91";
	contasPagarReceber.carregar(arq);
}
async function executaAcao(linkDestino) {
	let versao = "?v0.91";
	if (linkDestino === "#abrir") {
		contasPagarReceber.abrirArquivo();
	} else if (linkDestino === "#salvar") {
		contasPagarReceber.salvarArquivo("contasPagarReceber.json");
	} else if (linkDestino === "#novo") {
		contasPagarReceber.novo();
	} else if (linkDestino === "#validar") {
		let lista = contasPagarReceber.validar();
		contasPagarReceber.mostrarValidacao(lista, contasPagarReceber.aba);
	} else if (linkDestino === "#planoContas") {
		let obj = await contasPagarReceber.abrirComJanelaNativa();
		contasPagarReceber.setContas(obj);
	} else if (linkDestino === "#clientes") {
		let obj = await contasPagarReceber.abrirComJanelaNativa();
		contasPagarReceber.setClientes(obj);
	} else if (linkDestino === "#ajuda") {
		//contasPagarReceber.mostrarAjuda("ajuda.html", "Contabilidade Simples em Javascript", versao);
	} else if (linkDestino === "#sobre") {
		contasPagarReceber.sobre("Contabilidade Simples em Javascript", "Módulo de Contas a Pagar e a Receber do Sistema contábil para treinamento e para uso em pequenas empresas.<br>Em desenvolvimento por Myrko I. da Graça", versao);
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
document.body.hidden = false;
