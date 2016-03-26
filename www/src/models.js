/**
 * Created by nikolai on 25/03/16.
 */
function Charity(Value, Name, Location, Type){
    this.value = Value;
    this.name = Name;
    this.location = Location;
    this.type = Type;
}

//Provides generic function for sending and receiving Json
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
    var beaconlist = [];
    beaconlist.push(1234);
    beaconlist.push(1235);

    return beaconlist;
};

function createJsonForBeacons(beaconIdArray){
    var jsonMessage = [];
    var loopcount = beaconIdArray.length;
    for(var i= 0; i < loopcount; i++){
        jsonMessage.push(
            {"beaconid": beaconIdArray[i]}
        );
    }
    return jsonMessage;
};

var userLocation ={
    "llatitude": ltd.toString(),
    "llongitude": lgt.toString()
};

var deviceID ={
    "tuuid": device.uuid,
    "vuid": window.localStorage.getItem('uid'), //Currently coming back as null
    "vrandom": window.localStorage.getItem('vrandom')
};