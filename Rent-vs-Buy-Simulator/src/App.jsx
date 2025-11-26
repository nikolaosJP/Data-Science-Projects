import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ComposedChart, ReferenceLine
} from 'recharts';
import { 
  Calculator, Home, Building2, TrendingUp, DollarSign, 
  Info, Settings2, PieChart as PieIcon, List, CreditCard, Landmark, 
  ArrowUpRight, ArrowDownRight, Scale, ChevronDown, ChevronUp, BookOpen, FileText,
  Activity, AlertTriangle, User
} from 'lucide-react';

// --- Constants ---

const TAX_BRACKETS = [
  { limit: 1950000, rate: 0.05, deduction: 0 },
  { limit: 3300000, rate: 0.10, deduction: 97500 },
  { limit: 6950000, rate: 0.20, deduction: 427500 },
  { limit: 9000000, rate: 0.23, deduction: 636000 },
  { limit: 18000000, rate: 0.33, deduction: 1536000 },
  { limit: 40000000, rate: 0.40, deduction: 2796000 },
  { limit: Infinity, rate: 0.45, deduction: 4796000 },
];

const HOUSE_TYPES = [
  { id: 'longterm', label: 'Long-term Quality', limit: 45000000 },
  { id: 'zeh', label: 'ZEH (Zero Energy)', limit: 35000000 },
  { id: 'energy', label: 'Energy Efficient', limit: 30000000 },
  { id: 'standard', label: 'Standard (Other)', limit: 0 },
];

// Artistic Palette
const PALETTE = {
  bg: '#f2f0e9',        // Warm Alabaster
  paper: '#fcfbf9',     // Paper White
  ink: '#2c2c2c',       // Soft Black
  subtle: '#a8a29e',    // Warm Grey
  buy: '#3d5a80',       // Muted Blue
  buySoft: '#98c1d9',
  rent: '#e07a5f',      // Terra Cotta
  rentSoft: '#f4a261',
  equity: '#81b29a',    // Sage Green
  equitySoft: '#a3c4bc', // Lighter Sage
  liquid: '#f2cc8f',    // Muted Gold
  debt: '#e07a5f',      // Use rent color for debt/liability
  principal: '#2a9d8f', // Teal for Principal (Savings)
  interest: '#e76f51',  // Orange for Interest (Waste)
  taxMaint: '#f4a261',  // Sandy for Tax/Maint
};

// --- Helpers ---

const formatJPY = (val) => {
  if (val === undefined || val === null) return '¥0';
  const absVal = Math.abs(val);
  if (absVal >= 1000000000) return `¥${(val / 1000000000).toFixed(2)}B`;
  if (absVal >= 1000000) return `¥${(val / 1000000).toFixed(1)}M`;
  return `¥${Math.round(val).toLocaleString()}`;
};

const formatJPYFull = (val) => `¥${Math.round(val).toLocaleString()}`;

// --- UI Atoms ---

