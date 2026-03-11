import Papa from 'papaparse';

async function test() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/1Hl2lusHsyfZeaA5SmDOG57HE-24TmgQd9buq46dd-6A/export?format=csv&gid=224484968');
  const text = await res.text();
  const data = Papa.parse(text, { skipEmptyLines: true }).data;
  const eth = data.filter((row: any) => row[2] && row[2].includes('에틸렌'));
  console.log(eth.slice(0, 10));
}
test();
