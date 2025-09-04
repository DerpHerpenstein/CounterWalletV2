import CounterpartyV2 from "../api/CounterpartyV2.js";
import UniSatConnect from "../wallets/UniSatConnect.js";
import OkxConnect from "../wallets/OkxConnect.js";
import LeatherConnect from "../wallets/LeatherConnect.js";
import ManualConnect from "../wallets/ManualConnect.js"
import "./bitcoinjs-lib.min.js"

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

        async function broadcastTaprootTx(tmpData, noModal){
            try{
                var url = "https://mempool.space/api/tx";
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'text/plain'
                    },
                    body: tmpData.signed_reveal_rawtransaction
                });
                
                const responseText = await response.text();
                if(response.ok === false){
                    throw new Error(responseText); // if we get not ok this is the error
                }
                else{
                    return responseText; // if we get ok this will be the tx hash
                }
            } catch (err) {
                // if we want a modal
                if(!noModal){
                    generalModal.openError("Error Submitting taproot tx!", err + " - " +JSON.stringify(tmpData));
                }
                throw new Error("Error Submitting taproot tx: " + err + " - " + JSON.stringify(tmpData));
            }
          
          }

        async function beginSignAndBroadcast(tmpData, isTaprootTx){
            try{
                console.log("Generated tx info", tmpData);
                // seperate behavior for manual wallet, need to show the data, but wont actually sign anything
                if(walletProvider.walletName === "manual"){
                    generalModal.open(`
                        <div class="space-y-4">
                            <div class="font-bold text-sm text-amber-500">
                                WARNING: This is a raw hex transaction. Signing it could steal everything in your wallet! Use a decoder and only sign this if you agree with it!
                            </div>
                            <h4 class="font-bold text-lg">Transaction Hex To Sign</h4>
                            <p class="text-text-primary">Use your wallet to manually sign this</p>
                            <div class="w-full h-20 overflow-y-auto bg-card-bg border border-border-color p-2">
                                <p class="text-text-primary">${escapeHtml(tmpData.rawtransaction)}</p>
                            </div>
                            ${isTaprootTx ? `
                            <div class="font-bold text-sm text-yellow-500">
                                WARNING: This reveal transaction must be submitted to finalize your counterparty transaction. Submit this transaction AFTER you sign and submit the one above.
                            </div>
                            <h4 class="font-bold text-lg">Signed Taproot Reveal Hex</h4>
                            <div class="w-full h-20 overflow-y-auto bg-card-bg border border-border-color p-2">
                                <p class="text-text-primary">${escapeHtml(tmpData.signed_reveal_rawtransaction)}</p>
                            </div>
                                ` : "" }
                        </div>
                    `, "Manually Sign Transaction", (isTaprootTx? "Broadcast Reveal Tx" : "Okay"), 
                    ()=> {
                        
                        if(isTaprootTx){
                            window.showToast(`Broadcasting taproot reveal tx...`, 'Info');
                            // wait for the first tx to propagate for a few seconds
                            setTimeout( async () => {
                                try{
                                    let taprootResult = await broadcastTaprootTx(tmpData, true);
                                    console.log(taprootResult);
                                    window.showToast(`
                                        Reveal Transaction successful!<br>
                                        <a href="https://mempool.space/tx/${taprootResult}" class="text-accent-blue hover:text-accent-purple" target="_blank">View on Mempool.space</a>
                                        `, 'success');
                                    generalModal.close(); 
                                }
                                catch(e){
                                    console.log("Error broadcasting reveal", e);
                                    window.showToast(`
                                        Reveal Transaction broadcast failed!<br>
                                        ${e}
                                        `, 'error');
                                }
                            },100);
                        }
                        else{
                            generalModal.close(); 
                        }
                    } );

                }
                else{
                    let finalPsbt = window.rawHexToPsbt(tmpData.rawtransaction, walletProvider.walletAddress, tmpData.inputs_values, null);
                    console.log("Corrected PSBT", finalPsbt);
                    let result = await walletProvider.signAndBroadcastPSBT(finalPsbt);
                    window.showToast(`
                        Transaction successful!<br>
                        <a href="https://mempool.space/tx/${result}" class="text-accent-blue hover:text-accent-purple" target="_blank">View on Mempool.space</a>
                        `, 'success');
                    console.log("Signed Tx Hash",result);
                    if(isTaprootTx){
                        window.showToast(`Broadcasting taproot reveal tx...`, 'Info');
                        // wait for the first tx to propagate for a few seconds
                        setTimeout( async () => {
                            let taprootResult = await broadcastTaprootTx(tmpData);
                            window.showToast(`
                                Reveal Transaction successful!<br>
                                <a href="https://mempool.space/tx/${taprootResult}" class="text-accent-blue hover:text-accent-purple" target="_blank">View on Mempool.space</a>
                                `, 'success');
                        },5000);

                    }
                }
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
            beginSignAndBroadcast(txData, isTaprootTx);
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

        function showWalletAddress(addr) {
            return `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;
        }

        //console.log(e.target)
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
                document.getElementById('wallet-connect-text').innerText = showWalletAddress(walletProvider.walletAddress);
                window.currentPage = "myassets";
                setActivePage(currentPage);
            }
            catch(e){
                window.generalModal.openError("Error connecting wallet", e);
            }
        }
        // connect okx
        else if(e.target.id === "wallet-okx"){
            try{
                walletProvider = new OkxConnect();
                await walletProvider.connect();
                console.log(walletProvider)
                walletModal.classList.remove('active');
                document.getElementById('wallet-connect-text').innerText = showWalletAddress(walletProvider.walletAddress);
                window.currentPage = "myassets";
                setActivePage(currentPage);
            }
            catch(e){
                window.generalModal.openError("Error connecting wallet", e);
            }
        }
        else if(e.target.id === "wallet-leather"){
            try{
                walletProvider = new LeatherConnect();
                await walletProvider.connect();
                console.log(walletProvider)
                walletModal.classList.remove('active');
                document.getElementById('wallet-connect-text').innerText = showWalletAddress(walletProvider.walletAddress);
                window.currentPage = "myassets";
                setActivePage(currentPage);
            }
            catch(e){
                window.generalModal.openError("Error connecting wallet", e);
            }
        }
        else if(e.target.id === "wallet-manual"){
            let tmpAddress = document.getElementById('wallet-modal-address-input').value;
            try{
                if(tmpAddress.length == 0){
                    throw new Error("Enter an address to connect")
                }
                bitcoin.address.toOutputScript(tmpAddress, bitcoin.networks.bitcoin);
                walletProvider = new ManualConnect();
                await walletProvider.connect(tmpAddress);
                console.log(walletProvider);
                walletModal.classList.remove('active');
                document.getElementById('wallet-connect-text').innerText = showWalletAddress(walletProvider.walletAddress);
                window.currentPage = "myassets";
                setActivePage(currentPage);
            }
            catch(e){
                generalModal.openError("Wallet connect error", e);
            }
            
        }
    });
  