import Papa from 'papaparse';

async function run() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/1Hl2lusHsyfZeaA5SmDOG57HE-24TmgQd9buq46dd-6A/export?format=csv&gid=858636807');
  const text = await res.text();
  const data = Papa.parse(text, { skipEmptyLines: true }).data;
  
  data.forEach((row, i) => {
    if (row[2] === '천연가스(유럽)' || row[6] === '천연가스(유럽)' || row[10] === '천연가스(유럽)') {
      console.log(`Row ${i}:`, row);
    }
  });
}

run();
