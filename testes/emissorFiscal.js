/**
 * Módulo de Emissão Fiscal (Frontend) para Vendas Financiadas
 */
const EmissorFiscal = {
    
    /**
     * Função auxiliar genérica para forçar o download de arquivos no navegador
     */
    _dispararDownload: function(conteudo, nomeArquivo, tipoMime) {
        const blob = new Blob([conteudo], { type: tipoMime });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * 1. GERAÇÃO DE PRODUTOS EM LOTE (NF-e formato .txt para o Sebrae)
     */
    exportarNfeProdutoSebrae: function(venda, emitente, destinatario) {
        let txt = "";
        const quebra = "\(\r\\)n"; // Padrão Windows obrigatório da SEFAZ

        // Linha Inicial e Bloco A (Layout)
        txt += `NOTA FISCAL|${quebra}`;
        txt += `A|4.00|NFe|${quebra}`;

        // Bloco B: Identificação da Nota Fiscal
        txt += `B|${emitente.codigoMunicipio.substring(0,2)}||Venda Financiada de Mercadorias|1|55|1|${venda.idVenda}|${new Date().toISOString().substring(0,19)}||1|1|${emitente.codigoMunicipio}|1|1||2|2|1|1.0.0|||${quebra}`;

        // Bloco C: Emitente (Dados da Empresa)
        txt += `C|${emitente.razaoSocial}||${emitente.ie}||||${emitente.crt}|${quebra}`;
        txt += `C02|${emitente.cnpj}|${quebra}`;
        txt += `C05|${emitente.logradouro}|${emitente.numero}||${emitente.bairro}|${emitente.codigoMunicipio}|${emitente.municipio}|${emitente.uf}|${emitente.cep}|1058|BRASIL|||${quebra}`;

        // Bloco E: Destinatário (Dados do Cliente)
        txt += `E|${destinatario.nome}|||${destinatario.ie || ''}||||${quebra}`;
        txt += `E02|${destinatario.cpf_cnpj}|${quebra}`;
        txt += `E05|${destinatario.logradouro}|${destinatario.numero}||${destinatario.bairro}|${destinatario.codigoMunicipio}|${destinatario.municipio}|${destinatario.uf}|${destinatario.cep}|1058|BRASIL|||${quebra}`;

        // Bloco H e I: Loop de Múltiplos Itens (Produtos)
        let vProdTotal = 0;
        venda.itens.forEach((item, index) => {
            const numeroItem = index + 1;
            const vProdItem = (item.valorOriginal * item.quantidade).toFixed(2);
            vProdTotal += item.valorOriginal * item.quantidade;

            txt += `H|${numeroItem}|||${quebra}`;
            txt += `I|${item.codigo}||${item.descricao}|${item.ncm}||${venda.cfop}|UN|${item.quantidade.toFixed(4)}|${item.valorOriginal.toFixed(4)}|${vProdItem}||UN|${item.quantidade.toFixed(4)}|||||1||${quebra}`;
            txt += `M|${quebra}`;
            txt += `N||${quebra}`;
            txt += `N10c|0|102|${quebra}`; // Simples Nacional - CSOSN 102
        });

        // Bloco W: Totais Fiscais da Nota
        const vProdFinal = vProdTotal.toFixed(2);
        const vOutroFinal = venda.totalJurosRecebidos.toFixed(2);
        const vNfFinal = venda.valorTotalComJuros.toFixed(2);

        // Posição correta dos totalizadores após W02|:
        // |vBC|vICMS|vICMSDeson|vFCPUFDest|vICMSUFDest|vICMSColor|vProd|vFrete|vSeg|vDesc|vII|vIPI|vIPIDevol|vPIS|vCOFINS|vOutro|vNF|
        txt += `W|${quebra}`;
        txt += `W02|0.00|0.00|0.00|0.00|0.00|0.00|${vProdFinal}|0.00|0.00|0.00|0.00|0.00|0.00|0.00|0.00|${vOutroFinal}|${vNfFinal}|${quebra}`;

        // Bloco YA: Informações de Pagamento (03 = Cartão de Crédito)
        txt += `YA|${quebra}`;
        txt += `YA01||03|${vNfFinal}|1||${quebra}`;

        // Força download em ANSI/Windows-1252 para conformidade com a SEFAZ
        this._dispararDownload(txt, `NFe_Venda_Produtos_${venda.idVenda}.txt`, 'text/plain;charset=windows-1252');
        return txt; // Retorna para validação em ambiente de teste
    },

    /**
     * 2. GERAÇÃO DE SERVIÇOS EM LOTE (NFS-e formato .xml para o Gov.br)
     */
    exportarNfseServicoGovBr: function(venda, emitente, destinatario) {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
        xml += `<EnviarLoteRpsEnvio xmlns="http://abrasf.org.br">`;
        xml += `  <LoteRps Id="lote_${venda.idVenda}" versao="2.02">`;
        xml += `    <ListaRps>`;

        // Múltiplos Serviços geram múltiplas tags <Rps> no lote
        venda.itens.forEach((item, index) => {
            const valorTotalItemComJuros = (item.valorOriginal + item.juroDoItem).toFixed(2);
            
            xml += `      <Rps>`;
            xml += `        <InfDeclaracaoPrestacaoServico>`;
            xml += `          <Prestador>`;
            xml += `            <Cnpj>${emitente.cnpj}</Cnpj>`;
            xml += `            <InscricaoMunicipal>${emitente.im}</InscricaoMunicipal>`;
            xml += `          </Prestador>`;
            xml += `          <Tomador>`;
            xml += `            <IdentificacaoTomador>`;
            xml += `              <CpfCnpj>`;
            xml += `                <Cnpj>${destinatario.cpf_cnpj}</Cnpj>`;
            xml += `              </CpfCnpj>`;
            xml += `            </IdentificacaoTomador>`;
            xml += `            <RazaoSocial>${destinatario.nome}</RazaoSocial>`;
            xml += `            <Endereco>`;
            xml += `              <Logradouro>${destinatario.logradouro}</Logradouro>`;
            xml += `              <Numero>${destinatario.numero}</Numero>`;
            xml += `              <Bairro>${destinatario.bairro}</Bairro>`;
            xml += `              <CodigoMunicipio>${destinatario.codigoMunicipio}</CodigoMunicipio>`;
            xml += `              <Uf>${destinatario.uf}</Uf>`;
            xml += `              <Cep>${destinatario.cep}</Cep>`;
            xml += `            </Endereco>`;
            xml += `          </Tomador>`;
            xml += `          <Servico>`;
            xml += `            <Valores>`;
            xml += `              <ValorServicos>${valorTotalItemComJuros}</ValorServicos>`;
            xml += `              <IssRetido>2</IssRetido>`;
            xml += `            </Valores>`;
            xml += `            <ItemListaServico>${item.nbm}</ItemListaServico>`;
            xml += `            <CodigoMunicipio>${emitente.codigoMunicipio}</CodigoMunicipio>`;
            xml += `            <Discriminacao>Item ${index + 1}: ${item.descricao}. Valor base: R$ ${item.valorOriginal.toFixed(2)} | Juros calculados: R$ ${item.juroDoItem.toFixed(2)}</Discriminacao>`;
            xml += `          </Servico>`;
            xml += `        </InfDeclaracaoPrestacaoServico>`;
            xml += `      </Rps>`;
        });

        xml += `    </ListaRps>`;
        xml += `  </LoteRps>`;
        xml += `</EnviarLoteRpsEnvio>`;

        this._dispararDownload(xml, `NFSe_Venda_Servicos_${venda.idVenda}.xml`, 'application/xml;charset=utf-8');
        return xml; // Retorna para validação em ambiente de teste
    }
};
// === MASSA DE DADOS (MOCKS) ===
const emitenteMock = {
    cnpj: "00000000000191",
    ie: "111111111111",
    im: "123456",
    razaoSocial: "RAZAO SOCIAL DA MINHA EMPRESA LTDA",
    crt: "1",
    logradouro: "AVENIDA PAULISTA",
    numero: "1000",
    bairro: "BELA VISTA",
    codigoMunicipio: "3550308", // São Paulo
    municipio: "SAO PAULO",
    uf: "SP",
    cep: "01310100"
};

const destinatarioMock = {
    cpf_cnpj: "11111111111",
    nome: "NOME DO CLIENTE DE TESTE",
    ie: "",
    logradouro: "RUA DAS FLORES",
    numero: "123",
    bairro: "CENTRO",
    codigoMunicipio: "3304557", // Rio de Janeiro
    municipio: "RIO DE JANEIRO",
    uf: "RJ",
    cep: "20000000"
};

// Venda contendo múltiplos produtos
const carrinhoProdutos = {
    idVenda: "505",
    cfop: "5102",
    totalJurosRecebidos: 120.00,
    valorTotalComJuros: 2120.00,
    itens: [
        { codigo: "PROD-01", descricao: "MESA GAMER", valorOriginal: 1200.00, quantidade: 1, ncm: "94031000" },
        { codigo: "PROD-02", descricao: "CADEIRA ERGONOMICA", valorOriginal: 800.00, quantidade: 1, ncm: "94031000" }
    ]
};

// Venda contendo múltiplos serviços
const carrinhoServicos = {
    idVenda: "606",
    itens: [
        { descricao: "Consultoria em TI", valorOriginal: 1000.00, juroDoItem: 60.00, nbm: "01.01" },
        { descricao: "Desenvolvimento Web", valorOriginal: 2000.00, juroDoItem: 120.00, nbm: "01.02" }
    ]
};

// === SCRIPT DE EXECUÇÃO E VERIFICAÇÃO ===
function executarTestesFiscais() {
    console.log("🎬 Iniciando testes de validação dos layouts fiscais...");

    // Teste 1: Validação de Produtos (.txt)
    try {
        const txtGerado = EmissorFiscal.exportarNfeProdutoSebrae(carrinhoProdutos, emitenteMock, destinatarioMock);
        
        // Asserção de quebra de linha padrão Windows
        if (!txtGerado.includes("\r\n")) throw new Error("Falha: O layout TXT precisa de quebras de linha \\r\\n");
        // Asserção do campo dos juros na linha totalizadora (W02)
        if (!txtGerado.includes("|120.00|2120.00|")) throw new Error("Falha: Juros ou Valor Total desalinhados na linha W02");
        
        console.log("✅ Teste 1: Estrutura do arquivo TXT (Produtos) gerada com sucesso.");
    } catch (e) {
        console.error("❌ Erro no Teste 1:", e.message);
    }

    // Teste 2: Validação de Serviços (.xml)
    try {
        const xmlGerado = EmissorFiscal.exportarNfseServicoGovBr(carrinhoServicos, emitenteMock, destinatarioMock);
        
        // Asserção de fechamento de lote
        if (!xmlGerado.endsWith("</EnviarLoteRpsEnvio>")) throw new Error("Falha: O XML de serviços não fechou a tag root com segurança");
        // Asserção de consolidação de preço por item (1000 + 60 = 1060)
        if (!xmlGerado.includes("<ValorServicos>1060.00</ValorServicos>")) throw new Error("Falha: O cálculo de Juro + Serviço falhou no XML");
        
        console.log("✅ Teste 2: Estrutura do arquivo XML (Serviços) gerada com sucesso.");
    } catch (e) {
        console.error("❌ Erro no Teste 2:", e.message);
    }
}

// Executar no console
executarTestesFiscais();
