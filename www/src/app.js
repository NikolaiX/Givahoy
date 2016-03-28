/**
 * Created by nikolai on 24/03/16.
 */

var CharityRequestBuilder = function(){
    this.retrieveLocation = false;
    this.retrieveBeacons = false;
    this.triggerError = false;

    //Used by mock server to test Json error handling
    this.triggerError = function(){
        this.triggerError = true;
        return this;
    };
    this.useLocation = function(){
        this.retrieveLocation = true;
        return this;
    };
    this.useBeacons = function(){
        this.retrieveBeacons = true;
        return this;
    };
    this.build = function(){
        var body = {};

        if(this.triggerError == true){
            body.saction = "Error"
        }
        else{
            body.saction = "GetLocation"
        }
        body.vuid = deviceID.vuid;
        body.tuuid = deviceID.tuuid;
        body.vrandom = deviceID.vrandom;

        if(this.retrieveLocation == true){
            body.llatitude = userLocation.llatitude;
            body.llongitude = userLocation.llongitude;
        }
        if(this.retrieveBeacons == true){
            var beacons = createJsonForBeacons(getBeacons());
            body.beaconList = (
                beacons
            )
        }
        return body;
    };
};
