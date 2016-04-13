/**
 * Created by nikolai on 24/03/16.
 */
var givahoyApp = angular.module('givahoyApp',[]);
givahoyApp.controller('givahoyAppController', ['$scope', 'RuntimeDataFactory', function($scope, RuntimeDataFactory){
    /*
    Temporary initialisation until registration model is implemented
     */
    deviceID={
        "tuuid": device.uuid,
        "vuid": 1234,
        "vrandom": 5678
    };
    console.log("Angular controller has been loaded");

    showLoadingModal();
    RuntimeDataFactory.Initialise( device.uuid, window.localStorage.getItem('uid'), window.localStorage.getItem('vrandom'), function(){
        updateScope();
         clearModal();
    });

    function updateScope(){
        $scope.$apply();
    }
    var ServerData = {
        testValue: "Test value",
        localData: RuntimeDataFactory.localData
    };
    $scope.ServerData = function(){
        return ServerData;
    };
    $scope.testButton = function(){

    };


    $scope.testValue = "Testvalue";
    /*
     Fixes issue with bluetooth status not being represented correctly
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
    var GetDataFromServer = function(body){
        var apigClient = apigClientFactory.newClient();

        return apigClient.allpurposePost({}, body, {});
    };
    var ServerDataObjects = {
        charities: [],
        userBalance: 0
    };


    function Initialise(tuuid, vuid, vrandom, onCallback){
        deviceID.tuuid = tuuid;
        deviceID.vuid = vuid;
        deviceID.vrandom = vrandom;

        var location = {
            latitude: -41.2904522,
            longitude: 174.7798954
        };
        var initialiseRequest = new ServerDataRequestBuilder()
            .useLocation(location);
        console.log(initialiseRequest);


        console.log(location);
        var request = initialiseRequest
            .build();



        console.log(request);
        GetDataFromServer(request)
            .then(function (result) {
                ServerDataObjects.charities.push.apply(ServerDataObjects.charities, getCharitiesFromJson(result));
                userBalance = getBalanceFromJson(result);
                onCallback();
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
        GetDataFromServer(request.build())
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
        GetDataFromServer(request.build())
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
        AddBeacon: GetCharityFromBeacon
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
        this.body.llatitude = locationData.latitude;
        this.body.llongitude = locationData.longitude;
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