const fs = require('fs');
const https = require('https');

const CSV_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';
const OUTPUT_PATH = './src/pokemon-names.json';

https.get(CSV_URL, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const lines = data.split('\n');
        const map = {};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length < 3) continue;

            const speciesId = parts[0];
            const langId = parts[1];
            const name = parts[2];

            if (langId === '3') { // 3 is Korean
                map[name] = parseInt(speciesId);
            }
        }

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(map, null, 2), 'utf8');
        console.log(`Successfully generated ${OUTPUT_PATH} with ${Object.keys(map).length} entries.`);
    });
}).on('error', (err) => {
    console.error('Error fetching CSV:', err.message);
});
