/**
 * Created by nikolai on 24/03/16.
 */
var givahoyApp = angular.module('givahoyApp',[]);
givahoyApp.controller('givahoyAppController', ['$scope', 'RuntimeDataFactory', function($scope, RuntimeDataFactory){
    showLoadingModal();
    /*
    Temporary initialisation until registration model is implemented
     */
    deviceID={
        "tuuid": device.uuid,
        "vuid": 1234,
        "vrandom": 5678
    };
    var userLocation = {
        enabled: false
    };

    navigator.geolocation.getCurrentPosition(
        function(currentLocation) {
            userLocation = currentLocation;
            userLocation.enabled = true;
            RuntimeDataFactory.Initialise( device.uuid,
                window.localStorage.getItem('uid'),
                window.localStorage.getItem('vrandom'),
                function(){
                    updateScope();
                    clearModal();
                },
                userLocation
            );
        },
        function(result){
            RuntimeDataFactory.Initialise( device.uuid, window.localStorage.getItem('uid'), window.localStorage.getItem('vrandom'), function(){
                console.log("Location not enabled");
                console.log(result);
                updateScope();
                clearModal();
            });
        });

    console.log("Angular controller has been loaded");

    function updateScope(){
        $scope.$apply();
    }
    $scope.ServerData = {
        testValue: "Test value",
        localData: RuntimeDataFactory.localData,
        charities: RuntimeDataFactory.charities,
        balance: RuntimeDataFactory.balance
    };

    $scope.makeTransaction = InitiateTransaction;

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
    $scope.testValue = "Testvalue";

    /*
     Having bluetooth check inside timeout fixes issue with bluetooth status not being represented correctly
     */

    setTimeout(function() {
        if(cordova.plugins.BluetoothStatus.hasBTLE && cordova.plugins.BluetoothStatus.BTenabled !== true){
            alert("Please enable bluetooth and refresh list to see available beacons");
        }
        if(cordova.plugins.BluetoothStatus.BTenabled === true){
            startBeaconScan();
        }else{
            console.log("No bluetoothLE detected, beacon functionality cancelled");
        }
    }, 1);


    var discoveredBeacons = {};
    function startBeaconScan(){
        console.log("Started scanning for beacons");
        evothings.eddystone.startScan(
            function(beacon){
                var listed = false;
                if(!discoveredBeacons[beacon.address] && isGivahoyBeacon(beacon)){
                    discoveredBeacons[beacon.address] = beacon;
                    console.log("beacon pushed to array");
                    RuntimeDataFactory.AddBeacon(beacon, updateScope);
                }
            },
            function(error){
                alert('Scan error: ' + error);
            }
        )

    }
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
        deviceID.tuuid = tuuid;
        deviceID.vuid = vuid;
        deviceID.vrandom = vrandom;

        var initialiseRequest = new ServerDataRequestBuilder();

        if(typeof location !== 'undefined'){
            console.log("Location detected");
            console.log(location);
            initialiseRequest = initialiseRequest.useLocation(location);
        }
        var request = initialiseRequest
            .build();

        ContactServer(request)
            .then(function (result) {
                ServerDataObjects.charities.push.apply(ServerDataObjects.charities, getCharitiesFromJson(result));
                userBalance = getBalanceFromJson(result);
                console.log(JSON.stringify(result));
                onCallback();
            });
    }

    function makeTransaction(amount, charityValue, onCallback){
        console.log(charityValue);
        var body = transactionDataBody(amount, charityValue);
        console.log("make transaction called in factory");
        console.log(JSON.stringify(body));
        console.log("Above code hsoudl have worled");
        ContactServer(body)
            .then(function(result){
                var returnedData = result.data;
                console.log(returnedData);
                ServerDataObjects.userBalance = returnedData.mbalance.mbalance;
                onCallback("Success");
            })
            .catch(function(result){
                alert("Sorry, there was a problem processing your donation.");
                console.log(result);
                onCallback("Fail");
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
                ServerDataObjects.charities.push.apply(ServerDataObjects.charities, getCharitiesFromJson(result));
                onCallback();
            });
    }
    function GetCharitiesFromLocation(location, onCallBack){
        var request = new ServerDataRequestBuilder();
        request.useLocation(location);
        ContactServer(request.build())
            .then(function (result) {

                ServerDataObjects.charities.push.apply(ServerDataObjects.charities, getCharitiesFromJson(result));
                onCallback();
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
        this.body.beaconList = (
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
        this.body.vuid = deviceID.vuid;
        this.body.tuuid = deviceID.tuuid;
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
        "tuuid": device.uuid,
        "vuid": localStorage.uid,
        "vrandom": localStorage.vrandom,
        "dbcr": "db"
    };
    return body;
}