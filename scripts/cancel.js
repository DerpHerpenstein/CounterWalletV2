import CounterpartyV2 from "../api/CounterpartyV2.js";

let page = 1;
let ordersData = [];

document.getElementById('main').addEventListener('click', async function(event) {
    const cancelDexOrder = async() =>{
        try{
            let result = await CounterpartyV2.createCancelSatsPerVByte(
                walletProvider.walletAddress,                                   // source address
                event.target.dataset.txhash,                                     //order tx hash
                window.getFeeSelectorValue('cancel'),                            // fee sats/vb
            );
            
            // Transaction submission modal
            let txData = result.result;
            window.prepareSignAndBroadcastPSBT(txData);
        }
        catch(e){
            generalModal.openError("Error composing transaction", e);
        }
    }

    const updateOrders = () => {
        document.getElementById('cancel-order-data').innerHTML = "";
        for(let i=0; i< ordersData.length; i++){
            const currentOrder = ordersData[i];
            let propertyHtml = window.generatePropertyDisplayHtml("cancel-data-"+currentOrder.tx_hash, currentOrder, ["give_quantity_normalized","give_remaining_normalized","get_asset", "get_quantity_normalized","expire_index", "status"]);
            document.getElementById('cancel-order-data').innerHTML += 
                `<div class="cancel-card glass-card rounded-xl overflow-hidden border border-border-color relative">
                    <div class="p-2">
                        <h4>Asset: ${window.escapeHtml(currentOrder.give_asset)}</h4>
                        ${propertyHtml}
                        <button data-txhash="${window.escapeHtml(currentOrder.tx_hash)}"
                                data-asset="${window.escapeHtml(currentOrder.give_asset)}"
                            class="cancel-order-btn btn-primary px-6 py-3 rounded-lg flex items-center justify-center">
                            Cancel Order
                        </button>
                    </div>
                </div>`
                
        }
    }

    //load more dex orders
    if (event.target.id === 'cancel-load-order-btn') {
        try{
            let response = await CounterpartyV2.getDexOrders(window.walletProvider.walletAddress,page,50);
            ordersData = ordersData.concat(response.result);
            page++;
            updateOrders();
        }
        catch(e){
            generalModal.openError("Error getting Dex orders", e);
        }
    }


    else if(event.target.classList.contains('cancel-order-btn')){
        window.generalModal.open(`
            <div class="mb-6">
                <p class="text-text-primary">Order Tx Hash:</p>
                <div class="w-full h-20 overflow-y-auto bg-card-bg border border-border-color p-2">
                    <p class="text-text-primary">${escapeHtml(event.target.dataset.txhash)}</p>
                </div>
                <div class="m-10"></div>
                ${window.generateFeeSelectorHtml('cancel')}
            </div>
        `,"Cancel Dex Order - " + escapeHtml(event.target.dataset.asset),"Submit transaction", cancelDexOrder);
    }
});