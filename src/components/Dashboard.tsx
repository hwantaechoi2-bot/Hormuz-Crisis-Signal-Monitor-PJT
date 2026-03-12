import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { fetchDashboardData } from '../data/fetchData';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Ship, Droplet, Factory, Settings, ChevronUp, ChevronDown, Info } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1C1C24] border border-[#2A2A35] p-3 rounded-xl shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
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
  
  if (range === '7d') cutoffDate.setDate(cutoffDate.getDate() - 7);
  else if (range === '30d') cutoffDate.setDate(cutoffDate.getDate() - 30);
  else if (range === '6m') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
  else if (range === '1y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  else return dataList; // 'all' or fallback

  return dataList.filter(d => new Date(d.date) >= cutoffDate);
};

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1y');
  const [isFMExpanded, setIsFMExpanded] = useState(false);
  const [isTAExpanded, setIsTAExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeNote, setActiveNote] = useState<string | null>(null);

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
        if (row.name.includes('브렌트') || row.name.includes('COK6')) oilGrouped[row.date].Brent = row.price;
        if (row.name.includes('두바이') || row.name.includes('DBL1')) oilGrouped[row.date].Dubai = row.price;
      });
      const processedOil = Object.values(oilGrouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

      setData({
        oil: processedOil,
        ne: processedNE,
        freight: processedFreight,
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
      oil: filterDataByTimeRange(data.oil, timeRange),
      ne: filterDataByTimeRange(data.ne, timeRange),
      freight: filterDataByTimeRange(data.freight, timeRange)
    };
  }, [data, timeRange]);

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

  const revOil = [...filteredData.oil].reverse();
  const latestWTI = revOil.find(d => d.WTI !== undefined) || {};
  const prevWTI = revOil.find(d => d.WTI !== undefined && d.date !== latestWTI.date) || {};
  const latestBrent = revOil.find(d => d.Brent !== undefined) || {};
  const prevBrent = revOil.find(d => d.Brent !== undefined && d.date !== latestBrent.date) || {};
  const latestDubai = revOil.find(d => d.Dubai !== undefined) || {};
  const prevDubai = revOil.find(d => d.Dubai !== undefined && d.date !== latestDubai.date) || {};

  const revNE = [...filteredData.ne].reverse();
  const latestNaphtha = revNE.find(d => d.Naphtha !== undefined) || {};
  const prevNaphtha = revNE.find(d => d.Naphtha !== undefined && d.date !== latestNaphtha.date) || {};
  const latestEthylene = revNE.find(d => d.Ethylene !== undefined) || {};
  const prevEthylene = revNE.find(d => d.Ethylene !== undefined && d.date !== latestEthylene.date) || {};
  const latestSpread = revNE.find(d => d.Spread !== undefined) || {};
  const prevSpread = revNE.find(d => d.Spread !== undefined && d.date !== latestSpread.date) || {};

  const revFreight = [...filteredData.freight].reverse();
  const latestFreight = revFreight.find(d => d['3월물'] !== undefined || d['4월물'] !== undefined) || {};
  const prevFreight = revFreight.find(d => (d['3월물'] !== undefined || d['4월물'] !== undefined) && d.date !== latestFreight.date) || {};

  const wtiChange = calculateChange(latestWTI.WTI, prevWTI.WTI);
  const brentChange = calculateChange(latestBrent.Brent, prevBrent.Brent);
  const dubaiChange = calculateChange(latestDubai.Dubai, prevDubai.Dubai);
  const naphthaChange = calculateChange(latestNaphtha.Naphtha, prevNaphtha.Naphtha);
  const ethyleneChange = calculateChange(latestEthylene.Ethylene, prevEthylene.Ethylene);

  const taOngoing = filteredData?.turnaround.filter((item: any) => item.category?.includes('진행 中')) || [];
  const taPlanned = filteredData?.turnaround.filter((item: any) => item.category?.includes('조기 실시')) || [];

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0B0B0F]/95 backdrop-blur-sm border-b border-[#2A2A35] mb-4 sm:mb-6">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="text-purple-500 w-5 h-5 sm:w-6 sm:h-6" />
              Hormuz Crisis Signal Monitor
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
            <div className="text-xs sm:text-sm font-medium text-gray-400">
              {currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })} {currentTime.toLocaleTimeString('ko-KR', { hour12: false })}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-[#1C1C24] p-1 sm:p-1.5 rounded-xl border border-[#2A2A35] w-full sm:w-auto overflow-x-auto hide-scrollbar">
              {['7d', '30d', '6m', '1y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    timeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        {/* Top Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Oil Futures */}
        <Card className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
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

        {/* Naphtha Spot */}
        <Card className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
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

            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.ne} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
        <Card className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
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

            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.ne} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Freight Futures Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-start gap-2">
                <Ship className="text-blue-400 mt-1" size={20} />
                <div className="flex flex-col">
                  <span>운임선물 추이</span>
                  <span className="text-sm text-gray-400 font-normal">(Freight Futures)</span>
                </div>
              </CardTitle>
              <CardDescription>3, 4, 5, 6월물 추이</CardDescription>
            </div>
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
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Force Majeure */}
        <Card>
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
                  {(isFMExpanded ? filteredData.forceMajeure : filteredData.forceMajeure.slice(0, filteredData.operatingRates.length)).map((item: any, idx: number) => (
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
            {filteredData.forceMajeure.length > filteredData.operatingRates.length && (
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

        {/* Operating Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="text-blue-400" size={20} />
              지역별 가동률 조정
            </CardTitle>
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
                  {filteredData.operatingRates.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-[#2A2A35]/50 hover:bg-[#1C1C24]/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        <div className="flex items-center gap-1.5">
                          {item.company}
                          {item.note && item.note !== '-' && (
                            <div className="relative">
                              <button
                                onMouseDown={() => setActiveNote(`or-${idx}`)}
                                onMouseUp={() => setActiveNote(null)}
                                onMouseLeave={() => setActiveNote(null)}
                                onTouchStart={() => setActiveNote(`or-${idx}`)}
                                onTouchEnd={() => setActiveNote(null)}
                                className="flex items-center focus:outline-none"
                              >
                                <Info size={14} className="text-yellow-500" />
                              </button>
                              {activeNote === `or-${idx}` && (
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
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
