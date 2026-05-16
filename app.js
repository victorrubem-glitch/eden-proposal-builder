let activeModel = "c3";
const c3Form = document.querySelector("#operationForm");
const homeEquityForm = document.querySelector("#homeEquityForm");
const consorcioForm = document.querySelector("#consorcioForm");
let form = c3Form;
const saveButton = document.querySelector("#saveButton");
const printButton = document.querySelector("#printButton");
const resetButton = document.querySelector("#resetButton");
const clearHistoryButton = document.querySelector("#clearHistoryButton");
const historyTable = document.querySelector("#historyTable");
const calcStatus = document.querySelector("#calcStatus");
const validationPanel = document.querySelector("#validationPanel");
const proposalStatus = document.querySelector("#proposalStatus");

const formattedFields = {
  propertyGuarantee: "currency",
  letterCredit: "currency",
  releasedCredit: "currency",
  letterEntry: "currency",
  transferFee: "currency",
  installmentValueA: "currency",
  installmentValueB: "currency",
  iof: "currency",
  appraisalFee: "currency",
  registryFee: "currency",
  bankFee: "currency",
  insuranceFee: "currency",
  otherCosts: "currency",
  agentCost: "percent",
  homeEquityRate: "percent",
  ipca: "percent",
  installmentsA: "integer",
  installmentsB: "integer",
  term: "integer",
  creditAmount: "currency",
  bidAmount: "currency",
  installment: "currency",
  adminFee: "percent",
  reserveFund: "percent",
  insuranceMonthly: "currency",
  annualAdjustment: "percent",
};

function money(value) {
  return edenMoney(value);
}

function percent(value) {
  return edenPercent(value);
}

