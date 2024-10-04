// customSync.js

import CryptoJS from 'crypto-js';
import { initializeSalesDB, initializeUserDB} from '@/services/indexedDbService'

const encryptionKey = "RadsDashboard#$%245";

// Open sales and user DB
export async function syncSalesToServer() {
  try {
    const db = await initializeSalesDB(); 
    const salesTx = db.transaction('sales', 'readonly');
    const salesStore = salesTx.objectStore('sales');
    const allSales = await salesStore.getAll();
    const allKeys = await salesStore.getAllKeys();

    if (allSales.length > 0) {
      for (let i = 0; i < allSales.length; i++) {
        const sale = allSales[i];
        const saleKey = allKeys[i];
        const token = await getDecryptedToken();
        if (!token) {
          console.error("No valid token found");
          return;
        }

        try {
          const url = import.meta.env.VITE_BACKEND_BASEURL+"sales"
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(sale),
          });

          if (response.ok) {
            const deleteTx = db.transaction('sales', 'readwrite');
            const deleteStore = deleteTx.objectStore('sales');
            await deleteStore.delete(saleKey);
            await deleteTx.done;
            console.log(`Sale ${saleKey} synced and removed from IndexedDB`);
          } else {
            console.error('Failed to sync sale:', sale);
          }
        } catch (syncError) {
          console.error('Sync error:', syncError);
        }
      }
    }
  } catch (error) {
    console.error('Error during syncSalesToServer:', error);
  }
}

// Function to open the user DB and get the decrypted token
async function getDecryptedToken() {
  const db = await initializeUserDB();
  const tx = db.transaction('user', 'readonly');
  const store = tx.objectStore('user');
  const userEntry = await store.get(1);

  if (userEntry) {
    const encryptedToken = userEntry.encryptedUser;
    return decryptToken(encryptedToken, encryptionKey);
  }

  return null;
}

function decryptToken(encryptedToken, key) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedToken, key).toString(CryptoJS.enc.Utf8);
    const decryptedObject = JSON.parse(decrypted);
    return decryptedObject.token;
  } catch (error) {
    console.error('Error decrypting token:', error);
    return null;
  }
}
