/**
 * Created by nikolai on 17/06/16.
 */
givahoyApp.factory('ServerApi', ['LocalData', 'Server', function(LocalData, Server) {
    var ServerDataObjects = {
        charities: [],
        userBalance: 0,
        transactionHistory: []
    };

    function Initialise(onCallback, location){
        var initialiseRequest = new ServerDataRequestBuilder();

        if(typeof location !== 'undefined'){
            console.log("Location detected");
            initialiseRequest = initialiseRequest.useLocation(location)
        }
        var request = initialiseRequest
            .initialCall()
            .build();

        Server.sendRequest(request)
            .then(function (result) {
                console.log(JSON.stringify(result));
                ServerDataObjects.charities.push.apply(ServerDataObjects.charities, ServerResultGetCharities(result));
                ServerDataObjects.userBalance = ServerResultGetBalance(result);
                ServerDataObjects.transactionHistory.push.apply(ServerDataObjects.transactionHistory, ServerResultGetTransactionHistory(result));
                onCallback();
            }).catch(function (result) {
            showErrorModal("There was a problem contacting the server, check your internet connection or try again later", false);
        });
    }

    function makeTransaction(amount, charityValue, onCallBack){
        var body = transactionDataBody(amount, charityValue);
        console.log(JSON.stringify(body));
        console.log("make transaction called in factory");
        Server.sendRequest(body)
            .then(function(result){
                ServerDataObjects.userBalance = ServerResultGetBalance(result);
                /*
                 var newItem = ServerResultGetTransactionHistory(result);
                 ServerDataObjects.transactionHistory.push(newItem);
                 */
                onCallBack("Success");
            })
            .catch(function(result){
                onCallBack("Fail");
            });


    }

    function GetCharityFromBeacon(beacon, onCallBack){
        console.log("getcharitiesfrombeacon called");
        var beacons = [];
        beacons.push(beacon);
        var request = new ServerDataRequestBuilder();
        request.useBeacons(beacons);
        var builtRequest = request.build();

        console.log(JSON.stringify(builtRequest));
        Server.sendRequest(request.build())
            .then(function (result) {
                console.log("Data for beacon returned");
                var convertedCharities = ServerResultGetCharities(result);
                ServerDataObjects.charities.push.apply(ServerDataObjects.charities, convertedCharities);
                onCallBack();
            });
    }

    function GetCharitiesFromLocation(location, onCallBack){
        var request = new ServerDataRequestBuilder();
        request.useLocation(location);
        var builtRequest = request.build();
        Server.sendRequest(builtRequest)
            .then(function (result) {
                var newCharities = ServerResultGetCharities(result);
                console.log(newCharities);
                //Check if Charity is already in list
                var charityAlreadyExists;
                for(var newCharityindex in newCharities){
                    charityAlreadyExists = false;
                    for(existingCharityIndex in ServerDataObjects.charities){
                        if(newCharities[newCharityindex].value === ServerDataObjects.charities[existingCharityIndex].value){
                            charityAlreadyExists = true;
                        }
                    }
                    if(charityAlreadyExists == false){
                        ServerDataObjects.charities.push(newCharities[newCharityindex]);
                    }
                }
                onCallBack();
            }).catch(function (result) {
            showErrorModal("There was a problem contacting the server, check your internet connection or try again later", true);
        });
    }
    function deleteLocations(onCallBack){
        //iterates through array backwards to avoid problems using index in for statement
        var i = ServerDataObjects.charities.length
        while(i--) {
            if(ServerDataObjects.charities[i].type === "l"){
                console.log(ServerDataObjects.charities);
                console.log("Charity removed: " + ServerDataObjects.charities[i].name);
                ServerDataObjects.charities.splice(i, 1);
                console.log(ServerDataObjects.charities);
            }
        }
        onCallBack();
    }
    function registerUser(email, onCallBack){
        var body = registerUserDataBody(email);
        Server.sendRequest(body)
            .then(function(result){
                onCallBack("Success");
            })
            .catch(function(result){
                console.log(result);
                onCallBack("Fail");
            });
    }

    /*
     Builder object that creates a JSON body for a charity information request that's readable by the server.
     */
    var ServerDataRequestBuilder = function(){
        this.body = {};
        this.body.vuid = LocalData.user.uid;
        this.body.tuuid = LocalData.user.uuid;
        this.body.vrandom = LocalData.user.UserDeviceID;
        this.retrieveInitialCall = false;
        this.retrieveLocation = false;
        this.retrieveBeacons = false;
        this.mockTriggerError = false;

        //Used by mock server to test Json error handling
        this.triggerError = function(){
            this.mockTriggerError = true;
            return this;
        };
        this.initialCall = function(){
            this.retrieveInitialCall = true;
            return this;
        };
        this.useLocation = function(locationData){
            this.retrieveLocation = true;
            this.body.llatitude = locationData.coords.latitude;
            this.body.llongitude = locationData.coords.longitude;
            return this;
        };
        this.useBeacons = function(beaconData){
            this.body.beaconlist = (
                createJsonForBeacons(beaconData)
            );
            this.retrieveBeacons = true;
            return this;
        };
        this.build = function(){

            if(this.mockTriggerError == true){
                this.body.saction = "Error";
            }
            else{
                if(this.retrieveBeacons == true){
                    this.body.saction = "GetBeacons"
                }
                if(this.retrieveLocation == true && this.retrieveInitialCall == false){
                    this.body.saction = "GetLocation";
                }
                if(this.retrieveInitialCall == true){
                    this.body.saction = "GetInitial";
                }
            }
            return this.body;
        };
    };
    function registerUserDataBody(email){
        /*
         Example data:
         "saction": "MakeTransaction",
         "tuuid": device.uuid,
         "vuid": localStorage.uid,
         "vrandom": localStorage.vrandom
         "email": email
         Every value must be accounted for!
         */
        return {
            //This is where you define the body of the request

            "saction": "ValidateUser",
            "tuuid": LocalData.user.uuid,
            "vuid": LocalData.user.uid,
            "email": email
        };
    }
    function transactionDataBody(amount, charityValue){
        /*
         Example data:
         "saction": "MakeTransaction",
         "mvalue": amount, //Decimal value
         "linstancelocationid": $('#location option:selected').val(),
         "tuuid": device.uuid,
         "vuid": localStorage.uid,
         "vrandom": localStorage.vrandom,
         "dbcr": "db"
         Every value must be accounted for!
         */
        return {
            //This is where you define the body of the request

            "saction": "MakeTransaction",
            "mvalue": amount, //Decimal value
            "linstancelocationid": charityValue,
            "tuuid": LocalData.user.uuid,
            "vuid": LocalData.user.uid,
            "vrandom": LocalData.user.UserDeviceID,
            "dbcr": "db"
        };
    }
    return{
        Initialise: Initialise,
        localData: ServerDataObjects,
        charities: ServerDataObjects.charities,
        balance: ServerDataObjects.userBalance,
        transactionHistory: ServerDataObjects.transactionHistory,
        AddLocation: GetCharitiesFromLocation,
        AddBeacon: GetCharityFromBeacon,
        makeTransaction: makeTransaction,
        deleteLocations: deleteLocations,
        registerUser: registerUser
    }
}]);

givahoyApp.service('Server', function () {
    this.sendRequest = function(body){
        var apigClient = apigClientFactory.newClient();

        return apigClient.allpurposePost({}, body, {});
    };
});