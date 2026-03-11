import Papa from 'papaparse';

const BASE_URL = 'https://docs.google.com/spreadsheets/d/1Hl2lusHsyfZeaA5SmDOG57HE-24TmgQd9buq46dd-6A/export?format=csv&gid=';

const GIDS = {
  OIL: '1178400251',
  NAPHTHA_ETHYLENE: '224484968',
  FREIGHT: '0',
  FORCE_MAJEURE: '454908556',
  OPERATING_RATES: '1209759407',
  TURNAROUND: '720422684'
};

async function fetchCsv(gid: string) {
  const res = await fetch(`${BASE_URL}${gid}`);
  const text = await res.text();
  return Papa.parse(text, { skipEmptyLines: true }).data as string[][];
}

export async function fetchDashboardData() {
  const [
    oilDataRaw,
    naphthaEthyleneRaw,
    freightRaw,
    forceMajeureRaw,
    operatingRatesRaw,
    turnaroundRaw
  ] = await Promise.all([
    fetchCsv(GIDS.OIL),
    fetchCsv(GIDS.NAPHTHA_ETHYLENE),
    fetchCsv(GIDS.FREIGHT),
    fetchCsv(GIDS.FORCE_MAJEURE),
    fetchCsv(GIDS.OPERATING_RATES),
    fetchCsv(GIDS.TURNAROUND)
  ]);

  // Parse Oil Futures (Dubai, WTI, Brent)
  // Format: [empty, 일자, 이름, 가격, 코드]
  const oilData = oilDataRaw.slice(2).map(row => ({
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

  // Parse Freight Futures
  const freightData = freightRaw.slice(2).map(row => ({
    date: row[1],
    name: row[2],
    price: parseFloat(row[3])
  })).filter(row => row.date && !isNaN(row.price));

  // Parse Force Majeure
  // Format: [empty, 구분, Start, End, Country, Company, Commodity, Capa(만톤), 비고, 출처]
  const forceMajeureData = forceMajeureRaw.slice(2).map(row => ({
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

  return {
    oilData,
    neData,
    freightData,
    forceMajeureData,
    operatingRatesData,
    turnaroundData
  };
}
