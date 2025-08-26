import CounterpartyV2 from "../api/CounterpartyV2.js";

let page = 0;
let fairminterData = [];

document.getElementById('general-modal').addEventListener('click', async function(event) {
    if(event.target.id === "fairmint-sats-per-vb-slider"){
        const selectedFee = document.getElementById('fairmint-selected-fee-rate');
        selectedFee.innerText = `${event.target.value}`
    }
})

document.getElementById('main').addEventListener('click', async function(event) {
    const mintFairmint = async() =>{
        try{
            let result = await CounterpartyV2.fairmintSatsPerVByte(
                walletProvider.walletAddress,                                   // source address
                event.target.dataset.asset,                                     //asset name
                document.getElementById('fairmint-sats-per-vb-slider').value,   // fee sats/vb
            );
            
            // Transaction submission modal
            let txData = result.result;
            window.prepareSignAndBroadcastPSBT(txData);
        }
        catch(e){
            generalModal.openError("Error composing transaction", e);
        }
    }

    const updateFairminters = () => {
        document.getElementById('fairmint-fairminter-data').innerHTML = "";
        for(let i=0; i< fairminterData.length; i++){
            document.getElementById('fairmint-fairminter-data').innerHTML += 
                `<div class="fairmint-card glass-card rounded-xl overflow-hidden border border-border-color relative">
                    <div class="p-2">
                        <h4>Asset: ${window.escapeHtml(fairminterData[i].asset)}</h4>
                        <p>${window.escapeHtml(JSON.stringify(fairminterData[i],null,2))}</p>
                        <button data-asset="${window.escapeHtml(fairminterData[i].asset)}"
                                data-description="${window.escapeHtml(fairminterData[i].description)}"
                            class="fairmint-mint-btn btn-primary px-6 py-3 rounded-lg flex items-center justify-center">
                            Mint
                        </button>
                    </div>
                </div>`
                
        }
    }

    //load more fairmints
    if (event.target.id === 'fairmint-load-fairminters-btn') {
        try{
            let response = await CounterpartyV2.getFairminters(page,50);
            fairminterData = fairminterData.concat(response.result);
            //console.log(fairminterData);
            page++;
            updateFairminters();
        }
        catch(e){
            generalModal.openError("Error getting fairminters", e);
        }
    }

    // if the user clicks a fairmint mint-btn, we need to open the fairmint-mint modal
    else if(event.target.classList.contains('fairmint-mint-btn')){
        window.generalModal.open(`
            <div class="mb-6">
                <p class="text-text-primary">Description:</p>
                <div class="w-full h-20 overflow-y-auto bg-card-bg border border-border-color p-2">
                    <p class="text-text-primary">${escapeHtml(event.target.dataset.description)}</p>
                </div>
                <div class="m-10"></div>
                <label class="block text-text-secondary text-sm mb-2">Fee: <span id="fairmint-selected-fee-rate">3</span> (sats/vb) </label> 
                <div class="flex space-x-2">
                    <div class="relative w-full">
                        <label for="fairmint-sats-per-vb-slider" class="sr-only">Labels range</label>
                        <input id="fairmint-sats-per-vb-slider" type="range" value="3" min="1" max="200" step="0.1" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">
                        <span class="text-sm text-gray-500 dark:text-gray-400 absolute start-0 -bottom-6">1 sat/vb</span>
                        <span class="text-sm text-gray-500 dark:text-gray-400 absolute end-0 -bottom-6">200 sat/vb</span>
                    </div>
                </div>
            </div>    
        `,"Fairmint - " + escapeHtml(event.target.dataset.asset),"Mint", mintFairmint);
    }
});