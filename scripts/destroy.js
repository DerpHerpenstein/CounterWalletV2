import CounterpartyV2 from "../api/CounterpartyV2.js";

// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    if(event.target.id === "destroy-sats-per-vb-slider"){
        const selectedFee = document.getElementById('destroy-selected-fee-rate');
        selectedFee.innerText = `${event.target.value}`
    }
    else if(event.target.id === "destroy-submit-tx-btn"){
        try{
            let result = await CounterpartyV2.destroySatsPerVByte(
                walletProvider.walletAddress,                                  // source address
                document.getElementById('destroy-selected-asset').innerText,   //asset name
                document.getElementById('destroy-asset-quantity').value,       //asset quantity
                document.getElementById('destroy-sats-per-vb-slider').value,   // fee sats/vb
                document.getElementById('destroy-asset-tag').value,           //asset memo
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