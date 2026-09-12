import CounterpartyV2 from "../api/CounterpartyV2.js";

function getImageUrl(assetName) {
    return `https://cdn.xcp.io/img/full/${encodeURIComponent(assetName)}?image=1`;
}

function getFallbackImage() {
    return `data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fw3.org%22%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20fill%3D%22%23666%22%3E%0A%20%20%20%20Error%20loading%20image%0A%20%20%3C%2Ftext%3E%3C%2Fsvg%3E`;
}

// Expose fallback globally for any inline onerror if needed (defensive)
window.getAssetFallbackImage = getFallbackImage;

let currentAssetData = null;
let currentAssetDispensers = [];
let userOwnsAsset = false;

function showLoading() {
    const loading = document.getElementById('asset-loading');
    const error = document.getElementById('asset-error');
    const detail = document.getElementById('asset-detail');
    if (loading) loading.classList.remove('hidden');
    if (error) error.classList.add('hidden');
    if (detail) detail.classList.add('hidden');
}

function showError(message) {
    const loading = document.getElementById('asset-loading');
    const error = document.getElementById('asset-error');
    const detail = document.getElementById('asset-detail');
    const msgEl = document.getElementById('asset-error-message');
    if (loading) loading.classList.add('hidden');
    if (detail) detail.classList.add('hidden');
    if (error) error.classList.remove('hidden');
    if (msgEl) msgEl.textContent = message || "We couldn't find that asset on the Counterparty network.";
}

function showDetail() {
    const loading = document.getElementById('asset-loading');
    const error = document.getElementById('asset-error');
    const detail = document.getElementById('asset-detail');
    if (loading) loading.classList.add('hidden');
    if (error) error.classList.add('hidden');
    if (detail) detail.classList.remove('hidden');
}

function setExplorerLink(assetName, description) {
    const link = document.getElementById('asset-explorer-link');
    if (!link) return;
    const isStamp = (description || '').toLowerCase().includes("stamp:");
    const url = isStamp 
        ? `https://stampverse.io/stamp/${encodeURIComponent(assetName)}`
        : `https://horizon.market/assets/${encodeURIComponent(assetName)}`;
    link.href = url;
}

