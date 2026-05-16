const params = new URLSearchParams(window.location.search);
const reportId = params.get("id");
const saved = reportId ? localStorage.getItem(`edenReport:${reportId}`) : null;
const reportData = saved
  ? JSON.parse(saved)
  : {
      id: "preview",
      model: "C3",
      createdAt: new Date().toISOString(),
      data: EDEN_DEFAULTS,
      result: edenCalculate(EDEN_DEFAULTS),
    };

const { data, result } = reportData;
const createdAt = new Date(reportData.createdAt).toLocaleDateString("pt-BR");

function row(label, value) {
  return `<tr><td>${label}</td><td><strong>${value}</strong></td></tr>`;
}

function pageHeader(page, title = "Operação C3") {
  return `
    <div class="page-header">
      <span>${title}</span>
      <span>Página ${page}</span>
    </div>
  `;
}

document.title = `Relatorio C3 - ${data.clientName || "Cliente"}`;

document.querySelector("#report").innerHTML = `
  <section class="page cover">
    <div class="brand-line">
      <strong>Eden Capital</strong>
      <span>XP Investimentos</span>
    </div>

    <div>
      <h1>Operação C3</h1>
      <p class="subtitle">Estruturação de crédito com carta contemplada para transformar patrimônio em liquidez sem venda do ativo.</p>
      <div class="metric-grid">
        <div class="metric"><span>Cliente</span><strong>${data.clientName || "Cliente"}</strong></div>
        <div class="metric"><span>Crédito liberado</span><strong>${edenMoney(data.releasedCredit)}</strong></div>
        <div class="metric"><span>Garantia</span><strong>${edenMoney(data.propertyGuarantee)}</strong></div>
        <div class="metric"><span>Uso da garantia</span><strong>${edenPercent(result.ltv)}</strong></div>
      </div>
    </div>

    <div class="footer">
      <span>Material de análise comercial</span>
      <span>${createdAt}</span>
    </div>
  </section>

  <section class="page">
    ${pageHeader(2)}
    <h2>1. Objetivo da Operação</h2>
    <p class="lead">A Operação C3 permite ao cliente acessar liquidez de forma estruturada, utilizando patrimônio imobiliário como lastro, sem necessidade de venda do ativo.</p>
    <p>A estrutura combina carta contemplada já disponível, garantia imobiliária, FIDC para estruturação da entrada e fluxo de pagamento previsível.</p>

    <h3>Resumo da Estrutura</h3>
    <table>
      <tbody>
        ${row("Garantia imobiliária", edenMoney(data.propertyGuarantee))}
        ${row("Crédito da carta contemplada", edenMoney(data.letterCredit))}
        ${row("Valor aproximado liberado ao cliente", edenMoney(data.releasedCredit))}
        ${row("Uso da garantia", edenPercent(result.ltv))}
        ${row("Prazo total", `${edenNumber(result.term)} meses`)}
        ${row("Saldo devedor da carta", edenMoney(result.cardDebt))}
      </tbody>
    </table>

    <div class="callout">
      <strong>Leitura objetiva:</strong>
      O cliente utiliza uma garantia imobiliária de ${edenMoney(data.propertyGuarantee)} para acessar aproximadamente ${edenMoney(data.releasedCredit)} de liquidez.
    </div>
  </section>

  <section class="page">
    ${pageHeader(3)}
    <h2>2. Aquisição da Carta Contemplada</h2>
    <p>A operação utiliza uma carta de crédito já contemplada, ou seja, não depende de sorteio, lance ou contemplação futura.</p>

    <table>
      <tbody>
        ${row("Crédito total da carta", edenMoney(data.letterCredit))}
        ${row("Entrada para aquisição", edenMoney(data.letterEntry))}
        ${row("Taxa de transferência", edenMoney(data.transferFee))}
        ${row("Total necessário para aquisição", edenMoney(result.totalAcquisition))}
        ${row("Entrada sobre o crédito da carta", edenPercent(result.entryPercent))}
      </tbody>
    </table>

    <div class="note-box">
      A entrada e a taxa de transferência podem ser estruturadas via FIDC, evitando o desembolso inicial com capital próprio.
    </div>
  </section>

  <section class="page">
    ${pageHeader(4)}
    <h2>3. Fluxo de Pagamento da Carta</h2>
    <p>Após a aquisição da carta contemplada, o cliente assume um fluxo de pagamento definido, com prazo longo e previsibilidade.</p>

    <table>
      <thead>
        <tr><th>Período</th><th>Quantidade</th><th>Parcela</th><th>Total</th></tr>
      </thead>
      <tbody>
        <tr><td>Parcelas 1 a ${edenNumber(data.installmentsA)}</td><td>${edenNumber(data.installmentsA)}</td><td>${edenMoney(data.installmentValueA)}</td><td>${edenMoney(data.installmentsA * data.installmentValueA)}</td></tr>
        <tr><td>Parcelas ${edenNumber(data.installmentsA + 1)} a ${edenNumber(result.term)}</td><td>${edenNumber(data.installmentsB)}</td><td>${edenMoney(data.installmentValueB)}</td><td>${edenMoney(data.installmentsB * data.installmentValueB)}</td></tr>
        <tr><td><strong>Total</strong></td><td><strong>${edenNumber(result.term)} meses</strong></td><td></td><td><strong>${edenMoney(result.cardDebt)}</strong></td></tr>
      </tbody>
    </table>

    <div class="note-box">
      Os valores representam o saldo devedor total da carta contemplada. Custos acessórios devem ser confirmados conforme documentação da operação.
    </div>
  </section>

  <section class="page">
    ${pageHeader(5)}
    <h2>4. Alternativas para Avaliação</h2>
    <p>A análise compara três caminhos possíveis: usar a estrutura financiada via FIDC, comprar a carta com recurso próprio ou contratar uma operação tradicional de Home Equity.</p>

    <table>
      <thead>
        <tr><th>Alternativa</th><th>Desembolso inicial</th><th>Liquidez estimada</th><th>Custo financeiro direto</th><th>Ponto de atenção</th></tr>
      </thead>
      <tbody>
        <tr><td>C3</td><td>R$ 0,00 na entrada da carta*</td><td>${edenMoney(data.releasedCredit)}</td><td>${edenMoney(result.agentCostValue)}</td><td>Operação estruturada financiada via FIDC com preservação de caixa</td></tr>
        <tr><td>Compra com recurso próprio</td><td>${edenMoney(result.totalAcquisition)}</td><td>${edenMoney(data.releasedCredit)}</td><td>R$ 0,00</td><td>Imobiliza capital próprio</td></tr>
        <tr><td>Home Equity</td><td>Conforme aprovação bancária</td><td>${edenMoney(data.releasedCredit)}</td><td>${data.homeEquityRate.toFixed(2).replace(".", ",")}% a.m. + IPCA</td><td>Dívida indexada à inflação</td></tr>
      </tbody>
    </table>
    <p>*Entrada e taxa de transferência estruturadas via FIDC.</p>
  </section>

  <section class="page">
    ${pageHeader(6)}
    <h2>5. Comparativo de Custo</h2>
    <table>
      <thead>
        <tr><th>Alternativa</th><th>Desembolso inicial</th><th>Saldo parcelado da carta</th><th>Custo adicional</th><th>Custo total estimado</th></tr>
      </thead>
      <tbody>
        <tr><td>Compra com recurso próprio</td><td>${edenMoney(result.totalAcquisition)}</td><td>${edenMoney(result.cardDebt)}</td><td>R$ 0,00</td><td>${edenMoney(result.totalOwnResources)}</td></tr>
        <tr><td>C3</td><td>R$ 0,00 na entrada*</td><td>${edenMoney(result.cardDebt)}</td><td>${edenMoney(result.agentCostValue)}</td><td>${edenMoney(result.totalWithAgent)}</td></tr>
      </tbody>
    </table>
    <div class="callout">
      A compra com recurso próprio reduz o custo financeiro direto em aproximadamente ${edenMoney(result.agentCostValue)}. Por outro lado, exige desembolso inicial de ${edenMoney(result.totalAcquisition)}.
    </div>
  </section>

  <section class="page">
    ${pageHeader(7)}
    <h2>6. Comparativo com Home Equity</h2>
    <p>Simulação considerando uma operação de Home Equity de ${edenMoney(data.releasedCredit)}, no prazo de ${edenNumber(result.term)} meses, com taxa de ${data.homeEquityRate.toFixed(2).replace(".", ",")}% a.m. + IPCA.</p>
    <table>
      <thead>
        <tr><th>Estrutura</th><th>Parcela estimada</th><th>Total estimado</th></tr>
      </thead>
      <tbody>
        <tr><td>Operação C3</td><td>${edenMoney(data.installmentValueA)} até a parcela ${edenNumber(data.installmentsA)}</td><td>${edenMoney(result.cardDebt)}</td></tr>
        <tr><td>Home Equity sem IPCA</td><td>${edenMoney(result.homeEquityInstallment)}</td><td>${edenMoney(result.homeEquityTotal)}</td></tr>
        <tr><td>Home Equity com IPCA estimado de ${data.ipca.toFixed(2).replace(".", ",")}% a.a.</td><td>${edenMoney(result.homeEquityIpcaInstallment)}</td><td>${edenMoney(result.homeEquityIpcaTotal)}</td></tr>
      </tbody>
    </table>
    <div class="callout">
      No comparativo, a Operação C3 apresenta fluxo mais previsível e não fica exposta à correção mensal pelo IPCA ao longo do contrato.
    </div>
  </section>

  <section class="page">
    ${pageHeader(8)}
    <h2>7. Como Avaliar a Melhor Alternativa</h2>
    <div class="two-col">
      <div class="mini-card"><span>Preservação de caixa</span><strong>C3</strong></div>
      <div class="mini-card"><span>Menor custo direto</span><strong>Recurso próprio</strong></div>
      <div class="mini-card"><span>Modelo tradicional</span><strong>Home Equity</strong></div>
      <div class="mini-card"><span>Uso da garantia</span><strong>${edenPercent(result.ltv)}</strong></div>
    </div>
    <h3>Pontos de destaque da Operação C3</h3>
    <table>
      <tbody>
        ${row("Liquidez imediata", `Acesso aproximado a ${edenMoney(data.releasedCredit)}`)}
        ${row("Preservação patrimonial", "Não há venda do imóvel")}
        ${row("Carta já contemplada", "Sem espera por sorteio ou lance")}
        ${row("Entrada estruturada", "Possibilidade de não usar caixa próprio na aquisição")}
        ${row("Fluxo previsível", "Parcelas definidas ao longo do prazo")}
      </tbody>
    </table>
  </section>

  <section class="page">
    ${pageHeader(9)}
    <h2>8. Conclusão da Análise</h2>
    <p class="lead">A Operação C3 é uma alternativa para clientes que desejam acessar liquidez utilizando patrimônio como lastro, sem necessidade de venda do ativo e com fluxo de pagamento previsível.</p>
    <table>
      <thead>
        <tr><th>Alternativa</th><th>Principal leitura</th></tr>
      </thead>
      <tbody>
        <tr><td>Compra com recurso próprio</td><td>Menor custo financeiro direto, porém exige desembolso inicial relevante.</td></tr>
        <tr><td>C3</td><td>Operação estruturada financiada via FIDC que preserva o caixa inicial do cliente, mediante custo transitório de estruturação.</td></tr>
        <tr><td>Home Equity</td><td>Operação tradicional, porém com exposição à taxa de juros e correção pelo IPCA.</td></tr>
      </tbody>
    </table>
    <div class="callout">
      <strong>A melhor estrutura é aquela que equilibra custo, prazo, previsibilidade e preservação de caixa.</strong>
    </div>
    <div class="signoff">
      <strong>Victor Rubem</strong>
      <p>Eden Capital | XP Investimentos</p>
    </div>
  </section>
`;

document.querySelector("#printReportButton").addEventListener("click", () => window.print());
document.querySelector("#backButton").addEventListener("click", () => window.history.back());
