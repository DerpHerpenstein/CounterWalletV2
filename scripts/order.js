import CounterpartyV2 from "../api/CounterpartyV2.js";

// inject the shared fee selector (slider + custom fee input) into this page
document.getElementById('order-fee-selector').innerHTML = window.generateFeeSelectorHtml('order');

// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    if(event.target.id === "order-submit-tx-btn"){
        try{
            let result = await CounterpartyV2.createOrderSatsPerVByte(
                walletProvider.walletAddress,                                // source address
                document.getElementById('order-selected-asset').innerText,   //asset name
                document.getElementById('order-asset-give-quantity').value,  //asset quantity
                document.getElementById('order-asset-get-asset').value,      //get asset name
                document.getElementById('order-asset-get-quantity').value,   //get asset quantity
                document.getElementById('order-expiration').value,           //expiration
                0,
                window.getFeeSelectorValue('order'),                         // fee sats/vb
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