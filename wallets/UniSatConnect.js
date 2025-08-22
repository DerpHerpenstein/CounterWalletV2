
/**
 * A class to make btc easier to deal with
 */
class UniSatConnect {
 
    constructor() {
      this.connected = null;
      this.connectType = null;
      this.walletAddress = null;
      this.walletName = null;
      this.publicKey = null; 
    }

    /**
     * Returns the tx hash or throws an error in case of failure
     * @param rawTxHex
     * @returns {Promise<*>}
     */
    async broadcastPSBT(rawTxHex){
        try {
            let res = await window.unisat.pushPsbt(rawTxHex);
            return res;

        } 
        catch (error) {
            console.log("Broadcast failed", error);
            // re-throw the error so it can be handled by the caller
            throw error;
        }
    }

        /**
         * Returns the tx hash or throws an error in case of failure
         * @param rawTxHex
         * @returns {Promise<*>}
         */
        async broadcastTx(rawTxHex){
            try {
                let res = await window.unisat.pushTx({
                    rawtx:rawTxHex
                });
                return res;
    
            } 
            catch (error) {
                console.log("Broadcast failed", error);
                // re-throw the error so it can be handled by the caller
                throw error;
            }
        }


    signPSBT = async(rawPSBT) => {
        let signedPsbt = await window.unisat.signPsbt(rawPSBT); 
        return signedPsbt;
    }


    signAndBroadcastPSBT = async (psbt) => { 
            try {
                let signedPSBT = await this.signPSBT(psbt);
                let result = await this.broadcastPSBT(signedPSBT);
                return(result)


            } catch (error) {
                throw new Error(`Error signing PSBT: ${error.message}`);
            }

    }

    static isUnisatInstalled = () => {
        if (typeof window !== 'undefined') {
            return typeof window.unisat !== 'undefined';
        } else {
            return false;
        }
    }

    async connect() {
        this.connected = false;
        // check if UniSat is installed
        if (UniSatConnect.isUnisatInstalled()) {
            try {
                let accounts = await window.unisat.requestAccounts();
                    this.walletAddress = accounts[0];
                    this.publicKey = await window.unisat.getPublicKey();
                    this.walletName = "unisat";
                    this.connected = true;
              } catch (error) {
                // console.log(`Connect failed. ${e.message}`);
                // re-throw the error so it can be handled by the caller
                throw error;
              }
        } else {
            throw new Error('UniSat Wallet is not installed');
        }
    }
    
}

export default UniSatConnect;