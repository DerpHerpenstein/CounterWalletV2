import CounterpartyV2 from "../api/CounterpartyV2.js";
import UniSatConnect from "../wallets/UniSatConnect.js";

    // Wallet modal functionality
    const walletBtn = document.getElementById('wallet-connect-btn');
    const closeWalletModal = document.getElementById('close-wallet-modal');
    const walletModal = document.getElementById('wallet-modal');

    //const connectUniSatButton = document.getElementById('wallet-unisat');
    //console.log(connectUniSatButton);
    window.walletProvider = null;

    window.prepareSignAndBroadcastPSBT = async (counterpartyTxData) => {
        let txData = JSON.parse(JSON.stringify(counterpartyTxData)); // create a new object
        console.log("Recent Transaction Data", txData);

        async function beginSignAndBroadcast(tmpData){
            try{
                console.log("Generated tx info", tmpData)
                let finalPsbt = window.rawHexToPsbt(tmpData.rawtransaction, walletProvider.walletAddress, tmpData.inputs_values, null);
                console.log("Corrected PSBT", finalPsbt);
                let result = await walletProvider.signAndBroadcastPSBT(finalPsbt);
                console.log(result);
            }
            catch(e){
                generalModal.openError("Error signing transaction", e);
            }
        }

        function createParamsTable(tmpData){
            let objKeys = Object.keys(tmpData);

            let tableHtml = `
                <h3 class="text-lg font-semibold mb-4">Parameters</h3>
                <div class="glass-card rounded-xl p-6 overflow-y-auto max-h-[35vh]">                
                    <div>
                            `
            for(const key of objKeys){
                
                tableHtml += `
                        <label class="block text-text-secondary text-sm mb-2">${window.escapeHtml(key)}</label>
                        <div class="flex space-x-2">
                            <span>&nbsp;${window.escapeHtml(JSON.stringify(tmpData[key]))}</span>
                        </div>
                `;
            }         
            tableHtml += `
                    </div>
                </div>
                `;
            return tableHtml;
            
        }
        
        const isTaprootTx = txData?.signed_reveal_rawtransaction;
        if(isTaprootTx){
            setTimeout(() => { window.downloadJSON(txData, "counterparty-taproot-tx-" + Date.now() + ".json"); }, 2000);
        }

        generalModal.open(`
            <div class="space-y-4">
                <h4 class="font-bold text-lg">Transaction Type: ${window.escapeHtml(txData.name)}</h4>
                ${isTaprootTx ? `<div class="font-bold text-sm text-amber-500">WARNING: Taproot transaction! This type of transaction requires a reveal tx to be submitted. 
                                                            if it is not submitted, you will lose the bitcoin sent to the reveal address <br><br>
                                                            <span class="text-yellow-300">Save the file before signing your transaction!</span></div>` : "" }
                ${createParamsTable(txData.params)}
            </div>
        `, "Confirm Transaction", "Yes", 
        ()=> {
            generalModal.close(); 
            beginSignAndBroadcast(txData);
        } );
        
    }
    
    if (walletBtn) {
        walletBtn.addEventListener('click', function() {
            walletModal.classList.add('active');
        });
    }
    
    if (closeWalletModal) {
        closeWalletModal.addEventListener('click', function() {
            walletModal.classList.remove('active');
        });
    }
    
    // Close modal when clicking outside
    walletModal.addEventListener('click', async function(e) {
        console.log(e.target)
        if (e.target === walletModal) {
            walletModal.classList.remove('active');
        }
        // connect to unisat wallet
        else if(e.target.id === "wallet-unisat"){
            try{
                walletProvider = new UniSatConnect();
                await walletProvider.connect();
                console.log(walletProvider)
                walletModal.classList.remove('active');
                document.getElementById('wallet-connect-text').innerText = walletProvider.walletAddress;
                setActiveType(currentPage);
                CounterpartyV2.getUserAssets(walletProvider.walletAddress,0,1000).then( (res) => {
                    if(!window.dataStore.assets){
                        window.dataStore.assets = {};
                        window.dataStore.assets[walletProvider.walletAddress] = {epoch: Date.now(), result: res.result};
                    }

                });
            }
            catch(e){
                window.generalModal.openError("Error connecting wallet", e);
            }
        }
    });
  