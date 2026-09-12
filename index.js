tailwind.config = {
    theme: {
        extend: {
            colors: {
                'dark-bg': '#0f172a',
                'card-bg': '#1e293b',
                'accent-blue': '#60a5fa',
                'accent-purple': '#a78bfa',
                'accent-teal': '#2dd4bf',
                'text-primary': '#f1f5f9',
                'text-secondary': '#cbd5e1',
                'border-color': '#334155',
                'success': '#22c55e',
                'error': '#f87171'
            }
        }
    }
}

window.dataStore = {
    initializedPages: {
    }
};

// used to escape potentially dangerous html
window.escapeHtml = (tmpData) => {
    let tmpResult = "" + tmpData;
    return tmpResult
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// used to download JSON files
window.downloadJSON = (data, filename = 'data.json') => {
    try {
        // Convert data to JSON string
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Download failed:', error);
        // Fallback: show JSON in new window
        const win = window.open('', '_blank');
        win.document.write('<pre>' + JSON.stringify(data, null, 2) + '</pre>');
        win.document.close();
    }
}

// Keep track of loaded scripts to avoid duplicates
const loadedScripts = new Set();

//const pageNames = ["attach","broadcast","cancel","destroy","detach","dispense","dispenser","dividend","fairmint","fairminter","issuance","mpma","order","recent","send","sweep"]
const pageObjects = {
    // pages that dont need wallet
    "balances": {wallet: false},
    "recent": {wallet: false},
    "explore": {wallet: false},
    "disclaimer": {wallet: false},
    "asset": {wallet: false},

    "myassets": {wallet: true},
    // pages that do
    "airdrop": {wallet: true},
    "attach": {wallet: true},
    "broadcast": {wallet: true},
    "cancel": {wallet: true},
    "closedispenser": {wallet: true},
    "destroy": {wallet: true},
    "detach": {wallet: true},
    "dispense": {wallet: true},
    "dispenser": {wallet: true},
    "dividend": {wallet: true},
    "fairmint": {wallet: true},
    "fairminter": {wallet: true},
    "issuance": {wallet: true},
    "mpma": {wallet: true},
    "order": {wallet: true},
    "send": {wallet: true},
    "sweep": {wallet: true},
    "userdispensers": {wallet: false}
}

const pageNames = Object.keys(pageObjects);
window.currentPage = "disclaimer";

// on page load get URL params
const urlParams = new URLSearchParams(window.location.search);
const pageParam = urlParams.get("page");
const assetParam = urlParams.get("asset");

if (pageParam === "userdispensers") {
    window.currentPage = "userdispensers";
} else if (pageParam === "asset" || assetParam) {
    if (assetParam) {
        window.dataStore.viewAsset = assetParam;
    }
    window.currentPage = "asset";
}

const loadPage = async (pageName) =>  {
    const pageUrl = "./pages/" + pageName + ".html";
    const scriptUrl = "./scripts/" + pageName + ".js";
    const mainElement = document.querySelector('main');
    let response = await fetch(pageUrl);
    let responseData = await response.text();

    mainElement.innerHTML += `<div class="hidden main-content" data-type="${pageName}">${responseData}</div>`;
    // Prevent loading the same script twice
    if (loadedScripts.has(scriptUrl)) {
        return;
    }
    else{
        const newScript = document.createElement('script');
        newScript.src = scriptUrl;
        newScript.type = "module";
        document.body.appendChild(newScript);
    }
}



document.addEventListener('DOMContentLoaded', async function() {
    // ----- Fee selector component -----
    // Generates the full markup for a fee selector: a number input for custom fees
    // plus a range slider, both synced to a shared display span.
    // All elements are keyed off the base id:
    //   {id}-fee-input, {id}-sats-per-vb-slider, {id}-selected-fee-rate
    // NOTE: defined before the page-loading loop so the page scripts (which run
    // during the loop) can call generateFeeSelectorHtml immediately.
    window.generateFeeSelectorHtml = function (id, options = {}) {
        const value = options.value ?? 3;
        const min   = options.min   ?? 1;
        const max   = options.max   ?? 100;
        const step  = options.step  ?? 0.1;
        return `
                <div class="mb-6">
                    <label class="block text-text-secondary text-sm mb-2">Fee: <span id="${id}-selected-fee-rate" class="fee-rate-display">${value}</span> (sats/vb) </label>
                    <div class="flex space-x-2">
                        <input id="${id}-fee-input" type="number" value="${value}" min="0" step="${step}" placeholder="${value}"
                                class="fee-rate-input input-field w-28 px-3 py-2 rounded-lg focus:outline-none" title="Enter a custom fee, or use the slider">
                        <div class="relative w-full">
                            <label for="${id}-sats-per-vb-slider" class="sr-only">Labels range</label>
                            <input id="${id}-sats-per-vb-slider" type="range" value="${value}" min="${min}" max="${max}" step="${step}" class="fee-rate-slider sats-per-vb-slider w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
                            <span class="text-sm text-gray-500 dark:text-gray-400 absolute start-0 -bottom-6">${min} sat/vb</span>
                            <span class="text-sm text-gray-500 dark:text-gray-400 absolute end-0 -bottom-6">${max} sat/vb</span>
                        </div>
                    </div>
                </div>`;
    }

    // Reads the validated fee for a given base id. The number input is the source of
    // truth (allows custom values outside the slider range); falls back to the slider
    // value (then 3) if the input is empty or invalid.
    window.getFeeSelectorValue = function (id) {
        const input  = document.getElementById(id + '-fee-input');
        const slider = document.getElementById(id + '-sats-per-vb-slider');
        let value = input ? parseFloat(input.value) : NaN;
        if (!isFinite(value) || value < 0) {
            value = slider ? parseFloat(slider.value) : NaN;
        }
        return isFinite(value) ? value : 3;
    }

    // One delegated listener handles EVERY fee selector (static pages and dynamically
    // injected modal content), syncing slider <-> number input <-> display span.
    document.addEventListener('input', function(event) {
        const target = event.target;
        if (!target || !target.id) return;

        if (target.classList.contains('fee-rate-slider')) {
            const base = target.id.replace('sats-per-vb-slider', '');
            const input   = document.getElementById(base + 'fee-input');
            const display = document.getElementById(base + 'selected-fee-rate');
            if (input)   input.value = target.value;
            if (display) display.innerText = target.value;
        }
        else if (target.classList.contains('fee-rate-input')) {
            const base    = target.id.replace('fee-input', '');
            const display = document.getElementById(base + 'selected-fee-rate');
            const slider  = document.getElementById(base + 'sats-per-vb-slider');
            if (display) display.innerText = target.value;
            if (slider && target.value !== '' && !isNaN(parseFloat(target.value))) {
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                slider.value = Math.min(Math.max(parseFloat(target.value), min), max);
            }
        }
    });

    // load all the pages into the main content section
    for(const pageName of pageNames){
        await loadPage(pageName);
    }
    

    // Transaction type selection
    const txCards = document.querySelectorAll('.tx-card');
    const mainContentPages = document.querySelectorAll('.main-content');
    
    window.setActivePage = (type, clean=true) => {
        txCards.forEach(card => {
            card.classList.remove('active');
            if (card.dataset.type === type) {
                card.classList.add('active');
                //loadPage(type);
            }
        });
        mainContentPages.forEach(page => {
            page.classList.add('hidden');
            if (page.dataset.type === type) {
                page.classList.remove('hidden');
                // Call page-specific initialization if available (e.g. auto-load assets)
                // Only initialize once per page (using initializedPages) so pages don't reset on navigation
                if (type === 'myassets' && typeof window.initMyAssets === 'function') {
                    if (!window.dataStore.initializedPages.myassets) {
                        window.initMyAssets();
                        window.dataStore.initializedPages.myassets = true;
                    }
                }
                else if (type === 'explore' && typeof window.initExplore === 'function') {
                    if (!window.dataStore.initializedPages.explore) {
                        window.initExplore();
                        window.dataStore.initializedPages.explore = true;
                    }
                }
                else if (type === 'fairmint' && typeof window.initFairmint === 'function') {
                    if (!window.dataStore.initializedPages.fairmint) {
                        window.initFairmint();
                        window.dataStore.initializedPages.fairmint = true;
                    }
                }
                else if (type === 'asset' && typeof window.initAsset === 'function') {
                    window.initAsset();
                }
            }
        });
        // hide the sidebar if its not
        document.getElementById('sidebar').classList.add('hidden');

        // clean url when changing pages
        if(clean){
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', cleanUrl);
        }
    }
    
    txCards.forEach(card => {
        card.addEventListener('click', function() {
            //console.log(this.dataset.type)
            currentPage = this.dataset.type;
            // if the wallet needs to be connected and the page needs a wallet
            //console.log(pageObjects[this.dataset.type].wallet, this.dataset.type)
            if(walletProvider?.walletAddress && pageObjects[this.dataset.type].wallet){
                setActivePage(currentPage);
            }
            // if the page doesnt need a wallet
            else if(!pageObjects[this.dataset.type].wallet){
                setActivePage(currentPage);
            }
            //otherwise show the need a wallet page
            else{
                setActivePage("connect-wallet");
            }
        });
    });

    // Initialize current page without resetting the url
    setActivePage(currentPage, false);


    // general modal
    window.generalModal = {
        open: function(content, title = "Information", confirmText = "Confirm", cbFunction) {
            const modalEl = document.getElementById('general-modal');
            const modalBody = document.getElementById('modal-body');
            const modalTitle = document.getElementById('modal-title');
            const oldConfirmButton = document.getElementById('modal-confirm');
            
            // Set content
            modalBody.innerHTML = content;
            modalTitle.textContent = title;
            oldConfirmButton.textContent = confirmText;
            // Show modal
            modalEl.classList.add('active');
            let newConfirmButton = oldConfirmButton.cloneNode(true);
            oldConfirmButton.parentNode.replaceChild(newConfirmButton, oldConfirmButton);
            newConfirmButton.addEventListener('click', cbFunction);
        },

        openNoButtons: function (content, title){
            const modalCancel = document.getElementById('modal-cancel');
            modalCancel.classList.add('hidden');
            const modalConfirm = document.getElementById('modal-confirm');
            modalConfirm.classList.add('hidden');
            window.generalModal.open(content, title, "", () => {} )
        },

        openError: function (title, error){
            const modalCancel = document.getElementById('modal-cancel');
            modalCancel.classList.add('hidden');
            console.log(title,error);
            window.generalModal.open(`
                <div class="space-y-4">
                    <h4 class="font-bold text-lg">${title}</h4>
                    <p>${error}</p>
                </div>
            `, "Error", "Okay", ()=>{
                window.generalModal.close();
            });
        },
        
        close: function() {
            document.getElementById('general-modal').classList.remove('active');
            setTimeout(() => {
                const confirmButton = document.getElementById('modal-confirm');
                confirmButton.classList.remove('hidden');
                const modalCancel = document.getElementById('modal-cancel');
                modalCancel.classList.remove('hidden');
            }, 300);
        }
    };
    
    // Event listeners
    document.getElementById('close-modal').addEventListener('click', generalModal.close);
    document.getElementById('modal-cancel').addEventListener('click', generalModal.close);
    document.querySelector('.modal-overlay').addEventListener('click', (e) => {
        if (e.target === document.querySelector('.modal-overlay')) {
            generalModal.close();
        }
    });

    // Generic image zoom: clicking any element with the 'image-zoom' class
    // opens a modal showing the image at up to 512x512 while keeping its aspect ratio.
    document.addEventListener('click', function(event) {
        const zoomTarget = event.target.closest('.image-zoom');
        if (!zoomTarget || zoomTarget.tagName !== 'IMG') return;
        const src = zoomTarget.dataset.fullSrc || zoomTarget.currentSrc || zoomTarget.src;
        if (!src) return;
        event.stopPropagation();
        window.generalModal.openNoButtons(`
            <div class="flex justify-center">
                <img src="${src}"
                     class="max-w-[512px] max-h-[512px] w-auto h-auto object-contain bg-[#1e2937] rounded-lg p-4"
                     alt="${zoomTarget.alt || ''}">
            </div>
        `, zoomTarget.alt || "Image");
    });

    // open menu on the sidebar on mobile
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('hidden');
    });

    // show toast
    window.showToast = function(message, type = "") {

        function getTypeIcon(type) {
            switch(type) {
              case 'success': return '<i class="fas fa-check-circle text-success"></i>';
              case 'error': return '<i class="fas fa-exclamation-triangle text-error"></i>';
              default: return '<i class="fas fa-info-circle text-text-secondary"></i>';
            }
        }
          
        function hideToast(toastId) {
            const toast = document.getElementById(toastId);
            if (toast) {
                toast.classList.add('animate-fadeOut');
                setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                }, 300);
            }
        }

        const container = document.getElementById('toast-container');
        if (!container) return;
      
        // Create toast element
        const toast = document.createElement('div');
        toast.id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        toast.className = `
          relative p-4 rounded-lg border border-border-color shadow-lg
          transition-all duration-300 ease-in-out transform
          animate-fadeIn
        `;
      
        // Set background and border based on type
        switch(type) {
          case 'success':
            toast.classList.add('bg-card-bg', 'border-success');
            break;
          case 'error':
            toast.classList.add('bg-card-bg', 'border-error');
            break;
          default:
            toast.classList.add('bg-card-bg', 'border-border-color');
        }
      
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times text-text-secondary hover:text-text-primary"></i>';
        closeBtn.className = 'absolute top-2 right-2';
        closeBtn.onclick = () => hideToast(toast.id);
      
        // Message content
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start';
        messageDiv.innerHTML = `
          <span class="mr-2 mt-0.5">
            ${getTypeIcon(type)}
          </span>
          <div class="text-text-primary">${message}</div>
        `;
      
        toast.appendChild(closeBtn);
        toast.appendChild(messageDiv);
        container.appendChild(toast);
      }; 


    window.generatePropertyDisplayHtml = function (containerId, data, subsetKeys = []) {

        // Create grid layout with two columns
        let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-2">`;
            
        let hiddenHTML = ``;
            
        // Generate properties
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const propertyHTML = `
                    <div class="property-item">
                        <span class="font-medium">${escapeHtml(key)}:</span>
                        <span class="ml-2">${escapeHtml(JSON.stringify(data[key]))}</span>
                    </div>
                `;
                
                if (subsetKeys.includes(key)) {
                    html += propertyHTML;
                } else {
                    hiddenHTML += propertyHTML;
                }
            }
        }
        html +="</div>";

        hiddenHTML = `
            <div class="mb-3 mt-3">
                <!-- Hidden checkbox with proper ID -->
                <input type="checkbox" id="${containerId}-toggle" class="peer sr-only">
                
                <!-- Button-style label that targets the checkbox -->
                <label for="${containerId}-toggle" class="inline-flex px-6 py-3 btn-primary text-white rounded-lg cursor-pointer transition-all duration-200 shadow-md">
                    <span class="flex items-center">
                        View All Data
                    </span>
                </label>

                <div class="peer-checked:block hidden">
                    ${hiddenHTML};
                </div>


            </div>
        `

        return (html + hiddenHTML);
    }
    
    window.copyToClipboard = function(button) {
        const originalHTML = button.innerHTML;
        
        navigator.clipboard.writeText(button.dataset.copydata)
            .then(() => {
                button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                }, 3000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    }
});