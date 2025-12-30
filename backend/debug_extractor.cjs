const fs = require('fs');
const path = require('path');
const { splitIntoRawBlocks, extractRawBlockData } = require('./utils/pbpExtractorV2.cjs');

function testExtractor() {
  console.log('--- Starting Extractor Sanity Check ---');
  try {
    const pbpHtml = fs.readFileSync(path.join(__dirname, 'pbp code.txt'), 'utf8');
    console.log('HTML content loaded.');

    const blocksBySet = splitIntoRawBlocks(pbpHtml);
    console.log(`Found ${blocksBySet.length} sets.`);

    if (!blocksBySet || blocksBySet.length === 0) {
      console.log('No game blocks were extracted.');
      return;
    }

    console.log('\n--- Analyzing First Game Block of First Set ---');

    const firstSetBlocks = blocksBySet[0];
    if (!firstSetBlocks || firstSetBlocks.length === 0) {
        console.log('No game blocks found in the first set.');
        return;
    }
    const firstGameBlock = firstSetBlocks[0];

    const result = extractRawBlockData(firstGameBlock.html);
    result.setLabel = firstGameBlock.setLabel;

    console.log('Extraction Result:');
    console.log(JSON.stringify(result, null, 2));

    const expectedServer = 'vacherot-valentin';
    const extractedServer = result.serverSlug;

    console.log(`\nExpected Server: ${expectedServer}`);
    console.log(`Extracted Server: ${extractedServer}\n`);

    if (extractedServer === expectedServer) {
      console.log('✅ SUCCESS: Correct server was extracted.');
    } else {
      console.log(`❌ FAILURE: Incorrect server was extracted. Got ${extractedServer}`);
    }
  } catch (error) {
    console.error('An error occurred during the test:', error);
  }
}

testExtractor();
