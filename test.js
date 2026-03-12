const fs = require('fs');

async function run() {
  const res = await fetch('https://docs.google.com/spreadsheets/d/1Hl2lusHsyfZeaA5SmDOG57HE-24TmgQd9buq46dd-6A/export?format=csv&gid=1178400251');
  const text = await res.text();
  
  const lines = text.split('\n');
  const header = lines[1];
  console.log("Header:", header);
  console.log("Line 2:", lines[2]);
}

run();
