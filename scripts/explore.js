import CounterpartyV2 from "../api/CounterpartyV2.js";

let page = 1;
let exploreData = [];
let isLoading = false;
let hasMore = true;

function getImageUrl(assetName) {
    return `https://cdn.xcp.io/img/full/${encodeURIComponent(assetName)}?image=1`;
}

function getFallbackImage() {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%231e2937'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui' font-size='60' fill='%23647585' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%AA%99%3C/text%3E%3C/svg%3E`;
}

function createIssuanceCard(issuance) {
    const assetName = window.escapeHtml(issuance.asset || 'Unknown');
    const quantity = (issuance.quantity != null && issuance.quantity !== '') 
        ? window.escapeHtml(Number(issuance.quantity).toLocaleString()) 
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
                <img src="${imageUrl}" 
                     onerror="this.onerror=null; this.src='${getFallbackImage()}'; this.classList.add('opacity-75');"
                     class="w-full h-full object-contain bg-[#1e2937] transition-all duration-300 group-hover:scale-105 p-4"
                     alt="${assetName}">
                
                ${quantity ? `
                <!-- Quantity Badge -->
                <div class="absolute top-4 right-4 bg-black/70 text-white text-xs font-mono px-3 py-1 rounded-2xl backdrop-blur-md border border-white/20">
                    ${quantity}
                </div>` : ''}
                
                ${eventType ? `
                <!-- Event Badge -->
                <div class="absolute top-4 left-4">
                    <div class="bg-accent-purple/90 text-[10px] font-medium px-2.5 py-0.5 rounded-xl">
                        ${eventType.toUpperCase()}
                    </div>
                </div>` : ''}
                
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
        document.getElementById('explore-load-more-container').classList.add('hidden');
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