const fs = require('fs');
const path = require('path');
const { splitIntoRawBlocks, extractRawBlockData } = require('./utils/pbpExtractorV2.cjs');

async function testExtractor() {
  try {
    console.log('--- Starting Extractor Sanity Check ---');
    
    // 1. Carica HTML
    const htmlPath = path.join(__dirname, 'pbp code.txt');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    console.log('HTML content loaded.');

    // 2. Dividi in blocchi per set
    const blocksBySet = splitIntoRawBlocks(htmlContent);
    console.log(`Found ${blocksBySet.size} sets.`);

    if (blocksBySet.size === 0) {
      console.error('No sets found. Check splitIntoRawBlocks logic.');
      return;
    }

    // 3. Prendi il primo set e il suo primo blocco
    // I set sono 2 e 1. Vogliamo il primo set giocato, che è il "1".
    const firstSetBlocks = blocksBySet.get(1);
    
    if (!firstSetBlocks || firstSetBlocks.length === 0) {
        console.error(`Set 1 has no blocks.`);
        return;
    }
    
    // Analizziamo il primo blocco del primo set (che dovrebbe essere il game 1 di Vacherot)
    const firstBlockHtml = firstSetBlocks[0];
    console.log('\n--- Analyzing First Game Block of First Set ---');
    
    // 4. Estrai dati grezzi
    const rawData = extractRawBlockData(firstBlockHtml);

    // 5. Stampa il risultato
    console.log('Extraction Result:');
    console.log(JSON.stringify(rawData, null, 2));

    console.log(`\nExpected Server: vacherot-valentin`);
    console.log(`Extracted Server: ${rawData.serverSlug}`);

    if (rawData.serverSlug === 'vacherot-valentin') {
      console.log('\n✅ SUCCESS: Correct server was extracted.');
    } else {
      console.log(`\n❌ FAILURE: Incorrect server was extracted. Got ${rawData.serverSlug}`);
    }

  } catch (error) {
    console.error('An error occurred during the test:', error);
  }
}

testExtractor();
