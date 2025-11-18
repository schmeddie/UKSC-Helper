/**
 * Quick test script to verify the National Archives API implementation
 * Run with: node test-api.js
 */

// Simpler implementation for Node.js testing (without DOM)
async function testAPI() {
  const XML_BASE_URL = 'https://caselaw.nationalarchives.gov.uk/xml';

  // Test with a known UKSC case: [2019] UKSC 41 (Miller/Cherry Brexit case)
  const court = 'uksc';
  const year = '2019';
  const number = '41';

  const url = `${XML_BASE_URL}/${court}/${year}/${number}/data.xml`;

  console.log('Testing National Archives XML API...');
  console.log(`URL: ${url}`);
  console.log('');

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();

    console.log('✓ Successfully fetched XML');
    console.log(`✓ XML length: ${xmlText.length} characters`);
    console.log('');

    // Check for key elements
    const hasFRBRname = xmlText.includes('<FRBRname');
    const hasFRBRdate = xmlText.includes('<FRBRdate');
    const hasParagraphs = xmlText.includes('<p>') || xmlText.includes('<p ');
    const hasJudgmentBody = xmlText.includes('judgmentBody') || xmlText.includes('mainBody');

    console.log('XML Structure Check:');
    console.log(`  <FRBRname>: ${hasFRBRname ? '✓' : '✗'}`);
    console.log(`  <FRBRdate>: ${hasFRBRdate ? '✓' : '✗'}`);
    console.log(`  <p> tags: ${hasParagraphs ? '✓' : '✗'}`);
    console.log(`  judgment/mainBody: ${hasJudgmentBody ? '✓' : '✗'}`);
    console.log('');

    // Extract a sample
    const titleMatch = xmlText.match(/value="([^"]+)"/);
    if (titleMatch) {
      console.log(`Sample title: ${titleMatch[1]}`);
    }

    console.log('');
    console.log('✓ API test successful!');
    console.log('✓ The National Archives XML endpoint is working correctly');

  } catch (error) {
    console.error('✗ API test failed:');
    console.error(error.message);
    process.exit(1);
  }
}

testAPI();
