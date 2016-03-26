/**
 * Created by nikolai on 24/03/16.
 */

var localCharities = [];

var CharityRequestBuilder = function(){
    this.retrieveLocation = false;
    this.retrieveBeacons = false;

    this.useLocation = function(){
        this.retrieveLocation = true;
        return this;
    };
    this.useBeacons = function(){
        this.retrieveBeacons = true;
        return this;
    };
    this.build = function(){
        var body = {
            //This is where you define the body of the request
            "saction": "GetLocation"
        };

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
var retrieveCharityData = function(detectedCharities){
    var result = server(detectedCharities);
    if (result.status = "success"){
        var serverCharities = result.data.sresult;

        var charityObjects = [];
        for (var i = 0; i < serverCharities.length; i++) {
            console.log("Iteration " + i);

            charityObjects.push(new Charity(
                serverCharities[i].linstancelocationid,
                serverCharities[i].sinstancename,
                serverCharities[i].slocationname,
                serverCharities[i].loctype
            ));
            console.log("Generated list length = " + charityObjects.length);
        }
        return charityObjects;
    }

};