function parseFormattedNumber(value) {
  if (typeof value === "number") return value;
  const clean = String(value || "")
    .replace(/[R$\s%]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatFieldValue(value, kind) {
  const parsed = parseFormattedNumber(value);
  if (kind === "currency") return money(parsed);
  if (kind === "percent") return `${parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  if (kind === "integer") return String(Math.round(parsed || 0));
  return value;
}

function getFormData() {
  return Object.fromEntries(
    Array.from(new FormData(form).entries()).map(([key, value]) => {
      if (key === "clientName" || key === "operationName" || key === "rateMode") return [key, value];
      return [key, parseFormattedNumber(value)];
    }),
  );
}

function setFormData(data) {
  Object.entries(data).forEach(([key, value]) => {
    const input = form.elements[key];
    if (input) input.value = formattedFields[key] ? formatFieldValue(value, formattedFields[key]) : value;
  });
}

function calculate(data) {
  return edenCalculate(data);
}

function calculateHomeEquity(data) {
  return edenCalculateHomeEquity(data);
}

function calculateConsorcio(data) {
  return edenCalculateConsorcio(data);
}

function rows(target, items) {
  target.innerHTML = items
    .map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`)
    .join("");
}

function validateOperation(data, result) {
  const issues = [];

  if (!data.clientName.trim()) {
    issues.push({ type: "error", text: "Informe o nome do cliente antes de gerar a proposta." });
  }

  if (data.propertyGuarantee <= 0) {
    issues.push({ type: "error", text: "A garantia imobiliária precisa ser maior que zero." });
  }

  if (data.releasedCredit <= 0) {
    issues.push({ type: "error", text: "O crédito liberado precisa ser maior que zero." });
  }

  if (result.ltv > 0.5) {
    issues.push({ type: "warning", text: "Uso da garantia acima de 50%. Revise enquadramento, garantia e apetite de risco." });
  }

  if (data.releasedCredit > data.propertyGuarantee) {
    issues.push({ type: "error", text: "O crédito liberado não pode ser maior que a garantia imobiliária." });
  }

  if (result.totalAcquisition > data.releasedCredit) {
    issues.push({ type: "warning", text: "O total para aquisição da carta supera o crédito liberado. Avalie impacto de caixa." });
  }

  if (data.homeEquityRate <= 0 || data.ipca <= 0) {
    issues.push({ type: "error", text: "Taxa Home Equity e IPCA estimado são necessários para o comparativo." });
  }

  if (result.term <= 0) {
    issues.push({ type: "error", text: "O prazo total precisa considerar ao menos uma parcela." });
  }

  return issues;
}

function renderValidation(issues) {
  const errors = issues.filter((issue) => issue.type === "error");
  if (!issues.length) {
    validationPanel.className = "validation-panel is-ok";
    validationPanel.innerHTML = `<strong>Sem alertas críticos</strong><span>Premissas consistentes para revisão comercial.</span>`;
    proposalStatus.textContent = "Pronta para revisão";
    proposalStatus.className = "status-ready";
    return;
  }

  validationPanel.className = `validation-panel ${errors.length ? "has-error" : "has-warning"}`;
  validationPanel.innerHTML = `
    <strong>${errors.length ? "Pendências para emissão" : "Pontos de atenção"}</strong>
    <ul>${issues.map((issue) => `<li>${issue.text}</li>`).join("")}</ul>
  `;
  proposalStatus.textContent = errors.length ? "Revisar pendências" : "Revisar alertas";
  proposalStatus.className = errors.length ? "status-error" : "status-warning";
}

function updatePreview() {
  if (activeModel === "home-equity") {
    updateHomeEquityPreview();
    return;
  }
  if (activeModel === "consorcio") {
    updateConsorcioPreview();
    return;
  }

  const data = getFormData();
  const result = calculate(data);
  const issues = validateOperation(data, result);

  document.querySelector("#kpiLetterCredit").textContent = money(data.letterCredit);
  document.querySelector("#kpiReleased").textContent = money(data.releasedCredit);
  document.querySelector("#kpiLtv").textContent = percent(result.ltv);
  document.querySelector("#kpiLetterEntry").textContent = money(data.letterEntry);
  document.querySelector("#kpiTransferFee").textContent = money(data.transferFee);
  document.querySelector("#kpiAgentCost").textContent = money(result.agentCostValue);
  document.querySelector("#kpiCardDebt").textContent = money(result.cardDebt);
  document.querySelector("#metricReleased").textContent = money(data.releasedCredit);
  document.querySelector("#metricGuarantee").textContent = money(data.propertyGuarantee);
  document.querySelector("#metricLtv").textContent = percent(result.ltv);
  document.querySelector("#metricTerm").textContent = `${edenNumber(result.term)} meses`;

  document.querySelector("#objectiveText").textContent =
    `A operação permite ao cliente ${data.clientName || "Cliente"} acessar liquidez de forma estruturada, utilizando garantia imobiliária de ${money(data.propertyGuarantee)} como lastro, sem necessidade de venda do ativo.`;

  rows(document.querySelector("#summaryRows"), [
    ["Cliente", data.clientName || "-"],
    ["Garantia imobiliária", money(data.propertyGuarantee)],
    ["Crédito da carta contemplada", money(data.letterCredit)],
    ["Crédito liberado ao cliente", money(data.releasedCredit)],
    ["Uso da garantia", percent(result.ltv)],
    ["Prazo total", `${edenNumber(result.term)} meses`],
    ["Saldo devedor total da carta", money(result.cardDebt)],
  ]);

  rows(document.querySelector("#letterRows"), [
    ["Entrada da carta", money(data.letterEntry)],
    ["Taxa de transferência", money(data.transferFee)],
    ["Total para aquisição", money(result.totalAcquisition)],
    ["Entrada sobre o crédito", percent(result.entryPercent)],
    ["Custo FIDC", money(result.agentCostValue)],
    ["Liquidação estimada da estrutura financiada", money(result.agentSettlement)],
  ]);

  document.querySelector("#comparisonRows").innerHTML = [
    ["C3", money(result.totalWithAgent), "Operação estruturada financiada com preservação de caixa"],
    ["Compra com recurso próprio", money(result.totalOwnResources), "Reduz custo financeiro direto"],
    ["Home Equity sem IPCA", money(result.homeEquityTotal), `${money(result.homeEquityInstallment)} por mês`],
    ["Home Equity com IPCA", money(result.homeEquityIpcaTotal), `${money(result.homeEquityIpcaInstallment)} por mês`],
  ]
    .map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`)
    .join("");

  calcStatus.textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  renderValidation(issues);
}

function validateConsorcio(data) {
  const issues = [];
  if (!data.clientName.trim()) {
    issues.push({ type: "error", text: "Informe o nome do cliente antes de gerar a análise." });
  }
  if (data.creditAmount <= 0) {
    issues.push({ type: "error", text: "O crédito desejado precisa ser maior que zero." });
  }
  if (data.term <= 0) {
    issues.push({ type: "error", text: "O prazo total precisa considerar ao menos um mês." });
  }
  if (data.bidAmount > data.creditAmount) {
    issues.push({ type: "warning", text: "O lance/entrada está acima do crédito desejado. Revise a simulação." });
  }
  if (data.bidAmount / data.creditAmount < 0.1) {
    issues.push({ type: "warning", text: "Lance inferior a 10% do crédito. A chance de contemplação pode ser baixa conforme o grupo." });
  }
  return issues;
}

function updateConsorcioPreview() {
  const data = getFormData();
  const result = calculateConsorcio(data);
  const issues = validateConsorcio(data, result);

  document.querySelector(".eyebrow").textContent = "Consórcio · Rascunho";
  document.querySelector("h1").textContent = "Consórcio: Estrutura de Aquisição Planejada";

  const kpis = [
    ["Crédito desejado", money(data.creditAmount)],
    ["Lance / entrada", money(data.bidAmount)],
    ["Lance sobre crédito", percent(result.bidPercent)],
    ["Parcela estimada", money(data.installment)],
    ["Prazo", `${edenNumber(data.term)} meses`],
    ["Custo total estimado", money(result.totalCost)],
    ["Crédito corrigido proj.", money(result.projectedAdjustedCredit)],
  ];
  document.querySelector(".kpi-strip").innerHTML = kpis
    .map(([label, value]) => `<div class="kpi-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  document.querySelector(".proposal-cover p").textContent = "CONSÓRCIO";
  document.querySelector(".proposal-cover h2").textContent = "Estrutura de Aquisição Planejada";
  document.querySelector("#metricReleased").textContent = money(data.creditAmount);
  document.querySelector("#metricGuarantee").textContent = money(data.bidAmount);
  document.querySelector("#metricLtv").textContent = percent(result.bidPercent);
  document.querySelector("#metricTerm").textContent = `${edenNumber(data.term)} meses`;

  document.querySelector("#objectiveText").textContent =
    `A simulação permite avaliar uma aquisição planejada por consórcio, considerando crédito desejado de ${money(data.creditAmount)}, lance/entrada de ${money(data.bidAmount)} e prazo de ${edenNumber(data.term)} meses.`;

  rows(document.querySelector("#summaryRows"), [
    ["Cliente", data.clientName || "-"],
    ["Crédito desejado", money(data.creditAmount)],
    ["Lance ou entrada", money(data.bidAmount)],
    ["Lance sobre o crédito", percent(result.bidPercent)],
    ["Parcela estimada", money(data.installment)],
    ["Prazo total", `${edenNumber(data.term)} meses`],
  ]);

  rows(document.querySelector("#letterRows"), [
    ["Taxa de administração estimada", `${data.adminFee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`],
    ["Custo de administração", money(result.adminCost)],
    ["Fundo de reserva", money(result.reserveCost)],
    ["Seguro total estimado", money(result.insuranceTotal)],
    ["Total das parcelas", money(result.installmentTotal)],
    ["Custo total estimado", money(result.totalCost)],
  ]);

  document.querySelector("#comparisonRows").innerHTML = [
    ["Consórcio", money(result.totalCost), "Aquisição planejada sem juros bancários tradicionais"],
    ["Capital próprio inicial", money(result.requiredOwnCapital), "Lance/entrada necessário para buscar contemplação"],
    ["Crédito corrigido projetado", money(result.projectedAdjustedCredit), "Estimativa com correção anual informada"],
  ]
    .map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`)
    .join("");

  document.querySelector(".proposal-body section:nth-child(3) h3").textContent = "3. Custos do grupo";
  document.querySelector(".proposal-body section:nth-child(4) h3").textContent = "4. Leitura comparativa";
  document.querySelector(".proposal-body section:nth-child(5) p").textContent =
    "A análise deve considerar prazo, capacidade de pagamento, necessidade de contemplação, correção do crédito e disponibilidade de capital para lance.";
  document.querySelector(".assumptions p").textContent =
    "Simulação comercial para fins comparativos. Regras de contemplação, reajustes, taxas, seguros e disponibilidade de crédito devem ser confirmados com a administradora do consórcio.";

  document.querySelector("#consorcioCalcStatus").textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  renderValidation(issues);
}

function restoreC3Kpis() {
  document.querySelector(".kpi-strip").innerHTML = `
    <div class="kpi-card"><span>Crédito da carta</span><strong id="kpiLetterCredit">R$ 0,00</strong></div>
    <div class="kpi-card"><span>Crédito liberado</span><strong id="kpiReleased">R$ 0,00</strong></div>
    <div class="kpi-card"><span>Uso da garantia</span><strong id="kpiLtv">0,00%</strong></div>
    <div class="kpi-card"><span>Entrada da carta</span><strong id="kpiLetterEntry">R$ 0,00</strong></div>
    <div class="kpi-card"><span>Transferência</span><strong id="kpiTransferFee">R$ 0,00</strong></div>
    <div class="kpi-card"><span>Custo FIDC</span><strong id="kpiAgentCost">R$ 0,00</strong></div>
    <div class="kpi-card"><span>Saldo devedor</span><strong id="kpiCardDebt">R$ 0,00</strong></div>
  `;
}

function resetC3Copy() {
  document.querySelector(".eyebrow").textContent = "Operação C3 · Rascunho";
  document.querySelector("h1").textContent = "C3: Estruturação de Crédito com Carta Contemplada";
  document.querySelector(".proposal-cover p").textContent = "OPERAÇÃO C3";
  document.querySelector(".proposal-cover h2").textContent = "C3: Estruturação de Crédito com Carta Contemplada";
  document.querySelector(".proposal-body section:nth-child(3) h3").textContent = "3. Aquisição da carta contemplada";
  document.querySelector(".proposal-body section:nth-child(4) h3").textContent = "4. Comparativo de alternativas";
}

function switchModel(model) {
  activeModel = model;
  form = model === "home-equity" ? homeEquityForm : model === "consorcio" ? consorcioForm : c3Form;
  c3Form.classList.toggle("is-hidden", model !== "c3");
  homeEquityForm.classList.toggle("is-hidden", model !== "home-equity");
  consorcioForm.classList.toggle("is-hidden", model !== "consorcio");
  document.querySelectorAll(".model-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.model === model);
  });
  if (model === "c3") {
    restoreC3Kpis();
    resetC3Copy();
  }
  updatePreview();
}

function validateHomeEquity(data, result) {
  const issues = [];
  if (!data.clientName.trim()) {
    issues.push({ type: "error", text: "Informe o nome do cliente antes de gerar a análise." });
  }
  if (data.propertyGuarantee <= 0) {
    issues.push({ type: "error", text: "O valor do imóvel precisa ser maior que zero." });
  }
  if (data.releasedCredit <= 0) {
    issues.push({ type: "error", text: "O crédito solicitado precisa ser maior que zero." });
  }
  if (data.term <= 0) {
    issues.push({ type: "error", text: "O prazo precisa considerar ao menos um mês." });
  }
  if (result.ltv > 0.6) {
    issues.push({ type: "warning", text: "Uso da garantia acima de 60%. Revise enquadramento bancário e apetite de crédito." });
  }
  if (data.homeEquityRate <= 0 || (result.isPostFixed && data.ipca <= 0)) {
    issues.push({ type: "error", text: "Taxa mensal e IPCA estimado são necessários para a simulação." });
  }
  return issues;
}

function updateHomeEquityPreview() {
  const data = getFormData();
  const result = calculateHomeEquity(data);
  const issues = validateHomeEquity(data, result);
  const rateModeLabel = result.isPostFixed ? "Pós-fixada + IPCA" : "Pré-fixada";
  const installmentLabel = result.isPostFixed ? "Parcela com IPCA" : "Parcela estimada";

  document.querySelector(".eyebrow").textContent = "Home Equity · Rascunho";
  document.querySelector("h1").textContent = "Home Equity: Crédito com Garantia Imobiliária";

  const kpis = [
    ["Valor do imóvel", money(data.propertyGuarantee)],
    ["Crédito solicitado", money(data.releasedCredit)],
    ["Uso da garantia", percent(result.ltv)],
    ["Valor líquido", money(result.netClientAmount)],
    ["Modalidade", rateModeLabel],
    ["CET estimado a.a.", percent(result.annualCetApprox)],
    [result.isPostFixed ? "Projeção com IPCA" : "Custo total estimado", money(result.totalWithIpca)],
  ];
  document.querySelector(".kpi-strip").innerHTML = kpis
    .map(([label, value]) => `<div class="kpi-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  document.querySelector(".proposal-cover p").textContent = "HOME EQUITY";
  document.querySelector(".proposal-cover h2").textContent = "Crédito com Garantia Imobiliária";
  document.querySelector("#metricReleased").textContent = money(data.releasedCredit);
  document.querySelector("#metricGuarantee").textContent = money(data.propertyGuarantee);
  document.querySelector("#metricLtv").textContent = percent(result.ltv);
  document.querySelector("#metricTerm").textContent = `${edenNumber(data.term)} meses`;

  document.querySelector("#objectiveText").textContent =
    `A operação permite ao cliente ${data.clientName || "Cliente"} acessar crédito com garantia imobiliária, mantendo o imóvel como lastro da operação.`;

  rows(document.querySelector("#summaryRows"), [
    ["Cliente", data.clientName || "-"],
    ["Valor do imóvel", money(data.propertyGuarantee)],
    ["Crédito solicitado", money(data.releasedCredit)],
    ["Uso da garantia", percent(result.ltv)],
    ["Prazo", `${edenNumber(data.term)} meses`],
    ["Sistema de amortização", "PRICE"],
    ["Valor líquido estimado ao cliente", money(result.netClientAmount)],
    ["Modalidade da taxa", rateModeLabel],
    ["CET estimado a.a.", percent(result.annualCetApprox)],
    ["IOF estimado", money(data.iof)],
    ["Custos acessórios estimados", money(result.accessoryCosts)],
  ]);

  rows(document.querySelector("#letterRows"), [
    ["Taxa mensal", `${data.homeEquityRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`],
    ["IPCA estimado anual", result.isPostFixed ? `${data.ipca.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "Não aplicável"],
    ["CET estimado mensal", percent(result.monthlyCetRate)],
    ["CET estimado anual", percent(result.annualCetApprox)],
    ["Parcela estimada sem IPCA", money(result.installmentWithoutIpca)],
    [result.isPostFixed ? "Parcela estimada com IPCA" : "Parcela pré-fixada estimada", money(result.installmentWithIpca)],
    ["Avaliação do imóvel", money(data.appraisalFee)],
    ["Registro e cartório", money(data.registryFee)],
    ["Tarifa bancária", money(data.bankFee)],
    ["Seguros estimados", money(data.insuranceFee)],
    ["Outros custos", money(data.otherCosts)],
    ["IOF + custos acessórios", money(result.upfrontCosts)],
    ["Custo total sem IPCA", money(result.totalWithoutIpca)],
    [result.isPostFixed ? "Projeção econômica com IPCA" : "Custo total pré-fixado", money(result.totalWithIpca)],
  ]);

  const comparisonRows = result.isPostFixed
    ? [
        ["CET estimado sem IPCA", percent(result.annualCetApprox), "Taxa anual aproximada com IOF e custos"],
        ["Projeção econômica com IPCA", money(result.totalWithIpca), `${money(result.installmentWithIpca)} por mês`],
      ]
    : [
        ["CET estimado pré-fixado", percent(result.annualCetApprox), "Taxa anual aproximada com IOF e custos"],
        ["Custo total pré-fixado", money(result.totalWithIpca), `${money(result.installmentWithIpca)} por mês`],
      ];

  document.querySelector("#comparisonRows").innerHTML = [
    ...comparisonRows,
    ["Juros/correção estimados", money(result.interestWithIpca), "Diferença entre projeção total, crédito e custos acessórios"],
  ]
    .map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`)
    .join("");

  document.querySelector(".proposal-body section:nth-child(3) h3").textContent = "3. Premissas financeiras";
  document.querySelector(".proposal-body section:nth-child(4) h3").textContent = "4. Simulação de custo";
  document.querySelector(".proposal-body section:nth-child(5) p").textContent =
    "A avaliação deve considerar custo total, indexação, prazo, previsibilidade e impacto da correção monetária ao longo da operação.";
  document.querySelector(".assumptions p").textContent =
    "Simulação comercial para fins comparativos. O CET estimado é uma aproximação anual sem projeção futura do IPCA. O CET oficial, incluindo metodologia, datas, tarifas, seguros, tributos e demais encargos, deve ser confirmado pela instituição financeira conforme a Resolução CMN nº 4.881/2020.";

  document.querySelector("#heCalcStatus").textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  const ipcaInput = homeEquityForm.elements.ipca;
  if (ipcaInput) {
    ipcaInput.closest("label").classList.toggle("is-muted", !result.isPostFixed);
  }
  renderValidation(issues);
}

function readHistory() {
  return edenReadHistory();
}

function writeHistory(items) {
  edenWriteHistory(items);
}

function renderHistory() {
  const items = readHistory();
  if (!items.length) {
    historyTable.innerHTML = `<div class="empty-history">Nenhuma proposta salva nesta página ainda.</div>`;
    return;
  }

  historyTable.innerHTML = `
    <table>
      <thead>
        <tr><th>Data</th><th>Modelo</th><th>Cliente</th><th>Crédito liberado</th><th>Uso da garantia</th><th>Relatório</th></tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
              <tr>
                <td>${item.date}</td>
                <td>${item.model}</td>
                <td>${item.client}</td>
                <td>${money(item.releasedCredit)}</td>
                <td>${percent(item.ltv)}</td>
                <td>${item.id ? `<a href="./relatorio.html?id=${encodeURIComponent(item.id)}" target="_blank">Abrir</a>` : "-"}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

document.querySelectorAll(".model-form").forEach((modelForm) => {
  modelForm.addEventListener("input", updatePreview);
  modelForm.addEventListener("change", updatePreview);
});

document.querySelectorAll("[data-format]").forEach((input) => {
  input.addEventListener("focus", () => {
    input.value = String(parseFormattedNumber(input.value)).replace(".", ",");
    input.select();
  });

  input.addEventListener("blur", () => {
    input.value = formatFieldValue(input.value, input.dataset.format);
    updatePreview();
  });
});

saveButton.addEventListener("click", () => {
  const data = getFormData();
  const result = activeModel === "home-equity" ? calculateHomeEquity(data) : calculate(data);
  const items = readHistory();
  items.unshift({
    date: new Date().toLocaleString("pt-BR"),
    model: activeModel === "home-equity" ? "Home Equity" : activeModel === "consorcio" ? "Consórcio" : "C3",
    client: data.clientName || "Cliente",
    releasedCredit: data.releasedCredit,
    ltv: result.ltv,
  });
  writeHistory(items.slice(0, 20));
  renderHistory();
});

printButton.addEventListener("click", () => {
  updatePreview();
  if (activeModel === "home-equity") {
    const data = getFormData();
    const result = calculateHomeEquity(data);
    const blockingIssues = validateHomeEquity(data, result).filter((issue) => issue.type === "error");
    if (blockingIssues.length) {
      renderValidation(blockingIssues);
      validationPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    alert("A proposta PDF de Home Equity será a próxima camada. A análise executiva já está funcional na tela.");
    return;
  }
  if (activeModel === "consorcio") {
    const data = getFormData();
    const result = calculateConsorcio(data);
    const blockingIssues = validateConsorcio(data, result).filter((issue) => issue.type === "error");
    if (blockingIssues.length) {
      renderValidation(blockingIssues);
      validationPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    alert("A proposta PDF de Consórcio será a próxima camada. A análise executiva já está funcional na tela.");
    return;
  }
  const data = getFormData();
  const result = calculate(data);
  const blockingIssues = validateOperation(data, result).filter((issue) => issue.type === "error");
  if (blockingIssues.length) {
    renderValidation(blockingIssues);
    validationPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const id = `C3-${Date.now()}`;
  const report = {
    id,
    model: "C3",
    createdAt: new Date().toISOString(),
    data,
    result,
  };
  localStorage.setItem(`edenReport:${id}`, JSON.stringify(report));
  const items = readHistory();
  items.unshift({
    id,
    date: new Date().toLocaleString("pt-BR"),
    model: "C3",
    client: data.clientName || "Cliente",
    releasedCredit: data.releasedCredit,
    ltv: result.ltv,
  });
  writeHistory(items.slice(0, 20));
  renderHistory();
  window.location.href = `./relatorio.html?id=${encodeURIComponent(id)}`;
});

resetButton.addEventListener("click", () => {
  setFormData(activeModel === "home-equity" ? EDEN_HE_DEFAULTS : activeModel === "consorcio" ? EDEN_CONSORCIO_DEFAULTS : EDEN_DEFAULTS);
  updatePreview();
});

clearHistoryButton.addEventListener("click", () => {
  writeHistory([]);
  renderHistory();
});

document.querySelectorAll(".model-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.model === "c3" || button.dataset.model === "home-equity" || button.dataset.model === "consorcio") {
      switchModel(button.dataset.model);
      return;
    }
    alert("Este modelo já está previsto para a próxima fase.");
  });
});

setFormData(EDEN_DEFAULTS);
form = homeEquityForm;
setFormData(EDEN_HE_DEFAULTS);
form = consorcioForm;
setFormData(EDEN_CONSORCIO_DEFAULTS);
form = c3Form;
updatePreview();
renderHistory();
