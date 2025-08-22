import CounterpartyV2 from "../api/CounterpartyV2.js";

/*
let response = await CounterpartyV2.getLatestIssuances(0,25);
let transactions = response.result;
console.log(transactions);

document.getElementById('recent-transactions-data').innerHTML = "";

for(let i=0; i< transactions.length; i++){
    document.getElementById('recent-transactions-data').innerHTML += `

      <div class="rounded-lg border border-gray-200 shadow-md p-6 m-2 mx-auto">
        <div class="space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <label class="text-text-secondary text-sm font-medium mb-1">TX Hash</label>
              <div class="font-mono text-sm break-all">
                ${window.escapeHtml(transactions[i].tx_hash)}
              </div>
            </div>
            <div class="flex-shrink-0">
              <div class="text-sm">
                <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                  ${window.escapeHtml(transactions[i].asset_events)}
                </span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label class="text-text-secondary text-sm font-medium mb-1">Block Index</label>
              <div class="text-sm">${window.escapeHtml(transactions[i].block_index)}</div>
            </div>

            <div>
              <label class="text-text-secondary text-sm font-medium mb-1">Asset</label>
              <div class="text-sm">${window.escapeHtml(transactions[i].asset)}</div>
            </div>

            <div>
              <label class="text-text-secondary text-sm font-medium mb-1">Quantity</label>
              <div class="text-sm">${window.escapeHtml(transactions[i].quantity)}</div>
            </div>

            <div>
              <label class="text-text-secondary text-sm font-medium mb-1">Status</label>
              <div class="text-sm">${window.escapeHtml(transactions[i].status)}</div>
            </div>
          </div>

          <div>
            <label class="text-text-secondary text-sm font-medium mb-1">Description</label>
            <div class="mt-1 p-3 rounded border max-h-32 overflow-y-auto text-sm">
              ${window.escapeHtml(transactions[i].description)}
            </div>
          </div>
        </div>
      </div>
      `
}
*/