function renderAsset(asset, dispensers = []) {
    currentAssetData = asset;

    const name = asset.asset || 'Unknown';
    const description = asset.description || 'No description available';
    const quantity = (asset.quantity != null && asset.quantity !== '')
        ? Number(asset.quantity)
        : (asset.supply != null ? Number(asset.supply) : null);
    const divisible = !!asset.divisible;
    // For divisible assets the quantity is in the smallest unit (1e8), so divide
    // by 100,000,000 for display.
    const displayQuantity = quantity != null
        ? (quantity / 100000000).toLocaleString()
        : '—';
    const locked = !!asset.locked;
    const issuer = asset.issuer || asset.source || '—';
    const assetId = asset.asset_id != null ? asset.asset_id : '—';

    // Name
    const nameEl = document.getElementById('asset-name');
    if (nameEl) nameEl.textContent = name;

    // Description
    const descEl = document.getElementById('asset-description');
    if (descEl) descEl.textContent = description;

    // Image
    const imgEl = document.getElementById('asset-image');
    if (imgEl) {
        imgEl.dataset.fullSrc = getImageUrl(name);
        imgEl.src = getImageUrl(name);
        imgEl.onerror = function() {
            this.onerror = null;
            this.src = getFallbackImage();
            this.classList.add('opacity-75');
        };
    }

    // Badges
    const badgesEl = document.getElementById('asset-badges');
    if (badgesEl) {
        badgesEl.innerHTML = '';
        if (locked) {
            const b = document.createElement('div');
            b.className = 'bg-red-500/90 text-[10px] font-medium px-2.5 py-0.5 rounded-xl flex items-center gap-1';
            b.innerHTML = `<i class="fas fa-lock text-xs"></i> LOCKED`;
            badgesEl.appendChild(b);
        }
        if (divisible) {
            const b = document.createElement('div');
            b.className = 'bg-emerald-500/90 text-[10px] font-medium px-2.5 py-0.5 rounded-xl';
            b.textContent = 'DIVISIBLE';
            badgesEl.appendChild(b);
        }
    }

    // Quantity badge
    const qtyBadge = document.getElementById('asset-quantity-badge');
    if (qtyBadge) {
        if (displayQuantity && displayQuantity !== '—') {
            qtyBadge.textContent = displayQuantity;
            qtyBadge.classList.remove('hidden');
        } else {
            qtyBadge.classList.add('hidden');
        }
    }

    // Metadata
    const supplyEl = document.getElementById('asset-supply');
    if (supplyEl) supplyEl.textContent = displayQuantity;

    const divEl = document.getElementById('asset-divisible');
    if (divEl) divEl.textContent = divisible ? 'Divisible' : 'Indivisible';

    const lockEl = document.getElementById('asset-locked');
    if (lockEl) lockEl.textContent = locked ? 'Yes' : 'No';

    const issuerEl = document.getElementById('asset-issuer');
    if (issuerEl) issuerEl.textContent = issuer;

    const idEl = document.getElementById('asset-id');
    if (idEl) idEl.textContent = assetId;

    // Explorer link
    setExplorerLink(name, description);

    // View Dispensers button visibility
    const viewDispBtn = document.getElementById('view-dispensers-btn');
    if (viewDispBtn) {
        if (dispensers.length > 0) {
            viewDispBtn.classList.remove('hidden');
        } else {
            viewDispBtn.classList.add('hidden');
        }
    }

    // Quick actions visibility - only if user owns the asset
    const actionsContainer = document.getElementById('asset-quick-actions');
    if (actionsContainer) {
        if (userOwnsAsset && window.walletProvider && window.walletProvider.walletAddress) {
            actionsContainer.classList.remove('hidden');
        } else {
            actionsContainer.classList.add('hidden');
        }
    }

    showDetail();
}

async function fetchAndRender(assetName) {
    showLoading();
    userOwnsAsset = false;

    try {
        const response = await CounterpartyV2.getAsset(assetName);
        const asset = response && response.result ? response.result : response;
        if (!asset || !asset.asset) {
            throw new Error('Invalid asset data');
        }

        // Check for dispensers (exclude oracle-based dispensers)
        let dispensers = [];
        try {
            const dispResp = await CounterpartyV2.getDispensers(assetName, 1, 100);
            dispensers = (dispResp.result || []).filter(d => !d.oracle_address);
        } catch (e) {
            console.error('Failed to fetch dispensers:', e);
        }

        // Check ownership using getUserAsset if a wallet is connected
        if (window.walletProvider && window.walletProvider.walletAddress) {
            try {
                const balResp = await CounterpartyV2.getUserAsset(
                    window.walletProvider.walletAddress,
                    assetName
                );
                const balances = balResp && balResp.result ? balResp.result : [];
                // User owns the asset if there's a positive balance entry for it
                userOwnsAsset = balances.some(b => {
                    const total = (b.total != null ? b.total : b.quantity);
                    return b.asset === assetName && Number(total || 0) > 0;
                });
            } catch (e) {
                // No balance or error → does not own
                userOwnsAsset = false;
            }
        }

        renderAsset(asset, dispensers);
        currentAssetDispensers = dispensers;
    } catch (e) {
        console.error('Failed to load asset:', e);
        showError(`The asset "${assetName}" does not exist or could not be loaded.`);
    }
}

function attachQuickActions(assetName) {
    const container = document.getElementById('asset-quick-actions');
    if (!container) return;

    // Remove old listeners
    const buttons = container.querySelectorAll('.asset-action-btn');
    buttons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });

    container.addEventListener('click', function handler(e) {
        const btn = e.target.closest('.asset-action-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        if (!action) return;

        // Set selected asset on target page if element exists
        const selectedEl = document.getElementById(action + '-selected-asset');
        if (selectedEl) {
            selectedEl.innerText = assetName;
        }

        // Navigate
        if (typeof window.setActivePage === 'function') {
            window.setActivePage(action);
        }
    });
}

