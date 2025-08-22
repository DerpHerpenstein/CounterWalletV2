import CounterpartyV2 from "../api/CounterpartyV2.js";

// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    if(event.target.id === "order-sats-per-vb-slider"){
        const selectedFee = document.getElementById('order-selected-fee-rate');
        selectedFee.innerText = `${event.target.value}`
    }
    else if(event.target.id === "order-submit-tx-btn"){
        try{
            let result = await CounterpartyV2.createOrderSatsPerVByte(
                walletProvider.walletAddress,                                // source address
                document.getElementById('order-selected-asset').innerText,   //asset name
                document.getElementById('order-asset-give-quantity').value,  //asset quantity
                document.getElementById('order-asset-get-asset').value,      //get asset name
                document.getElementById('order-asset-get-quantity').value,   //get asset quantity
                document.getElementById('order-expiration').value,           //expiration
                0,
                document.getElementById('order-sats-per-vb-slider').value,   // fee sats/vb
            );
            
            // Transaction submission modal
            let txData = result.result;
            window.prepareSignAndBroadcastPSBT(txData);
        }
        catch(e){
            generalModal.openError("Error composing transaction", e);
        }
        
    }
});