import { DrugPortalClient } from '@icare1/drug-portal-sdk';

console.log('Testing @icare1/drug-portal-sdk integration...');

// Read credentials
const username = process.env.CSDL_DUOC_USERNAME;
const password = process.env.CSDL_DUOC_PASSWORD;
const storeId = process.env.CSDL_DUOC_STORE_ID;
const warehouseCode = process.env.CSDL_DUOC_WAREHOUSE_CODE;

const qd228AppName = process.env.QD228_APP_NAME;
const qd228AppKey = process.env.QD228_APP_KEY;

if (!username || !password) {
  console.log('⚠️ WARNING: CSDL_DUOC_USERNAME or CSDL_DUOC_PASSWORD not found in environment variables. Falling back to dummy credentials.');
} else {
  console.log(`✅ Loaded credentials from ENV (Username: ${username})`);
}

// Initialize client
const client = new DrugPortalClient({
  environment: 'sandbox',
  csdlDuoc: {
    username: username || 'dummy_user',
    password: password || 'dummy_pass',
    storeId: storeId,
    warehouseCode: warehouseCode,
  },
  qd228: qd228AppName && qd228AppKey ? {
    appName: qd228AppName,
    appKey: qd228AppKey,
  } : undefined,
});

console.log('SDK client initialized successfully!');

async function run() {
  // ─── TEST 1: Drug Search ──────────────────────────────────────────
  console.log('\n--- TEST 1: Searching Drugs ---');
  try {
    const result = await client.csdlDuoc.drugs.search('paracetamol');
    console.log(`✅ Search success! Found ${result.total} drugs.`);
    if (result.items.length > 0) {
      console.log('First 3 search results:', result.items.slice(0, 3).map(i => ({ id: i.id, name: i.name })));
    }
  } catch (error) {
    console.error('❌ Drug Search failed:', (error as Error).message);
  }

  // ─── TEST 2: Master Data ──────────────────────────────────────────
  console.log('\n--- TEST 2: Fetching Master Data ---');
  try {
    const units = await client.csdlDuoc.masterData.getUnits({ page: 1, pageSize: 5 });
    console.log('✅ Fetch Units success! Sample:', units.map(u => u.name));

    const routes = await client.csdlDuoc.masterData.getRoutes({ page: 1, pageSize: 5 });
    console.log('✅ Fetch Routes success! Sample:', routes.map(r => r.name));
  } catch (error) {
    console.error('❌ Master Data fetch failed:', (error as Error).message);
  }

  // ─── TEST 3: Inventory Stock-In with Polling ─────────────────────
  console.log('\n--- TEST 3: Stock-In Transaction ---');
  if (!username || !password) {
    console.log('⏭️ Skipping Stock-In test because dummy credentials will fail authentication.');
  } else {
    try {
      console.log('Submitting Stock-In transaction (Nhập kho)...');
      // Create a dummy transaction payload to send to sandbox
      const stockInResult = await client.csdlDuoc.inventory.stockIn({
        items: [{
          drugId: '53531', // Using ID of 'Empatince' which we found in POS search
          unitId: '1', // Default Unit ID
          quantity: 10,
          batchNo: `LOT-${Date.now().toString().slice(-6)}`,
          expiryDate: '2027-12-31',
          manufacturer: { id: '1', name: 'Công ty TNHH MTV Dược phẩm LA TERRE FRANCE' }
        }],
        reason: 'supplier', // Nhập từ nhà cung cấp
        referenceNumber: `PO-${Date.now().toString().slice(-6)}`,
        transactionDate: new Date().toISOString(),
      });

      console.log('✅ Stock-In Transaction completed!');
      console.log('Result details:', {
        transactionId: stockInResult.transactionId,
        status: stockInResult.status,
        attempts: (stockInResult as any).attempts,
      });
    } catch (error) {
      console.error('❌ Stock-In failed:', (error as Error).message);
      if ((error as any).responseBody) {
        console.error('Response details:', (error as any).responseBody);
      }
    }
  }

  // ─── TEST 4: QĐ 228 Prescription (Optional) ─────────────────────
  console.log('\n--- TEST 4: QĐ 228 Prescription Lookup ---');
  if (!client.qd228) {
    console.log('⏭️ Skipping QĐ 228 test because QD228_APP_NAME and QD228_APP_KEY are not configured.');
  } else {
    try {
      const rxCode = 'DH0000000001'; // Default test prescription code
      console.log(`Looking up prescription ${rxCode}...`);
      const prescription = await client.qd228.prescriptions.get(rxCode);
      console.log('✅ Prescription Lookup success!');
      console.log('Details:', {
        patientName: prescription.patientName,
        diagnose: prescription.diagnose,
        doctorName: prescription.doctorName,
        itemCount: prescription.items.length,
      });
    } catch (error) {
      console.error('❌ Prescription Lookup failed:', (error as Error).message);
    }
  }
}

run();
