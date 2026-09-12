import CounterpartyV2 from "../api/CounterpartyV2.js";

let dispensersData = [];

document.getElementById('main').addEventListener('click', async function(event) {
    const closeDispenser = async() =>{
        try{
            console.log(event.target.dataset);
            let result = await CounterpartyV2.dispenserUpdateSatsPerVByte(
                walletProvider.walletAddress,                                         // source address
                event.target.dataset.asset,                                           // asset
                event.target.dataset.givequantity,                                    // give quantity
                0,                                                                    // set escrow quantityo to 0 to remove all
                event.target.dataset.mainchainrate,                                   // main chain rate
                10,                                                                   // close dispenser by sending 10
                window.getFeeSelectorValue('closedispenser'),                          // fee sats/vb
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
        document.getElementById('closedispenser-dispenser-data').innerHTML = "";
        for(let i=0; i< dispensersData.length; i++){
            const currentDispenser = dispensersData[i];
            console.log(JSON.stringify(currentDispenser));
            let propertyHtml = window.generatePropertyDisplayHtml("closedispenser-data-"+currentDispenser.tx_hash, currentDispenser, ["give_quantity_normalized","satoshirate_normalized","give_remaining_normalized","escrow_quantity_normalized"]);
            //console.log(propertyHtml);
            document.getElementById('closedispenser-dispenser-data').innerHTML += 
                `<div class="closedispenser-card glass-card rounded-xl overflow-hidden border border-border-color relative">
                    <div class="p-2">
                        <h4>Asset: ${window.escapeHtml(currentDispenser.asset)}</h4>
                        ${propertyHtml}
                        <button data-txhash="${window.escapeHtml(currentDispenser.tx_hash)}"
                                data-asset="${window.escapeHtml(currentDispenser.asset)}"
                                data-givequantity="${window.escapeHtml(currentDispenser.give_quantity)}"
                                data-escrowquantity="${window.escapeHtml(currentDispenser.escrow_quantity)}"
                                data-mainchainrate="${window.escapeHtml(currentDispenser.satoshirate)}"
                            class="closedispenser-dispenser-btn btn-primary px-6 py-3 rounded-lg flex items-center justify-center">
                            Close Dispenser
                        </button>
                    </div>
                </div>`
                
        }
        if(dispensersData.length === 0){
            document.getElementById('closedispenser-dispenser-data').innerHTML += "No dispensers found on this address"
        }
    }

    //load more dispenser orders
    if (event.target.id === 'closedispenser-get-dispensers-btn') {
        try{
            let response = await CounterpartyV2.getDispensers(window.walletProvider.walletAddress,1,50);
            dispensersData = dispensersData.concat(response.result);
            updateOrders();
        }
        catch(e){
            generalModal.openError("Error getting Dispenser orders", e);
        }
    }


    else if(event.target.classList.contains('closedispenser-dispenser-btn')){
        window.generalModal.open(`
            <div class="mb-6">
                <p class="text-text-primary m-3">Order Tx Hash: ${escapeHtml(event.target.dataset.txhash)}</p>
                <p class="text-text-primary m-3">Give Quantity: ${escapeHtml(event.target.dataset.givequantity)}</p>
                <p class="text-text-primary m-3">Escrow Quantity: ${escapeHtml(event.target.dataset.escrowquantity)}</p>
                <p class="text-text-primary m-3">Order Sale price (sats): ${escapeHtml(event.target.dataset.mainchainrate)}</p>

                <div class="m-10"></div>
                ${window.generateFeeSelectorHtml('closedispenser')}
            </div>
        `,"Cancel Dispenser For " + escapeHtml(event.target.dataset.asset),"Submit transaction", closeDispenser);
    }
});