const InputField = ({ label, value, onChange, unit, step = 1, min = 0, tooltip }) => {
  const [displayValue, setDisplayValue] = useState(value.toLocaleString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value.toLocaleString(undefined, { maximumFractionDigits: 2 }));
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    setDisplayValue(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const rawValue = displayValue.replace(/,/g, '');
    if (rawValue !== '' && !isNaN(rawValue)) {
      const num = parseFloat(rawValue);
      onChange(num);
      setDisplayValue(num.toLocaleString(undefined, { maximumFractionDigits: 2 }));
    } else {
      setDisplayValue(value.toLocaleString(undefined, { maximumFractionDigits: 2 }));
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(displayValue.replace(/,/g, ''));
  };

  return (
    <div className="flex justify-between items-baseline py-2 group hover:bg-stone-50 px-1 rounded transition-colors border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-sans font-medium text-stone-500 uppercase tracking-wider group-hover:text-stone-800 transition-colors">{label}</span>
        {tooltip && (
          <div className="group/tooltip relative">
            <Info size={10} className="text-stone-300 hover:text-stone-500 cursor-help" />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 ml-2 w-48 p-3 bg-[#2c2c2c] text-[#f2f0e9] text-[10px] rounded-sm shadow-xl hidden group-hover/tooltip:block z-50 font-serif leading-relaxed">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className="w-28 bg-transparent text-right font-serif text-sm text-[#2c2c2c] focus:border-b focus:border-[#2c2c2c] focus:outline-none transition-colors pb-0.5 placeholder-stone-300"
        />
        <span className="ml-1 text-[10px] text-stone-400 font-sans w-4 inline-block text-right">{unit}</span>
      </div>
    </div>
  );
};

const SectionDivider = ({ title, isOpen, toggle, icon: Icon }) => (
  <button 
    onClick={toggle}
    className="w-full flex items-center justify-between mt-6 mb-2 group bg-stone-100/50 p-2 rounded-sm"
  >
    <div className="flex items-center gap-2">
      {Icon && <Icon size={14} className="text-stone-400 group-hover:text-stone-600" />}
      <h3 className="font-serif text-md italic text-[#2c2c2c] group-hover:text-stone-600 transition-colors">{title}</h3>
    </div>
    {isOpen ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
  </button>
);

const StatDisplay = ({ label, value, subtext, accent }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-1">{label}</span>
    <span className="font-serif text-2xl text-[#2c2c2c]" style={accent ? { color: accent } : {}}>{value}</span>
    {subtext && <span className="text-xs font-sans text-stone-500 mt-1">{subtext}</span>}
  </div>
);

const LegendWrapper = ({ small }) => (
  <div className={`flex gap-6 ${small ? 'mt-4 justify-end' : ''}`}>
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full" style={{backgroundColor: PALETTE.rent}}></span>
      <span className="font-sans text-xs font-bold uppercase tracking-widest text-stone-500">Rent</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full" style={{backgroundColor: PALETTE.buy}}></span>
      <span className="font-sans text-xs font-bold uppercase tracking-widest text-stone-500">Buy</span>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#fcfbf9] border border-stone-200 p-4 shadow-xl rounded-sm font-sans min-w-[200px]">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Year {label}</p>
        {payload.map((p, idx) => (
          <div key={idx} className="flex justify-between items-center mb-1">
            <span className="text-xs text-stone-600" style={{color: p.color}}>{p.name}:</span>
            <span className="text-sm font-serif font-medium">{formatJPYFull(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Logic Helpers ---

const estimateMaxTaxDeduction = (monthlyNet) => {
  const estimatedAnnualGross = (monthlyNet * 12) / 0.75; 
  return estimatedAnnualGross * 0.15; 
};

// --- Main Component ---

export default function RentVsBuyArtistic() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [showSidebar, setShowSidebar] = useState(true);
  
  const [sections, setSections] = useState({
    profile: true,
    rent: true,
    purchase: true,
    rates: true,
  });

  const toggleSection = (key) => setSections(prev => ({...prev, [key]: !prev[key]}));

  const [inputs, setInputs] = useState({
    // Profile
    monthlyNetIncome: 550000,
    currentSavings: 15000000,

    // Rent
    monthlyRent: 88000,
    rentIncreaseRate: 0.5,
    rentersInsurance: 0,

    // House Purchase
    housePrice: 40000000,
    downPaymentPercent: 20,
    mortgageRate: 1.9,
    mortgageTerm: 25,
    landValuePortion: 50,

    // Rates & Returns
    investmentReturn: 10.0,
    propertyTaxRate: 1.4,
    maintenanceRate: 0.5,
    buildingDepreciation: 2.0,
    landAppreciation: 0.5,
    simulationYears: 25,
    
    // Fixed/Hidden Assumptions (Standard JP Costs)
    brokerageRate: 3.3, 
    registrationRate: 0.6, 
    loanFeeRate: 2.2, 
    sellingAgentFee: 3.3,
    houseType: 'zeh',
    // Buy Ongoing fixed
    managementFee: 15000,
    repairFund: 10000,
    repairFundIncrease: 2.0,
    fireInsurance: 20000, 
    // Rent fixed
    rentRenewalFee: 1, 
    initialRentFees: 4, 
  });

  // --- Logic Engine ---
  const simulation = useMemo(() => {
    const {
      monthlyNetIncome, monthlyRent, rentIncreaseRate, rentersInsurance,
      housePrice, downPaymentPercent, mortgageRate, mortgageTerm, landValuePortion,
      investmentReturn, propertyTaxRate, maintenanceRate, buildingDepreciation, landAppreciation, simulationYears,
      currentSavings, brokerageRate, registrationRate, loanFeeRate, sellingAgentFee, houseType,
      managementFee, repairFund, repairFundIncrease, fireInsurance, rentRenewalFee, initialRentFees
    } = inputs;

    // 1. Initial Costs
    const downPayment = housePrice * (downPaymentPercent / 100);
    const loanAmount = housePrice - downPayment;
    
    // Buying Closing Costs
    const brokerageFee = housePrice * (brokerageRate / 100);
    const registrationTax = housePrice * (registrationRate / 100);
    const loanFees = loanAmount * (loanFeeRate / 100);
    const miscBuyCosts = 130000; 
    const totalBuyClosingCosts = brokerageFee + registrationTax + loanFees + miscBuyCosts;
    const totalBuyUpfront = downPayment + totalBuyClosingCosts;

    // Renting Initial Costs
    const totalRentUpfront = monthlyRent * initialRentFees; 
    
    // Initial Wallet State
    const initialInvestableDiff = Math.max(0, totalBuyUpfront - totalRentUpfront);
    const startLiquidityBuy = Math.max(0, currentSavings - totalBuyUpfront);
    const startLiquidityRent = Math.max(0, currentSavings - totalRentUpfront);
    
    // Mortgage Calc
    const r = mortgageRate / 100 / 12;
    const n = mortgageTerm * 12;
    const monthlyMortgage = loanAmount > 0 
      ? (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      : 0;

    // Tax Deduction Cap
    const maxTaxDeductionPerYear = estimateMaxTaxDeduction(monthlyNetIncome);
    const maxLoanLimit = HOUSE_TYPES.find(h => h.id === houseType)?.limit || 0;

    // Simulation Loop
    let rentWealth = startLiquidityRent; 
    let buyLiquid = startLiquidityBuy; 
    
    let buyMortgageBalance = loanAmount;
    let landValue = housePrice * (landValuePortion / 100);
    let buildingValue = housePrice * (1 - landValuePortion / 100);

    const timeline = [];

    for (let year = 1; year <= simulationYears; year++) {
      const annualNetIncome = monthlyNetIncome * 12;

      // --- RENT SCENARIO ---
      const currentRent = monthlyRent * Math.pow(1 + rentIncreaseRate/100, year-1);
      const annualRentCost = (currentRent * 12) + (currentRent * (rentRenewalFee/2)) + rentersInsurance;
      
      // Renter invests TOTAL surplus (Income - RentExpenses)
      const rentSurplus = Math.max(0, annualNetIncome - annualRentCost);
      rentWealth = (rentWealth * (1 + investmentReturn/100)) + rentSurplus;

      // --- BUY SCENARIO ---
      let annualInterest = 0;
      let annualPrincipal = 0;
      
      for(let m=0; m<12; m++) {
        if(buyMortgageBalance > 0) {
          const interest = buyMortgageBalance * r;
          const principal = monthlyMortgage - interest;
          annualInterest += interest;
          annualPrincipal += principal;
          buyMortgageBalance -= principal;
          if (buyMortgageBalance < 0) buyMortgageBalance = 0;
        }
      }
      
      const annualMaintenance = (housePrice * (maintenanceRate / 100)) + (managementFee * 12) + (repairFund * 12);
      const currentPropValue = landValue + buildingValue;
      const annualPropertyTax = currentPropValue * (propertyTaxRate / 100);
      
      // Housing Loan Deduction
      let taxRefund = 0;
      const loanBalanceForDeduction = buyMortgageBalance; 
      if (year <= 13 && loanBalanceForDeduction > 0 && maxLoanLimit > 0) {
        const eligibleBalance = Math.min(loanBalanceForDeduction, maxLoanLimit);
        const deduction = eligibleBalance * 0.007;
        taxRefund = Math.min(deduction, maxTaxDeductionPerYear); 
      }

      const annualBuyCost = (annualInterest + annualPrincipal) + annualMaintenance + annualPropertyTax + fireInsurance;
      const annualBuyCostNet = annualBuyCost - taxRefund;

      // Buyer invests TOTAL surplus (Income - HousingExpenses)
      const buySurplus = Math.max(0, annualNetIncome - annualBuyCostNet);
      buyLiquid = (buyLiquid * (1 + investmentReturn/100)) + buySurplus;

      // Asset Appreciation/Depreciation
      landValue *= (1 + landAppreciation/100);
      buildingValue *= (1 - buildingDepreciation/100);
      
      const totalHouseValue = landValue + buildingValue;
      const sellingCost = totalHouseValue * (sellingAgentFee / 100);
      const netHomeEquity = Math.max(0, totalHouseValue - buyMortgageBalance - sellingCost);

      const buyNetWorth = buyLiquid + netHomeEquity;

      timeline.push({
        year,
        rentNetWorth: Math.round(rentWealth),
        buyNetWorth: Math.round(buyNetWorth),
        diff: Math.round(buyNetWorth - rentWealth),
        
        buyLiquid: Math.round(buyLiquid),
        buyEquity: Math.round(netHomeEquity),
        
        rentMonthly: Math.round(annualRentCost / 12),
        buyInterestMonthly: Math.round(annualInterest / 12),
        buyPrincipalMonthly: Math.round(annualPrincipal / 12),
        buyTaxMaintMonthly: Math.round((annualMaintenance + annualPropertyTax + fireInsurance - taxRefund) / 12),
        
        buyTaxRefund: Math.round(taxRefund),
        buyMortgageBalance: Math.round(buyMortgageBalance),
      });
    }

    const final = timeline[timeline.length - 1];

    return {
      timeline,
      initialCosts: {
        buy: { totalUpfront: totalBuyUpfront, totalClosing: totalBuyClosingCosts, down: downPayment, brokerage: brokerageFee, registration: registrationTax, loan: loanFees, misc: miscBuyCosts },
        rent: { totalUpfront: totalRentUpfront },
        investableDiff: initialInvestableDiff
      },
      mortgage: { monthly: monthlyMortgage, amount: loanAmount },
      taxes: {
        maxDeduction: maxLoanLimit * 0.007
      },
      summary: {
        rentFinalNW: final.rentNetWorth,
        buyFinalNW: final.buyNetWorth,
        winner: final.buyNetWorth > final.rentNetWorth ? 'Buy' : 'Rent',
        diff: final.buyNetWorth - final.rentNetWorth // Signed diff
      }
    };
  }, [inputs]);

  // --- Render Sections ---

  const renderAnalysis = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
      
      <div className="border-b border-stone-200 pb-8">
        <h2 className="font-serif text-3xl md:text-5xl text-[#2c2c2c] mb-4">
          The <span className={simulation.summary.winner === 'Buy' ? 'text-[#3d5a80]' : 'text-[#e07a5f]'}>{simulation.summary.winner}</span> Strategy
        </h2>
        <div className="flex flex-col md:flex-row gap-6 md:gap-16">
          <p className="font-sans text-stone-600 max-w-lg leading-relaxed">
            Based on your parameters over a {inputs.simulationYears}-year horizon, {simulation.summary.winner.toLowerCase()}ing appears to be the superior financial decision. 
            The net wealth gap is projected to be <span className="font-bold text-[#2c2c2c]">{formatJPY(Math.abs(simulation.summary.diff))}</span>.
          </p>
          <div className="flex gap-12 border-l border-stone-200 pl-8">
            <StatDisplay label="Final Net Worth (Buy)" value={formatJPY(simulation.summary.buyFinalNW)} accent={PALETTE.buy} />
            <StatDisplay label="Final Net Worth (Rent)" value={formatJPY(simulation.summary.rentFinalNW)} accent={PALETTE.rent} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="font-serif text-2xl text-[#2c2c2c]">Wealth Accumulation</h3>
          <LegendWrapper />
        </div>
        <div className="h-[450px] w-full bg-white border border-stone-100 p-4 rounded-sm relative">
          <ResponsiveContainer>
            <AreaChart data={simulation.timeline} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBuy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PALETTE.buy} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={PALETTE.buy} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PALETTE.rent} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={PALETTE.rent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: PALETTE.subtle, fontFamily: 'serif'}} dy={10} />
              <YAxis tickFormatter={(val) => `¥${val/1000000}M`} axisLine={false} tickLine={false} tick={{fill: PALETTE.subtle, fontFamily: 'serif'}} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d6d3d1', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="rentNetWorth" stroke={PALETTE.rent} strokeWidth={2} fill="url(#colorRent)" activeDot={{r: 6}} />
              <Area type="monotone" dataKey="buyNetWorth" stroke={PALETTE.buy} strokeWidth={2} fill="url(#colorBuy)" activeDot={{r: 6}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        <div className="space-y-4">
          <div className="border-t border-stone-200 pt-6">
            <h3 className="font-serif text-xl text-[#2c2c2c] mb-1">Monthly Cost Structure</h3>
            <p className="text-xs font-sans text-stone-500 uppercase tracking-wide">Savings (Principal) vs. Sunk Costs</p>
          </div>
          <div className="h-[300px] bg-white border border-stone-100 p-4">
            <ResponsiveContainer>
              <ComposedChart data={simulation.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="year" hide />
                <YAxis tickFormatter={(val) => `¥${val/1000}k`} axisLine={false} tickLine={false} tick={{fill: PALETTE.subtle, fontFamily: 'serif'}} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="buyInterestMonthly" stackId="a" stroke="none" fill={PALETTE.interest} name="Buy: Interest" />
                <Area type="monotone" dataKey="buyTaxMaintMonthly" stackId="a" stroke="none" fill={PALETTE.taxMaint} name="Buy: Tax & Maint" />
                <Area type="monotone" dataKey="buyPrincipalMonthly" stackId="a" stroke="none" fill={PALETTE.principal} name="Buy: Principal (Savings)" />
                <Line type="step" dataKey="rentMonthly" stroke={PALETTE.rent} strokeWidth={3} dot={false} name="Rent Total" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-widest font-bold">
            <div className="flex items-center gap-2"><div className="w-3 h-3" style={{backgroundColor: PALETTE.principal}}></div> Principal</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3" style={{backgroundColor: PALETTE.interest}}></div> Interest</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3" style={{backgroundColor: PALETTE.taxMaint}}></div> Tax/Maint</div>
            <div className="flex items-center gap-2"><div className="w-3 h-1" style={{backgroundColor: PALETTE.rent}}></div> Rent</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-t border-stone-200 pt-6">
            <h3 className="font-serif text-xl text-[#2c2c2c] mb-1">Wealth Composition (Buyer)</h3>
            <p className="text-xs font-sans text-stone-500 uppercase tracking-wide">Liquidity vs. Real Estate Equity</p>
          </div>
          <div className="h-[300px] bg-white border border-stone-100 p-4">
            <ResponsiveContainer>
              <AreaChart data={simulation.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="year" hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="buyLiquid" stackId="1" stroke="none" fill={PALETTE.liquid} name="Liquid Portfolio" />
                <Area type="monotone" dataKey="buyEquity" stackId="1" stroke="none" fill={PALETTE.equity} name="Home Equity" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-[10px] uppercase tracking-widest font-bold">
            <div className="flex items-center gap-2"><div className="w-3 h-3" style={{backgroundColor: PALETTE.liquid}}></div> Liquid Savings</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3" style={{backgroundColor: PALETTE.equity}}></div> Home Equity</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCostBreakdown = () => (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      <div className="bg-white rounded-lg border border-stone-200 p-8">
        <h3 className="text-xl font-serif text-stone-900 mb-8 flex items-center gap-3">
          <div className="p-2 bg-stone-100 rounded-md"><DollarSign className="text-stone-800" size={18} /></div>
          Upfront Cost Analysis
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* BUY SIDE */}
          <div className="relative">
            <div className="pl-0">
              <h4 className="font-bold text-stone-800 mb-6 text-sm uppercase tracking-widest border-b border-stone-800 pb-2">Buying Scenario</h4>
              <div className="space-y-5 text-sm font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Down Payment ({inputs.downPaymentPercent}%):</span>
                  <span className="font-serif font-medium text-stone-900">{formatJPYFull(simulation.initialCosts.buy.down)}</span>
                </div>
                
                <div className="bg-stone-50 p-4 border border-stone-100 rounded-sm space-y-3">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Closing Costs (Approx)</p>
                  <div className="flex justify-between text-stone-600">
                    <span>Total Fees & Taxes:</span>
                    <span className="font-mono text-xs">{formatJPYFull(simulation.initialCosts.buy.totalClosing)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between pt-4 mt-4 border-t border-stone-200">
                  <span className="font-serif font-medium text-stone-900 text-lg">Total Cash Required</span>
                  <span className="font-serif font-medium text-stone-900 text-lg decoration-stone-300 underline underline-offset-4">{formatJPYFull(simulation.initialCosts.buy.totalUpfront)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RENT SIDE */}
          <div className="relative">
             <div className="pl-0">
              <h4 className="font-bold text-stone-500 mb-6 text-sm uppercase tracking-widest border-b border-stone-200 pb-2">Renting Scenario</h4>
              <div className="space-y-5 text-sm font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Initial Fees (Approx 4mo):</span>
                  <span className="font-serif font-medium text-stone-900">{formatJPYFull(simulation.initialCosts.rent.totalUpfront)}</span>
                </div>
                
                <div className="bg-[#fff7ed] rounded-sm p-6 mt-8 border border-[#fed7aa]">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-[#c2410c]" />
                    <p className="font-bold text-[#9a3412] uppercase text-xs tracking-wide">Investable Head Start</p>
                  </div>
                  <p className="text-[#9a3412] text-sm mb-4 leading-relaxed opacity-90">
                    Renters pay less upfront. The difference between Buy Upfront and Rent Upfront is your initial investment capital.
                  </p>
                  <p className="text-3xl font-serif text-[#9a3412]">{formatJPYFull(simulation.initialCosts.investableDiff)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTaxes = () => (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
      <div className="bg-white rounded-lg border border-stone-200 p-8">
        <h3 className="text-xl font-serif text-stone-900 mb-6">Housing Loan Deduction Schedule</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={simulation.timeline.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#78716c', fontFamily: 'serif'}} dy={10} />
              <YAxis tickFormatter={(val) => `¥${val/1000}k`} axisLine={false} tickLine={false} tick={{fill: '#78716c', fontFamily: 'serif'}} />
              <Tooltip formatter={(val) => formatJPYFull(val)} contentStyle={{ borderRadius: '0', border: '1px solid #d6d3d1' }} cursor={{fill: '#f5f5f4'}} />
              <Bar dataKey="buyTaxRefund" fill={PALETTE.buy} name="Tax Refund Received" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-stone-500 mt-6 pt-4 border-t border-stone-100 flex items-start gap-2">
          <Info size={14} className="mt-0.5 shrink-0" />
          The deduction is limited to 13 years for new construction. It is capped by either the maximum deduction limit for your house type or your estimated tax liability.
        </p>
      </div>
    </div>
  );

  const renderData = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="border-b border-stone-200 pb-6">
         <h2 className="font-serif text-3xl text-[#2c2c2c]">Financial Ledger</h2>
         <p className="font-sans text-stone-500 mt-2">Annualized breakdown of asset accumulation.</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left font-mono">
            <thead className="bg-[#f2f0e9] text-stone-500 font-bold uppercase tracking-widest border-b border-stone-200">
              <tr>
                <th className="px-6 py-4 border-r border-stone-200">Year</th>
                <th className="px-6 py-4 text-[#e07a5f] border-r border-stone-200">Rent Portfolio</th>
                <th className="px-6 py-4 text-[#3d5a80] border-r border-stone-200">Buy Portfolio</th>
                <th className="px-6 py-4 text-stone-400">Buy Equity</th>
                <th className="px-6 py-4 text-stone-400 border-r border-stone-200">Buy Debt</th>
                <th className="px-6 py-4 text-[#3d5a80]">Buy Net Worth</th>
                <th className="px-6 py-4 text-[#e07a5f]">Rent Net Worth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-[#fcfbf9]">
              {simulation.timeline.map((row) => (
                <tr key={row.year} className="hover:bg-[#f2f0e9] transition-colors">
                  <td className="px-6 py-3 font-medium border-r border-stone-100 text-stone-400">{row.year}</td>
                  <td className="px-6 py-3 font-medium text-[#e07a5f] bg-[#fff7ed] border-r border-stone-100">{formatJPY(row.rentNetWorth)}</td>
                  <td className="px-6 py-3 font-medium text-[#3d5a80] bg-[#f0f9ff] border-r border-stone-100">{formatJPY(row.buyLiquid)}</td>
                  <td className="px-6 py-3 text-stone-400">{formatJPY(row.buyEquity)}</td>
                  <td className="px-6 py-3 text-stone-400 border-r border-stone-100">{formatJPY(row.buyMortgageBalance)}</td>
                  <td className="px-6 py-3 font-bold text-[#2c2c2c]">{formatJPY(row.buyNetWorth)}</td>
                  <td className="px-6 py-3 font-medium text-stone-600">{formatJPY(row.rentNetWorth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAssumptions = () => (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-4xl mx-auto">
      
      <div className="border-b border-stone-200 pb-8">
        <h2 className="font-serif text-3xl text-[#2c2c2c] flex items-center gap-3">
          <BookOpen className="text-stone-400" size={28} />
          Methodology & Market Data
        </h2>
        <p className="font-sans text-stone-600 mt-4 leading-relaxed">
          This simulation uses a "Total Cashflow" model. It calculates the total income minus total housing expenses for both scenarios, investing 100% of the surplus.
        </p>
      </div>

      {/* 1. Market Research Table */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl text-[#2c2c2c] flex items-center gap-2">
          <FileText size={20} className="text-stone-400" />
          Market Benchmarks (2024-2025)
        </h3>
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left font-sans">
              <thead className="bg-[#fcfbf9] text-stone-500 font-bold text-xs uppercase tracking-wide border-b border-stone-100">
                <tr>
                  <th className="px-6 py-4 w-1/3">Parameter</th>
                  <th className="px-6 py-4 text-stone-400">Conservative</th>
                  <th className="px-6 py-4 text-[#3d5a80] bg-blue-50/30 border-x border-stone-100">Default</th>
                  <th className="px-6 py-4 text-stone-400">Aggressive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[
                  { label: 'Variable Mortgage Rate', cons: '0.80%', def: '0.70%', agg: '0.60%' },
                  { label: 'Fixed 35yr Rate', cons: '2.30%', def: '2.00%', agg: '1.90%' },
                  { label: 'Effective Property Tax', cons: '0.4%', def: '0.3%', agg: '0.2%' },
                  { label: 'Transaction Costs', cons: '5.0%', def: '4.5%', agg: '4.0%' },
                  { label: 'Land Appreciation', cons: '+3.0%', def: '+4.5%', agg: '+6.0%' },
                  { label: 'Rent Inflation', cons: '0.5%', def: '0.7%', agg: '1.0%' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-stone-700">{row.label}</td>
                    <td className="px-6 py-3 text-stone-500">{row.cons}</td>
                    <td className="px-6 py-3 font-bold text-[#2c2c2c] bg-blue-50/30 border-x border-stone-100">{row.def}</td>
                    <td className="px-6 py-3 text-stone-500">{row.agg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. Logic Steps */}
      <div className="space-y-8 border-t border-stone-200 pt-8">
        <h3 className="font-serif text-xl text-[#2c2c2c] flex items-center gap-2">
          <Activity size={20} className="text-stone-400" />
          How the Math Works
        </h3>
        
        <div className="flex items-start gap-4">
          <div className="bg-[#3d5a80] text-white w-8 h-8 flex items-center justify-center rounded-full font-serif font-bold shrink-0 mt-1">1</div>
          <div>
            <h3 className="font-serif text-lg text-[#2c2c2c] mb-1">The Starting Line (Year 0)</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              We assume you start with <strong>Current Savings</strong>. The Buyer pays the Down Payment + Closing Costs from this amount. The Renter pays small upfront fees. The remaining balance in both cases becomes the starting <strong>Liquid Portfolio</strong>.
            </p>
            <div className="mt-2 bg-[#f2f0e9] p-3 rounded font-mono text-xs text-stone-600">
              BuyStartLiq = CurrentSavings - (DownPay + Closing)<br/>
              RentStartLiq = CurrentSavings - RentFees
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-[#3d5a80] text-white w-8 h-8 flex items-center justify-center rounded-full font-serif font-bold shrink-0 mt-1">2</div>
          <div>
            <h3 className="font-serif text-lg text-[#2c2c2c] mb-1">Monthly Surplus</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Every month, we subtract housing costs from your <strong>Net Income</strong>. The remaining cash ("Surplus") is added to your liquid portfolio and invested.
            </p>
            <div className="mt-2 bg-[#f2f0e9] p-3 rounded font-mono text-xs text-stone-600">
              RentSurplus = Income - (Rent + Fees)<br/>
              BuySurplus = Income - (Mortgage + Tax + Maint)
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-[#3d5a80] text-white w-8 h-8 flex items-center justify-center rounded-full font-serif font-bold shrink-0 mt-1">3</div>
          <div>
            <h3 className="font-serif text-lg text-[#2c2c2c] mb-1">Growth & Wealth</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Both portfolios grow at your set Investment Return rate. The Buyer <em>also</em> gains wealth through home equity (Home Value - Mortgage Debt).
            </p>
            <div className="mt-2 bg-[#f2f0e9] p-3 rounded font-mono text-xs text-stone-600">
              RentNetWorth = LiquidPortfolio<br/>
              BuyNetWorth = LiquidPortfolio + (HomeValue - Debt)
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#f2f0e9] font-sans text-[#2c2c2c] overflow-hidden">
      {/* ... Header & Layout structure identical to previous version ... */}
      <header className="px-8 py-5 flex items-center justify-between bg-[#fcfbf9] border-b border-stone-200 z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#2c2c2c] text-[#fcfbf9] flex items-center justify-center rounded-sm">
            <Scale size={18} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-serif text-xl tracking-tight text-[#2c2c2c]">Real Estate Simulator (Japan)</h1>
          </div>
        </div>
        
        <div className="flex gap-8">
          <nav className="hidden md:flex gap-6">
            <button onClick={() => setActiveTab('analysis')} className={`text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'analysis' ? 'border-[#2c2c2c] text-[#2c2c2c]' : 'border-transparent text-stone-400'}`}>Analysis</button>
            <button onClick={() => setActiveTab('costs')} className={`text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'costs' ? 'border-[#2c2c2c] text-[#2c2c2c]' : 'border-transparent text-stone-400'}`}>Costs</button>
            <button onClick={() => setActiveTab('taxes')} className={`text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'taxes' ? 'border-[#2c2c2c] text-[#2c2c2c]' : 'border-transparent text-stone-400'}`}>Taxes</button>
            <button onClick={() => setActiveTab('data')} className={`text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'data' ? 'border-[#2c2c2c] text-[#2c2c2c]' : 'border-transparent text-stone-400'}`}>Ledger</button>
            <button onClick={() => setActiveTab('assumptions')} className={`text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'assumptions' ? 'border-[#2c2c2c] text-[#2c2c2c]' : 'border-transparent text-stone-400'}`}>Assumptions</button>
          </nav>
          <button onClick={() => setShowSidebar(!showSidebar)} className="md:hidden text-stone-500">
            <Settings2 size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Inputs */}
        <aside className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-10 w-[340px] bg-[#f2f0e9] border-r border-stone-200 overflow-y-auto transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]`}>
          <div className="p-8 pb-32">
            <div className="flex justify-between items-center mb-6">
              <span className="font-serif italic text-stone-500">Parameters</span>
              <button onClick={() => setInputs(prev => ({...prev, simulationYears: 25}))} className="text-[10px] font-bold uppercase tracking-widest text-[#3d5a80] hover:underline">Reset</button>
            </div>

            <SectionDivider title="Financial Profile" isOpen={sections.profile} toggle={() => toggleSection('profile')} icon={User} />
            {sections.profile && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <InputField label="Net Income" value={inputs.monthlyNetIncome} onChange={v => setInputs(p => ({...p, monthlyNetIncome: v}))} unit="¥/mo" />
                <InputField label="Current Savings" value={inputs.currentSavings} onChange={v => setInputs(p => ({...p, currentSavings: v}))} unit="¥" />
              </div>
            )}

            <SectionDivider title="Rent Scenario" isOpen={sections.rent} toggle={() => toggleSection('rent')} icon={Building2} />
            {sections.rent && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <InputField label="Monthly Rent" value={inputs.monthlyRent} onChange={v => setInputs(p => ({...p, monthlyRent: v}))} unit="¥/mo" />
                <InputField label="Rent Incr" value={inputs.rentIncreaseRate} onChange={v => setInputs(p => ({...p, rentIncreaseRate: v}))} unit="%" step={0.1} />
                <InputField label="Insurance" value={inputs.rentersInsurance} onChange={v => setInputs(p => ({...p, rentersInsurance: v}))} unit="¥/yr" />
              </div>
            )}

            <SectionDivider title="Purchase Scenario" isOpen={sections.purchase} toggle={() => toggleSection('purchase')} icon={Home} />
            {sections.purchase && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <InputField label="Price" value={inputs.housePrice} onChange={v => setInputs(p => ({...p, housePrice: v}))} unit="¥" />
                <InputField label="Down Pay" value={inputs.downPaymentPercent} onChange={v => setInputs(p => ({...p, downPaymentPercent: v}))} unit="%" />
                <InputField label="Rate" value={inputs.mortgageRate} onChange={v => setInputs(p => ({...p, mortgageRate: v}))} unit="%" step={0.05} />
                <InputField label="Term" value={inputs.mortgageTerm} onChange={v => setInputs(p => ({...p, mortgageTerm: v}))} unit="Yr" />
                <InputField label="Land Ratio" value={inputs.landValuePortion} onChange={v => setInputs(p => ({...p, landValuePortion: v}))} unit="%" />
              </div>
            )}
            
            <SectionDivider title="Rates & Returns" isOpen={sections.rates} toggle={() => toggleSection('rates')} icon={Activity} />
            {sections.rates && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                <InputField label="VTI Rtn" value={inputs.investmentReturn} onChange={v => setInputs(p => ({...p, investmentReturn: v}))} unit="%" step={0.1} />
                <InputField label="Prop Tax" value={inputs.propertyTaxRate} onChange={v => setInputs(p => ({...p, propertyTaxRate: v}))} unit="%" step={0.1} />
                <InputField label="Maint." value={inputs.maintenanceRate} onChange={v => setInputs(p => ({...p, maintenanceRate: v}))} unit="%" step={0.1} />
                <InputField label="Bldg Depr" value={inputs.buildingDepreciation} onChange={v => setInputs(p => ({...p, buildingDepreciation: v}))} unit="%" step={0.1} />
                <InputField label="Land Appr" value={inputs.landAppreciation} onChange={v => setInputs(p => ({...p, landAppreciation: v}))} unit="%" step={0.1} />
                <InputField label="Years" value={inputs.simulationYears} onChange={v => setInputs(p => ({...p, simulationYears: v}))} unit="Yr" />
              </div>
            )}
            
            <p className="text-[10px] text-stone-300 font-serif italic text-center mt-12">Japan 2024 Tax Logic Applied</p>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-[#fcfbf9]">
          <div className="max-w-6xl mx-auto p-8 md:p-16">
            {activeTab === 'analysis' && renderAnalysis()}
            {activeTab === 'costs' && renderCostBreakdown()}
            {activeTab === 'taxes' && renderTaxes()}
            {activeTab === 'data' && renderData()}
            {activeTab === 'assumptions' && renderAssumptions()}
          </div>
        </main>

      </div>
    </div>
  );
}
