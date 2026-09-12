import CounterpartyV2 from "../api/CounterpartyV2.js";

let page = 1;
let fairminterData = [];
let isLoading = false;
let hasMore = true;

function getImageUrl(assetName) {
    return `https://cdn.xcp.io/img/full/${encodeURIComponent(assetName)}?image=1`;
}

function getFallbackImage() {
    return `data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fw3.org%22%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20fill%3D%22%23666%22%3E%0A%20%20%20%20Error%20loading%20image%0A%20%20%3C%2Ftext%3E%3C%2Fsvg%3E`;
}

function createFairmintCard(fairminter) {
    const assetName = window.escapeHtml(fairminter.asset || 'Unknown');
    const imageUrl = getImageUrl(fairminter.asset);
    const description = fairminter.description ? window.escapeHtml(fairminter.description) : 'No description available';
    const propertyHtml = window.generatePropertyDisplayHtml("fairmint-data-"+fairminter.txHash, fairminter, ["price", "quantity_by_price", "max_mint_per_tx", "end_block", "lock_quantity","status"]);
    return `
        <div class="fairmint-card glass-card rounded-xl overflow-hidden border border-border-color relative flex flex-col">
            <div class="flex flex-col md:flex-row">
                <!-- Info Left -->
                <div class="flex-1 p-4 min-w-0">
                    <h4 class="font-bold text-lg text-text-primary mb-3">Asset: ${assetName}</h4>
                    ${propertyHtml}
                </div>
                <!-- Image Right -->
                <div class="w-64 h-64 shrink-0 bg-card-bg border-t md:border-t-0 md:border-l border-border-color mx-auto md:mx-0">
                    <img data-full-src="${imageUrl}"
                         src="${imageUrl}"
                         onerror="this.onerror=null; this.src='${getFallbackImage()}'; this.classList.add('opacity-75');"
                         class="w-full h-full object-contain bg-[#1e2937] p-4 cursor-zoom-in image-zoom"
                         alt="${assetName}">
                </div>
            </div>
            <!-- Buttons Bottom -->
            <div class="p-4 border-t border-border-color">
                <button data-asset="${assetName}"
                        data-description="${window.escapeHtml(fairminter.description)}"
                    class="fairmint-mint-btn btn-primary px-6 py-3 rounded-lg flex items-center justify-center">
                    Mint
                </button>
            </div>
        </div>
    `;
}

function updateFairminters() {
    const container = document.getElementById('fairmint-fairminter-data');
    if (!container) return;
    container.innerHTML = '';
    
    // Hide error state when data loads
    document.getElementById('fairmint-error').classList.add('hidden');
    
    if (fairminterData.length === 0) {
        document.getElementById('fairmint-empty').classList.remove('hidden');
        return;
    }
    
    document.getElementById('fairmint-empty').classList.add('hidden');
    
    fairminterData.forEach(fairminter => {
        container.innerHTML += createFairmintCard(fairminter);
    });
}

