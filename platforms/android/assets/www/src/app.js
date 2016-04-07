/**
 * Created by nikolai on 24/03/16.
 */

var ServerDataRequestBuilder = function(){
    var body = {};
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
        body.llatitude = locationData.latitude;
        body.llongitude = locationData.longitude;
        return this;
    };
    this.useBeacons = function(beaconData){
        body.beaconList = (
            createJsonForBeacons(beaconData)
        );
        this.retrieveBeacons = true;
        return this;
    };
    this.build = function(){


        if(this.triggerError == true){
            body.saction = "Error"
        }
        else{
            body.saction = "GetLocation"
        }
        body.vuid = deviceID.vuid;
        body.tuuid = deviceID.tuuid;
        body.vrandom = deviceID.vrandom;

        return body;
    };
};