import CounterpartyV2 from "../api/CounterpartyV2.js";

// add event listener to the main and then check that the class/id matches for each event
document.getElementById('main').addEventListener('click', async function(event) {

    if(event.target.id === "send-sats-per-vb-slider"){
        const selectedFee = document.getElementById('send-selected-fee-rate');
        selectedFee.innerText = `${event.target.value}`
    }
    else if(event.target.id === "send-submit-tx-btn"){
        try{
            let result = await CounterpartyV2.transferSatsPerVByte(
                walletProvider.walletAddress,                               // source address
                document.getElementById('send-destination-address').value,  // destination address
                document.getElementById('send-selected-asset').innerText,           //asset name
                document.getElementById('send-asset-quantity').value,       //asset quantity
                document.getElementById('send-sats-per-vb-slider').value,   // fee sats/vb
                document.getElementById('send-asset-memo').value,           //asset memo
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