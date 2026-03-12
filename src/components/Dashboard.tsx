import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { fetchDashboardData } from '../data/fetchData';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Ship, Droplet, Factory, Settings, ChevronUp, ChevronDown, Info, Menu, X } from 'lucide-react';

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
            {entry.name}: {entry.value?.toFixed ? entry.value.toFixed(2) : entry.value}
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
    diffText = `+${diff.toFixed(2)}`;
    pctText = `+${pct.toFixed(2)}%`;
  } else if (diff < 0) {
    color = 'text-rose-400';
    diffText = `${diff.toFixed(2)}`;
    pctText = `${pct.toFixed(2)}%`;
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

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [oilTimeRange, setOilTimeRange] = useState('1y');
  const [naturalGasTimeRange, setNaturalGasTimeRange] = useState('1y');
  const [naphthaTimeRange, setNaphthaTimeRange] = useState('1y');
  const [ethyleneTimeRange, setEthyleneTimeRange] = useState('1y');
  const [freightTimeRange, setFreightTimeRange] = useState('6m');
  const [freightSpotTimeRange, setFreightSpotTimeRange] = useState('1y');
  const [isFMExpanded, setIsFMExpanded] = useState(false);
  const [isTAExpanded, setIsTAExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      freight: filterFreightData(data.freight, freightTimeRange),
      freightSpot: filterDataByTimeRange(data.freightSpot, freightSpotTimeRange)
    };
  }, [data, oilTimeRange, naturalGasTimeRange, naphthaTimeRange, ethyleneTimeRange, freightTimeRange, freightSpotTimeRange]);

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
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="text-purple-500 w-5 h-5 sm:w-6 sm:h-6" />
              Hormuz Crisis Signal Monitor
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm font-medium text-gray-400 hidden sm:block">
              {currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })} {currentTime.toLocaleTimeString('ko-KR', { hour12: false })}
            </div>
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
                  <Droplet size={14} className="text-emerald-500" /> 천연가스
                </button>
                <button onClick={() => scrollToSection('naphtha')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Factory size={14} className="text-purple-500" /> 납사(MOPJ)
                </button>
                <button onClick={() => scrollToSection('ethylene')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                  <Activity size={14} className="text-amber-500" /> 에틸렌(CFR NEA)
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
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col">
                <p className="text-[10px] text-gray-500 font-medium tracking-wider mb-1">WTI</p>
                <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${latestWTI.WTI?.toFixed(2) || '-'}</span>
                    <span className={`text-sm font-medium ${wtiChange.color}`}>({wtiChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400 sm:block hidden">전일: ${prevWTI.WTI?.toFixed(2) || '-'}</span>
                    <span className={`text-[10px] font-medium ${wtiChange.color} sm:block hidden`}>({wtiChange.pctText})</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col">
                <p className="text-[10px] text-gray-500 font-medium tracking-wider mb-1">BRENT</p>
                <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${latestBrent.Brent?.toFixed(2) || '-'}</span>
                    <span className={`text-sm font-medium ${brentChange.color}`}>({brentChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400 sm:block hidden">전일: ${prevBrent.Brent?.toFixed(2) || '-'}</span>
                    <span className={`text-[10px] font-medium ${brentChange.color} sm:block hidden`}>({brentChange.pctText})</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col">
                <p className="text-[10px] text-gray-500 font-medium tracking-wider mb-1">DUBAI</p>
                <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${latestDubai.Dubai?.toFixed(2) || '-'}</span>
                    <span className={`text-sm font-medium ${dubaiChange.color}`}>({dubaiChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400 sm:block hidden">전일: ${prevDubai.Dubai?.toFixed(2) || '-'}</span>
                    <span className={`text-[10px] font-medium ${dubaiChange.color} sm:block hidden`}>({dubaiChange.pctText})</span>
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
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="WTI" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Brent" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Dubai" stroke="#3b82f6" strokeWidth={2} dot={false} />
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
                <Droplet size={16} />
              </div>
              <p className="text-sm text-gray-400 font-medium">천연가스 <span className="text-gray-500 text-xs ml-1">[단위: $/MMBtu]</span></p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col">
                <p className="text-[10px] text-gray-500 font-medium tracking-wider mb-1">미국</p>
                <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${latestUS.US?.toFixed(2) || '-'}</span>
                    <span className={`text-sm font-medium ${usChange.color}`}>({usChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400 sm:block hidden">전일: ${prevUS.US?.toFixed(2) || '-'}</span>
                    <span className={`text-[10px] font-medium ${usChange.color} sm:block hidden`}>({usChange.pctText})</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col">
                <p className="text-[10px] text-gray-500 font-medium tracking-wider mb-1">아시아</p>
                <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${latestAsia.Asia?.toFixed(2) || '-'}</span>
                    <span className={`text-sm font-medium ${asiaChange.color}`}>({asiaChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400 sm:block hidden">전일: ${prevAsia.Asia?.toFixed(2) || '-'}</span>
                    <span className={`text-[10px] font-medium ${asiaChange.color} sm:block hidden`}>({asiaChange.pctText})</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#1C1C24] p-3 rounded-xl border border-[#2A2A35] flex flex-col">
                <p className="text-[10px] text-gray-500 font-medium tracking-wider mb-1">유럽</p>
                <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-xl font-bold text-white">${latestEurope.Europe?.toFixed(2) || '-'}</span>
                    <span className={`text-sm font-medium ${europeChange.color}`}>({europeChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400 sm:block hidden">전일: ${prevEurope.Europe?.toFixed(2) || '-'}</span>
                    <span className={`text-[10px] font-medium ${europeChange.color} sm:block hidden`}>({europeChange.pctText})</span>
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
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="US" name="미국" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Asia" name="아시아" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Europe" name="유럽" stroke="#3b82f6" strokeWidth={2} dot={false} />
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
            
            <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] mb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-white">${latestNaphtha.Naphtha?.toFixed(2) || '-'}</span>
                  <span className={`text-sm font-medium ${naphthaChange.color}`}>({naphthaChange.diffText})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-gray-400">전일: ${prevNaphtha.Naphtha?.toFixed(2) || '-'}</span>
                  <span className={`text-xs font-medium ${naphthaChange.color}`}>({naphthaChange.pctText})</span>
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
                  <Line type="monotone" dataKey="Naphtha" stroke="#a855f7" strokeWidth={2} dot={false} />
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
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-white">${latestEthylene.Ethylene?.toFixed(2) || '-'}</span>
                  <span className={`text-sm font-medium ${ethyleneChange.color}`}>({ethyleneChange.diffText})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-gray-400">전일: ${prevEthylene.Ethylene?.toFixed(2) || '-'}</span>
                  <span className={`text-xs font-medium ${ethyleneChange.color}`}>({ethyleneChange.pctText})</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium mb-1">에틸렌 Spread</p>
                <p className={`text-xl lg:text-2xl font-bold ${latestSpread.Spread !== undefined && latestSpread.Spread < 300 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${latestSpread.Spread?.toFixed(2) || '-'}
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
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="Ethylene" stroke="#ffffff" strokeWidth={2} dot={false} connectNulls={true} />
                  <Line type="monotone" dataKey="Spread" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={true} />
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 lg:gap-4 w-full sm:w-auto">
                {[
                  { label: 'BDI (고체)', latest: latestBDI.BDI, prev: prevBDI.BDI, unit: '$', decimals: 2 },
                  { label: 'Clean (정제유/납사)', latest: latestClean.Clean, prev: prevClean.Clean, unit: '$', decimals: 2 },
                  { label: 'Dirty (원유)', latest: latestDirty.Dirty, prev: prevDirty.Dirty, unit: '$', decimals: 2 },
                  { label: 'SCFI (Container)', latest: latestSCFI.SCFI, prev: prevSCFI.SCFI, unit: '$', decimals: 2 },
                ].map((item) => {
                  const change = calculateChange(item.latest, item.prev);
                  return (
                    <div key={item.label} className="flex flex-col items-center bg-[#1C1C24] px-3 sm:px-4 py-2 rounded-xl border border-[#2A2A35] min-w-0 sm:min-w-[130px] w-full">
                      <span className="text-gray-500 text-[10px] sm:text-xs font-medium tracking-wider mb-1 text-center">{item.label}</span>
                      <div className="flex flex-col gap-0.5 sm:gap-1 items-center">
                        <div className="flex items-baseline gap-1 sm:gap-1.5">
                          <span className="text-base sm:text-lg font-bold text-white">{item.unit}{item.latest?.toFixed(item.decimals) || '-'}</span>
                          <span className={`text-[10px] sm:text-xs font-medium ${change.color}`}>({change.diffText})</span>
                        </div>
                        <div className="flex items-baseline gap-1 sm:gap-1.5">
                          <span className="text-xs sm:text-sm text-gray-400">전일: {item.unit}{item.prev?.toFixed(item.decimals) || '-'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="Clean" name="Clean" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={true} />
                    <Line type="monotone" dataKey="Dirty" name="Dirty" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={true} />
                    <Line type="monotone" dataKey="BDI" name="BDI" stroke="#f97316" strokeWidth={2} dot={false} connectNulls={true} />
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
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="SCFI" name="SCFI" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls={true} />
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 lg:gap-4 w-full sm:w-auto">
                {[
                  { label: '3월물', latest: latestFreight['3월물'], prev: prevFreight['3월물'] },
                  { label: '4월물', latest: latestFreight['4월물'], prev: prevFreight['4월물'] },
                  { label: '5월물', latest: latestFreight['5월물'], prev: prevFreight['5월물'] },
                  { label: '6월물', latest: latestFreight['6월물'], prev: prevFreight['6월물'] },
                ].map((item) => {
                  const change = calculateChange(item.latest, item.prev);
                  return (
                    <div key={item.label} className="flex flex-col items-center bg-[#1C1C24] px-3 sm:px-4 py-2 rounded-xl border border-[#2A2A35] min-w-0 sm:min-w-[130px] w-full">
                      <span className="text-gray-500 text-[10px] sm:text-xs font-medium tracking-wider mb-1">{item.label}</span>
                      <div className="flex flex-col gap-0.5 sm:gap-1 items-center">
                        <div className="flex items-baseline gap-1 sm:gap-1.5">
                          <span className="text-base sm:text-lg font-bold text-white">${item.latest?.toFixed(2) || '-'}</span>
                          <span className={`text-[10px] sm:text-xs font-medium ${change.color}`}>({change.diffText})</span>
                        </div>
                        <div className="flex items-baseline gap-1 sm:gap-1.5">
                          <span className="text-xs sm:text-sm text-gray-400">전일: ${item.prev?.toFixed(2) || '-'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  {freightDates.map((date, idx) => {
                    const isLatest = idx === freightDates.length - 1;
                    const isPrev = idx === freightDates.length - 2;
                    const opacity = Math.max(0.1, (idx + 1) / freightDates.length);
                    const color = isLatest ? '#3b82f6' : isPrev ? '#10b981' : `rgba(107, 114, 128, ${opacity})`;
                    return (
                      <Line 
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