function initAsset() {
    // Determine asset name: prefer URL param (already handled in index.js), then dataStore
    let assetName = window.dataStore && window.dataStore.viewAsset;

    // Also check current URL in case of direct navigation without prior setActivePage
    if (!assetName) {
        const params = new URLSearchParams(window.location.search);
        assetName = params.get('asset');
    }

    if (!assetName) {
        showError("No asset specified. Use the search on the Explore page or provide ?asset=NAME in the URL.");
        return;
    }

    // Fetch and render
    fetchAndRender(assetName);

    // Attach quick action handlers (will respect wallet state at render time)
    // We pass the name so clicks can use it even if render hasn't completed yet
    attachQuickActions(assetName);

    // Attach View Dispensers button handler.
    // Re-bind on every init: clone the button to strip any previously attached
    // listeners (same pattern as attachQuickActions), then bind a fresh handler
    // that captures the current asset name so the modal title stays correct.
    const viewDispBtn = document.getElementById('view-dispensers-btn');
    if (viewDispBtn) {
        const newBtn = viewDispBtn.cloneNode(true);
        viewDispBtn.parentNode.replaceChild(newBtn, viewDispBtn);
        newBtn.addEventListener('click', () => {
            showDispensersModal(assetName);
        });
    }
}

async function showDispensersModal(assetName) {
    try {
        // Use cached dispensers if available, otherwise fetch
        let dispensers = currentAssetDispensers;
        if (!dispensers || dispensers.length === 0) {
            const resp = await CounterpartyV2.getDispensers(assetName, 1, 100);
            dispensers = resp.result || [];
        }

        if (dispensers.length === 0) {
            window.generalModal.open("<p>No open dispensers found for this asset.</p>", "Dispensers");
            return;
        }

        // Exclude oracle-based dispensers and order by price (cheapest first)
        dispensers = [...dispensers]
            .filter(d => !d.oracle_address)
            .sort((a, b) => Number(a.satoshirate) - Number(b.satoshirate));

        let tableHtml = `
            <div class="overflow-x-auto">
                <div class="m-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p class="text-gray-700">
                        Dispenser can be front run<br>Ensure you are buying from a trusted source<br>Buy at your own risk!
                    </p>
                </div>
                <table class="w-full text-left text-sm">
                    <thead class="text-text-secondary border-b border-border-color">
                        <tr>
                            <th class="pb-2 font-medium">Dispenser</th>
                            <th class="pb-2 font-medium">Price</th>
                            <th class="pb-2 font-medium">Quantity</th>
                            <th class="pb-2 font-medium">Remaining</th>
                            <th class="pb-2 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border-color">
                        ${dispensers.map(d => `
                            <tr>
                                <td class="py-3 font-mono text-xs break-all max-w-[150px]">${window.escapeHtml(d.source)}</td>
                                <td class="py-3">${window.escapeHtml(d.satoshirate_normalized)}</td>
                                <td class="py-3">${window.escapeHtml(Number(d.give_quantity_normalized).toFixed(3))}</td>
                                <td class="py-3">${window.escapeHtml(Number(d.give_remaining_normalized).toFixed(3))} / ${window.escapeHtml(Number(d.escrow_quantity_normalized).toFixed(3))}</td>
                                <td class="py-1 text-right">
                                    <button class="buy-dispenser-btn btn-primary px-4 py-2 rounded-lg"
                                            data-dispenser-index="${dispensers.indexOf(d)}">
                                        Buy
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        window.generalModal.open(tableHtml, `Dispensers for ${window.escapeHtml(assetName)}`, "Close", () => {
            window.generalModal.close();
        });

        // Attach event listeners to Buy buttons
        const buyBtns = document.querySelectorAll('.buy-dispenser-btn');
        buyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const index = btn.dataset.dispenserIndex;
                window.openDispenseBuyModal(dispensers[index]);
            });
        });

    } catch (e) {
        console.error('Failed to show dispensers modal:', e);
        window.generalModal.openError("Error loading dispensers", e);
    }
}

// Make available globally
window.initAsset = initAsset;
