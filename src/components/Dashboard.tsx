import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { fetchDashboardData } from '../data/fetchData';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Ship, Droplet, Factory, Settings, ChevronUp, ChevronDown, Info, Menu, X, Flame } from 'lucide-react';

const formatNumber = (num: number | undefined, decimals: number = 2) => {
  if (num === undefined || num === null) return '-';
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatDateShort = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => {
      const dateA = Date.parse(a.name);
      const dateB = Date.parse(b.name);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return dateA - dateB;
      }
      return 0;
    });

    return (
      <div className="bg-[#1C1C24] border border-[#2A2A35] p-3 rounded-xl shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        {sortedPayload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {formatNumber(entry.value, 2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const calculateChange = (current: number, previous: number) => {
  if (!current || !previous) return { diffText: '-', pctText: '-', color: 'text-white', diff: 0 };
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  
  let color = 'text-white';
  let diffText = '-';
  let pctText = '-';

  if (diff > 0) {
    color = 'text-emerald-400';
    diffText = `+${formatNumber(diff, 2)}`;
    pctText = `+${formatNumber(pct, 2)}%`;
  } else if (diff < 0) {
    color = 'text-rose-400';
    diffText = `${formatNumber(diff, 2)}`;
    pctText = `${formatNumber(pct, 2)}%`;
  }

  return { diffText, pctText, color, diff };
};