async function loadFairminters(reset = false) {
    if (isLoading) return;
    
    const loadingEl = document.getElementById('fairmint-loading');
    
    isLoading = true;
    if (loadingEl) loadingEl.classList.remove('hidden');
    
    try {
        if (reset) {
            page = 1;
            fairminterData = [];
            hasMore = true;
        }
        
        const response = await CounterpartyV2.getFairminters(page, 50);
        
        const newFairminters = response.result || [];
        
        if (newFairminters.length > 0) {
            fairminterData = fairminterData.concat(newFairminters);
            page++;
            hasMore = newFairminters.length === 50;
            updateFairminters();
        } else {
            hasMore = false;
        }
        
    } catch (e) {
        console.error(e);
        const errorMessageEl = document.getElementById('fairmint-error-message');
        if (errorMessageEl) {
            errorMessageEl.textContent = e.message || e || 'An error occurred while loading fairmints.';
        }
        document.getElementById('fairmint-error').classList.remove('hidden');
    } finally {
        isLoading = false;
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

document.getElementById('general-modal').addEventListener('click', async function(event) {
    if(event.target.id === "fairmint-sats-per-vb-slider"){
        const selectedFee = document.getElementById('fairmint-selected-fee-rate');
        selectedFee.innerText = `${event.target.value}`
    }
})

// Main event delegation for fairmint page
document.getElementById('main').addEventListener('click', async function(event) {
    const mintFairmint = async() =>{
        try{
            let result = await CounterpartyV2.fairmintSatsPerVByte(
                walletProvider.walletAddress,                                   // source address
                event.target.dataset.asset,                                     //asset name
                document.getElementById('fairmint-sats-per-vb-slider').value,   // fee sats/vb
            );
            
            // Transaction submission modal
            let txData = result.result;
            window.prepareSignAndBroadcastPSBT(txData);
        }
        catch(e){
            generalModal.openError("Error composing transaction", e);
        }
    }

    // Handle retry button
    if (event.target.id === 'fairmint-retry-btn' ||
        event.target.closest('#fairmint-retry-btn')) {
        loadFairminters(true);
        return;
    }
    
    // if the user clicks a fairmint mint-btn, we need to open the fairmint-mint modal
    if (event.target.classList.contains('fairmint-mint-btn')) {
        const modalAssetName = event.target.dataset.asset;
        window.generalModal.open(`
            <div class="mb-6">
                <div class="flex justify-center mb-4">
                    <img data-full-src="${getImageUrl(modalAssetName)}"
                         src="${getImageUrl(modalAssetName)}"
                         onerror="this.onerror=null; this.src='${getFallbackImage()}'; this.classList.add('opacity-75');"
                         class="max-w-64 max-h-64 w-auto h-auto object-contain bg-[#1e2937] rounded-lg p-4 cursor-zoom-in image-zoom"
                         alt="${escapeHtml(modalAssetName)}">
                </div>
                <p class="text-text-primary">Description:</p>
                <div class="w-full h-20 overflow-y-auto bg-card-bg border border-border-color p-2">
                    <p class="text-text-primary">${escapeHtml(event.target.dataset.description)}</p>
                </div>
                <div class="m-10"></div>
                <label class="block text-text-secondary text-sm mb-2">Fee: <span id="fairmint-selected-fee-rate">3</span> (sats/vb) </label> 
                <div class="flex space-x-2">
                    <div class="relative w-full">
                        <label for="fairmint-sats-per-vb-slider" class="sr-only">Labels range</label>
                        <input id="fairmint-sats-per-vb-slider" type="range" value="3" min="1" max="200" step="0.1" class="sats-per-vb-slider w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
                        <span class="text-sm text-gray-500 dark:text-gray-400 absolute start-0 -bottom-6">1 sat/vb</span>
                        <span class="text-sm text-gray-500 dark:text-gray-400 absolute end-0 -bottom-6">200 sat/vb</span>
                    </div>
                </div>
            </div>    
        `,"Fairmint - " + escapeHtml(event.target.dataset.asset),"Mint", mintFairmint);
    }
});

// Auto-load when page becomes active
function initFairmint() {
    const assetDataContainer = document.getElementById('fairmint-fairminter-data');
    if (!assetDataContainer) return;
    
    // Clear previous state
    fairminterData = [];
    page = 1;
    hasMore = true;
    isLoading = false;
    
    const emptyEl = document.getElementById('fairmint-empty');
    const errorEl = document.getElementById('fairmint-error');
    const loadingEl = document.getElementById('fairmint-loading');
    
    if (emptyEl) emptyEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (loadingEl) loadingEl.classList.add('hidden');
    
    // Trigger initial load
    setTimeout(() => {
        loadFairminters(true);
    }, 100);
}

// Make init function available globally so index.js can call it when page activates
window.initFairmint = initFairmint;
