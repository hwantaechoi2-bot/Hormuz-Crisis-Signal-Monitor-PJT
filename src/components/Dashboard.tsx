import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { fetchDashboardData } from '../data/fetchData';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Ship, Droplet, Factory, Settings, ChevronUp, ChevronDown, Info, Menu, X, Flame, HelpCircle, Zap, RefreshCw, Plus } from 'lucide-react';

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
  if (current === undefined || previous === undefined || current === null || previous === null) 
    return { diffText: '-', pctText: '-', color: 'text-white', diff: 0 };
  
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / previous) * 100 : 0;
  
  const formattedDiff = formatNumber(diff, 2);
  // Check if the formatted value is 0 or -0
  const isZero = parseFloat(formattedDiff) === 0;

  if (isZero) {
    return { 
      diffText: formattedDiff, 
      pctText: `${formatNumber(pct, 2)}%`, 
      color: 'text-white', 
      diff 
    };
  }

  if (diff > 0) {
    return {
      diffText: `+${formattedDiff}`,
      pctText: `+${formatNumber(pct, 2)}%`,
      color: 'text-emerald-400',
      diff
    };
  } else {
    return {
      diffText: formattedDiff,
      pctText: `${formatNumber(pct, 2)}%`,
      color: 'text-rose-400',
      diff
    };
  }
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
  } else if (range === '1m') {
    let currentDate = new Date(revList[0].date);
    for (let i = 0; i < 4; i++) {
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
  } else if (range === '1y') {
    let currentDate = new Date(revList[0].date);
    for (let i = 0; i < 12; i++) {
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
  
  const yyyy = kst.getFullYear().toString();
  const mm = (kst.getMonth() + 1).toString().padStart(2, '0');
  const dd = kst.getDate().toString().padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[kst.getDay()];
  
  const ampm = kst.getHours() >= 12 ? 'PM' : 'AM';
  const hh = (kst.getHours() % 12 || 12).toString().padStart(2, '0');
  const min = kst.getMinutes().toString().padStart(2, '0');
  const ss = kst.getSeconds().toString().padStart(2, '0');

  return `${yyyy}.${mm}.${dd}(${day}) /\n${ampm} ${hh}:${min}:${ss}[KST]`;
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
  const [exchangeRateTimeRange, setExchangeRateTimeRange] = useState('1w');
  const [isFMExpanded, setIsFMExpanded] = useState(false);
  const [isTAExpanded, setIsTAExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});
  const [showNaphthaHelp, setShowNaphthaHelp] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<{ show: boolean, country: string, x: number, y: number }>({ show: false, country: '', x: 0, y: 0 });
  const [expandedFMRows, setExpandedFMRows] = useState<string[]>([]);
  const [expandedNaphthaRows, setExpandedNaphthaRows] = useState<string[]>([]);
  const [showFMHelp, setShowFMHelp] = useState(false);
  const [showOilHelp, setShowOilHelp] = useState(false);
  const [showMoreFM, setShowMoreFM] = useState(false);
  const [fmBaseDate, setFmBaseDate] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        alert("iOS에서는 브라우저 하단의 '공유' 버튼을 누른 후 '홈 화면에 추가'를 선택하여 설치해 주세요.");
      } else {
        alert("PWA 설치를 위해 아이콘 파일(icon-192.png, icon-512.png)이 public 폴더에 필요하며, 브라우저가 설치 가능 상태를 감지해야 합니다. (이미 설치되어 있거나 지원하지 않는 환경일 수 있습니다.)");
      }
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const toggleHelp = () => {
    setIsHelpOpen(!isHelpOpen);
    if (!isHelpOpen) setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) setIsHelpOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.help-container') && !target.closest('.menu-container')) {
        setIsHelpOpen(false);
        setIsMenuOpen(false);
      }
    };

    if (isHelpOpen || isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHelpOpen, isMenuOpen]);

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
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchDashboardData();
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
        if (row.name.includes('4월물')) freightGrouped[row.date]['4월물'] = row.price;
        if (row.name.includes('5월물')) freightGrouped[row.date]['5월물'] = row.price;
        if (row.name.includes('6월물')) freightGrouped[row.date]['6월물'] = row.price;
        if (row.name.includes('7월물')) freightGrouped[row.date]['7월물'] = row.price;
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

      // Process Exchange Rate
      const processedExchangeRate = [...res.exchangeRateData].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setData({
        oil: processedOil,
        naturalGas: processedNG,
        ne: processedNE,
        pb: processedPB,
        freight: processedFreight,
        freightSpot: processedFreightSpot,
        exchangeRate: processedExchangeRate,
        forceMajeure: res.forceMajeureData,
        fmTotalCapacities: res.fmTotalCapacities,
        fmBaseDate: res.fmBaseDate,
        operatingRates: res.operatingRatesData,
        turnaround: res.turnaroundData,
        realtimePrice: res.realtimePrice,
        naphthaDamageDetails: res.naphthaDamageDetails,
        naphthaDamageBaseDate: res.naphthaDamageBaseDate
      });
      setFmBaseDate(res.fmBaseDate);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fmAggregated = useMemo(() => {
    if (!data?.forceMajeure) return [];
    
    const commodities = Array.from(new Set(data.forceMajeure.map((item: any) => item.commodity)));
    const result: any[] = [];
    
    commodities.forEach(comm => {
      const commData = data.forceMajeure.filter((item: any) => item.commodity === comm);
      const globalCapa = commData.reduce((sum: number, item: any) => sum + item.capacity, 0);
      const asiaCapa = commData
        .filter((item: any) => item.region === 'Asia')
        .reduce((sum: number, item: any) => sum + item.capacity, 0);
      
      const division = commData[0]?.division || '';
      const totalCapacities = (data.fmTotalCapacities as any)?.[comm as string] || {};
      
      result.push({
        commodity: comm,
        region: 'Global',
        capacity: globalCapa,
        totalCapacity: totalCapacities['Global'] || 0,
        division,
        details: commData
      });
      
      result.push({
        commodity: comm,
        region: 'Asia',
        capacity: asiaCapa,
        totalCapacity: totalCapacities['Asia'] || 0,
        division,
        details: commData.filter((item: any) => item.region === 'Asia')
      });
    });
    
    return result;
  }, [data?.forceMajeure, data?.fmTotalCapacities]);

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
      freightSpot: filterDataByTimeRange(data.freightSpot, freightSpotTimeRange),
      exchangeRate: filterDataByTimeRange(data.exchangeRate, exchangeRateTimeRange)
    };
  }, [data, oilTimeRange, naturalGasTimeRange, naphthaTimeRange, ethyleneTimeRange, propyleneTimeRange, butadieneTimeRange, freightTimeRange, freightSpotTimeRange, exchangeRateTimeRange]);

  const freightChartData = useMemo(() => {
    if (!filteredData || !filteredData.freight) return [];
    
    const months = ['4월물', '5월물', '6월물', '7월물'];
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

  const naphthaDamageSummary = useMemo<any[]>(() => {
    if (!data?.naphthaDamageDetails) return [];
    
    const countries = Array.from(new Set((data.naphthaDamageDetails as any[]).map((item: any) => item.country)));
    return countries.map(country => {
      const countryData = (data.naphthaDamageDetails as any[]).filter((item: any) => item.country === country);
      return {
        country,
        existing: countryData.reduce((sum: number, item: any) => sum + item.existing, 0),
        tank: countryData.reduce((sum: number, item: any) => sum + item.tank, 0),
        drone: countryData.reduce((sum: number, item: any) => sum + item.drone, 0),
        selfConsumption: countryData.reduce((sum: number, item: any) => sum + item.selfConsumption, 0),
      };
    });
  }, [data?.naphthaDamageDetails]);

  const naphthaDamageDetailsMap = useMemo<Record<string, any[]>>(() => {
    if (!data?.naphthaDamageDetails) return {};
    
    const map: Record<string, any[]> = {};
    (data.naphthaDamageDetails as any[]).forEach((item: any) => {
      if (!map[item.country]) map[item.country] = [];
      map[item.country].push(item);
    });
    return map;
  }, [data?.naphthaDamageDetails]);

  const naphthaDamageTotal = useMemo(() => {
    if (!naphthaDamageSummary) return { existing: 0, tank: 0, drone: 0, selfConsumption: 0, ratio: 0 };
    const existing = naphthaDamageSummary.reduce((sum, row) => sum + row.existing, 0);
    const tank = naphthaDamageSummary.reduce((sum, row) => sum + row.tank, 0);
    const drone = naphthaDamageSummary.reduce((sum, row) => sum + row.drone, 0);
    const selfConsumption = naphthaDamageSummary.reduce((sum, row) => sum + row.selfConsumption, 0);
    const ratio = existing > 0 ? ((tank + drone + selfConsumption) / existing) * 100 : 0;
    return { existing, tank, drone, selfConsumption, ratio };
  }, [naphthaDamageSummary]);

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
  const latestFreight = revFreight.find(d => d['4월물'] !== undefined || d['5월물'] !== undefined) || {};
  const prevFreight = revFreight.find(d => (d['4월물'] !== undefined || d['5월물'] !== undefined) && d.date !== latestFreight.date) || {};

  const revFreightSpot = [...(data?.freightSpot || [])].reverse();
  const latestBDI = revFreightSpot.find(d => d.BDI !== undefined) || {};
  const prevBDI = revFreightSpot.find(d => d.BDI !== undefined && d.date !== latestBDI.date) || {};
  const latestClean = revFreightSpot.find(d => d.Clean !== undefined) || {};
  const prevClean = revFreightSpot.find(d => d.Clean !== undefined && d.date !== latestClean.date) || {};
  const latestDirty = revFreightSpot.find(d => d.Dirty !== undefined) || {};
  const prevDirty = revFreightSpot.find(d => d.Dirty !== undefined && d.date !== latestDirty.date) || {};
  const latestSCFI = revFreightSpot.find(d => d.SCFI !== undefined) || {};
  const prevSCFI = revFreightSpot.find(d => d.SCFI !== undefined && d.date !== latestSCFI.date) || {};

  const revExchangeRate = [...(data?.exchangeRate || [])].reverse();
  const latestUSD = revExchangeRate.find(d => d.USD !== undefined) || {};
  const prevUSD = revExchangeRate.find(d => d.USD !== undefined && d.date !== latestUSD.date) || {};
  const latestCNY = revExchangeRate.find(d => d.CNY !== undefined) || {};
  const prevCNY = revExchangeRate.find(d => d.CNY !== undefined && d.date !== latestCNY.date) || {};
  const latestJPY = revExchangeRate.find(d => d.JPY !== undefined) || {};
  const prevJPY = revExchangeRate.find(d => d.JPY !== undefined && d.date !== latestJPY.date) || {};
  const latestEUR = revExchangeRate.find(d => d.EUR !== undefined) || {};
  const prevEUR = revExchangeRate.find(d => d.EUR !== undefined && d.date !== latestEUR.date) || {};

  const realtimePrice = data?.realtimePrice || { WTI: 0, Brent: 0, Dubai: 0, updateTime: '' };

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

  const usdChange = calculateChange(latestUSD.USD, prevUSD.USD);
  const cnyChange = calculateChange(latestCNY.CNY, prevCNY.CNY);
  const jpyChange = calculateChange(latestJPY.JPY, prevJPY.JPY);
  const eurChange = calculateChange(latestEUR.EUR, prevEUR.EUR);

  const realtimeWtiChange = calculateChange(realtimePrice.WTI, latestWTI.WTI);
  const realtimeBrentChange = calculateChange(realtimePrice.Brent, latestBrent.Brent);
  const realtimeDubaiChange = calculateChange(realtimePrice.Dubai, latestDubai.Dubai);

  const taOngoing = filteredData?.turnaround.filter((item: any) => item.category?.includes('진행 中')) || [];
  const taPlanned = filteredData?.turnaround.filter((item: any) => item.category?.includes('조기 실시')) || [];

  const scfiDataCount = filteredData.freightSpot.filter((d: any) => d.SCFI !== undefined).length;

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
            <div className="text-[11px] sm:text-sm font-medium text-gray-400 ml-7 sm:ml-0 leading-tight whitespace-pre-line">
              {formatHeaderTime(currentTime)}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={handleInstallClick}
              className={`p-2 rounded-lg border transition-colors ${deferredPrompt ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-[#1C1C24] border-[#2A2A35] text-gray-400 hover:text-white'}`}
              title="앱 설치"
            >
              <Plus size={20} />
            </button>
            <div className="relative help-container">
              <button 
                onClick={toggleHelp}
                className={`p-2 rounded-lg border transition-colors ${isHelpOpen ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-[#1C1C24] border-[#2A2A35] text-gray-400 hover:text-white'}`}
                title="도움말"
              >
                {isHelpOpen ? <X size={20} /> : <HelpCircle size={20} />}
              </button>
              
              {isHelpOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 sm:w-64 bg-[#1C1C24] border border-[#2A2A35] rounded-xl shadow-2xl p-4 z-[60] text-xs sm:text-sm text-gray-300 leading-relaxed">
                  <div className="space-y-4">
                    <div>
                      <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        가격 지표
                      </p>
                      <div className="pl-3 space-y-1">
                        <p>전일자 종가 기준</p>
                        <p className="text-[10px] sm:text-xs text-gray-400">(매일 오전 업데이트)</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1 italic leading-tight">
                          예: WTI 26.03.18<br/>
                          → 18일 최종 고시 가격
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-[#2A2A35]">
                      <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        현황 리스트
                      </p>
                      <div className="pl-3 space-y-1">
                        <p>변동 발생 시 수시 갱신</p>
                        <p className="text-[10px] sm:text-xs text-gray-400">(항목별 업데이트 일자 별도 표기)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative menu-container">
              <button 
                onClick={toggleMenu}
                className="p-2 rounded-lg bg-[#1C1C24] border border-[#2A2A35] text-gray-400 hover:text-white transition-colors"
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#1C1C24] border border-[#2A2A35] rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="py-2">
                    <button onClick={() => scrollToSection('realtime-crude-oil')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                      <Zap size={14} className="text-blue-400" /> 실시간 유가
                    </button>
                    <button onClick={() => scrollToSection('crude-oil')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                      <Droplet size={14} className="text-blue-500" /> 원유 / CRUDE OIL
                    </button>
                    <button onClick={() => scrollToSection('natural-gas')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                      <Flame size={14} className="text-emerald-500" /> 천연가스
                    </button>
                    <button onClick={() => scrollToSection('naphtha')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                      <Factory size={14} className="text-purple-500" /> 납사(MOPJ)
                    </button>
                    <button onClick={() => scrollToSection('naphtha-damage')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                      <AlertTriangle size={14} className="text-rose-500" /> 중동 납사 피해현황
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
                    <button onClick={() => scrollToSection('exchange-rate')} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A35] hover:text-white transition-colors flex items-center gap-2">
                      <Activity size={14} className="text-yellow-500" /> 환율
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        {/* Top Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Real-time Crude Oil Prices */}
          <Card id="realtime-crude-oil" className="bg-gradient-to-br from-[#1A1A24] to-[#252535] border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 animate-pulse">
                    <span className="text-[10px] text-red-500 font-black tracking-tighter uppercase">Live</span>
                  </div>
                  <p className="text-sm text-gray-300 font-bold tracking-tight">실시간 유가</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowOilHelp(!showOilHelp)}
                    className={`p-1.5 rounded-lg border transition-colors ${showOilHelp ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20'}`}
                    title="도움말"
                  >
                    <HelpCircle size={14} />
                  </button>
                  <button 
                    onClick={loadData}
                    className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    title="새로고침"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {showOilHelp && (
                <div className="mb-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <p className="text-[10px] text-blue-400 font-bold mb-0.5">1. WTI</p>
                    <p className="text-[9px] text-gray-400 leading-relaxed">CL, 뉴욕상업거래소, 서부텍사스산 원유 (26.05.)<br/>뉴욕상업거래소(NYMEX)에서 거래되는 WTI(Western Texas Intermediate) 선물의 최근월물 가격</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400 font-bold mb-0.5">2. BRENT</p>
                    <p className="text-[9px] text-gray-400 leading-relaxed">BRN, 유럽 ICE선물거래소, 브렌트유 (26.06.)<br/>ICE 선물거래소에서 거래되는 영국 브렌트유 선물의 최근월물 가격</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400 font-bold mb-0.5">3. DUBAI</p>
                    <p className="text-[9px] text-gray-400 leading-relaxed">DCB, 뉴욕상업거래소, 두바이유 (26.04.)<br/>뉴욕상업거래소(NYMEX)에서 거래되는 두바이 크루드 오일 선물의 최근월물 가격(두바이유는 현물거래임에 따라 실시간 가격 확인 제한)</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1C1C24]/50 p-3 rounded-xl border border-[#2A2A35] flex flex-col items-center text-center">
                  <div className="flex flex-col items-center mb-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">WTI</p>
                    <p className="text-[9px] text-gray-600 font-medium mt-0.5">(26.05)</p>
                  </div>
                  <span className="text-xl font-black text-white tracking-tighter">${formatNumber(realtimePrice.WTI, 2)}</span>
                  <div className={`flex flex-col items-center mt-1 ${realtimeWtiChange.color}`}>
                    <span className="text-[10px] font-bold leading-tight">{realtimeWtiChange.diffText}</span>
                    <span className="text-[9px] font-medium opacity-80 leading-tight">({realtimeWtiChange.pctText})</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[8px] text-amber-500/80 font-medium">10분지연</span>
                  </div>
                </div>
                <div className="bg-[#1C1C24]/50 p-3 rounded-xl border border-[#2A2A35] flex flex-col items-center text-center">
                  <div className="flex flex-col items-center mb-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Brent</p>
                    <p className="text-[9px] text-gray-600 font-medium mt-0.5">(26.06)</p>
                  </div>
                  <span className="text-xl font-black text-white tracking-tighter">${formatNumber(realtimePrice.Brent, 2)}</span>
                  <div className={`flex flex-col items-center mt-1 ${realtimeBrentChange.color}`}>
                    <span className="text-[10px] font-bold leading-tight">{realtimeBrentChange.diffText}</span>
                    <span className="text-[9px] font-medium opacity-80 leading-tight">({realtimeBrentChange.pctText})</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[8px] text-amber-500/80 font-medium">10분지연</span>
                  </div>
                </div>
                <div className="bg-[#1C1C24]/50 p-3 rounded-xl border border-[#2A2A35] flex flex-col items-center text-center">
                  <div className="flex flex-col items-center mb-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Dubai</p>
                    <p className="text-[9px] text-gray-600 font-medium mt-0.5">(26.04)</p>
                  </div>
                  <span className="text-xl font-black text-white tracking-tighter">${formatNumber(realtimePrice.Dubai, 2)}</span>
                  <div className={`flex flex-col items-center mt-1 ${realtimeDubaiChange.color}`}>
                    <span className="text-[10px] font-bold leading-tight">{realtimeDubaiChange.diffText}</span>
                    <span className="text-[9px] font-medium opacity-80 leading-tight">({realtimeDubaiChange.pctText})</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <p className="text-[9px] text-gray-600 font-medium">[단위: $/bbl, 네이버증권 기준]</p>
              </div>
            </CardContent>
          </Card>

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

            <div className="flex justify-end mb-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35] flex-nowrap min-w-max">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setOilTimeRange(range)}
                    className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
                <LineChart data={filteredData.oil} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={!!hiddenLines['WTI']} type="monotone" dataKey="WTI" stroke="#f97316" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['Brent']} type="monotone" dataKey="Brent" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['Dubai']} type="monotone" dataKey="Dubai" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
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

            <div className="flex justify-end mb-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35] flex-nowrap min-w-max">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setNaturalGasTimeRange(range)}
                    className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
                <LineChart data={filteredData.naturalGas} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={!!hiddenLines['US']} yAxisId="right" type="monotone" dataKey="US" name="미국(우)" stroke="#f97316" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['Asia']} yAxisId="left" type="monotone" dataKey="Asia" name="아시아" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['Europe']} yAxisId="left" type="monotone" dataKey="Europe" name="유럽" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Naphtha Column */}
        <div className="flex flex-col gap-6">
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

              <div className="flex justify-end mb-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35] flex-nowrap min-w-max">
                  {['1w', '1m', '6m', '1y'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setNaphthaTimeRange(range)}
                      className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
                  <LineChart data={filteredData.naphtha} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                    <Line hide={!!hiddenLines['Naphtha']} type="monotone" dataKey="Naphtha" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Middle East Naphtha Damage Status */}
          <Card id="naphtha-damage" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24] flex-grow relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <AlertTriangle size={16} />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">중동 납사 피해현황</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">[{data?.naphthaDamageBaseDate || '26.03.12'} 기준]</span>
                  <div 
                    className="relative flex items-center justify-center text-gray-400 hover:text-white cursor-help"
                    onMouseEnter={() => setShowNaphthaHelp(true)}
                    onMouseLeave={() => setShowNaphthaHelp(false)}
                    onTouchStart={() => setShowNaphthaHelp(true)}
                    onTouchEnd={() => setShowNaphthaHelp(false)}
                  >
                    <HelpCircle size={14} />
                    {showNaphthaHelp && (
                      <div className="absolute right-0 top-6 w-64 p-3 bg-[#2A2A35] border border-gray-600 rounded-lg shadow-xl z-50 text-xs text-gray-200 whitespace-pre-line">
                        ①Tank 제약: Tank 제약 경우 호르무즈 Open 정상화 가능{"\n"}
                        ② Drone Attack 영향
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left text-gray-300">
                  <thead className="text-[10px] text-gray-400 bg-[#1C1C24] border-b border-[#2A2A35]">
                    <tr>
                      <th className="px-2 py-2 font-medium align-bottom whitespace-nowrap">Country</th>
                      <th className="px-2 py-2 font-medium text-right align-bottom leading-tight whitespace-nowrap">기존<br/>판매량</th>
                      <th className="px-2 py-2 font-medium text-right align-bottom leading-tight whitespace-nowrap">Tank<br/>제약</th>
                      <th className="px-2 py-2 font-medium text-right align-bottom leading-tight whitespace-nowrap">Drone<br/>피해</th>
                      <th className="px-2 py-2 font-medium text-right align-bottom leading-tight whitespace-nowrap min-w-[60px]">자체소비<br/>물량감소</th>
                      <th className="px-2 py-2 font-medium text-right align-bottom leading-tight whitespace-nowrap">피해<br/>비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {naphthaDamageSummary.map((row, idx) => {
                      const ratio = ((row.tank + row.drone + row.selfConsumption) / row.existing) * 100;
                      const isExpanded = expandedNaphthaRows.includes(row.country);
                      const details = naphthaDamageDetailsMap[row.country] || [];

                      return (
                        <React.Fragment key={idx}>
                          <tr 
                            className="border-b border-[#2A2A35] hover:bg-[#2A2A35]/50 transition-colors cursor-pointer"
                            onClick={() => {
                              setExpandedNaphthaRows(prev => 
                                prev.includes(row.country) ? prev.filter(c => c !== row.country) : [...prev, row.country]
                              );
                            }}
                          >
                            <td className="px-2 py-2 font-medium text-white flex items-center gap-1">
                              {row.country}
                              {details.length > 0 && (
                                isExpanded ? <ChevronUp size={10} className="text-gray-500" /> : <ChevronDown size={10} className="text-gray-500" />
                              )}
                            </td>
                            <td className="px-2 py-2 text-right">{row.existing.toLocaleString()}</td>
                            <td className="px-2 py-2 text-right text-amber-500">{row.tank > 0 ? row.tank.toLocaleString() : '-'}</td>
                            <td className="px-2 py-2 text-right text-rose-500">{row.drone > 0 ? row.drone.toLocaleString() : '-'}</td>
                            <td className="px-2 py-2 text-right text-cyan-500">{row.selfConsumption > 0 ? row.selfConsumption.toLocaleString() : '-'}</td>
                            <td className="px-2 py-2 text-right font-bold text-white">
                              {ratio > 0 ? `${ratio.toFixed(1)}%` : '-'}
                            </td>
                          </tr>
                          {isExpanded && details.length > 0 && (
                            <tr>
                              <td colSpan={6} className="px-0 py-0">
                                <div 
                                  className="bg-[#1C1C24] p-3 border-b border-[#2A2A35] cursor-pointer"
                                  onClick={() => {
                                    setExpandedNaphthaRows(prev => prev.filter(c => c !== row.country));
                                  }}
                                >
                                  <div className="grid grid-cols-1 gap-2">
                                    {details.map((detail, dIdx) => (
                                      <div key={dIdx} className="bg-[#2A2A35]/30 p-2 rounded-lg border border-[#2A2A35] text-[10px]">
                                        <div className="flex justify-between mb-1">
                                          <span className="text-gray-500">Origin:</span>
                                          <span className="text-gray-300 font-medium">{detail.origin || '-'}</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                          <span className="text-gray-500">Port:</span>
                                          <span className="text-gray-300 font-medium">{detail.port || '-'}</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                          <span className="text-gray-500">기존판매량:</span>
                                          <span className="text-gray-300 font-medium">{detail.existing?.toLocaleString() || '-'}</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                          <span className="text-gray-500">Tank 제약:</span>
                                          <span className="text-amber-500 font-medium">{detail.tank && detail.tank > 0 ? detail.tank.toLocaleString() : '-'}</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                          <span className="text-gray-500">Drone 피해:</span>
                                          <span className="text-rose-500 font-medium">{detail.drone && detail.drone > 0 ? detail.drone.toLocaleString() : '-'}</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                          <span className="text-gray-500">자체 소비 물량 감소:</span>
                                          <span className="text-cyan-500 font-medium">{detail.selfConsumption && detail.selfConsumption > 0 ? detail.selfConsumption.toLocaleString() : '-'}</span>
                                        </div>
                                        {detail.note && (
                                          <div className="mt-1 pt-1 border-t border-[#2A2A35] text-rose-400 italic">
                                            {detail.note}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <tr className="bg-[#1C1C24] font-bold border-t-2 border-[#2A2A35]">
                      <td className="px-2 py-2 text-white">Total</td>
                      <td className="px-2 py-2 text-right text-white">{naphthaDamageTotal.existing.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-amber-500">{naphthaDamageTotal.tank.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-rose-500">{naphthaDamageTotal.drone.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-cyan-500">{naphthaDamageTotal.selfConsumption.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right text-white">{naphthaDamageTotal.ratio.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-right text-[10px] text-gray-500">
                * 단위: 천톤/월
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ethylene Spot */}
        <Card id="ethylene" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Activity size={16} />
              </div>
              <p className="text-sm text-gray-400 font-medium">에틸렌(CFR NEA) <span className="text-gray-500 text-xs ml-1">[단위: $/톤]</span></p>
            </div>
            
            <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] mb-4 flex justify-between items-start gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">에틸렌</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestEthylene.date)}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base sm:text-lg lg:text-xl font-bold text-white">${formatNumber(latestEthylene.Ethylene, 2)}</span>
                  <span className={`text-xs sm:text-sm font-medium ${ethyleneChange.color}`}>({ethyleneChange.diffText})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] sm:text-xs text-gray-400">전일: ${formatNumber(prevEthylene.Ethylene, 2)}</span>
                  <span className={`text-[9px] sm:text-[10px] font-medium ${ethyleneChange.color}`}>({ethyleneChange.pctText})</span>
                </div>
              </div>
              <div className="text-right min-w-[70px] sm:min-w-[100px]">
                <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium mb-1 leading-tight">
                  에틸렌<br/>Spread
                </p>
                <p className={`text-sm sm:text-lg lg:text-xl font-bold ${latestSpread.Spread !== undefined && latestSpread.Spread < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${formatNumber(latestSpread.Spread, 2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end mb-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35] flex-nowrap min-w-max">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setEthyleneTimeRange(range)}
                    className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
                <LineChart data={filteredData.ethylene} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ffffff" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={!!hiddenLines['Ethylene']} yAxisId="left" type="monotone" dataKey="Ethylene" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['Spread']} yAxisId="right" type="monotone" dataKey="Spread" name="Spread(우)" stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={true} isAnimationActive={true} />
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
            
            <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] mb-4 flex justify-between items-start gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">프로필렌</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestPropylene.date)}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base sm:text-lg lg:text-xl font-bold text-white">${formatNumber(latestPropylene.Propylene, 2)}</span>
                  <span className={`text-xs sm:text-sm font-medium ${propyleneChange.color}`}>({propyleneChange.diffText})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] sm:text-xs text-gray-400">전일: ${formatNumber(prevPropylene.Propylene, 2)}</span>
                  <span className={`text-[9px] sm:text-[10px] font-medium ${propyleneChange.color}`}>({propyleneChange.pctText})</span>
                </div>
              </div>
              <div className="text-right min-w-[70px] sm:min-w-[100px]">
                <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium mb-1 leading-tight">
                  프로필렌<br/>Spread
                </p>
                <p className={`text-sm sm:text-lg lg:text-xl font-bold ${latestPropyleneSpread.PropyleneSpread !== undefined && latestPropyleneSpread.PropyleneSpread < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${formatNumber(latestPropyleneSpread.PropyleneSpread, 2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end mb-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35] flex-nowrap min-w-max">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setPropyleneTimeRange(range)}
                    className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
                <LineChart data={filteredData.propylene} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ffffff" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={!!hiddenLines['Propylene']} yAxisId="left" type="monotone" dataKey="Propylene" stroke="#06b6d4" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['PropyleneSpread']} yAxisId="right" type="monotone" dataKey="PropyleneSpread" name="Spread(우)" stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={true} isAnimationActive={true} />
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
            
            <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] mb-4 flex justify-between items-start gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex justify-between w-full items-center mb-1">
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider">부타디엔</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestButadiene.date)}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base sm:text-lg lg:text-xl font-bold text-white">${formatNumber(latestButadiene.Butadiene, 2)}</span>
                  <span className={`text-xs sm:text-sm font-medium ${butadieneChange.color}`}>({butadieneChange.diffText})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] sm:text-xs text-gray-400">전일: ${formatNumber(prevButadiene.Butadiene, 2)}</span>
                  <span className={`text-[9px] sm:text-[10px] font-medium ${butadieneChange.color}`}>({butadieneChange.pctText})</span>
                </div>
              </div>
              <div className="text-right min-w-[70px] sm:min-w-[100px]">
                <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium mb-1 leading-tight">
                  부타디엔<br/>Spread
                </p>
                <p className={`text-sm sm:text-lg lg:text-xl font-bold ${latestButadieneSpread.ButadieneSpread !== undefined && latestButadieneSpread.ButadieneSpread < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${formatNumber(latestButadieneSpread.ButadieneSpread, 2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end mb-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35] flex-nowrap min-w-max">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setButadieneTimeRange(range)}
                    className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
                <LineChart data={filteredData.butadiene} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ffffff" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                  <Line hide={!!hiddenLines['Butadiene']} yAxisId="left" type="monotone" dataKey="Butadiene" stroke="#ec4899" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['ButadieneSpread']} yAxisId="right" type="monotone" dataKey="ButadieneSpread" name="Spread(우)" stroke="#ffffff" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={true} isAnimationActive={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Main Charts Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
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
                        <span className="text-xs text-gray-400">{item.label === 'SCFI' ? '전주' : '전일'}: {item.unit}{formatNumber(item.prev, item.decimals)}</span>
                        <span className={`text-[10px] font-medium ${change.color}`}>({change.pctText})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mb-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35] flex-nowrap min-w-max">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setFreightSpotTimeRange(range)}
                    className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
                  <LineChart data={filteredData.freightSpot} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                    <Line hide={!!hiddenLines['Clean']} yAxisId="left" type="monotone" dataKey="Clean" name="Clean" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                    <Line hide={!!hiddenLines['Dirty']} yAxisId="left" type="monotone" dataKey="Dirty" name="Dirty" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                    <Line hide={!!hiddenLines['BDI']} yAxisId="right" type="monotone" dataKey="BDI" name="BDI(우)" stroke="#f97316" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData.freightSpot} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '12px', paddingTop: '10px', cursor: 'pointer' }} />
                    <Line hide={!!hiddenLines['SCFI']} type="monotone" dataKey="SCFI" name="SCFI" stroke="#a855f7" strokeWidth={2} dot={scfiDataCount === 1 ? { r: 4, fill: '#a855f7' } : false} connectNulls={true} isAnimationActive={true} />
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
              TD3 FFA: MEG → JP
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: '4월물', latest: latestFreight['4월물'], prev: prevFreight['4월물'], date: latestFreight.date },
                { label: '5월물', latest: latestFreight['5월물'], prev: prevFreight['5월물'], date: latestFreight.date },
                { label: '6월물', latest: latestFreight['6월물'], prev: prevFreight['6월물'], date: latestFreight.date },
                { label: '7월물', latest: latestFreight['7월물'], prev: prevFreight['7월물'], date: latestFreight.date },
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
            <div className="flex justify-end mb-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35] flex-nowrap min-w-max">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setFreightTimeRange(range)}
                    className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      freightTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '1m' ? '1개월' : range === '6m' ? '6개월' : '1년'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={freightChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                        hide={!!hiddenLines[date]}
                        key={date} 
                        type="monotone" 
                        dataKey={date} 
                        stroke={color} 
                        strokeWidth={isLatest || isPrev ? 2 : 1} 
                        dot={isLatest || isPrev} 
                        activeDot={{ r: 4 }}
                        name={date}
                        connectNulls={true}
                        isAnimationActive={true}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Force Majeure */}
        <Card id="force-majeure" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24] lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={20} />
                <div className="flex flex-col">
                  <span className="leading-tight">Force Majeure 현황</span>
                  {fmBaseDate && (
                    <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                      {fmBaseDate.includes('기준') ? fmBaseDate : `[${fmBaseDate} 기준]`}
                    </span>
                  )}
                </div>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                <button 
                  onMouseEnter={() => setShowFMHelp(true)}
                  onMouseLeave={() => setShowFMHelp(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <HelpCircle size={18} />
                </button>
                {showFMHelp && (
                  <div className="absolute right-0 top-6 w-48 p-3 bg-[#1C1C24] border border-[#2A2A35] rounded-xl shadow-2xl z-50 text-[11px]">
                    <p className="text-gray-400 mb-2 font-bold">사업부별 표기</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-gray-300">NCC/PO</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-gray-300">PVC/가소제</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-gray-300">ABS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-gray-300">아크릴/SAP</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-gray-300">HPM</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-end mb-1">
              <span className="text-[9px] text-gray-500">[단위: 만톤]</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] sm:text-[11px] text-left text-gray-300">
                <thead className="text-[9px] sm:text-[10px] text-gray-400 bg-[#1C1C24] border-b border-[#2A2A35]">
                  <tr>
                    <th className="px-2 py-2 font-medium">Commodity</th>
                    <th className="px-2 py-2 font-medium">Region</th>
                    <th className="px-2 py-2 font-medium text-right">F/M Capa</th>
                    <th className="px-2 py-2 font-medium text-right">총 Capa</th>
                    <th className="px-2 py-2 font-medium text-right">비중</th>
                  </tr>
                </thead>
                <tbody>
                  {(showMoreFM ? fmAggregated : fmAggregated.slice(0, 5)).map((row: any, idx: number) => {
                    const isExpanded = expandedFMRows.includes(`${row.commodity}-${row.region}`);
                    const dotColor = 
                      row.division === 'NCC/PO' ? 'bg-emerald-500' :
                      row.division === 'PVC/가소제' ? 'bg-blue-500' :
                      row.division === 'ABS' ? 'bg-yellow-500' :
                      row.division === '아크릴/SAP' ? 'bg-rose-500' :
                      row.division === 'HPM' ? 'bg-purple-500' : 'bg-gray-500';

                    return (
                      <React.Fragment key={idx}>
                        <tr 
                          className="border-b border-[#2A2A35]/50 hover:bg-[#2A2A35]/50 transition-colors cursor-pointer"
                          onClick={() => {
                            const key = `${row.commodity}-${row.region}`;
                            setExpandedFMRows(prev => 
                              prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                            );
                          }}
                        >
                          <td className="px-2 py-2.5 font-medium text-white">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              {row.commodity}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-gray-400">{row.region}</td>
                          <td className="px-2 py-2.5 text-right font-bold text-white">
                            {row.capacity > 0 ? formatNumber(row.capacity, 0) : '-'}
                          </td>
                          <td className="px-2 py-2.5 text-right font-bold text-gray-400">
                            {row.totalCapacity > 0 ? formatNumber(row.totalCapacity, 0) : '-'}
                          </td>
                          <td className="px-2 py-2.5 text-right font-bold text-rose-500">
                            {row.totalCapacity > 0 ? `${formatNumber((row.capacity / row.totalCapacity) * 100, 1)}%` : '-'}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="px-0 py-0">
                              <div 
                                className="bg-[#1C1C24] p-3 border-b border-[#2A2A35] cursor-pointer"
                                onClick={() => {
                                  const key = `${row.commodity}-${row.region}`;
                                  setExpandedFMRows(prev => prev.filter(k => k !== key));
                                }}
                              >
                                {/* Desktop Table */}
                                <div className="hidden sm:block overflow-x-auto">
                                  <table className="w-full text-[10px] text-left text-gray-400">
                                    <thead>
                                      <tr className="border-b border-[#2A2A35]">
                                        <th className="pb-2">Country</th>
                                        <th className="pb-2">Company</th>
                                        <th className="pb-2 text-right">Capa</th>
                                        <th className="pb-2 text-center">Start</th>
                                        <th className="pb-2 text-center">End</th>
                                        <th className="pb-2">비고</th>
                                        <th className="pb-2">출처</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.details.map((detail: any, dIdx: number) => (
                                        <tr key={dIdx} className="border-b border-[#2A2A35]/30 last:border-0">
                                          <td className="py-2 text-gray-300">{detail.country}</td>
                                          <td className="py-2 text-gray-300">{detail.company}</td>
                                          <td className="py-2 text-right text-rose-500 font-bold">{formatNumber(detail.capacity, 0)}</td>
                                          <td className="py-2 text-center">{detail.start}</td>
                                          <td className="py-2 text-center">{detail.end}</td>
                                          <td className="py-2 text-[9px]">{detail.note}</td>
                                          <td className="py-2 text-[9px]">{detail.source}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {/* Mobile Card Layout */}
                                <div className="sm:hidden space-y-2">
                                  {row.details.map((detail: any, dIdx: number) => (
                                    <div key={dIdx} className="bg-[#2A2A35]/30 p-3 rounded-lg border border-[#2A2A35] text-[10px]">
                                      <div className="flex justify-between mb-1">
                                        <span className="text-gray-500">Company:</span>
                                        <span className="text-white font-medium">{detail.company} ({detail.country})</span>
                                      </div>
                                      <div className="flex justify-between mb-1">
                                        <span className="text-gray-500">Capacity:</span>
                                        <span className="text-rose-500 font-bold">{formatNumber(detail.capacity, 0)} 만톤</span>
                                      </div>
                                      <div className="flex justify-between mb-1">
                                        <span className="text-gray-500">Period:</span>
                                        <span className="text-gray-300">{detail.start} ~ {detail.end}</span>
                                      </div>
                                      {detail.note && detail.note !== '-' && (
                                        <div className="mt-2 pt-2 border-t border-[#2A2A35] text-gray-400">
                                          <span className="text-gray-500 mr-1">Note:</span> {detail.note}
                                        </div>
                                      )}
                                      {detail.source && detail.source !== '-' && (
                                        <div className="mt-1 text-[9px] text-gray-500 italic">
                                          Source: {detail.source}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {fmAggregated.length > 5 && (
              <button 
                onClick={() => {
                  if (showMoreFM) {
                    scrollToSection('force-majeure');
                  }
                  setShowMoreFM(!showMoreFM);
                }}
                className="w-full mt-4 py-2 text-[11px] text-gray-400 hover:text-white hover:bg-[#2A2A35] transition-colors rounded-lg border border-[#2A2A35] flex items-center justify-center gap-1"
              >
                {showMoreFM ? (
                  <>접기 <ChevronUp size={14} /></>
                ) : (
                  <>더보기 <ChevronDown size={14} /></>
                )}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Exchange Rate Dashboard */}
        <Card id="exchange-rate" className="bg-gradient-to-br from-[#15151C] to-[#1A1A24] mt-6 lg:col-span-3">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Activity size={16} />
              </div>
              <p className="text-sm text-gray-400 font-medium">환율 <span className="text-gray-500 text-xs ml-1">[기준: KRW]</span></p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* USD */}
              <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-2">
                  <p className="text-xs text-gray-500 font-medium tracking-wider">미국 (USD)</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestUSD.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">₩{formatNumber(latestUSD.USD, 2)}</span>
                    <span className={`text-sm font-medium ${usdChange.color}`}>({usdChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ₩{formatNumber(prevUSD.USD, 2)}</span>
                    <span className={`text-[10px] font-medium ${usdChange.color}`}>({usdChange.pctText})</span>
                  </div>
                </div>
              </div>

              {/* JPY */}
              <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-2">
                  <p className="text-xs text-gray-500 font-medium tracking-wider">일본 (JPY/100)</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestJPY.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">₩{formatNumber(latestJPY.JPY, 2)}</span>
                    <span className={`text-sm font-medium ${jpyChange.color}`}>({jpyChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ₩{formatNumber(prevJPY.JPY, 2)}</span>
                    <span className={`text-[10px] font-medium ${jpyChange.color}`}>({jpyChange.pctText})</span>
                  </div>
                </div>
              </div>

              {/* EUR */}
              <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-2">
                  <p className="text-xs text-gray-500 font-medium tracking-wider">유럽연합 (EUR)</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestEUR.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">₩{formatNumber(latestEUR.EUR, 2)}</span>
                    <span className={`text-sm font-medium ${eurChange.color}`}>({eurChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ₩{formatNumber(prevEUR.EUR, 2)}</span>
                    <span className={`text-[10px] font-medium ${eurChange.color}`}>({eurChange.pctText})</span>
                  </div>
                </div>
              </div>

              {/* CNY */}
              <div className="bg-[#1C1C24] p-4 rounded-xl border border-[#2A2A35] flex flex-col justify-between items-start">
                <div className="flex justify-between w-full items-center mb-2">
                  <p className="text-xs text-gray-500 font-medium tracking-wider">중국 (CNY)</p>
                  <p className="text-[10px] text-gray-500 font-medium">{formatDateShort(latestCNY.date)}</p>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">₩{formatNumber(latestCNY.CNY, 2)}</span>
                    <span className={`text-sm font-medium ${cnyChange.color}`}>({cnyChange.diffText})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400">전일: ₩{formatNumber(prevCNY.CNY, 2)}</span>
                    <span className={`text-[10px] font-medium ${cnyChange.color}`}>({cnyChange.pctText})</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mb-4 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-[#1C1C24] p-1 rounded-lg border border-[#2A2A35] flex-nowrap min-w-max">
                {['1w', '1m', '6m', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setExchangeRateTimeRange(range)}
                    className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      exchangeRateTimeRange === range ? 'bg-[#2A2A35] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === '1w' ? '1주' : range === '1m' ? '1개월' : range === '6m' ? '6개월' : '1년'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData.exchangeRate} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend onClick={handleLegendClick} formatter={renderLegendText} wrapperStyle={{ fontSize: '11px', paddingTop: '20px', cursor: 'pointer' }} />
                  <Line hide={!!hiddenLines['USD']} yAxisId="left" type="monotone" dataKey="USD" name="미국(USD)" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['JPY']} yAxisId="left" type="monotone" dataKey="JPY" name="일본(JPY/100)" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['EUR']} yAxisId="left" type="monotone" dataKey="EUR" name="유럽연합(EUR)" stroke="#f97316" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                  <Line hide={!!hiddenLines['CNY']} yAxisId="right" type="monotone" dataKey="CNY" name="중국(CNY)(우)" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls={true} isAnimationActive={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
      {/* Country Details Tooltip */}
      {hoveredCountry.show && naphthaDamageDetailsMap[hoveredCountry.country] && (
        <div 
          className="fixed z-50 bg-[#1C1C24] border border-[#2A2A35] rounded-lg shadow-2xl p-3 pointer-events-none"
          style={{ 
            left: Math.min(hoveredCountry.x + 15, window.innerWidth - 300), 
            top: hoveredCountry.y + 15,
            minWidth: '250px',
            maxWidth: '400px'
          }}
        >
          <p className="text-white font-bold text-xs mb-2">{hoveredCountry.country} 상세 현황</p>
          <table className="w-full text-[10px] text-left text-gray-300">
            <thead className="bg-[#2A2A35] text-gray-400">
              <tr>
                <th className="px-2 py-1">Origin</th>
                <th className="px-2 py-1">Port</th>
                <th className="px-2 py-1">비고</th>
              </tr>
            </thead>
            <tbody>
              {naphthaDamageDetailsMap[hoveredCountry.country].map((detail, i) => (
                <tr key={i} className="border-b border-[#2A2A35] last:border-0">
                  <td className="px-2 py-1">{detail.origin || '-'}</td>
                  <td className="px-2 py-1">{detail.port || '-'}</td>
                  <td className="px-2 py-1 text-amber-400/90">{detail.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
