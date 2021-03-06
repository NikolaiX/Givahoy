/**
 * Created by nikolai on 24/03/16.
 */
var givahoyApp = angular.module('givahoyApp',['ionic']);
console.log("Started app");
givahoyApp.config(['$ionicConfigProvider', function ($ionicConfigProvider) {
    $ionicConfigProvider.tabs.position('bottom');
}]);
givahoyApp.controller('givahoyAppController', ['$scope', '$timeout', 'ServerApi','LocalData', function($scope, $timeout, ServerApi, LocalData){

    var userLocation = {
        enabled: false
    };


    $scope.charities = [];
    $scope.charityDropdown = {
        selected: null,
        label: function(charity){
            return charity.name + " (" + charity.location + ")"
        }
    }
    $scope.userBalance = 0;
    $scope.transactionHistory = [];

    $scope.makeTransaction = InitiateTransaction;
    $scope.refreshList = updateCharityList;
    $scope.user = LocalData.user;

    $scope.registerUser = function(regInfo){
        showLoadingModal("Registering Email...");
        ServerApi.registerUser(regInfo.email)
            .then(function (response) {
                if(response === "Success" && LocalData.user.isRegistered){
                    updateScope();
                    showRegistration2Modal();
                }
                else {
                    showErrorModal("There was a problem registering your account, please try again", true);
                }
            });
    };
    console.log("About to get position");

    navigator.geolocation.getCurrentPosition(
        function(currentLocation) {
            console.log("Got location");
            userLocation = currentLocation;
            userLocation.enabled = true;
            ServerApi.Initialise(currentLocation)
                .then(function (returnedData) {
                    console.log("Got location data from server");
                    console.log(returnedData);
                    $scope.charities.push.apply($scope.charities, returnedData.charities);
                    $scope.userBalance = returnedData.userBalance;
                    $scope.transactionHistory.push.apply($scope.transactionHistory, returnedData.transactionHistory);

                    if(LocalData.user.isInitialised === false){
                        LocalData.user.initialise(returnedData.uid);
                    }
                    if(cordova.plugins.BluetoothStatus.hasBTLE){
                        BeaconService.begin(evothings.eddystone);
                    }else{
                        console.log("No bluetoothLE detected, beacon functionality disabled");
                    }
                    updateScope();
                    clearModal();
                })
        },/*Initialise Server without location data if not available*/
        function (result) {
            console.log(result);
            showErrorModal("This application needs access to your location to function. Please enable high-accuracy location in your phones settings and restart the app.", false);
        }
        ,{timeout: 2000});

    function updateCharityList() {
        showLoadingModal("Refreshing List of Charities");

        //Enables beacon scanning in case bluetooth has been enabled after app initialisation
        if (cordova.plugins.BluetoothStatus.BTenabled === true && BeaconService.enabled === false) {
            BeaconService.begin(evothings.eddystone);
        }

        //clears location-based charities from list
        var i = $scope.charities.length;
        while(i--) {
            if($scope.charities[i].type === "l"){
                console.log($scope.charities);
                console.log("Charity removed: " + $scope.charities[i].name);
                $scope.charities.splice(i, 1);
                console.log($scope.charities);
            }
        }

        /*
         todo: remove the redundancy that is the charityalreadyexists stuff
         */
        navigator.geolocation.getCurrentPosition(
            function (currentLocation) {
                userLocation = currentLocation;
                ServerApi.GetCharityFromLocation(currentLocation)
                    .then(function(newCharities){
                        console.log(newCharities);
                        //Check if Charity is already in list
                        var charityAlreadyExists;
                        for(var newCharityIndex in newCharities){
                            charityAlreadyExists = false;
                            for(var existingCharityIndex in $scope.charities){
                                if(newCharities[newCharityIndex].value === $scope.charities[existingCharityIndex].value){
                                    charityAlreadyExists = true;
                                }
                            }
                            if(charityAlreadyExists == false){
                                $scope.charities.push(newCharities[newCharityIndex]);
                            }
                        }

                        updateScope();
                        clearModal();
                    });
            }, function () {
                alert("There was a problem getting current location");
                clearModal();
            });
    }


    console.log("Angular controller has been loaded");

    function updateScope(){
        /*
         Sets default selection on charity list to first charity found if none is already set
         */
        if ($scope.charityDropdown.selected === null && $scope.charities.length > 0){
            $scope.charityDropdown.selected = $scope.charities[0];
        }
        $scope.$apply();
        console.log("Scope updated");
    }

    function InitiateTransaction(amount, charity) {
        /*
        if ($scope.userBalance < amount) {
            alert('Insufficient Funds');
            return;
        }
        */
        if(charity === null){
            alert("No Charity selected!");
            return;
        }
        navigator.notification.confirm(
            "Are you sure you want to donate $" + amount + " to " + charity.name + "?",
            function (buttonIndex) {
                if (buttonIndex == 1) {
                    showLoadingModal("Your Transaction is being Processed");

                    ServerApi.makeTransaction(amount, charity.value)
                        .then(function(result){
                            updateScope();
                            if(result.success == true){
                                $scope.userBalance = result.balance;
                                showTransactionCompletedModal(getSelectedLocation().text(), amount);
                            }else{
                                showErrorModal("Sorry, there was a problem processing your donation.", true);
                            }
                        });
                    }
            });
    }

    var discoveredBeacons = {};
    var BeaconService = {
        enabled: false,
        begin: function(beaconScanner){
            this.enabled = true;
            console.log(JSON.stringify(this))
            console.log("beacon scan has started");
            beaconScanner.startScan(
                this.processBeaconBroadcast
                ,
                function(error){
                    BeaconService.enabled = false;
                    console.log('Scan error: ' + error);
                    evothings.eddystone.stopScan();
                }
            )
        },
        processBeaconBroadcast: function (beacon) {
            if(!discoveredBeacons[beacon.address] && isGivahoyBeacon(beacon)){
                discoveredBeacons[beacon.address] = beacon;
                console.log("beacon pushed to array");
                ServerApi.ProcessBeacon(beacon)
                    .then(function(newCharities){
                        $scope.charities.push.apply($scope.charities, newCharities);
                        console.log($scope.charities);
                        updateScope();
                    });
            }
        }
    };
}]);

