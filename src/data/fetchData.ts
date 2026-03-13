import Papa from 'papaparse';

const BASE_URL = 'https://docs.google.com/spreadsheets/d/1Hl2lusHsyfZeaA5SmDOG57HE-24TmgQd9buq46dd-6A/export?format=csv&gid=';

const GIDS = {
  OIL: '1178400251',
  NATURAL_GAS: '858636807',
  NAPHTHA_ETHYLENE: '224484968',
  PROPYLENE: '1772810748',
  BUTADIENE: '638440156',
  FREIGHT: '0',
  FREIGHT_SPOT: '340864639',
  FREIGHT_CONTAINER: '896888630',
  FORCE_MAJEURE: '454908556',
  OPERATING_RATES: '1209759407',
  TURNAROUND: '720422684',
  EXCHANGE_RATE: '1275419118'
};

async function fetchCsv(gid: string) {
  const res = await fetch(`${BASE_URL}${gid}`);
  const text = await res.text();
  return Papa.parse(text, { skipEmptyLines: true }).data as string[][];
}

export async function fetchDashboardData() {
  const [
    oilDataRaw,
    naturalGasRaw,
    naphthaEthyleneRaw,
    propyleneRaw,
    butadieneRaw,
    freightRaw,
    freightSpotRaw,
    freightContainerRaw,
    forceMajeureRaw,
    operatingRatesRaw,
    turnaroundRaw,
    exchangeRateRaw
  ] = await Promise.all([
    fetchCsv(GIDS.OIL),
    fetchCsv(GIDS.NATURAL_GAS),
    fetchCsv(GIDS.NAPHTHA_ETHYLENE),
    fetchCsv(GIDS.PROPYLENE),
    fetchCsv(GIDS.BUTADIENE),
    fetchCsv(GIDS.FREIGHT),
    fetchCsv(GIDS.FREIGHT_SPOT),
    fetchCsv(GIDS.FREIGHT_CONTAINER),
    fetchCsv(GIDS.FORCE_MAJEURE),
    fetchCsv(GIDS.OPERATING_RATES),
    fetchCsv(GIDS.TURNAROUND),
    fetchCsv(GIDS.EXCHANGE_RATE)
  ]);

  // Parse Oil Futures (Dubai, WTI, Brent)
  // Format: [empty, 일자, 이름, 가격, 코드]
  const oilData = oilDataRaw.slice(2).map(row => ({
    date: row[1],
    name: row[2],
    price: parseFloat(row[3])
  })).filter(row => row.date && !isNaN(row.price));

  // Parse Natural Gas (미국, 유럽, 아시아)
  const naturalGasData = naturalGasRaw.slice(2).map(row => ({
    date: row[1],
    name: row[2],
    price: parseFloat(row[3])
  })).filter(row => row.date && !isNaN(row.price));

  // Parse Naphtha & Ethylene
  const neData = naphthaEthyleneRaw.slice(1).map(row => ({
    date: row[1],
    name: row[2],
    price: parseFloat(row[3])
  })).filter(row => row.date && !isNaN(row.price));

  // Parse Propylene & Butadiene
  const pbData = [
    ...propyleneRaw.slice(1).map(row => ({
      date: row[1],
      name: row[2],
      price: parseFloat(row[3])
    })).filter(row => row.date && !isNaN(row.price)),
    ...butadieneRaw.slice(1).map(row => ({
      date: row[1],
      name: row[2],
      price: parseFloat(row[3])
    })).filter(row => row.date && !isNaN(row.price))
  ];

  // Parse Freight Futures
  const freightData = freightRaw.slice(2).map(row => ({
    date: row[1],
    name: row[2],
    price: parseFloat(row[3])
  })).filter(row => row.date && !isNaN(row.price));

  // Parse Freight Spot
  const freightSpotData = freightSpotRaw.slice(2).map(row => ({
    date: row[1],
    name: row[2],
    price: parseFloat(row[3])
  })).filter(row => row.date && !isNaN(row.price));

  // Parse Freight Container
  const freightContainerData = freightContainerRaw.slice(2).map(row => ({
    date: row[1],
    name: row[2],
    price: parseFloat(row[3])
  })).filter(row => row.date && !isNaN(row.price));

  // Parse Force Majeure
  // Format: ['', '', '사업부', 'Commodity', 'Region', 'Country', 'Company', 'Capa(만톤)', 'Start', 'End', '비  고', '출처']
  const forceMajeureData = forceMajeureRaw.slice(2).map(row => ({
    division: row[2],
    commodity: row[3],
    region: row[4],
    country: row[5],
    company: row[6],
    capacity: parseFloat(row[7]?.replace(/,/g, '')) || 0,
    start: row[8],
    end: row[9],
    note: row[10],
    source: row[11]
  })).filter(row => row.company);

  // Extract base date from N188 (Row 187, Col 13)
  const fmBaseDate = forceMajeureRaw[187]?.[13] || '';

  // Parse Operating Rates
  // Format: [empty, 구분, Start, End, Country, Company, Commodity, Capa(만톤), 비고, 출처]
  const operatingRatesData = operatingRatesRaw.slice(3).map(row => ({
    category: row[1],
    start: row[2],
    end: row[3],
    country: row[4],
    company: row[5],
    commodity: row[6],
    capacity: row[7],
    note: row[8],
    source: row[9]
  })).filter(row => row.company);

  // Parse Turnaround
  // Format: [구분, Start, End, Country, Company, Commodity, Capa(만톤), 출처]
  const turnaroundData = turnaroundRaw.slice(3).map(row => ({
    category: row[0],
    start: row[1],
    end: row[2],
    country: row[3],
    company: row[4],
    commodity: row[5],
    capacity: row[6],
    source: row[7]
  })).filter(row => row.company);

  // Parse Exchange Rate
  // Format: [empty, 일자, 미국(USD), 중국(RMB), 일본(JPY/100), 유럽연합(EUR)]
  const exchangeRateData = exchangeRateRaw.slice(1).map(row => ({
    date: row[1],
    USD: parseFloat(row[2]),
    CNY: parseFloat(row[3]),
    JPY: parseFloat(row[4]),
    EUR: parseFloat(row[5])
  })).filter(row => row.date && !isNaN(row.USD));

  return {
    oilData,
    naturalGasData,
    neData,
    pbData,
    freightData,
    freightSpotData,
    freightContainerData,
    forceMajeureData,
    fmBaseDate,
    operatingRatesData,
    turnaroundData,
    exchangeRateData
  };
}
