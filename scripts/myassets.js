import CounterpartyV2 from "../api/CounterpartyV2.js";

let page = 0;
let myAssetsData = [];

function generateAssetPreview(asset, descriptionId) {
    return `
        <div class="flex-1">
            <h3 class="font-semibold text-lg">${window.escapeHtml(asset.asset)}</h3>
            ${descriptionId ? `<p id="${descriptionId}" class="max-w-xl overflow-wrap-anywhere text-text-secondary text-sm mt-1"></p>`: ""}
            <div class="mt-3">
                <span class="text-text-primary font-medium">Locked: ${window.escapeHtml(asset.asset_info.locked)}</span>
            </div>
            <div class="mt-3">
                <span class="text-text-primary font-medium">Quantity: ${window.escapeHtml(asset.total)}</span>
                <span class="text-text-primary font-medium">Divisible: ${window.escapeHtml(asset.asset_info.divisible)}</span>
            </div>
        </div>
    `
}

document.getElementById('main').addEventListener('click', async function(event) {
    const updateMyAssets = () => {
        document.getElementById('myassets-asset-data').innerHTML = "";
        for(let i=0; i< myAssetsData.length; i++){
            let descriptionId = "myassets-" + myAssetsData[i].asset;
            const assetDescription = escapeHtml(new String(myAssetsData[i].asset_info.description))
            const isStamp = assetDescription.toLowerCase().includes("stamp:") ? true : false ;
            document.getElementById('myassets-asset-data').innerHTML += 
                `<div class="asset-card glass-card rounded-xl overflow-hidden border border-border-color relative">
                    <div class="p-2">
                        <div class="flex items-start space-x-4">
                            ${generateAssetPreview(myAssetsData[i], descriptionId)}
                            <div class="flex flex-col space-y-3 ml-4">
                                <button data-asset="${window.escapeHtml(myAssetsData[i].asset)}" 
                                        data-url="${isStamp ? "https://stampverse.io/stamp/" + window.escapeHtml(myAssetsData[i].asset) 
                                            : "https://horizon.market/assets/" + window.escapeHtml(myAssetsData[i].asset)}" 
                                        class="myassets-open-explorer-btn btn-secondary px-6 py-3 rounded-lg flex items-center justify-center">
                                    View on ${isStamp ? "Stampverse.io" : "Horizon.market"}
                                </button>
                                <button data-asset="${window.escapeHtml(myAssetsData[i].asset)}"
                                    class="myassets-actions-btn btn-primary px-6 py-3 rounded-lg flex items-center justify-center">
                                    Actions
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`
                document.getElementById(descriptionId).innerText = window.escapeHtml(myAssetsData[i].asset_info.description);
                
        }
    }

    console.log(event.target);
    if (event.target.id === 'myassets-load-assets-btn') {
        let response = await CounterpartyV2.getUserAssets(window.walletProvider.walletAddress,page,50);
        myAssetsData = myAssetsData.concat(response.result);
        page++;
        updateMyAssets();
    }
    else if(event.target.classList.contains('myassets-open-explorer-btn')){
        window.open(event.target.dataset.url, '_blank');
        /*
        generalModal.openNoButtons(`
            <iframe id="popupIframe" sandbox="allow-scripts" src="${event.target.dataset.url}" class="w-full h-[calc(50vh-1px)] border-0"></iframe>
        `, "View Asset " + event.target.dataset.asset);
        */
    }
    else if(event.target.classList.contains('myassets-actions-btn')){
        generalModal.openNoButtons(`
            <div class="grid grid-cols-2 gap-4">
                <button data-asset="${event.target.dataset.asset}"
                        data-page="send"
                        class="myassets-actions-page-btn btn-primary px-6 py-3 my-3 rounded-lg flex items-center justify-center">
                        Send
                </button>
                <button data-asset="${event.target.dataset.asset}"
                        data-page="mpma"
                        class="myassets-actions-page-btn btn-primary px-6 py-3 my-3 rounded-lg flex items-center justify-center">
                        MPMA
                </button>
                <button data-asset="${event.target.dataset.asset}"
                        data-page="airdrop"
                        class="myassets-actions-page-btn btn-primary px-6 py-3 my-3 rounded-lg flex items-center justify-center">
                        Airdrop
                </button>
                <button data-asset="${event.target.dataset.asset}"
                        data-page="destroy"
                        class="myassets-actions-page-btn btn-primary px-6 py-3 my-3 rounded-lg flex items-center justify-center">
                        Destroy
                </button>
                <button data-asset="${event.target.dataset.asset}"
                        data-page="dividend"
                        class="myassets-actions-page-btn btn-primary px-6 py-3 my-3 rounded-lg flex items-center justify-center">
                        Issue Dividend
                </button>

                <button data-asset="${event.target.dataset.asset}"
                        data-page="order"
                        class="myassets-actions-page-btn btn-primary px-6 py-3 my-3 rounded-lg flex items-center justify-center">
                        Create Dex Order
                </button>

                <button data-asset="${event.target.dataset.asset}"
                        data-page="dispenser"
                        class="myassets-actions-page-btn btn-primary px-6 py-3 my-3 rounded-lg flex items-center justify-center hidden">
                        Create Dispenser
                </button>

            </div>
        `, "Actions : " + event.target.dataset.asset);
    }
});


document.getElementById('general-modal').addEventListener('click', async function(event) {
    if(event.target.classList.contains('myassets-actions-page-btn')){
        document.getElementById(event.target.dataset.page + '-selected-asset').innerText = event.target.dataset.asset;
        setActiveType(event.target.dataset.page);
        generalModal.close();
    }
});
