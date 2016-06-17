/**
 * Created by nikolai on 24/03/16.
 */
var givahoyApp = angular.module('givahoyApp',[]);
givahoyApp.controller('givahoyAppController', ['$scope', '$timeout', 'RuntimeDataFactory','LocalData', function($scope, $timeout, RuntimeDataFactory, LocalData){
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
    $scope.user = LocalData.user;

    $scope.registerUser = function(user){
        showLoadingModal("Registering Email...");
        RuntimeDataFactory.registerUser(
            user.email,
            function(response){
                if(response === "Success"){
                    LocalData.user.registerUser(user.email);
                    updateScope();
                    showRegistration2Modal();
                }
                else if(response === "Fail"){
                    showErrorModal("There was a problem registering your account, please try again", true);
                }
        })
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
                    showLoadingModal("Your Transaction is being Processed");
                    RuntimeDataFactory.makeTransaction(amount, getSelectedLocation().attr("value"), function(status){
                        updateScope();
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


givahoyApp.factory("LocalData", ['Server', function(Server){
    var user = function(){
        userData = {
            "uuid": device.uuid,
            "uid": window.localStorage.getItem('uid'),
            email: window.localStorage.getItem('email'),
            get isInitialised(){
                return window.localStorage.getItem('initialised') === "true" ;
            },
            get isRegistered(){
                return window.localStorage.getItem('registered') === "true" ;
            },
            initialise: function(uid){
                if (uid === parseInt(uid, 10)){
                    window.localStorage.setItem('uid', uid);
                    window.localStorage.setItem('initialised', "true");
                }
            },
            registerUser: function(email){
                window.localStorage.setItem('email', email);
                window.localStorage.setItem('registered', "true");
            },
            toggleRegistration: function(){
                if(this.isRegistered){
                    window.localStorage.setItem('registered', "false");
                    console.log("Registration set to false");
                }else{
                    console.log("Registration set to true");
                    window.localStorage.setItem('registered', "true");
                }
            }
        };

        return userData;
    };

    return{
        user: user()
    }
}]);