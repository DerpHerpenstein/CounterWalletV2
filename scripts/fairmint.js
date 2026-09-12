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
                        data-price="${window.escapeHtml(fairminter.price)}"
                        data-quantity-by-price="${window.escapeHtml(fairminter.quantity_by_price)}"
                        data-max-mint-per-tx="${window.escapeHtml(fairminter.max_mint_per_tx)}"
                        data-divisible="${window.escapeHtml(fairminter.divisible)}"
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

// Returns true if the fairminter is priced (non-free). Fairminters are priced in
// XCP by default; the API response does not expose a pricing_asset field, so a
// non-zero price is the gate.
function isXcpPriced(dataset) {
    const price = parseFloat(dataset.price);
    return isFinite(price) && price > 0;
}

// Convert a whole-token input (string/number) to integer base units.
// Divisible assets use 8 decimals; non-divisible assets are whole units.
function tokensToBaseUnits(tokensAmount, divisible) {
    const value = parseFloat(tokensAmount);
    if (!isFinite(value) || value < 0) return 0;
    if (String(divisible) === 'true' || divisible === true) {
        return Math.round(value * 1e8);
    }
    return Math.round(value);
}

// The API's compose/fairmint `quantity` is in minted-token base units and must be a
// multiple of the fairmint's lot_size (= quantity_by_price). Takes a whole-token input,
// converts to base units, rounds DOWN to the nearest whole lot, and caps at max_mint_per_tx.
// Returns the lot-size-aligned quantity in base units (0 if no valid whole lot).
function calculateFairmintQuantity(tokensAmount, quantityByPrice, maxMintPerTx, divisible) {
    const qbp = parseFloat(quantityByPrice);
    if (!isFinite(qbp) || qbp <= 0) return 0;

    const lotSize = Math.max(1, Math.floor(qbp));
    const rawBase = tokensToBaseUnits(tokensAmount, divisible);
    if (rawBase <= 0) return 0;

    // Round down to the nearest whole lot
    let quantityBase = Math.floor(rawBase / lotSize) * lotSize;

    // Cap at max_mint_per_tx, keeping lot-size alignment
    const max = parseFloat(maxMintPerTx);
    if (isFinite(max) && max > 0 && quantityBase > max) {
        quantityBase = Math.floor(max / lotSize) * lotSize;
    }
    return quantityBase;
}

// Estimate XCP cost for a given lot-aligned quantity (base units).
// xcp_sats = quantityBase * price / quantity_by_price; returned as whole XCP (number).
function estimateXcpCost(quantityBase, priceSatsPerUnit, quantityByPrice) {
    if (!quantityBase || quantityBase <= 0) return 0;
    const price = parseFloat(priceSatsPerUnit);
    const qbp = parseFloat(quantityByPrice);
    if (!isFinite(price) || price <= 0 || !isFinite(qbp) || qbp <= 0) return 0;
    const xcpSats = (quantityBase * price) / qbp;
    return xcpSats / 1e8;
}

// Max whole tokens a user can mint in one transaction (for the input placeholder/label)
function getMaxTokens(maxMintPerTx, divisible) {
    const max = parseFloat(maxMintPerTx);
    if (!isFinite(max) || max <= 0) return '';
    if (String(divisible) === 'true' || divisible === true) {
        return Math.floor(max / 1e8);
    }
    return Math.floor(max);
}

// Main event delegation for fairmint page
document.getElementById('main').addEventListener('click', async function(event) {
    const mintFairmint = async() =>{
        try{
            // The API expects the quantity in minted-token base units (a multiple of lot_size).
            // For free fairmints, pass null so the API mints the maximum.
            const quantity = isXcpPriced(event.target.dataset)
                ? calculateFairmintQuantity(
                    document.getElementById('fairmint-token-amount').value,
                    event.target.dataset.quantityByPrice,
                    event.target.dataset.maxMintPerTx,
                    event.target.dataset.divisible
                  )
                : null;

            let result = await CounterpartyV2.fairmintSatsPerVByte(
                walletProvider.walletAddress,                                   // source address
                event.target.dataset.asset,                                     //asset name
                window.getFeeSelectorValue('fairmint'),                         // fee sats/vb
                quantity,                                                       // quantity (token base units) or null for free
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
        const xcpPriced = isXcpPriced(event.target.dataset);

        const maxTokens = xcpPriced ? getMaxTokens(event.target.dataset.maxMintPerTx, event.target.dataset.divisible) : '';

        // For XCP-priced fairmints, add a token-amount input + live XCP cost estimate
        const xcpSection = xcpPriced ? `
            <div class="mt-4">
                <label class="block text-text-secondary text-sm mb-2">Amount of ${escapeHtml(modalAssetName)} to mint ${maxTokens ? `(max: ${maxTokens})` : ''}</label>
                <div class="flex space-x-2">
                    <input id="fairmint-token-amount" type="number" min="0" step="any" value=""
                            class="input-field w-full px-4 py-3 rounded-lg focus:outline-none"
                            placeholder="${maxTokens ? `e.g. ${maxTokens}` : 'e.g. 1000'}">
                </div>
                <div class="mt-2">
                    <p class="text-text-secondary text-sm">You will pay: <span id="fairmint-xcp-cost" class="text-text-primary font-semibold">0</span> XCP</p>
                </div>
            </div>
        ` : ``;

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
                ${xcpSection}
                <div class="m-10"></div>
                ${window.generateFeeSelectorHtml('fairmint')}
            </div>
        `,"Fairmint - " + escapeHtml(event.target.dataset.asset),"Mint", mintFairmint);

        // Live XCP cost estimate as the user types
        if (xcpPriced) {
            const amountInput = document.getElementById('fairmint-token-amount');
            const costEl = document.getElementById('fairmint-xcp-cost');
            amountInput.addEventListener('input', function() {
                const quantityBase = calculateFairmintQuantity(
                    amountInput.value,
                    event.target.dataset.quantityByPrice,
                    event.target.dataset.maxMintPerTx,
                    event.target.dataset.divisible
                );
                const cost = estimateXcpCost(
                    quantityBase,
                    event.target.dataset.price,
                    event.target.dataset.quantityByPrice
                );
                costEl.textContent = cost.toLocaleString(undefined, { maximumFractionDigits: 8 });
            });
        }
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
