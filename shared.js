const EDEN_DEFAULTS = {
  clientName: "Cliente Exemplo",
  operationName: "Operacao C3",
  propertyGuarantee: 1500000,
  letterCredit: 1200694,
  releasedCredit: 600000,
  letterEntry: 549445.12,
  transferFee: 17000,
  agentCost: 10,
  installmentsA: 196,
  installmentValueA: 7632,
  installmentsB: 18,
  installmentValueB: 4312,
  homeEquityRate: 1.3,
  ipca: 4.5,
};

const EDEN_HE_DEFAULTS = {
  clientName: "Cliente Exemplo",
  operationName: "Home Equity",
  propertyGuarantee: 1500000,
  releasedCredit: 600000,
  iof: 11000,
  appraisalFee: 3500,
  registryFee: 4500,
  bankFee: 2500,
  insuranceFee: 1500,
  otherCosts: 0,
  term: 214,
  rateMode: "post",
  homeEquityRate: 1.3,
  ipca: 4.5,
};

const EDEN_CONSORCIO_DEFAULTS = {
  clientName: "Cliente Exemplo",
  operationName: "Consorcio Imobiliario",
  creditAmount: 1200000,
  bidAmount: 300000,
  term: 180,
  installment: 7600,
  adminFee: 18,
  reserveFund: 2,
  insuranceMonthly: 120,
  annualAdjustment: 4.5,
};

const edenFormatters = {
  brl: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
  pct: new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  number: new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }),
};

function edenMoney(value) {
  return edenFormatters.brl.format(Number.isFinite(value) ? value : 0);
}

function edenPercent(value) {
  return edenFormatters.pct.format(Number.isFinite(value) ? value : 0);
}

function edenNumber(value) {
  return edenFormatters.number.format(Number.isFinite(value) ? value : 0);
}

function edenPmt(rate, periods, presentValue) {
  if (!rate) return presentValue / periods;
  return (presentValue * rate) / (1 - Math.pow(1 + rate, -periods));
}

function edenApproxMonthlyRateFromPayment(payment, periods, presentValue) {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const estimatedPayment = edenPmt(mid, periods, presentValue);
    if (estimatedPayment > payment) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

function edenCalculate(data) {
  const totalAcquisition = data.letterEntry + data.transferFee;
  const agentCostValue = totalAcquisition * (data.agentCost / 100);
  const agentSettlement = totalAcquisition + agentCostValue;
  const term = data.installmentsA + data.installmentsB;
  const cardDebt = data.installmentsA * data.installmentValueA + data.installmentsB * data.installmentValueB;
  const totalOwnResources = totalAcquisition + cardDebt;
  const totalWithAgent = agentSettlement + cardDebt;
  const ltv = data.releasedCredit / data.propertyGuarantee;
  const entryPercent = data.letterEntry / data.letterCredit;
  const homeEquityMonthlyRate = data.homeEquityRate / 100;
  const homeEquityInstallment = edenPmt(homeEquityMonthlyRate, term, data.releasedCredit);
  const homeEquityTotal = homeEquityInstallment * term;
  const monthlyIpca = Math.pow(1 + data.ipca / 100, 1 / 12) - 1;
  const homeEquityIpcaRate = homeEquityMonthlyRate + monthlyIpca;
  const homeEquityIpcaInstallment = edenPmt(homeEquityIpcaRate, term, data.releasedCredit);
  const homeEquityIpcaTotal = homeEquityIpcaInstallment * term;

  return {
    totalAcquisition,
    agentCostValue,
    agentSettlement,
    term,
    cardDebt,
    totalOwnResources,
    totalWithAgent,
    ltv,
    entryPercent,
    homeEquityInstallment,
    homeEquityTotal,
    homeEquityIpcaRate,
    homeEquityIpcaInstallment,
    homeEquityIpcaTotal,
    differenceIpcaVsC3: homeEquityIpcaTotal - totalWithAgent,
  };
}

function edenCalculateHomeEquity(data) {
  const ltv = data.releasedCredit / data.propertyGuarantee;
  const monthlyRate = data.homeEquityRate / 100;
  const monthlyIpca = Math.pow(1 + data.ipca / 100, 1 / 12) - 1;
  const isPostFixed = data.rateMode !== "fixed";
  const combinedRate = isPostFixed ? monthlyRate + monthlyIpca : monthlyRate;
  const installmentWithoutIpca = edenPmt(monthlyRate, data.term, data.releasedCredit);
  const installmentWithIpca = edenPmt(combinedRate, data.term, data.releasedCredit);
  const accessoryCosts = data.appraisalFee + data.registryFee + data.bankFee + data.insuranceFee + data.otherCosts;
  const upfrontCosts = data.iof + accessoryCosts;
  const netClientAmount = data.releasedCredit - upfrontCosts;
  const netCreditForCet = Math.max(data.releasedCredit - upfrontCosts, 1);
  const monthlyCetRate = edenApproxMonthlyRateFromPayment(installmentWithoutIpca, data.term, netCreditForCet);
  const annualCetApprox = Math.pow(1 + monthlyCetRate, 12) - 1;
  const totalWithoutIpca = installmentWithoutIpca * data.term + upfrontCosts;
  const totalWithIpca = installmentWithIpca * data.term + upfrontCosts;
  const interestWithIpca = totalWithIpca - data.releasedCredit - upfrontCosts;

  return {
    ltv,
    isPostFixed,
    monthlyRate,
    combinedRate,
    installmentWithoutIpca,
    installmentWithIpca,
    accessoryCosts,
    upfrontCosts,
    netClientAmount,
    monthlyCetRate,
    annualCetApprox,
    totalWithoutIpca,
    totalWithIpca,
    interestWithIpca,
  };
}

function edenCalculateConsorcio(data) {
  const bidPercent = data.bidAmount / data.creditAmount;
  const adminCost = data.creditAmount * (data.adminFee / 100);
  const reserveCost = data.creditAmount * (data.reserveFund / 100);
  const insuranceTotal = data.insuranceMonthly * data.term;
  const installmentTotal = data.installment * data.term;
  const totalCost = data.bidAmount + installmentTotal + adminCost + reserveCost + insuranceTotal;
  const projectedAdjustedCredit = data.creditAmount * Math.pow(1 + data.annualAdjustment / 100, data.term / 12);
  const requiredOwnCapital = data.bidAmount;

  return {
    bidPercent,
    adminCost,
    reserveCost,
    insuranceTotal,
    installmentTotal,
    totalCost,
    projectedAdjustedCredit,
    requiredOwnCapital,
  };
}

function edenReadHistory() {
  try {
    return JSON.parse(localStorage.getItem("edenProposalHistory") || "[]");
  } catch {
    return [];
  }
}

function edenWriteHistory(items) {
  localStorage.setItem("edenProposalHistory", JSON.stringify(items));
}
