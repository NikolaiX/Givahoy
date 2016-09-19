/**
 * Created by nikolai on 25/03/16.
 */

/*
Types of charities defined by server:
    l = location-based charity
    b = beacon-based charity
 */
function Charity(Value, Name, Location, Type){
    this.value = Value;
    this.name = Name;
    this.location = Location;
    this.type = Type;
}

function debitTransaction(ID, connectionID, date, instance, location, amount){
    this.ID = ID;
    this.connectionID = connectionID;
    this.date = date;
    this.instance = instance;
    this.location = location;
    this.amount = amount;
}

function creditTransaction(ID, connectionID, date, amount){
    this.ID = ID;
    this.connectionID = connectionID;
    this.date = date;
    this.amount = amount;
}

/*
 Checks beacon namespace
 Must be modified to check namespace properly once one has been decided
 */
function isGivahoyBeacon(beacon){
    return true
}

/*
Returns promise directly to caller
 */
function ServerPromise(){
    var apigClient = apigClientFactory.newClient();
    var execute = function(body){
        return apigClient.allpurposePost({}, body, {});
    };
    return{
        execute: execute
    }
}



var GetDataFromServer = function(body){
    var apigClient = apigClientFactory.newClient();

    return apigClient.allpurposePost({}, body, {});
};

//Provides function for sending and receiving Json. Sends Json body given via argument and returns response
var server = function(body){
    var apigClient = apigClientFactory.newClient();

    apigClient.allpurposePost({}, body, {})
        .then(function (result) {
            console.log("Server responded to Json request with sucess");
            return result;
        }).catch(function (result) {
        console.log("Server failed the request");
        return result;
    });
};

function getBeacons(){
    //placeholder until I can receive actual beacons
    var beaconList = [];
    beaconList.push(1234);
    beaconList.push(1235);

    return beaconList;
}

function createJsonForBeacons(beaconIdArray){
    var jsonMessage = [];
    var loopcount = beaconIdArray.length;
    for(var i= 0; i < loopcount; i++){
        var beaconId = uint8ArrayToString(beaconIdArray[i].bid);
        console.log("Processed beacon ID: " + beaconId);
        jsonMessage.push(
            {"beaconid": beaconId}
        );
    }
    return jsonMessage;
}

var userLocation ={
    "latitude": 0,
    "longitude": 0
};

//Taken from cordova-eddystone plugin example
function uint8ArrayToString(uint8Array)
{
    function format(x)
    {
        var hex = x.toString(16);
        return hex.length < 2 ? '0' + hex : hex;
    }
    var result = '';
    for (var i = 0; i < uint8Array.length; ++i)
    {
        result += format(uint8Array[i]);
    }
    return result;
}

function ServerResultGetCharities(json){
    var charityObjects = [];
    var serverCharities = json.data.sresult;

    if(serverCharities === null){
        return charityObjects;
    }

    for (var i = 0; i < serverCharities.length; i++) {

        charityObjects.push(new Charity(
            serverCharities[i].linstancelocationid,
            serverCharities[i].sinstancename,
            serverCharities[i].slocationname,
            serverCharities[i].loctype
        ));
    }
    console.log(serverCharities);
    return charityObjects;
}
function ServerResultGetBalance(json){
    return json.data.mbalance.mbalance;
}
function ServerResultGetUID(json){
    return parseInt(json.data.mbalance.vuid);
}
function ServerResultGetTransactionHistory(json){
    console.log(JSON.stringify(json.data.sresult2.txns));
    return json.data.sresult2.txns;
}