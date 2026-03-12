import Papa from 'papaparse';

async function fetchCsv(gid: string) {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/1Hl2lusHsyfZeaA5SmDOG57HE-24TmgQd9buq46dd-6A/export?format=csv&gid=${gid}`);
  const text = await res.text();
  return Papa.parse(text, { skipEmptyLines: true }).data as string[][];
}

async function run() {
  const data2 = await fetchCsv('896888630');
  console.log('896888630', data2.slice(0, 5));
}
run();
