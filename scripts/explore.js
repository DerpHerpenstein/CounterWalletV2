import CounterpartyV2 from "../api/CounterpartyV2.js";

let page = 1;
let exploreData = [];
let isLoading = false;
let hasMore = true;

function getImageUrl(assetName) {
    return `https://cdn.xcp.io/img/full/${encodeURIComponent(assetName)}?image=1`;
}

function getFallbackImage() {
    return `data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fw3.org%22%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20fill%3D%22%23666%22%3E%0A%20%20%20%20Error%20loading%20image%0A%20%20%3C%2Ftext%3E%3C%2Fsvg%3E`;
}

function createIssuanceCard(issuance) {
    const assetName = window.escapeHtml(issuance.asset || 'Unknown');
    const quantity = (issuance.quantity != null && issuance.quantity !== '')
        ? Number(issuance.quantity)
        : null;
    // For divisible assets the quantity is in the smallest unit (1e8), so divide
    // by 100,000,000 for display.
    const displayQuantity = quantity != null
        ? window.escapeHtml((quantity / 100000000).toLocaleString())
        : null;
    const description = issuance.description ? window.escapeHtml(issuance.description) : 'No description available';
    const eventType = issuance.asset_events ? window.escapeHtml(issuance.asset_events) : '';
    const status = issuance.status ? window.escapeHtml(issuance.status) : '';
    const blockIndex = issuance.block_index != null ? window.escapeHtml(issuance.block_index) : '';

    const isStamp = description.toLowerCase().includes("stamp:");
    const explorerUrl = isStamp 
        ? `https://stampverse.io/stamp/${assetName}` 
        : `https://horizon.market/assets/${assetName}`;
    
    const imageUrl = getImageUrl(assetName);
    
    return `
        <div class="asset-card group glass-card rounded-3xl overflow-hidden border border-border-color hover:border-accent-blue/50 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
            <!-- Image Container -->
            <div class="relative h-48 bg-card-bg overflow-hidden">
                <img data-full-src="${imageUrl}"
                     src="${imageUrl}"
                     onerror="this.onerror=null; this.src='${getFallbackImage()}'; this.classList.add('opacity-75');"
                     class="w-full h-full object-contain bg-[#1e2937] transition-all duration-300 group-hover:scale-105 p-4 cursor-zoom-in image-zoom"
                     alt="${assetName}">
                
                ${displayQuantity ? `
                <!-- Quantity Badge -->
                <div class="absolute top-4 right-4 bg-black/70 text-white text-xs font-mono px-3 py-1 rounded-2xl backdrop-blur-md border border-white/20">
                    ${displayQuantity}
                </div>` : ''}
                
                ${eventType ? `
                <!-- Event Badge -->
                <div class="absolute top-4 left-4">
                    <div class="bg-accent-purple/90 text-[10px] font-medium px-2.5 py-0.5 rounded-xl">
                        ${eventType.toUpperCase()}
                    </div>
                </div>` : ''}
                
                <!-- Image Overlay Gradient -->
                <div class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent"></div>
            </div>
            
            <!-- Content -->
            <div class="p-5 flex-1 flex flex-col">
                <div class="flex-1">
                    <h3 class="font-bold text-xl text-text-primary mb-1 tracking-tight">${assetName}</h3>
                    <p class="text-text-secondary text-sm line-clamp-3 leading-relaxed mb-4 min-h-[3.75rem]">
                        ${description}
                    </p>
                    ${(status || blockIndex) ? `
                    <div class="text-xs text-text-secondary mb-2">
                        ${status ? `Status: ${status}` : ''}${status && blockIndex ? ' • ' : ''}${blockIndex ? `Block ${blockIndex}` : ''}
                    </div>` : ''}
                </div>
                
                <!-- Actions -->
                <div class="flex gap-3 pt-4 border-t border-border-color mt-auto">
                    <button data-asset="${assetName}" 
                            class="explore-view-asset-btn flex-1 btn-secondary text-sm py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                        <i class="fas fa-external-link-alt text-xs"></i>
                        <span class="font-medium">Explore</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateExplore() {
    const container = document.getElementById('explore-asset-data');
    if (!container) return;
    container.innerHTML = '';
    
    // Hide error state when data loads
    document.getElementById('explore-error').classList.add('hidden');
    
    if (exploreData.length === 0) {
        document.getElementById('explore-empty').classList.remove('hidden');
        document.getElementById('explore-load-more-container').classList.add('hidden');
        return;
    }
    
    document.getElementById('explore-empty').classList.add('hidden');
    
    exploreData.forEach(issuance => {
        container.innerHTML += createIssuanceCard(issuance);
    });
    
    // Update stats
    const statsEl = document.getElementById('explore-stats');
    if (statsEl) {
        statsEl.classList.remove('hidden');
        const countEl = document.getElementById('explore-count');
        if (countEl) countEl.textContent = exploreData.length;
    }
}

async function loadIssuances(reset = false) {
    if (isLoading) return;
    
    const loadingEl = document.getElementById('explore-loading');
    const loadMoreContainer = document.getElementById('explore-load-more-container');
    
    isLoading = true;
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
    
    try {
        if (reset) {
            page = 1;
            exploreData = [];
            const dataContainer = document.getElementById('explore-asset-data');
            if (dataContainer) dataContainer.innerHTML = '';
        }
        
        const response = await CounterpartyV2.getLatestIssuances(page, 20, 'creation');
        
        const newIssuances = response.result || [];
        
        if (newIssuances.length > 0) {
            exploreData = exploreData.concat(newIssuances);
            page++;
            hasMore = newIssuances.length === 20;
            updateExplore();
        } else {
            hasMore = false;
        }
        
        if (hasMore && loadMoreContainer) {
            loadMoreContainer.classList.remove('hidden');
        }
        
    } catch (e) {
        console.error(e);
        const errorMessageEl = document.getElementById('explore-error-message');
        if (errorMessageEl) {
            errorMessageEl.textContent = e.message || e || 'An error occurred while loading issuances.';
        }
        document.getElementById('explore-error').classList.remove('hidden');
        document.getElementById('explore-load-more-container').classList.remove('hidden');
    } finally {
        isLoading = false;
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

// Main event delegation for explore page
document.getElementById('main').addEventListener('click', function(event) {
    // Handle load more button
    if (event.target.id === 'explore-load-more-btn' ||
        event.target.closest('#explore-load-more-btn')) {
        loadIssuances(false);
        return;
    }
    
    // Handle retry button
    if (event.target.id === 'explore-retry-btn' ||
        event.target.closest('#explore-retry-btn')) {
        loadIssuances(true);
        return;
    }
    
    // View Asset buttons (opens internal asset detail page)
    if (event.target.classList.contains('explore-view-asset-btn') || 
        event.target.closest('.explore-view-asset-btn')) {
        const btn = event.target.closest('.explore-view-asset-btn') || event.target;
        const assetName = btn.dataset.asset;
        if (assetName) {
            window.dataStore.viewAsset = assetName;
            if (typeof window.setActivePage === 'function') {
                window.setActivePage('asset');
            }
        }
        return;
    }
});

// Search for asset by name (used by explore search bar)
async function searchForAsset() {
    const input = document.getElementById('explore-search-input');
    if (!input) return;
    const assetName = (input.value || '').trim();
    if (!assetName) return;

    try {
        await CounterpartyV2.getAsset(assetName);
        // Asset exists: store name and navigate to asset page
        window.dataStore.viewAsset = assetName;
        if (typeof window.setActivePage === 'function') {
            window.setActivePage('asset');
        }
    } catch (e) {
        // Asset does not exist or API error
        if (typeof generalModal !== 'undefined' && generalModal.openError) {
            generalModal.openError("Asset Not Found", `The asset "${assetName}" does not exist.`);
        } else {
            console.error('Asset search failed:', e);
        }
    }
}

// Attach search input/button listeners (idempotent)
let exploreSearchAttached = false;
function attachExploreSearchListeners() {
    if (exploreSearchAttached) return;

    const searchBtn = document.getElementById('explore-search-btn');
    const searchInput = document.getElementById('explore-search-input');

    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchForAsset();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchForAsset();
            }
        });
    }

    exploreSearchAttached = true;
}

// Auto-load when page becomes active
function initExplore() {
    const assetDataContainer = document.getElementById('explore-asset-data');
    if (!assetDataContainer) return;
    
    // Clear previous state
    exploreData = [];
    page = 1;
    hasMore = true;
    isLoading = false;
    
    const emptyEl = document.getElementById('explore-empty');
    const errorEl = document.getElementById('explore-error');
    const statsEl = document.getElementById('explore-stats');
    const loadMoreContainer = document.getElementById('explore-load-more-container');
    
    if (emptyEl) emptyEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (statsEl) statsEl.classList.add('hidden');
    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
    
    // Attach search listeners (safe on re-init)
    attachExploreSearchListeners();
    
    // Trigger initial load
    setTimeout(() => {
        loadIssuances(true);
    }, 100);
}

// Make init function available globally so index.js can call it when page activates
window.initExplore = initExplore;