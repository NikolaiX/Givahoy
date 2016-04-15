/**
 * Created by nikolai on 24/03/16.
 */
var givahoyApp = angular.module('givahoyApp',[]);
givahoyApp.controller('givahoyAppController', ['$scope', '$timeout', 'RuntimeDataFactory', function($scope, $timeout, RuntimeDataFactory){
    showLoadingModal();
    /*
    Temporary initialisation until registration model is implemented
     */
    deviceID={
        "uuid": device.uuid,
        "uid": window.localStorage.getItem('uid'),
        "vrandom": window.localStorage.getItem('vrandom')
    };
    var userLocation = {
        enabled: false
    };

    $scope.ServerData = {
        localData: RuntimeDataFactory.localData,
        charities: RuntimeDataFactory.charities,
        balance: RuntimeDataFactory.balance
    };

    $scope.makeTransaction = InitiateTransaction;
    navigator.geolocation.getCurrentPosition(
        function(currentLocation) {
            userLocation = currentLocation;
            userLocation.enabled = true;
            RuntimeDataFactory.Initialise(
                deviceID.uuid,
                deviceID.uid,
                deviceID.vrandom,
                function(){
                    updateScope();
                    clearModal();
                },
                userLocation
            );
        },/*Initialise Server without location data if not available*/
        function(result){
            RuntimeDataFactory.Initialise(
                deviceID.uuid,
                deviceID.uid,
                deviceID.vrandom,
                function(){
                    console.log("Location not enabled");
                    updateScope();
                    clearModal();
                });
        });

    /*
     Having bluetooth check inside timeout fixes issue with bluetooth status not being represented correctly
     */
    setTimeout(function() {
        if(cordova.plugins.BluetoothStatus.hasBTLE && cordova.plugins.BluetoothStatus.BTenabled !== true){
            alert("Please enable bluetooth and refresh list to see available beacons");
        }
        if(cordova.plugins.BluetoothStatus.BTenabled === true){
            BeaconScanner.begin();
        }else{
            console.log("No bluetoothLE detected, beacon functionality cancelled");
        }
    }, 1);
    console.log("Angular controller has been loaded");

    function updateScope(){
        $timeout(function(){
            console.log("Scope updated");
        });

    }

    function InitiateTransaction(amount) {
        var theAmount = amount;
        console.log(amount);
        if (mybal + 50 <= amount) {
            alert('Insufficient Funds');
            return;
        }

        if(getSelectedLocation().attr("id") =="defaultOption"){
            alert("Please choose a charity");
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
                    showTransactionProcessModal();
                    RuntimeDataFactory.makeTransaction(amount, getSelectedLocation().attr("value"), function(status){
                        console.log(status);
                        updateScope();
                        console.log(amount);
                        if(status == "Success"){
                            showTransactionCompletedModal(getSelectedLocation().text(), amount);
                        }else{
                            alert("Sorry, there was a problem processing your donation.");
                            clearModal();
                        }
                    });
                }
            });
    }


    var discoveredBeacons = {};
    var BeaconScanner = {

        begin: function(){
            console.log("Started scanning for beacons");
            console.log(JSON.stringify(this));
            evothings.eddystone.startScan(
                    this.processBeaconBroadcast
            ,
                function(error){
                    alert('Scan error: ' + error);
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













givahoyApp.factory('RuntimeDataFactory', function RuntimeDataFactory() {
    var ContactServer = function(body){
        var apigClient = apigClientFactory.newClient();

        return apigClient.allpurposePost({}, body, {});
    };
    var ServerDataObjects = {
        charities: [],
        userBalance: 0
    };


    function Initialise(tuuid, vuid, vrandom, onCallback, location){
        deviceID.uuid = tuuid;
        deviceID.uid = vuid;
        deviceID.vrandom = vrandom;

        var initialiseRequest = new ServerDataRequestBuilder();

        if(typeof location !== 'undefined'){
            console.log("Location detected");
            console.log(location);
            initialiseRequest = initialiseRequest.useLocation(location);
        }
        var request = initialiseRequest
            .build();

        console.log(JSON.stringify(request));
        ContactServer(request)
            .then(function (result) {
                ServerDataObjects.charities.push.apply(ServerDataObjects.charities, ServerResultGetCharities(result));
                ServerDataObjects.userBalance = ServerResultGetBalance(result);
                deviceID.uid = ServerResultGetUID(result);
                console.log(JSON.stringify(result));
                console.log(ServerDataObjects.userBalance);
                onCallback();
            });
    }

    function makeTransaction(amount, charityValue, onCallBack){
        console.log(charityValue);
        var body = transactionDataBody(amount, charityValue);
        console.log("make transaction called in factory");
        ContactServer(body)
            .then(function(result){
                console.log(ServerResultGetBalance(result));
                ServerDataObjects.userBalance = ServerResultGetBalance(result);
                console.log(JSON.stringify(result));
                console.log(ServerDataObjects.userBalance);
                onCallBack("Success");
            })
            .catch(function(result){
                alert("Sorry, there was a problem processing your donation.");
                console.log(result);
                onCallBack("Fail");
            });


    }
    //Todo Create new function that handles multiple beacons
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
                console.log(JSON.stringify(result));
                var convertedCharities = ServerResultGetCharities(result);
                console.log(convertedCharities);
                ServerDataObjects.charities.push.apply(ServerDataObjects.charities, convertedCharities);
                console.log(ServerDataObjects);
                onCallBack();
            });
    }

    function GetCharitiesFromLocation(location, onCallBack){
        var request = new ServerDataRequestBuilder();
        request.useLocation(location);
        ContactServer(request.build())
            .then(function (result) {

                ServerDataObjects.charities.push.apply(ServerDataObjects.charities, ServerResultGetCharities(result));
                onCallBack();
            });
    }
    return{
        Initialise: Initialise,
        localData: ServerDataObjects,
        charities: ServerDataObjects.charities,
        balance: ServerDataObjects.userBalance,
        AddLocation: GetCharitiesFromLocation,
        AddBeacon: GetCharityFromBeacon,
        makeTransaction: makeTransaction
    }
});

















//todo: Move this into models
var ServerDataRequestBuilder = function(){
    this.body = {};
    this.retrieveLocation = false;
    this.retrieveBeacons = false;
    this.triggerError = false;

    //Used by mock server to test Json error handling
    this.triggerError = function(){
        this.triggerError = true;
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


        if(this.triggerError == true){
            this.body.saction = "Error";
        }
        else{
            if(this.retrieveBeacons == true && this.retrieveLocation == false){
                this.body.saction = "GetBeacons"
            }
            else{
                this.body.saction = "GetLocation";
            }

        }
        this.body.vuid = deviceID.uid;
        this.body.tuuid = deviceID.uuid;
        this.body.vrandom = deviceID.vrandom;

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
    console.log(amount);
    console.log(charityValue);
    var body = {
        //This is where you define the body of the request

        "saction": "MakeTransaction",
        "mvalue": amount, //Decimal value
        "linstancelocationid": charityValue,
        "tuuid": deviceID.uuid,
        "vuid": deviceID.uid,
        "vrandom": deviceID.vrandom,
        "dbcr": "db"
    };
    return body;
}