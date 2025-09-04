class CounterpartyV2 {

    static baseEndpoint = "https://api.counterparty.io:4000/v2/";
    static composeSuffix = "&allow_unconfirmed_inputs=true"

    /**
     * Calls the REST API
     *
     * @param endpoint {string} - the specific endpoint for the API request
     * @param endpointSuffix {string} - the specific endpoint suffix for the API request
     * @param formData {string} - the form data for the API request
     * @param caching {boolean} - whether to cache the response. False by default
     * @returns {Promise<void>} - the response from the API
     */

    static async callAPI(endpoint, endpointSuffix, formData, caching = false){
        console.log(this.baseEndpoint + endpoint + "?" + formData + endpointSuffix);
        let response = await fetch(this.baseEndpoint + endpoint + "?" + formData + endpointSuffix);

        let responseJSON = await response.json();
        if(responseJSON.result){
            return responseJSON;
        }
        throw new Error(responseJSON.error);
    }

    static generateRandomNumber(min,max){
        return Math.floor(Math.random() * (max - min) ) + min;
    }

    static async normalizeToSatsIfNeeded(assetName, valueString){
        // checks if the asset is divisible, if it is returns the normalized value
        // if its not, returns the original value
        let assetResponse = await this.getAsset(assetName);
        let isDivisible = assetResponse.result.divisible;
        if(isDivisible){
            let normalizedValue = parseFloat(valueString);
            return parseInt(normalizedValue*1e8);
        }
        return valueString;
        
    }

    static async generateAvailableAssetName(){
        let max_asset_id = 2**64 - 1
        let min_asset_id = 26**12 + 1
        let asset_name = "A" + this.generateRandomNumber(min_asset_id - 8008, max_asset_id - 8008);
        let nameAvailable = false;
        let count = 0;
        while(!nameAvailable){
            asset_name = "A" + this.generateRandomNumber(min_asset_id - 8008, max_asset_id - 8008);
            nameAvailable = await this.checkAssetAvailability(asset_name);
            count++;
            if(count > 10)
                throw new Error("Unable to get asset name!");
        }
        return asset_name
    }

    static async getLatestIssuances(page, pageSize = 100, filter='all') {
        page -=1;
        try {
            let payload = `limit=${pageSize}&offset=${pageSize*page}&asset_events=${filter}`;
            let response = await this.callAPI(`issuances`, "", payload);
            return response;

        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getLatestTransactions(page, pageSize = 100) {
        page -=1;
        try {
            let payload = `limit=${pageSize}&offset=${pageSize*page}&verbose=true`;
            let response = await this.callAPI(`transactions`, "", payload);
            return response;

        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getUserAssets(walletAddress, page, pageSize = 100) {
        page -=1;
        try {
            let payload = `addresses=${walletAddress}&limit=${pageSize}&offset=${pageSize*page}&verbose=true`;
            let response = await this.callAPI("addresses/balances", "", payload);
            return response;

        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAsset(asset){
        try {
            return (await this.callAPI("assets/" + asset, "", ""));
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getIssuances(walletAddress, page, pageSize = 100) {
        page -=1;
        try {
            let payload = `status=open&limit=${pageSize}&offset=${pageSize*page}`;
            let response = await this.callAPI(`addresses/${walletAddress}/issuances`, "", payload);
            return response;

        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDispensers(identifier, page, pageSize = 100) {
        page -=1;
        try {
            console.log(identifier);
            if(identifier.length === 0){
                // get latest
                let payload = `status=open&limit=${pageSize}&offset=${pageSize*page}&verbose=true`;
                let response = await this.callAPI(`dispensers`, "", payload);
                return response;
            }
            if(identifier.length < 25){ // minimum address known is 26b
                // get by asset
                let payload = `status=open&limit=${pageSize}&offset=${pageSize*page}&verbose=true`;
                let response = await this.callAPI(`assets/${identifier}/dispensers`, "", payload);
                return response;
            }
            else{
                // get by address
                let payload = `status=open&limit=${pageSize}&offset=${pageSize*page}&verbose=true`;
                let response = await this.callAPI(`addresses/${identifier}/dispensers`, "", payload);
                return response;
            }
        } catch (error) {
            throw new Error(error.message);
        }

    }

    static async getDispenses(identifier, page, pageSize = 100) {
        page -=1;
        try {
            if(identifier.length < 25){ // minimum address known is 26b
                // get by asset
                let payload = `status=open&limit=${pageSize}&offset=${pageSize*page}`;
                let response = await this.callAPI(`assets/${identifier}/dispenses`, "", payload);
                return response;
            }
            else{
                // get by address
                let payload = `status=open&limit=${pageSize}&offset=${pageSize*page}`;
                let response = await this.callAPI(`addresses/${identifier}/dispenses`, "", payload);
                return response;
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getHolders(asset, page, pageSize = 100) {
        page -=1;
        try {
            let payload = `status=open&limit=${pageSize}&offset=${pageSize*page}`;
            let response = await this.callAPI(`assets/${asset}/holders`, "", payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getFairminters(page, pageSize = 100) {
        page -=1;
        try {
            let payload = `status=open&limit=${pageSize}&offset=${pageSize*page}`;
            let response = await this.callAPI(`fairminters`, "", payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDexOrders(walletAddress, page, pageSize = 100) {
        page -=1;
        try {
            let payload = `status=open&limit=${pageSize}&offset=${pageSize*page}&verbose=true`;
            let response = await this.callAPI(`addresses/${walletAddress}/orders`, "", payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async checkAssetAvailability(assetName) {
        try {
            let payload = `show_unconfirmed=true`;
            let response = await this.callAPI(`assets/${assetName}`, "", payload);
            return false;

        } catch (error) {
            if(error.message == "Not found") return true;
            throw new Error(error.message);
        }
    }
    /*
    static async createIssuanceSatsPerVByte(sourceAddress, destinationAddress, 
        assetName, quantity, divisible, 
        locked, descriptionData, satsPerVByte, encoding, mimeType, inscription) {

        try {
            let payloadObject = {
                destinationAddress:destinationAddress,
                asset: assetName,
                quantity: quantity,
                divisible: divisible,
                lock: locked,
                description: descriptionData,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                return_psbt: true,
                encoding: encoding,
                mime_type: mimeType,
                inscription: inscription
            }
            if(destinationAddress != sourceAddress)
                payloadObject.transfer_destination = destinationAddress;

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/issuance`, this.composeSuffix, payload);
            
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    */

    static async createIssuanceSatsPerVByte(sourceAddress, destinationAddress, 
        assetName, quantity, divisible, 
        locked, reset, descriptionData, satsPerVByte) {

        try {
            let payloadObject = {
                destinationAddress:destinationAddress,
                asset: assetName,
                quantity: quantity,
                divisible: divisible,
                lock: locked,
                reset: reset,
                description: descriptionData,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                return_psbt: true,
            }
            if(destinationAddress != sourceAddress)
                payloadObject.transfer_destination = destinationAddress;

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/issuance`, this.composeSuffix, payload);
            
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async dispenserUpdateSatsPerVByte(sourceAddress, assetName, 
                                giveQuantity, escrowQuantity, 
                                ratePerGiveInSats, status,  satsPerVByte) {
        try {
            giveQuantity = await this.normalizeToSatsIfNeeded(assetName, giveQuantity);
            escrowQuantity = await this.normalizeToSatsIfNeeded(assetName, escrowQuantity);
            let payloadObject  = {
                asset: assetName,
                give_quantity: giveQuantity,
                escrow_quantity: escrowQuantity,
                mainchainrate: ratePerGiveInSats,
                status: status,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                return_psbt: true,
            }

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/dispenser`, this.composeSuffix, payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async dispenserBuySatsPerVByte( sourceAddress, dispenserAddress, 
                                quantity, satsPerVByte){
        try {
            let payloadObject = {
                dispenser: dispenserAddress,
                quantity: quantity,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                return_psbt: true,
            }

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/dispense`, this.composeSuffix, payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }

    }

    static async transferSatsPerVByte(sourceAddress, destinationAddress, assetName, 
                        quantity, satsPerVByte, memo="None", memoIsHex="False") {
        try {
            quantity = await this.normalizeToSatsIfNeeded(assetName, quantity);
            let payloadObject = {
                destination: destinationAddress,
                asset:assetName,
                quantity: quantity,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                memo: memo,
                memo_is_hex: memoIsHex,
                return_psbt: true,
            }

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/send`, this.composeSuffix, payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // TODO: make MPMA AUTOMATICALLY NORMALIZE ASSETS
    static async mpmaSatsPerVByte(sourceAddress, destinationAddresses, assetNames, 
                        quantities, satsPerVByte, memo="None", memoIsHex="False", memos="None", memosAreHex="False") {
        try {
            let payloadObject = {
                address: sourceAddress,
                destinations: destinationAddresses,
                assets:assetNames,
                quantities: quantities,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                encoding: "taproot",
                return_psbt: true,
            }

            if(memo !== "None"){
                payloadObject.memo = memo;
                payloadObject.memo_is_hex = memoIsHex;
            }
            else if(memos !== "None"){
                payloadObject.memos = memos;
                payloadObject.memos_are_hex = memosAreHex; 
            }

            console.log(payloadObject);

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/mpma`, this.composeSuffix, payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async destroySatsPerVByte(sourceAddress, assetName, 
                        quantity, satsPerVByte, tag) {
        try {
            quantity = await this.normalizeToSatsIfNeeded(assetName, quantity);
            let payloadObject = {
                asset:assetName,
                quantity: quantity,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                tag: tag,
                return_psbt: true,
            }

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/destroy`, this.composeSuffix, payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async dividendSatsPerVByte(sourceAddress, quantityPerUnit, assetName, 
                        dividendAssetName, satsPerVByte) {
        try {
            quantity_per_unit = await this.normalizeToSatsIfNeeded(dividendAssetNamessetName, quantity_per_unit);
            let payloadObject = {
                quantity_per_unit:quantityPerUnit,
                asset:assetName,
                dividend_asset:dividendAssetName,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                return_psbt: true,
            }

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/dividend`, this.composeSuffix, payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async createOrderSatsPerVByte(sourceAddress, giveAssetName, giveAssetQuantity, 
                        getAssetName, getAssetQuantity, expiration, feeRequired, satsPerVByte) {
        try {
            giveAssetQuantity = await this.normalizeToSatsIfNeeded(giveAssetName, giveAssetQuantity);
            getAssetQuantity = await this.normalizeToSatsIfNeeded(getAssetName, getAssetQuantity);
            let payloadObject = {
                give_asset:giveAssetName,
                give_quantity: giveAssetQuantity,
                get_asset: getAssetName,
                get_quantity: getAssetQuantity,
                expiration: expiration,
                fee_required: feeRequired,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                return_psbt: true,
            }

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/order`, this.composeSuffix, payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async createCancelSatsPerVByte(sourceAddress, orderTxHash, satsPerVByte) {
        try {
            let payloadObject = {
                offer_hash: orderTxHash,
                fee_required: feeRequired,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                return_psbt: true,
            }

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/order`, this.composeSuffix, payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async fairmintSatsPerVByte(sourceAddress, assetName, satsPerVByte) {
        try {
            let payloadObject = {
                asset:assetName,
                fee_per_kb: parseInt("" + (satsPerVByte * 1000)),
                return_psbt: true,
            }

            let payload = new URLSearchParams(payloadObject).toString();
            let response = await CounterpartyV2.callAPI(`addresses/${sourceAddress}/compose/fairmint`, this.composeSuffix, payload);
            return response;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
}

export default CounterpartyV2;
