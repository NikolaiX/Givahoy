/*global angular, require, module, cordova*/

/*
 * An HTTP Plugin for cordova.
 */

(function () {
    "use strict";
    if (cordova.platformId !== "ios") {
        return;
    }
    var exec = require('cordova/exec'),
        http = {
            setHeader: function (header, value, success, failure) {
                return exec(success, failure, "CordovaHttpPlugin", "setHeader", [header, value]);
            },
            get: function (url, params, headers, success, failure) {
                return exec(success, failure, "CordovaHttpPlugin", "get", [url, params, headers]);
            },
            post: function (url, params, headers, success, failure) {
                return exec(success, failure, "CordovaHttpPlugin", "post", [url, params, headers]);
            },
            getImage: function (url, headers, success, failure) {
                return exec(success, failure, "CordovaHttpPlugin", "getImageAsBase64", [url, headers]);
            }
        };

    module.exports = http;
    window.cordovaHTTP = http;
}());