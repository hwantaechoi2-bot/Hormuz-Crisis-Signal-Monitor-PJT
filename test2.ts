import { fetchDashboardData } from './src/data/fetchData.js';

async function run() {
  try {
    const data = await fetchDashboardData();
    const names = new Set(data.oilData.map(d => d.name));
    console.log("Oil Names:", Array.from(names));
  } catch (e) {
    console.error(e);
  }
}
run();
