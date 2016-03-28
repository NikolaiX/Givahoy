/**
 * Created by nikolai on 25/03/16.
 */
function Charity(Value, Name, Location, Type){
    this.value = Value;
    this.name = Name;
    this.location = Location;
    this.type = Type;
}

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
        jsonMessage.push(
            {"beaconid": beaconIdArray[i]}
        );
    }
    return jsonMessage;
}

var userLocation ={
    "llatitude": ltd.toString(),
    "llongitude": lgt.toString()
};

var deviceID ={
    "tuuid": device.uuid,
    "vuid": window.localStorage.getItem('uid'), //Currently coming back as null
    "vrandom": window.localStorage.getItem('vrandom')
};

function getCharitiesFromJson(json){
    var serverCharities = json.data.sresult;

    var charityObjects = [];
    for (var i = 0; i < serverCharities.length; i++) {

        charityObjects.push(new Charity(
            serverCharities[i].linstancelocationid,
            serverCharities[i].sinstancename,
            serverCharities[i].slocationname,
            serverCharities[i].loctype
        ));
    }
    return charityObjects;
}

function getBalanceFromJson(json){
    return json.data.mbalance.mbalance;
}

function ServerCache(charityDataRequest){
    this.lastServerResponse = 0;
    this.localCharities = 0;
    this.localBalance = 0;

    //Retrieve data from server. Gets called immediately on serverCache creation
    this.update = function(charityDataRequest){

        this.lastServerResponse = server(charityDataRequest);        console.log(this.lastServerResponse);
        if (this.lastServerResponse.data.status.indexOf("Success") != -1){
            this.localCharities = getCharitiesFromJson(this.lastServerResponse);
            this.localBalance = getBalanceFromJson(this.lastServerResponse);
        }else{
            alert("There was a problem getting data from the server.");
        }
    };
    this.update(charityDataRequest);

}
