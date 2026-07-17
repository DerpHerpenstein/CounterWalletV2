import CounterpartyV2 from "../api/CounterpartyV2.js";

let page = 1;
let myAssetsData = [];
let isLoading = false;
let hasMore = true;

function getImageUrl(assetName) {
    return `https://cdn.xcp.io/img/full/${encodeURIComponent(assetName)}?image=1`;
}

function getFallbackImage() {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%231e2937'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui' font-size='60' fill='%23647585' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%AA%99%3C/text%3E%3C/svg%3E`;
}

function createAssetCard(asset) {
    const assetName = window.escapeHtml(asset.asset);
    const quantity = window.escapeHtml(asset.total.toLocaleString());
    const description = asset.asset_info?.description ? window.escapeHtml(asset.asset_info.description) : 'No description available';
    const isLocked = asset.asset_info?.locked || false;
    const isDivisible = asset.asset_info?.divisible || false;
    
    const isStamp = description.toLowerCase().includes("stamp:");
    const explorerUrl = isStamp 
        ? `https://stampverse.io/stamp/${assetName}` 
        : `https://horizon.market/assets/${assetName}`;
    
    const imageUrl = getImageUrl(assetName);
    
    return `
        <div class="asset-card group glass-card rounded-3xl overflow-hidden border border-border-color hover:border-accent-blue/50 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
            <!-- Image Container -->
            <div class="relative h-48 bg-card-bg overflow-hidden">
                <img src="${imageUrl}" 
                     onerror="this.onerror=null; this.src='${getFallbackImage()}'; this.classList.add('opacity-75');"
                     class="w-full h-full object-contain bg-[#1e2937] transition-all duration-300 group-hover:scale-105 p-4"
                     alt="${assetName}">
                
                <!-- Quantity Badge -->
                <div class="absolute top-4 right-4 bg-black/70 text-white text-xs font-mono px-3 py-1 rounded-2xl backdrop-blur-md border border-white/20">
                    ${quantity}
                </div>
                
                <!-- Status Badges -->
                <div class="absolute top-4 left-4 flex flex-col gap-1.5">
                    ${isLocked ? `
                    <div class="bg-red-500/90 text-[10px] font-medium px-2.5 py-0.5 rounded-xl flex items-center gap-1">
                        <i class="fas fa-lock text-xs"></i>
                        LOCKED
                    </div>` : ''}
                    ${isDivisible ? `
                    <div class="bg-emerald-500/90 text-[10px] font-medium px-2.5 py-0.5 rounded-xl">
                        DIVISIBLE
                    </div>` : ''}
                </div>
                
                <!-- Image Overlay Gradient -->
                <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent"></div>
            </div>
            
            <!-- Content -->
            <div class="p-5 flex-1 flex flex-col">
                <div class="flex-1">
                    <h3 class="font-bold text-xl text-text-primary mb-1 tracking-tight">${assetName}</h3>
                    <p class="text-text-secondary text-sm line-clamp-3 leading-relaxed mb-4 min-h-[3.75rem]">
                        ${description}
                    </p>
                </div>
                
                <!-- Actions -->
                <div class="flex gap-3 pt-4 border-t border-border-color mt-auto">
                    <button data-asset="${assetName}" 
                            class="myassets-view-asset-btn flex-1 btn-secondary text-sm py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                        <i class="fas fa-external-link-alt text-xs"></i>
                        <span class="font-medium">Explore</span>
                    </button>
                    <button data-asset="${assetName}"
                            class="myassets-actions-btn flex-1 btn-primary text-sm py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                        <i class="fas fa-bolt text-xs"></i>
                        <span class="font-medium">Actions</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateMyAssets() {
    const container = document.getElementById('myassets-asset-data');
    container.innerHTML = '';
    
    // Hide error state when data loads
    document.getElementById('myassets-error').classList.add('hidden');
    
    if (myAssetsData.length === 0) {
        document.getElementById('myassets-empty').classList.remove('hidden');
        document.getElementById('myassets-load-more-container').classList.add('hidden');
        return;
    }
    
    document.getElementById('myassets-empty').classList.add('hidden');
    
    myAssetsData.forEach(asset => {
        container.innerHTML += createAssetCard(asset);
    });
    
    // Update stats
    const statsEl = document.getElementById('myassets-stats');
    statsEl.classList.remove('hidden');
    document.getElementById('myassets-count').textContent = myAssetsData.length;
}

async function loadAssets(reset = false) {
    if (isLoading) return;
    
    const loadingEl = document.getElementById('myassets-loading');
    const loadMoreContainer = document.getElementById('myassets-load-more-container');
    
    isLoading = true;
    loadingEl.classList.remove('hidden');
    loadMoreContainer.classList.add('hidden');
    
    try {
        if (reset) {
            page = 1;
            myAssetsData = [];
            document.getElementById('myassets-asset-data').innerHTML = '';
        }
        
        const response = await CounterpartyV2.getUserAssets(
            window.walletProvider.walletAddress, 
            page, 
            20
        );
        
        const newAssets = response.result || [];
        
        if (newAssets.length > 0) {
            myAssetsData = myAssetsData.concat(newAssets);
            page++;
            hasMore = newAssets.length === 20;
            updateMyAssets();
        } else {
            hasMore = false;
        }
        
        if (hasMore) {
            loadMoreContainer.classList.remove('hidden');
        }
        
    } catch (e) {
        console.error(e);
        const errorMessageEl = document.getElementById('myassets-error-message');
        if (errorMessageEl) {
            errorMessageEl.textContent = e.message || e || 'An error occurred while loading assets.';
        }
        document.getElementById('myassets-error').classList.remove('hidden');
        document.getElementById('myassets-load-more-container').classList.add('hidden');
    } finally {
        isLoading = false;
        loadingEl.classList.add('hidden');
    }
}

// Auto-load when page becomes active
function initMyAssets() {
    const assetDataContainer = document.getElementById('myassets-asset-data');
    if (!assetDataContainer) return;
    
    // Clear previous state
    myAssetsData = [];
    page = 1;
    hasMore = true;
    isLoading = false;
    
    document.getElementById('myassets-empty').classList.add('hidden');
    const errorEl = document.getElementById('myassets-error');
    if (errorEl) errorEl.classList.add('hidden');
    document.getElementById('myassets-stats').classList.add('hidden');
    document.getElementById('myassets-load-more-container').classList.add('hidden');
    
    // Trigger initial load
    setTimeout(() => {
        loadAssets(true);
    }, 100);
}

// Main event delegation
document.getElementById('main').addEventListener('click', async function(event) {
    // Handle load more button
    if (event.target.id === 'myassets-load-more-btn' ||
        event.target.closest('#myassets-load-more-btn')) {
        loadAssets(false);
        return;
    }
    
    // Handle retry button
    if (event.target.id === 'myassets-retry-btn' ||
        event.target.closest('#myassets-retry-btn')) {
        loadAssets(true);
        return;
    }
    
    // View Asset buttons (opens internal asset detail page)
    if (event.target.classList.contains('myassets-view-asset-btn') || 
        event.target.closest('.myassets-view-asset-btn')) {
        const btn = event.target.closest('.myassets-view-asset-btn') || event.target;
        const assetName = btn.dataset.asset;
        if (assetName) {
            window.dataStore.viewAsset = assetName;
            if (typeof window.setActivePage === 'function') {
                window.setActivePage('asset');
            }
        }
        return;
    }
    
    // Actions button
    if (event.target.classList.contains('myassets-actions-btn') || 
        event.target.closest('.myassets-actions-btn')) {
        const btn = event.target.closest('.myassets-actions-btn') || event.target;
        const assetName = btn.dataset.asset;
        
        generalModal.openNoButtons(`
            <div class="grid grid-cols-2 gap-4 p-2">
                <button data-asset="${assetName}" data-page="send" 
                        class="myassets-actions-page-btn btn-primary px-6 py-4 rounded-2xl flex flex-col items-center gap-2 hover:scale-105 transition-all">
                    <i class="fas fa-paper-plane text-2xl"></i>
                    <span class="font-medium">Send</span>
                </button>
                <button data-asset="${assetName}" data-page="mpma" 
                        class="myassets-actions-page-btn btn-primary px-6 py-4 rounded-2xl flex flex-col items-center gap-2 hover:scale-105 transition-all">
                    <i class="fas fa-share-nodes text-2xl"></i>
                    <span class="font-medium">MPMA</span>
                </button>
                <button data-asset="${assetName}" data-page="airdrop" 
                        class="myassets-actions-page-btn btn-primary px-6 py-4 rounded-2xl flex flex-col items-center gap-2 hover:scale-105 transition-all">
                    <i class="fas fa-parachute-box text-2xl"></i>
                    <span class="font-medium">Airdrop</span>
                </button>
                <button data-asset="${assetName}" data-page="destroy" 
                        class="myassets-actions-page-btn btn-primary px-6 py-4 rounded-2xl flex flex-col items-center gap-2 hover:scale-105 transition-all">
                    <i class="fas fa-fire text-2xl"></i>
                    <span class="font-medium">Destroy</span>
                </button>
                <button data-asset="${assetName}" data-page="dividend" 
                        class="myassets-actions-page-btn btn-primary px-6 py-4 rounded-2xl flex flex-col items-center gap-2 hover:scale-105 transition-all">
                    <i class="fas fa-gift text-2xl"></i>
                    <span class="font-medium">Dividend</span>
                </button>
                <button data-asset="${assetName}" data-page="order" 
                        class="myassets-actions-page-btn btn-primary px-6 py-4 rounded-2xl flex flex-col items-center gap-2 hover:scale-105 transition-all">
                    <i class="fas fa-chart-line text-2xl"></i>
                    <span class="font-medium">Order</span>
                </button>
                <button data-asset="${assetName}" data-page="dispenser" 
                        class="myassets-actions-page-btn btn-primary px-6 py-4 rounded-2xl flex flex-col items-center gap-2 hover:scale-105 transition-all col-span-2">
                    <i class="fas fa-store text-2xl"></i>
                    <span class="font-medium">Create Dispenser</span>
                </button>
            </div>
        `, `Actions for ${assetName}`);
        return;
    }
});

// Modal delegation for action buttons
document.getElementById('general-modal').addEventListener('click', async function(event) {
    if (event.target.classList.contains('myassets-actions-page-btn')) {
        const asset = event.target.dataset.asset;
        const pageType = event.target.dataset.page;
        
        // Set selected asset in target page if it exists
        const selectedAssetEl = document.getElementById(pageType + '-selected-asset');
        if (selectedAssetEl) {
            selectedAssetEl.innerText = asset;
        }
        
        setActivePage(pageType);
        generalModal.close();
    }
});

// Make init function available globally so index.js can call it when page activates
window.initMyAssets = initMyAssets;