const filterDataByTimeRange = (dataList: any[], range: string) => {
  if (!dataList || dataList.length === 0) return [];
  const latestDateStr = dataList[dataList.length - 1].date;
  if (!latestDateStr) return dataList;
  
  const latestDate = new Date(latestDateStr);
  const cutoffDate = new Date(latestDate);
  
  if (range === '1w') cutoffDate.setDate(cutoffDate.getDate() - 7);
  else if (range === '1m') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
  else if (range === '6m') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
  else if (range === '1y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  else return dataList; // 'all' or fallback

  return dataList.filter(d => new Date(d.date) >= cutoffDate);
};

const filterFreightData = (dataList: any[], range: string) => {
  if (!dataList || dataList.length === 0) return [];
  
  const revList = [...dataList].reverse();
  const result: any[] = [];
  const seenDates = new Set();
  
  if (range === '1w') {
    return revList.slice(0, 7).reverse();
  } else if (range === '6w') {
    let currentDate = new Date(revList[0].date);
    for (let i = 0; i < 6; i++) {
      const closest = revList.find(d => new Date(d.date) <= currentDate && !seenDates.has(d.date));
      if (closest) {
        result.push(closest);
        seenDates.add(closest.date);
      }
      currentDate.setDate(currentDate.getDate() - 7);
    }
    return result.reverse();
  } else if (range === '6m') {
    let currentDate = new Date(revList[0].date);
    for (let i = 0; i < 6; i++) {
      const closest = revList.find(d => new Date(d.date) <= currentDate && !seenDates.has(d.date));
      if (closest) {
        result.push(closest);
        seenDates.add(closest.date);
      }
      currentDate.setMonth(currentDate.getMonth() - 1);
    }
    return result.reverse();
  }
  return dataList;
};

const formatHeaderTime = (date: Date) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 3600000));
  
  const yy = kst.getFullYear().toString().slice(2);
  const mm = (kst.getMonth() + 1).toString().padStart(2, '0');
  const dd = kst.getDate().toString().padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[kst.getDay()];
  
  const ampm = kst.getHours() >= 12 ? 'PM' : 'AM';
  const hh = (kst.getHours() % 12 || 12).toString().padStart(2, '0');
  const min = kst.getMinutes().toString().padStart(2, '0');
  const ss = kst.getSeconds().toString().padStart(2, '0');

  return `${yy}.${mm}.${dd}(${day}) / KST ${ampm} ${hh}:${min}:${ss}`;
};

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [oilTimeRange, setOilTimeRange] = useState('1w');
  const [naturalGasTimeRange, setNaturalGasTimeRange] = useState('1w');
  const [naphthaTimeRange, setNaphthaTimeRange] = useState('1w');
  const [ethyleneTimeRange, setEthyleneTimeRange] = useState('1w');
  const [propyleneTimeRange, setPropyleneTimeRange] = useState('1w');
  const [butadieneTimeRange, setButadieneTimeRange] = useState('1w');
  const [freightTimeRange, setFreightTimeRange] = useState('1w');
  const [freightSpotTimeRange, setFreightSpotTimeRange] = useState('1w');
  const [isFMExpanded, setIsFMExpanded] = useState(false);
  const [isTAExpanded, setIsTAExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});

  const handleLegendClick = (e: any) => {
    setHiddenLines(prev => ({ ...prev, [e.dataKey]: !prev[e.dataKey] }));
  };

  const renderLegendText = (value: string, entry: any) => {
    const { dataKey } = entry;
    const isHidden = hiddenLines[dataKey];
    return <span style={{ textDecoration: isHidden ? 'line-through' : 'none', color: isHidden ? '#6b7280' : entry.color, cursor: 'pointer' }}>{value}</span>;
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData().then(res => {
      // Process Oil Data
      const oilGrouped: any = {};
      res.oilData.forEach(row => {
        if (!oilGrouped[row.date]) oilGrouped[row.date] = { date: row.date };
        if (row.name.includes('WTI') || row.name.includes('CLJ6')) oilGrouped[row.date].WTI = row.price;
        if (row.name.includes('Brent') || row.name.includes('브렌트') || row.name.includes('COK6')) oilGrouped[row.date].Brent = row.price;
        if (row.name.includes('Dubai') || row.name.includes('두바이') || row.name.includes('DBL1')) oilGrouped[row.date].Dubai = row.price;
      });
      const processedOil = Object.values(oilGrouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Process Natural Gas Data
      const ngGrouped: any = {};
      res.naturalGasData.forEach(row => {
        if (!ngGrouped[row.date]) ngGrouped[row.date] = { date: row.date };
        if (row.name.includes('미국')) ngGrouped[row.date].US = row.price;
        if (row.name.includes('유럽')) ngGrouped[row.date].Europe = row.price;
        if (row.name.includes('아시아')) ngGrouped[row.date].Asia = row.price;
      });
      const processedNG = Object.values(ngGrouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Process Naphtha & Ethylene
      const neGrouped: any = {};
      res.neData.forEach(row => {
        if (!neGrouped[row.date]) neGrouped[row.date] = { date: row.date };
        if (row.name.includes('납사')) neGrouped[row.date].Naphtha = row.price;
        if (row.name.includes('에틸렌')) neGrouped[row.date].Ethylene = row.price;
      });
      const processedNE = Object.values(neGrouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      processedNE.forEach((row: any) => {
        if (row.Ethylene !== undefined && row.Naphtha !== undefined) {
          row.Spread = row.Ethylene - row.Naphtha;
        }
      });

      // Process Propylene & Butadiene
      const pbGrouped: any = {};
      res.pbData.forEach(row => {
        if (!pbGrouped[row.date]) pbGrouped[row.date] = { date: row.date };
        if (row.name.includes('프로필렌')) pbGrouped[row.date].Propylene = row.price;
        if (row.name.includes('부타디엔')) pbGrouped[row.date].Butadiene = row.price;
      });
      const processedPB = Object.values(pbGrouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      processedPB.forEach((row: any) => {
        // Find corresponding Naphtha price for the same date
        const neRow: any = processedNE.find((ne: any) => ne.date === row.date);
        if (neRow && neRow.Naphtha !== undefined) {
          if (row.Propylene !== undefined) row.PropyleneSpread = row.Propylene - neRow.Naphtha;
          if (row.Butadiene !== undefined) row.ButadieneSpread = row.Butadiene - neRow.Naphtha;
        }
      });

      // Process Freight
      const freightGrouped: any = {};
      res.freightData.forEach(row => {
        if (!freightGrouped[row.date]) freightGrouped[row.date] = { date: row.date };
        if (row.name.includes('3월물')) freightGrouped[row.date]['3월물'] = row.price;
        if (row.name.includes('4월물')) freightGrouped[row.date]['4월물'] = row.price;
        if (row.name.includes('5월물')) freightGrouped[row.date]['5월물'] = row.price;
        if (row.name.includes('6월물')) freightGrouped[row.date]['6월물'] = row.price;
      });
      const processedFreight = Object.values(freightGrouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Process Freight Spot & Container
      const freightSpotGrouped: any = {};
      res.freightSpotData.forEach(row => {
        if (!freightSpotGrouped[row.date]) freightSpotGrouped[row.date] = { date: row.date };
        if (row.name.includes('BDI')) freightSpotGrouped[row.date].BDI = row.price;
        if (row.name.includes('Clean')) freightSpotGrouped[row.date].Clean = row.price;
        if (row.name.includes('Dirty')) freightSpotGrouped[row.date].Dirty = row.price;
      });
      res.freightContainerData.forEach(row => {
        if (!freightSpotGrouped[row.date]) freightSpotGrouped[row.date] = { date: row.date };
        if (row.name.includes('SCFI')) freightSpotGrouped[row.date].SCFI = row.price;
      });
      const processedFreightSpot = Object.values(freightSpotGrouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setData({
        oil: processedOil,
        naturalGas: processedNG,
        ne: processedNE,
        pb: processedPB,
        freight: processedFreight,
        freightSpot: processedFreightSpot,
        forceMajeure: res.forceMajeureData,
        operatingRates: res.operatingRatesData,
        turnaround: res.turnaroundData
      });
      setLoading(false);
    });
  }, []);

  const filteredData = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      oil: filterDataByTimeRange(data.oil, oilTimeRange),
      naturalGas: filterDataByTimeRange(data.naturalGas, naturalGasTimeRange),
      naphtha: filterDataByTimeRange(data.ne, naphthaTimeRange),
      ethylene: filterDataByTimeRange(data.ne, ethyleneTimeRange),
      propylene: filterDataByTimeRange(data.pb, propyleneTimeRange),
      butadiene: filterDataByTimeRange(data.pb, butadieneTimeRange),
      freight: filterFreightData(data.freight, freightTimeRange),
      freightSpot: filterDataByTimeRange(data.freightSpot, freightSpotTimeRange)
    };
  }, [data, oilTimeRange, naturalGasTimeRange, naphthaTimeRange, ethyleneTimeRange, propyleneTimeRange, butadieneTimeRange, freightTimeRange, freightSpotTimeRange]);

  const freightChartData = useMemo(() => {
    if (!filteredData || !filteredData.freight) return [];
    
    const months = ['3월물', '4월물', '5월물', '6월물'];
    return months.map(month => {
      const row: any = { month };
      filteredData.freight.forEach((d: any) => {
        if (d[month] !== undefined) {
          row[d.date] = d[month];
        }
      });
      return row;
    });
  }, [filteredData]);
  
  const freightDates = useMemo(() => {
    if (!filteredData || !filteredData.freight) return [];
    return filteredData.freight.map((d: any) => d.date);
  }, [filteredData]);

  if (loading || !filteredData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const revOil = [...(data?.oil || [])].reverse();
  const latestWTI = revOil.find(d => d.WTI !== undefined) || {};
  const prevWTI = revOil.find(d => d.WTI !== undefined && d.date !== latestWTI.date) || {};
  const latestBrent = revOil.find(d => d.Brent !== undefined) || {};
  const prevBrent = revOil.find(d => d.Brent !== undefined && d.date !== latestBrent.date) || {};
  const latestDubai = revOil.find(d => d.Dubai !== undefined) || {};
  const prevDubai = revOil.find(d => d.Dubai !== undefined && d.date !== latestDubai.date) || {};

  const revNG = [...(data?.naturalGas || [])].reverse();
  const latestUS = revNG.find(d => d.US !== undefined) || {};
  const prevUS = revNG.find(d => d.US !== undefined && d.date !== latestUS.date) || {};
  const latestAsia = revNG.find(d => d.Asia !== undefined) || {};
  const prevAsia = revNG.find(d => d.Asia !== undefined && d.date !== latestAsia.date) || {};
  const latestEurope = revNG.find(d => d.Europe !== undefined) || {};
  const prevEurope = revNG.find(d => d.Europe !== undefined && d.date !== latestEurope.date) || {};

  const revNE = [...(data?.ne || [])].reverse();
  const latestNaphtha = revNE.find(d => d.Naphtha !== undefined) || {};
  const prevNaphtha = revNE.find(d => d.Naphtha !== undefined && d.date !== latestNaphtha.date) || {};
  const latestEthylene = revNE.find(d => d.Ethylene !== undefined) || {};
  const prevEthylene = revNE.find(d => d.Ethylene !== undefined && d.date !== latestEthylene.date) || {};
  const latestSpread = revNE.find(d => d.Spread !== undefined) || {};
  const prevSpread = revNE.find(d => d.Spread !== undefined && d.date !== latestSpread.date) || {};

  const revPB = [...(data?.pb || [])].reverse();
  const latestPropylene = revPB.find(d => d.Propylene !== undefined) || {};
  const prevPropylene = revPB.find(d => d.Propylene !== undefined && d.date !== latestPropylene.date) || {};
  const latestPropyleneSpread = revPB.find(d => d.PropyleneSpread !== undefined) || {};
  const prevPropyleneSpread = revPB.find(d => d.PropyleneSpread !== undefined && d.date !== latestPropyleneSpread.date) || {};
  
  const latestButadiene = revPB.find(d => d.Butadiene !== undefined) || {};
  const prevButadiene = revPB.find(d => d.Butadiene !== undefined && d.date !== latestButadiene.date) || {};
  const latestButadieneSpread = revPB.find(d => d.ButadieneSpread !== undefined) || {};
  const prevButadieneSpread = revPB.find(d => d.ButadieneSpread !== undefined && d.date !== latestButadieneSpread.date) || {};

  const revFreight = [...(data?.freight || [])].reverse();
  const latestFreight = revFreight.find(d => d['3월물'] !== undefined || d['4월물'] !== undefined) || {};
  const prevFreight = revFreight.find(d => (d['3월물'] !== undefined || d['4월물'] !== undefined) && d.date !== latestFreight.date) || {};

  const revFreightSpot = [...(data?.freightSpot || [])].reverse();
  const latestBDI = revFreightSpot.find(d => d.BDI !== undefined) || {};
  const prevBDI = revFreightSpot.find(d => d.BDI !== undefined && d.date !== latestBDI.date) || {};
  const latestClean = revFreightSpot.find(d => d.Clean !== undefined) || {};
  const prevClean = revFreightSpot.find(d => d.Clean !== undefined && d.date !== latestClean.date) || {};
  const latestDirty = revFreightSpot.find(d => d.Dirty !== undefined) || {};
  const prevDirty = revFreightSpot.find(d => d.Dirty !== undefined && d.date !== latestDirty.date) || {};
  const latestSCFI = revFreightSpot.find(d => d.SCFI !== undefined) || {};
  const prevSCFI = revFreightSpot.find(d => d.SCFI !== undefined && d.date !== latestSCFI.date) || {};

  const wtiChange = calculateChange(latestWTI.WTI, prevWTI.WTI);
  const brentChange = calculateChange(latestBrent.Brent, prevBrent.Brent);
  const dubaiChange = calculateChange(latestDubai.Dubai, prevDubai.Dubai);
  
  const usChange = calculateChange(latestUS.US, prevUS.US);
  const asiaChange = calculateChange(latestAsia.Asia, prevAsia.Asia);
  const europeChange = calculateChange(latestEurope.Europe, prevEurope.Europe);

  const naphthaChange = calculateChange(latestNaphtha.Naphtha, prevNaphtha.Naphtha);
  const ethyleneChange = calculateChange(latestEthylene.Ethylene, prevEthylene.Ethylene);
  const propyleneChange = calculateChange(latestPropylene.Propylene, prevPropylene.Propylene);
  const butadieneChange = calculateChange(latestButadiene.Butadiene, prevButadiene.Butadiene);

  const bdiChange = calculateChange(latestBDI.BDI, prevBDI.BDI);
  const cleanChange = calculateChange(latestClean.Clean, prevClean.Clean);
  const dirtyChange = calculateChange(latestDirty.Dirty, prevDirty.Dirty);
  const scfiChange = calculateChange(latestSCFI.SCFI, prevSCFI.SCFI);

  const taOngoing = filteredData?.turnaround.filter((item: any) => item.category?.includes('진행 中')) || [];
  const taPlanned = filteredData?.turnaround.filter((item: any) => item.category?.includes('조기 실시')) || [];

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0B0B0F]/95 backdrop-blur-sm border-b border-[#2A2A35] mb-4 sm:mb-6">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6 flex justify-between items-center gap-3 sm:gap-4 relative">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="text-purple-500 w-5 h-5 sm:w-6 sm:h-6" />
              Hormuz Crisis Signal Monitor
            </h1>
            <div className="text-[11px] sm:text-sm font-medium text-gray-400 ml-7 sm:ml-0">
              {formatHeaderTime(currentTime)}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg bg-[#1C1C24] border border-[#2A2A35] text-gray-400 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute top-full right-4 sm:right-6 lg:right-8 mt-2 w-56 bg-[#1C1C24] border border-[#2A2A35] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="py-2">
                <button onClick={() => scrollToSection('crude-oil')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Droplet size={14} className="text-blue-500" /> 원유 / CRUDE OIL
                </button>
                <button onClick={() => scrollToSection('natural-gas')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Flame size={14} className="text-emerald-500" /> 천연가스
                </button>
                <button onClick={() => scrollToSection('naphtha')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Factory size={14} className="text-purple-500" /> 납사(MOPJ)
                </button>
                <button onClick={() => scrollToSection('ethylene')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Activity size={14} className="text-amber-500" /> 에틸렌(CFR NEA)
                </button>
                <button onClick={() => scrollToSection('propylene')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Activity size={14} className="text-cyan-500" /> 프로필렌(FOB Korea,Poly)
                </button>
                <button onClick={() => scrollToSection('butadiene')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Activity size={14} className="text-pink-500" /> 부타디엔(FOB Korea)
                </button>
                <button onClick={() => scrollToSection('freight-spot')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Ship size={14} className="text-indigo-400" /> 운임(현물)
                </button>
                <button onClick={() => scrollToSection('freight-futures')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Ship size={14} className="text-blue-400" /> 운임(선물)
                </button>
                <button onClick={() => scrollToSection('force-majeure')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <AlertTriangle size={14} className="text-rose-500" /> Force Majeure 현황
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        {/* Top Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Oil Futures */}
        <Card id="crude-oil" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Droplet size={16} />
              </div>
              <p className="text-sm text-gray-400 font-medium">원유 / CRUDE OIL <span className="text-gray-500 text-xs ml-1">[단위: $/bbl]</span></p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">WTI</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestWTI.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestWTI.WTI, 2)}</span>
                    <span className={`text-sm font-medium ${wtiChange.color}`}>({wtiChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ${formatNumber(prevWTI.WTI, 2)}</span>
                    <span className={`text-[10px] font-medium ${wtiChange.color}`}>({wtiChange.pctText})</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">BRENT</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestBrent.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestBrent.Brent, 2)}</span>
                    <span className={`text-sm font-medium ${brentChange.color}`}>({brentChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ${formatNumber(prevBrent.Brent, 2)}</span>
                    <span className={`text-[10px] font-medium ${brentChange.color}`}>({brentChange.pctText})</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">DUBAI</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestDubai.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestDubai.Dubai, 2)}</span>
                    <span className={`text-sm font-medium ${dubaiChange.color}`}>({dubaiChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ${formatNumber(prevDubai.Dubai, 2)}</span>
                    <span className={`text-[10px] font-medium ${dubaiChange.color}`}>({dubaiChange.pctText})</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35]">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setOilTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      oilTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '1m' ? '1개월' : range === '6m' ? '6개월' : '1년'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.oil} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={hiddenLines['WTI']} type="monotone" dataKey="WTI" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line hide={hiddenLines['Brent']} type="monotone" dataKey="Brent" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line hide={hiddenLines['Dubai']} type="monotone" dataKey="Dubai" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Natural Gas */}
        <Card id="natural-gas" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Flame size={16} />
              </div>
              <p className="text-sm text-gray-400 font-medium">천연가스 <span className="text-gray-500 text-xs ml-1">[단위: $/MMBtu]</span></p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">미국(Henry Hub)</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestUS.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestUS.US, 2)}</span>
                    <span className={`text-sm font-medium ${usChange.color}`}>({usChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ${formatNumber(prevUS.US, 2)}</span>
                    <span className={`text-[10px] font-medium ${usChange.color}`}>({usChange.pctText})</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">아시아(JKM)</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestAsia.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestAsia.Asia, 2)}</span>
                    <span className={`text-sm font-medium ${asiaChange.color}`}>({asiaChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ${formatNumber(prevAsia.Asia, 2)}</span>
                    <span className={`text-[10px] font-medium ${asiaChange.color}`}>({asiaChange.pctText})</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">유럽(TTF)</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestEurope.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestEurope.Europe, 2)}</span>
                    <span className={`text-sm font-medium ${europeChange.color}`}>({europeChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ${formatNumber(prevEurope.Europe, 2)}</span>
                    <span className={`text-[10px] font-medium ${europeChange.color}`}>({europeChange.pctText})</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35]">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setNaturalGasTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      naturalGasTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '1m' ? '1개월' : range === '6m' ? '6개월' : '1년'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.naturalGas} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={hiddenLines['US']} type="monotone" dataKey="US" name="미국" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line hide={hiddenLines['Asia']} type="monotone" dataKey="Asia" name="아시아" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line hide={hiddenLines['Europe']} type="monotone" dataKey="Europe" name="유럽" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Naphtha Spot */}
        <Card id="naphtha" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Factory size={16} />
              </div>
              <p className="text-sm text-gray-400 font-medium">납사(MOPJ) <span className="text-gray-500 text-xs ml-1">[단위: $/톤]</span></p>
            </div>
            
            <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] mb-4 flex justify-between items-start">
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">납사</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestNaphtha.date)}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestNaphtha.Naphtha, 2)}</span>
                  <span className={`text-sm font-medium ${naphthaChange.color}`}>({naphthaChange.diffText})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400">전일: ${formatNumber(prevNaphtha.Naphtha, 2)}</span>
                  <span className={`text-[10px] font-medium ${naphthaChange.color}`}>({naphthaChange.pctText})</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35]">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setNaphthaTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      naphthaTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '1m' ? '1개월' : range === '6m' ? '6개월' : '1년'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.naphtha} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={hiddenLines['Naphtha']} type="monotone" dataKey="Naphtha" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Ethylene Spot */}
        <Card id="ethylene" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Activity size={16} />
              </div>
              <p className="text-sm text-gray-400 font-medium">에틸렌(CFR NEA) <span className="text-gray-500 text-xs ml-1">[단위: $/톤]</span></p>
            </div>
            
            <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] mb-4 flex justify-between items-start">
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">에틸렌</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestEthylene.date)}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestEthylene.Ethylene, 2)}</span>
                  <span className={`text-sm font-medium ${ethyleneChange.color}`}>({ethyleneChange.diffText})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400">전일: ${formatNumber(prevEthylene.Ethylene, 2)}</span>
                  <span className={`text-[10px] font-medium ${ethyleneChange.color}`}>({ethyleneChange.pctText})</span>
                </div>
              </div>
              <div className="text-right min-w-[100px]">
                <p className="text-[10px] text-gray-500 font-medium mb-1">에틸렌 Spread</p>
                <p className={`text-lg lg:text-xl font-bold ${latestSpread.Spread !== undefined && latestSpread.Spread < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${formatNumber(latestSpread.Spread, 2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35]">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setEthyleneTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      ethyleneTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '1m' ? '1개월' : range === '6m' ? '6개월' : '1년'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.ethylene} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ffffff" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={hiddenLines['Ethylene']} yAxisId="left" type="monotone" dataKey="Ethylene" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls={true} />
                  <Line hide={hiddenLines['Spread']} yAxisId="right" type="monotone" dataKey="Spread" name="Spread(우)" stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Propylene Spot */}
        <Card id="propylene" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Activity size={16} />
              </div>
              <p className="text-sm text-gray-400 font-medium">프로필렌(FOB Korea,Poly) <span className="text-gray-500 text-xs ml-1">[단위: $/톤]</span></p>
            </div>
            
            <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] mb-4 flex justify-between items-start">
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">프로필렌</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestPropylene.date)}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestPropylene.Propylene, 2)}</span>
                  <span className={`text-sm font-medium ${propyleneChange.color}`}>({propyleneChange.diffText})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400">전일: ${formatNumber(prevPropylene.Propylene, 2)}</span>
                  <span className={`text-[10px] font-medium ${propyleneChange.color}`}>({propyleneChange.pctText})</span>
                </div>
              </div>
              <div className="text-right min-w-[100px]">
                <p className="text-[10px] text-gray-500 font-medium mb-1">프로필렌 Spread</p>
                <p className={`text-lg lg:text-xl font-bold ${latestPropyleneSpread.PropyleneSpread !== undefined && latestPropyleneSpread.PropyleneSpread < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${formatNumber(latestPropyleneSpread.PropyleneSpread, 2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35]">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setPropyleneTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      propyleneTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '1m' ? '1개월' : range === '6m' ? '6개월' : '1년'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.propylene} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ffffff" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={hiddenLines['Propylene']} yAxisId="left" type="monotone" dataKey="Propylene" stroke="#06b6d4" strokeWidth={2} dot={false} connectNulls={true} />
                  <Line hide={hiddenLines['PropyleneSpread']} yAxisId="right" type="monotone" dataKey="PropyleneSpread" name="Spread(우)" stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Butadiene Spot */}
        <Card id="butadiene" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                <Activity size={16} />
              </div>
              <p className="text-sm text-gray-400 font-medium">부타디엔(FOB Korea) <span className="text-gray-500 text-xs ml-1">[단위: $/톤]</span></p>
            </div>
            
            <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] mb-4 flex justify-between items-start">
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">부타디엔</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestButadiene.date)}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(latestButadiene.Butadiene, 2)}</span>
                  <span className={`text-sm font-medium ${butadieneChange.color}`}>({butadieneChange.diffText})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400">전일: ${formatNumber(prevButadiene.Butadiene, 2)}</span>
                  <span className={`text-[10px] font-medium ${butadieneChange.color}`}>({butadieneChange.pctText})</span>
                </div>
              </div>
              <div className="text-right min-w-[100px]">
                <p className="text-[10px] text-gray-500 font-medium mb-1">부타디엔 Spread</p>
                <p className={`text-lg lg:text-xl font-bold ${latestButadieneSpread.ButadieneSpread !== undefined && latestButadieneSpread.ButadieneSpread < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${formatNumber(latestButadieneSpread.ButadieneSpread, 2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35]">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setButadieneTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      butadieneTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '1m' ? '1개월' : range === '6m' ? '6개월' : '1년'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.butadiene} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ffffff" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={hiddenLines['Butadiene']} yAxisId="left" type="monotone" dataKey="Butadiene" stroke="#ec4899" strokeWidth={2} dot={false} connectNulls={true} />
                  <Line hide={hiddenLines['ButadieneSpread']} yAxisId="right" type="monotone" dataKey="ButadieneSpread" name="Spread(우)" stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Area */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Freight Spot Chart */}
        <Card id="freight-spot" className="lg:col-span-3">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-start gap-2">
                <Ship className="text-indigo-400 mt-1" size={20} />
                <div className="flex flex-col">
                  <span>운임(현물)</span>
                </div>
              </CardTitle>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Clean/Dirty: MEG → JP
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: 'BDI', latest: latestBDI.BDI, prev: prevBDI.BDI, date: latestBDI.date, unit: '', decimals: 2 },
                { label: 'SCFI', latest: latestSCFI.SCFI, prev: prevSCFI.SCFI, date: latestSCFI.date, unit: '', decimals: 2 },
                { label: 'Dirty (원유)', latest: latestDirty.Dirty, prev: prevDirty.Dirty, date: latestDirty.date, unit: '$', decimals: 2 },
                { label: 'Clean (정제유/납사)', latest: latestClean.Clean, prev: prevClean.Clean, date: latestClean.date, unit: '$', decimals: 2 },
              ].map((item) => {
                const change = calculateChange(item.latest, item.prev);
                return (
                  <div key={item.label} className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                    <div className="flex justify-between w-full items-center mb-1">
                      <p className="text-[10px] text-gray-500 font-medium tracking-wider">{item.label}</p>
                      <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(item.date)}</p>
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg lg:text-xl font-bold text-white">{item.unit}{formatNumber(item.latest, item.decimals)}</span>
                        <span className={`text-sm font-medium ${change.color}`}>({change.diffText})</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-400">전일: {item.unit}{formatNumber(item.prev, item.decimals)}</span>
                        <span className={`text-[10px] font-medium ${change.color}`}>({change.pctText})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35]">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setFreightSpotTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      freightSpotTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '1m' ? '1개월' : range === '6m' ? '6개월' : '1년'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-6 mt-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData.freightSpot} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                    <Line hide={hiddenLines['Clean']} type="monotone" dataKey="Clean" name="Clean" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={true} />
                    <Line hide={hiddenLines['Dirty']} type="monotone" dataKey="Dirty" name="Dirty" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={true} />
                    <Line hide={hiddenLines['BDI']} type="monotone" dataKey="BDI" name="BDI" stroke="#f97316" strokeWidth={2} dot={false} connectNulls={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData.freightSpot} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                    <Line hide={hiddenLines['SCFI']} type="monotone" dataKey="SCFI" name="SCFI" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Freight Futures Chart */}
        <Card id="freight-futures" className="lg:col-span-3">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-start gap-2">
                <Ship className="text-blue-400 mt-1" size={20} />
                <div className="flex flex-col">
                  <span>운임(선물)</span>
                </div>
              </CardTitle>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              TD3 FFA MEG → JP
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: '3월물', latest: latestFreight['3월물'], prev: prevFreight['3월물'], date: latestFreight.date },
                { label: '4월물', latest: latestFreight['4월물'], prev: prevFreight['4월물'], date: latestFreight.date },
                { label: '5월물', latest: latestFreight['5월물'], prev: prevFreight['5월물'], date: latestFreight.date },
                { label: '6월물', latest: latestFreight['6월물'], prev: prevFreight['6월물'], date: latestFreight.date },
              ].map((item) => {
                const change = calculateChange(item.latest, item.prev);
                return (
                  <div key={item.label} className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                    <div className="flex justify-between w-full items-center mb-1">
                      <p className="text-[10px] text-gray-500 font-medium tracking-wider">{item.label}</p>
                      <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(item.date)}</p>
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg lg:text-xl font-bold text-white">${formatNumber(item.latest, 2)}</span>
                        <span className={`text-sm font-medium ${change.color}`}>({change.diffText})</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-400">전일: ${formatNumber(item.prev, 2)}</span>
                        <span className={`text-[10px] font-medium ${change.color}`}>({change.pctText})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35]">
                {['1w', '6w', '6m'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setFreightTimeRange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      freightTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '6w' ? '6주' : '6개월'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={freightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  {freightDates.map((date, idx) => {
                    const isLatest = idx === freightDates.length - 1;
                    const isPrev = idx === freightDates.length - 2;
                    const opacity = Math.max(0.1, (idx + 1) / freightDates.length);
                    const color = isLatest ? '#3b82f6' : isPrev ? '#10b981' : `rgba(107, 114, 128, ${opacity})`;
                    return (
                      <Line 
                        hide={hiddenLines[date]}
                        key={date} 
                        type="monotone" 
                        dataKey={date} 
                        stroke={color} 
                        strokeWidth={isLatest || isPrev ? 2 : 1} 
                        dot={isLatest || isPrev} 
                        activeDot={{ r: 4 }}
                        name={date}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Tables */}
      <div className="grid grid-cols-1 gap-6">
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Force Majeure */}
        <Card id="force-majeure">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={20} />
                Force Majeure 현황
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-[#1C1C24] border-b border-[#2A2A35]">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Company</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Commodity</th>
                    <th className="px-4 py-3">Capa</th>
                    <th className="px-4 py-3 rounded-tr-lg">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {(isFMExpanded ? filteredData.forceMajeure : filteredData.forceMajeure.slice(0, 5)).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-[#2A2A35]/50 hover:bg-[#1C1C24]/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        <div className="flex items-center gap-1.5">
                          {item.company}
                          {item.note && item.note !== '-' && (
                            <div className="relative">
                              <button
                                onMouseDown={() => setActiveNote(`fm-${idx}`)}
                                onMouseUp={() => setActiveNote(null)}
                                onMouseLeave={() => setActiveNote(null)}
                                onTouchStart={() => setActiveNote(`fm-${idx}`)}
                                onTouchEnd={() => setActiveNote(null)}
                                className="flex items-center focus:outline-none"
                              >
                                <Info size={14} className="text-yellow-500" />
                              </button>
                              {activeNote === `fm-${idx}` && (
                                <div className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#2A2A35] text-xs text-white rounded-lg shadow-xl border border-gray-600 pointer-events-none">
                                  {item.note}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{item.country}</td>
                      <td className="px-4 py-3 text-gray-300">{item.commodity}</td>
                      <td className="px-4 py-3 text-gray-300">{item.capacity}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{item.start} ~ {item.end}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredData.forceMajeure.length > 5 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setIsFMExpanded(!isFMExpanded)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors bg-[#1C1C24] px-4 py-2 rounded-lg border border-[#2A2A35]"
                >
                  {isFMExpanded ? (
                    <><ChevronUp size={16} /> 접기</>
                  ) : (
                    <><ChevronDown size={16} /> 더보기</>
                  )}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
