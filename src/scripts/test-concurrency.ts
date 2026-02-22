import axios from 'axios';

const API_URL = 'http://localhost:3000/api/wallet/transact';
const ALICE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ASSET_SLUG = 'gold_coins';
const CONCURRENCY_LEVEL = 50;

async function runConcurrencyTest() {
  console.log(`Starting concurrency test with ${CONCURRENCY_LEVEL} simultaneous requests...`);
  const promises = [];
  
  for (let i = 0; i < CONCURRENCY_LEVEL; i++) {
    const request = axios.post(
      API_URL, 
      {
        userId: ALICE_ID,
        amount: 10,
        assetSlug: ASSET_SLUG,
        type: 'SPEND'
      },
      { headers: { 'Idempotency-Key': `test-spend-${Date.now()}-${i}` } }
    ).then(res => {
      return { status: 'success', data: res.data };
    }).catch(err => {
      return { status: 'failed', error: err.response?.data?.message || err.message };
    });
    
    promises.push(request);
  }
  
  const results = await Promise.all(promises);
  
  const successes = results.filter(r => r.status === 'success');
  const failures = results.filter(r => r.status === 'failed');
  const insufficientFunds = failures.filter((r: any) => r.error === 'Insufficient funds');
  
  console.log('--- Test Results ---');
  console.log(`Total Requests Sent:   ${CONCURRENCY_LEVEL}`);
  console.log(`Successful Transfers:  ${successes.length} (Expected: 10)`);
  console.log(`Failed Transfers:      ${failures.length} (Expected: 40)`);
  console.log(`Insufficient Funds:    ${insufficientFunds.length} (Expected: 40)`);
  
  if (successes.length === 10 && insufficientFunds.length === 40) {
    console.log('\n✅ TEST PASSED: Pessimistic locking successfully prevented race conditions and double-spending.');
  } else {
    console.log('\n❌ TEST FAILED: Concurrency issue detected.');
  }
}

runConcurrencyTest();
