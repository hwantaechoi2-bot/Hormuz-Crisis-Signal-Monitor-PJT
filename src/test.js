const https = require('https');
https.get('https://docs.google.com/spreadsheets/d/1Hl2lusHsyfZeaA5SmDOG57HE-24TmgQd9buq46dd-6A/export?format=csv&gid=1772810748', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data.split('\n').slice(0, 5).join('\n'));
    console.log('---');
    console.log(data.split('\n').filter(line => line.includes('부타디엔')).slice(0, 5).join('\n'));
  });
});
