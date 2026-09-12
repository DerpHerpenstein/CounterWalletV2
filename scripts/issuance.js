import CounterpartyV2 from "../api/CounterpartyV2.js";

// inject the shared fee selector (slider + custom fee input) into this page
document.getElementById('issuance-fee-selector').innerHTML = window.generateFeeSelectorHtml('issuance');

// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    if(event.target.id === "issuance-generate-numeric"){
        document.getElementById('issuance-selected-asset').value = await CounterpartyV2.generateAvailableAssetName();
    }
    else if(event.target.id === "issuance-submit-tx-btn"){
        try{
            let result = await CounterpartyV2.createIssuanceSatsPerVByte(
                walletProvider.walletAddress,                                   // source address
                document.getElementById('issuance-destination-address').value,  // destination address
                document.getElementById('issuance-selected-asset').value,       //asset name
                document.getElementById('issuance-asset-quantity').value,       //asset quantity
                document.getElementById('issuance-asset-divisible').checked,      //asset divisible
                document.getElementById('issuance-asset-locked').checked,         //asset locked
                document.getElementById('issuance-asset-reset').checked,          //asset reset
                document.getElementById('issuance-asset-description').value,    //asset description
                window.getFeeSelectorValue('issuance'),                         // fee sats/vb
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