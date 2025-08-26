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

window.dataStore = {};

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
    "disclaimer": {wallet: false},

    "myassets": {wallet: true},
    // pages that do
    "airdrop": {wallet: true},
    "attach": {wallet: true},
    "broadcast": {wallet: true},
    "cancel": {wallet: true},
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
    "sweep": {wallet: true}
}

const pageNames = Object.keys(pageObjects);
window.currentPage = "disclaimer";

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
    // load all the pages into the main content section
    for(const pageName of pageNames){
        await loadPage(pageName);
    }
    

    // Transaction type selection
    const txCards = document.querySelectorAll('.tx-card');
    const mainContentPages = document.querySelectorAll('.main-content');
    
    window.setActiveType = (type) => {
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
            }
        });
    }
    
    txCards.forEach(card => {
        card.addEventListener('click', function() {
            //console.log(this.dataset.type)
            currentPage = this.dataset.type;
            // if the wallet needs to be connected and the page needs a wallet
            //console.log(pageObjects[this.dataset.type].wallet, this.dataset.type)
            if(walletProvider?.walletAddress && pageObjects[this.dataset.type].wallet){
                setActiveType(currentPage);
            }
            // if the page doesnt need a wallet
            else if(!pageObjects[this.dataset.type].wallet){
                setActiveType(currentPage);
            }
            //otherwise show the need a wallet page
            else{
                setActiveType("connect-wallet");
            }
        });
    });

    // Initialize with Send as active
    setActiveType(currentPage);


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

});
