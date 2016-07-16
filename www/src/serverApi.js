/**
 * Created by nikolai on 17/06/16.
 */
givahoyApp.factory('ServerApi', ['LocalData', 'Server', function(LocalData, Server) {
    var ServerDataObjects = {
        charities: [],
        userBalance: 0,
        transactionHistory: []
    };

    /*
    Used to get current user data on launch,
    as well as device-identifying data on first launch
     */
    function Initialise(location){
        var initialiseRequest = new ServerDataRequestBuilder();

        if(typeof location !== 'undefined'){
            console.log("Location detected");
            initialiseRequest = initialiseRequest.useLocation(location)
        }
        var request = initialiseRequest
            .initialCall()
            .build();

        var serverCall = Server.sendRequest(request)
            .then(function (result) {
                console.log(result);
                var returnObject = {
                    charities: ServerResultGetCharities(result),
                    userBalance: ServerResultGetBalance(result),
                    transactionHistory: ServerResultGetTransactionHistory(result),
                    uid: ServerResultGetUID(result)
                };
                console.log(JSON.stringify(returnObject));
                return returnObject;
            }).catch(function (result) {
            showErrorModal("There was a problem contacting the server, check your internet connection or try again later", false);
        });
        return serverCall;
    }

    function makeTransaction(amount, charityValue){
        var body = transactionDataBody(amount, charityValue);
        console.log(JSON.stringify(body));
        console.log("make transaction called in factory");
        var serverCall = Server.sendRequest(body)
            .then(function(result){
                var returnObject = {
                    success: true,
                    balance: ServerResultGetBalance(result)
                };
                console.log(result);
                /*
                 var newItem = ServerResultGetTransactionHistory(result);
                 ServerDataObjects.transactionHistory.push(newItem);
                 */
                return returnObject;
            })
            .catch(function(result){
                var returnObject = {
                    success: false
                };
                return returnObject;
            });
        return serverCall;
    }

    function GetCharityFromBeacon(beacon){
        console.log("getcharitiesfrombeacon called");
        var beacons = [];
        beacons.push(beacon);
        var request = new ServerDataRequestBuilder();
        request.useBeacons(beacons);

        var serverCall = Server.sendRequest(request.build())
            .then(function (result) {
                console.log("Data for beacon returned");
                return ServerResultGetCharities(result);
            });
        return serverCall;
    }

    function GetCharitiesFromLocation(location){
        var request = new ServerDataRequestBuilder();
        request.useLocation(location);
        var builtRequest = request.build();
        var serverCall = Server.sendRequest(builtRequest)
            .then(function (result) {
                var newCharities = ServerResultGetCharities(result);
                return newCharities;
            }).catch(function (result) {
            showErrorModal("There was a problem contacting the server, check your internet connection or try again later", true);
        });

        return serverCall;
    }

    function registerUser(email){
        var body = registerUserDataBody(email);

        var serverCall = Server.sendRequest(body)
            .then(function(result){
                console.log(result);
                LocalData.user.setRegistered(email);
                return "Success"
            })
            .catch(function(result){
                console.log(result);
            });

        return serverCall;
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
        GetCharityFromLocation: GetCharitiesFromLocation,
        ProcessBeacon: GetCharityFromBeacon,
        makeTransaction: makeTransaction,
        registerUser: registerUser
    }
}]);

givahoyApp.service('Server', function () {
    this.sendRequest = function(body){
        var apigClient = apigClientFactory.newClient();

        return apigClient.allpurposePost({}, body, {});
    };
});