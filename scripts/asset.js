import CounterpartyV2 from "../api/CounterpartyV2.js";

function getImageUrl(assetName) {
    return `https://cdn.xcp.io/img/full/${encodeURIComponent(assetName)}?image=1`;
}

function getFallbackImage() {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%231e2937'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui' font-size='60' fill='%23647585' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%AA%99%3C/text%3E%3C/svg%3E`;
}

// Expose fallback globally for any inline onerror if needed (defensive)
window.getAssetFallbackImage = getFallbackImage;

let currentAssetData = null;

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

function renderAsset(asset) {
    currentAssetData = asset;

    const name = asset.asset || 'Unknown';
    const description = asset.description || 'No description available';
    const supply = (asset.quantity != null && asset.quantity !== '') 
        ? Number(asset.quantity).toLocaleString() 
        : (asset.supply != null ? Number(asset.supply).toLocaleString() : '—');
    const divisible = !!asset.divisible;
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
        if (supply && supply !== '—') {
            qtyBadge.textContent = supply;
            qtyBadge.classList.remove('hidden');
        } else {
            qtyBadge.classList.add('hidden');
        }
    }

    // Metadata
    const supplyEl = document.getElementById('asset-supply');
    if (supplyEl) supplyEl.textContent = supply;

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

    // Quick actions visibility
    const actionsContainer = document.getElementById('asset-quick-actions');
    if (actionsContainer) {
        if (window.walletProvider && window.walletProvider.walletAddress) {
            actionsContainer.classList.remove('hidden');
        } else {
            actionsContainer.classList.add('hidden');
        }
    }

    showDetail();
}

async function fetchAndRender(assetName) {
    showLoading();
    try {
        const response = await CounterpartyV2.getAsset(assetName);
        const asset = response && response.result ? response.result : response;
        if (!asset || !asset.asset) {
            throw new Error('Invalid asset data');
        }
        renderAsset(asset);
    } catch (e) {
        console.error('Failed to load asset:', e);
        showError(`The asset "${assetName}" does not exist or could not be loaded.`);
    }
}

function attachBackButton() {
    const backBtn = document.getElementById('asset-back-btn');
    if (backBtn) {
        // Remove previous listeners by cloning
        const newBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBtn, backBtn);
        newBtn.addEventListener('click', () => {
            if (typeof window.setActivePage === 'function') {
                window.setActivePage('explore');
            }
        });
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
    attachBackButton();

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
}

// Make available globally
window.initAsset = initAsset;
