async function run() {
  const gids = ['1178400251', '224484968', '0', '454908556', '1209759407', '720422684'];
  for (const gid of gids) {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/1Hl2lusHsyfZeaA5SmDOG57HE-24TmgQd9buq46dd-6A/export?format=csv&gid=${gid}`);
    const text = await res.text();
    console.log(`\n--- GID ${gid} ---`);
    console.log(text.split('\n').slice(0, 5).join('\n'));
  }
}
run();
