
// TODO:  fix leather support to work... lol

/**
 * A class to make btc easier to deal with
 */
class LeatherConnect {
 
    constructor() {
      this.connected = null;
      this.connectType = null;
      this.walletAddress = null;
      this.publicKey = null;
    }

    /**
     * Returns the tx hash or throws an error in case of failure
     * @param rawPSBTHex
     * @returns {Promise<*>}
     */
    async broadcastPSBT(signedPSBT){
        throw new Error("broadcastPSBT Not implimented");
    }


    // signs and broadcasts a PSBT
    signPSBT = async(rawPSBT) => {
        throw new Error("signPSBT Not implimented");
    }

    signAndBroadcastPSBT = async (signedPSBT) => { 
        try {
            let requestParams = {
                hex: signedPSBT,
                broadcast: true      // default is false - finalize/broadcast tx
              }
    
            let signedPsbt = await window.LeatherProvider.request('signPsbt', requestParams);
            if(signedPsbt.result?.hex){
                const psbt = bitcoinjs.Psbt.fromHex(signedPsbt.result.hex);
                psbt.finalizeAllInputs();
                const txHex = psbt.extractTransaction().toHex();
                const tx = bitcoinjs.Transaction.fromHex(txHex);
                return tx.getId();
            }
            else{
                throw new Error('Sign failed');
            }
            
        } 
        catch (error) {
            console.log("Broadcast failed", error);
            // re-throw the error so it can be handled by the caller
            throw new Error('Broadcast failed');
        }

}

    static isLeatherInstalled = () => {
        if (typeof window !== 'undefined') {
            return typeof window?.LeatherProvider !== "undefined";
        } else {
            return false;
        }
    }
    
    static accountFromDerivationPath(path) {
        const account = parseInt(segments[3].replaceAll("'", ""), 10);	
        if (isNaN(account)) throw new Error("Cannot parse account number from path");	
        return account;	
    }

    async connect() {
        this.connected = false;
        // check if leather is installed
        if (LeatherConnect.isLeatherInstalled()) {
            try {
                let response = await window.LeatherProvider?.request('getAddresses'); 
                let account = accountFromDerivationPath(response.result.addresses[0].derivationPath);
                
                if (typeof account !== 'undefined') {
                    this.walletAddress = await window.LeatherProvider?.request("getAddresses");
                    this.publicKey = account.publicKey
                    this.accountNumber = LeatherConnect.extractAccountNumber(account.derivationPath);
                    this.connected = true;
                    console.log("Connected with Leather: ", this.walletAddress);

                } else
                    throw new Error('Account type error');
              } catch (error) {
                // re-throw the error so it can be handled by the caller
                throw error;
              }
        } else {
            throw new Error('Leather Wallet is not installed');
        }
    }

    static extractAccountNumber(path) {
        const segments = path.split('/');
        const accountNum = parseInt(segments[3].replaceAll("'", ''), 10);
        if (isNaN(accountNum)) throw new Error('Cannot parse account number from path');
        return accountNum;
      }
    
}

export default LeatherConnect;