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
console.log(this);
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

/*
Temporary hack until registration is done
 "uuid":
 "uid"
 "vrandom"
 */
var deviceID={
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
    return json.data.mbalance.vuid;
}
function ServerResultGetTransactionHistory(json){
    console.log(json.data.sresult2.txns);
    return json.data.sresult2.txns;
}

function ServerCache(charityDataRequest){
    this.lastServerResponse = 0;
    this.localCharities = 0;
    this.localBalance = 0;

    //Retrieve data from server. Gets called immediately on serverCache creation
    this.update = function(charityDataRequest){

        this.lastServerResponse = server(charityDataRequest);        console.log(this.lastServerResponse);
        if (this.lastServerResponse.data.status.indexOf("Success") != -1){
            this.localCharities = ServerResultGetCharities(this.lastServerResponse);
            this.localBalance = ServerResultGetBalance(this.lastServerResponse);
        }else{
            alert("There was a problem getting data from the server.");
        }
    };
    this.update(charityDataRequest);

}
