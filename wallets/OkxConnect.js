
/**
 * A class to make btc easier to deal with
 */
class OkxConnect {
 
    constructor() {
      this.connected = null;
      this.connectType = null;
      this.walletAddress = null;
      this.publicKey = null;
    }

    /**
     * Returns the tx hash or throws an error in case of failure
     * @param rawTxHex
     * @returns {Promise<*>}
     */
    async broadcastPSBT(rawTxHex){
        try {
            // this actually both signs and broacasts!
            let res = await window.okxwallet.bitcoin.pushPsbt(rawTxHex);
            return res;

        } 
        catch (error) {
            console.log("Broadcast failed", error);
            // re-throw the error so it can be handled by the caller
            throw error;
        }
    }


    signPSBT = async(rawPSBT) => {
        let signedPsbt = await window.okxwallet.bitcoin.signPsbt(rawPSBT);
        return signedPsbt;
    }

    signAndBroadcastPSBT = async (psbt) => {
        try {
            let signedPsbt = await window.okxwallet.bitcoin.signPsbt(psbt);
            let result = await window.okxwallet.bitcoin.pushPsbt(signedPsbt);
            return(result)

        } catch (error) {
            throw new Error(`Error signing PSBT: ${error.message}`);
        }

    }

    static isOkxInstalled = () => {
        if (typeof window !== 'undefined') {
            return typeof window.okxwallet !== 'undefined';
        } else {
            return false;
        }
    }

    async connect() {
        this.connected = false;
        // check if Okx is installed
        if (OkxConnect.isOkxInstalled()) {
            try {
                let accounts = await window.okxwallet.bitcoin.requestAccounts();
                let selectedAccount = await window.okxwallet?.bitcoin?.selectedAccount;
                //console.log("selectedAccount: ", selectedAccount);

                if (typeof selectedAccount !== 'undefined') {
                    this.walletAddress = selectedAccount.address;
                    this.publicKey = selectedAccount.publicKey
                    this.connected = true;
                    this.walletName = "okx";
                    console.log("Connected with Okx: ", this.walletAddress);
                    // console.log("pubkey: ", this.publicKey);
                } else
                    throw new Error('Error accession account');
              } catch (error) {
                // console.log(`Connect failed. ${e.message}`);
                // re-throw the error so it can be handled by the caller
                throw error;
              }
        } else {
            throw new Error('Okx Wallet is not installed');
        }
    }
    
}

export default OkxConnect;