givahoyApp.factory("LocalData", function(){
    var user = function(){
        userData = {
            get uuid(){
                if(device.platform == "browser"){
                    return "12b69eb1d5a2a398";
                }
                else{
                    return device.uuid;
                }
            },
            get uid(){
                if(device.platform == "browser"){
                    return "501446376089";
                }
                else{
                    return window.localStorage.getItem('uid');
                }
            },
            get email(){
                return window.localStorage.getItem('email');
            },
            get isInitialised(){
                return window.localStorage.getItem('initialised') === "true" ;
            },
            get isRegistered(){
                return window.localStorage.getItem('registered') === "true" ;
            },
            initialise: function(uid){
                if (typeof uid === 'number'){
                    window.localStorage.setItem('uid', uid);
                    window.localStorage.setItem('initialised', "true");
                    console.log(this.isInitialised);
                    console.log("UID: " + window.localStorage.getItem('uid'));
                }
            },
            setRegistered: function(email){
                window.localStorage.setItem('email', email);
                window.localStorage.setItem('registered', "true");
            },
            toggleRegistration: function(){
                if(this.isRegistered){
                    window.localStorage.setItem('registered', "false");
                    window.localStorage.setItem('email', null);
                    console.log("Registration set to false");
                }else{
                    console.log("Registration set to true");
                    window.localStorage.setItem('registered', "true");
                }
            },
            disableInitialisation: function(){
                console.log(this.isInitialised);
                console.log("UID: " + this.uid);
                window.localStorage.setItem('initialised', "false");
                window.localStorage.setItem('uid', "");
                console.log(this.isInitialised);
            }
        };
        return userData;
    };

    return{
        user: user()
    }
});

givahoyApp.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider

        .state('tabs', {
            url: "/tab",
            abstract: true,
            templateUrl: "templates/tabs.html"
        })
        .state('tabs.give', {
            url: "/give",
            views: {
                'tab-give': {
                    templateUrl: "templates/tab-give.html"
                }
            }
        })
        .state('tabs.history', {
            url: "/history",
            views: {
                'tab-history': {
                    templateUrl: "templates/tab-history.html"
                }
            }
        })
        .state('tabs.settings', {
            url: "/settings",
            views: {
                'tab-settings': {
                    templateUrl: "templates/tab-settings.html"
                }
            }
        });


    $urlRouterProvider.otherwise('/tab/give');
});