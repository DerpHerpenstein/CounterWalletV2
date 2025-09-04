import CounterpartyV2 from "../api/CounterpartyV2.js";

let dispensersData = [];

document.getElementById('general-modal').addEventListener('click', async function(event) {
    if(event.target.id === "closedispenser-sats-per-vb-slider"){
        const selectedFee = document.getElementById('closedispenser-selected-fee-rate');
        selectedFee.innerText = `${event.target.value}`
    }
})

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
                document.getElementById('closedispenser-sats-per-vb-slider').value,   // fee sats/vb
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
                <label class="block text-text-secondary text-sm mb-2">Fee: <span id="closedispenser-selected-fee-rate">3</span> (sats/vb) </label> 
                <div class="flex space-x-2">
                    <div class="relative w-full">
                        <label for="closedispenser-sats-per-vb-slider" class="sr-only">Labels range</label>
                        <input id="closedispenser-sats-per-vb-slider" type="range" value="3" min="1" max="200" step="0.1" class="sats-per-vb-slider w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
                        <span class="text-sm text-gray-500 dark:text-gray-400 absolute start-0 -bottom-6">1 sat/vb</span>
                        <span class="text-sm text-gray-500 dark:text-gray-400 absolute end-0 -bottom-6">200 sat/vb</span>
                    </div>
                </div>
            </div>    
        `,"Cancel Dispenser For " + escapeHtml(event.target.dataset.asset),"Submit transaction", closeDispenser);
    }
});