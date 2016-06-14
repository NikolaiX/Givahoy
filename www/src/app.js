/**
 * Created by nikolai on 24/03/16.
 */
var givahoyApp = angular.module('givahoyApp',[]);
givahoyApp.controller('givahoyAppController', ['$scope', '$timeout', 'RuntimeDataFactory', function($scope, $timeout, RuntimeDataFactory){
    /*
    Temporary initialisation until registration model is implemented
     */
    deviceID={
        "uuid": device.uuid,
        "uid": window.localStorage.getItem('uid'),
        "vrandom": window.localStorage.getItem('vrandom')
    };
    console.log(JSON.stringify(deviceID));
    var userLocation = {
        enabled: false
    };
    $scope.ServerData = {
        localData: RuntimeDataFactory.localData,
        charities: RuntimeDataFactory.charities,
        balance: RuntimeDataFactory.balance,
        transactionHistory: RuntimeDataFactory.transactionHistory
    };
    $scope.CharityDropdownValue = null;
    $scope.makeTransaction = InitiateTransaction;
    $scope.refreshList = updateCharityList;

    $scope.registerUser = function(user){
        showLoadingModal("Registering Email...");
        //Do magic stuff here
        setTimeout(function(){showRegistration2Modal();},100)
    };
    navigator.geolocation.getCurrentPosition(
        function(currentLocation) {
            userLocation = currentLocation;
            userLocation.enabled = true;
            RuntimeDataFactory.Initialise(
                function(){
                    updateScope();
                    clearModal();
                },
                userLocation
            );
        },/*Initialise Server without location data if not available*/
        function(result){
            RuntimeDataFactory.Initialise(
                function(){
                    console.log("Location not enabled");
                    updateScope();
                    clearModal();
                });
        });

     function updateCharityList() {
        showLoadingModal("Refreshing List of Charities");

        //Enables beacon scanning in case bluetooth has been enabled after app initialisation
        if (cordova.plugins.BluetoothStatus.BTenabled === true && BeaconScanner.enabled === false) {
            BeaconScanner.begin();
        }
         
         //clears location-based charities from list
         RuntimeDataFactory.deleteLocations(updateScope);
        navigator.geolocation.getCurrentPosition(
            function (currentLocation) {
                userLocation = currentLocation;
                console.log(userLocation);
                RuntimeDataFactory.AddLocation(currentLocation, function () {
                    updateScope();
                    clearModal();
                });
            }, function () {
                alert("There was a problem getting current location");
                clearModal();
            });
    }

    /*
     Having bluetooth check inside timeout fixes issue with bluetooth status not being represented correctly
     */
    setTimeout(function() {
        if(cordova.plugins.BluetoothStatus.hasBTLE){
            BeaconScanner.begin();
        }else{
            console.log("No bluetoothLE detected, beacon functionality disabled");
        }
    }, 1);

    console.log("Angular controller has been loaded");

    function updateScope(){
        /*
        Sets default selection on charity list to first charity found if none is already set
         */
        if ($scope.CharityDropdownValue === null && RuntimeDataFactory.charities.length > 0){
            console.log("Fillin' the default");
            $scope.CharityDropdownValue = RuntimeDataFactory.charities[0].value.toString();

        }
        
        $timeout(function(){
            //Naughty hack to circumvent problem with dropdown label not updating
            setTimeout(function(){
                $('#locations').selectmenu('refresh');
            },1);
            console.log("Scope updated");
        });
    }

    function InitiateTransaction(amount) {
        var theAmount = amount;
        console.log(amount);
        if (RuntimeDataFactory.balance + 50 <= amount) {
            alert('Insufficient Funds');
            return;
        }

        if($scope.CharityDropdownValue === null){
            alert("No Charities Found!");
            return;
        }
        /*
         todo: Change selected Charity check to angular model
         */
        navigator.notification.confirm(
            "Are you sure you want to donate $" + amount + " to " + getSelectedLocation().text() + "?",
            function (buttonIndex) {
                if (buttonIndex == 1) {
                    /*
                     Create processing page
                     */
                    console.log(amount);
                    showLoadingModal("Your Transaction is being Processed");
                    RuntimeDataFactory.makeTransaction(amount, getSelectedLocation().attr("value"), function(status){
                        console.log(status);
                        updateScope();
                        console.log(amount);
                        if(status == "Success"){
                            showTransactionCompletedModal(getSelectedLocation().text(), amount);
                        }else{
                            showErrorModal("Sorry, there was a problem processing your donation.", true);
                        }
                    });
                }
            });
    }


    var discoveredBeacons = {};
    var BeaconScanner = {
        enabled: false,
        begin: function(){
            console.log("Started scanning for beacons");
            this.enabled = true;
            console.log(JSON.stringify(this));
            evothings.eddystone.startScan(
                    this.processBeaconBroadcast
            ,
                function(error){
                    BeaconScanner.enabled = false;
                    console.log('Scan error: ' + error);
                    evothings.eddystone.stopScan();
                }
            )
        },
        processBeaconBroadcast: function (beacon) {
            if(!discoveredBeacons[beacon.address] && isGivahoyBeacon(beacon)){
                discoveredBeacons[beacon.address] = beacon;
                console.log("beacon pushed to array");
                RuntimeDataFactory.AddBeacon(beacon, updateScope);
            }
        }
    };
}]);


givahoyApp.factory("LocalData", function(){
    var user = function(){
        userData = {
            "uuid": device.uuid,
            "uid": window.localStorage.getItem('uid'),
            "UserDeviceID": window.localStorage.getItem('vrandom'),
            isRegistered: window.localStorage.getItem('isRegistered')
        };

        return userData;
    };
    var setUser = function(uid, UserDeviceID){
        if (uid === parseInt(uid, 10) && UserDeviceID === parseInt(UserDeviceID, 10)){
            window.localStorage.setItem('uid', uid);
            window.localStorage.setItem('vrandom', UserDeviceID);
            window.localStorage.setItem('isRegistered', true);
        }
    };

    return{
        user: user(),
        setUser: setUser()
    }
});










givahoyApp.factory('RuntimeDataFactory', ['LocalData', function(LocalData) {
    var ContactServer = function(body){
        var apigClient = apigClientFactory.newClient();

        return apigClient.allpurposePost({}, body, {});
    };
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

        ContactServer(request)
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
        ContactServer(body)
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
        ContactServer(request.build())
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
        ContactServer(builtRequest)
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
        deleteLocations: deleteLocations
    }
}]);