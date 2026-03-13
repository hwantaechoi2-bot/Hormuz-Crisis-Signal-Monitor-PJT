import Papa from 'papaparse';

async function test() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/1Hl2lusHsyfZeaA5SmDOG57HE-24TmgQd9buq46dd-6A/export?format=csv&gid=1772810748');
  const text = await res.text();
  const data = Papa.parse(text, { skipEmptyLines: true }).data;
  console.log(data.slice(0, 5));
  const bd = data.filter((row: any) => row[2] && row[2].includes('부타디엔'));
  console.log('---');
  console.log(bd.slice(0, 5));
}
test();
