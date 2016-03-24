cordova-http
==================

This plugin is used to solve https://issues.apache.org/jira/browse/CB-2415  
It is cloned from https://github.com/wymsee/cordova-HTTP.git and changed to only include the
GET request with headers for iOS

## Functions

All available functions are documented below.  Every function takes a success and error callback function as the last 2 arguments.

### setHeader
Set a header for all future requests.  Takes a header and a value.

    cordovaHTTP.setHeader("Header", "Value", function() {
        console.log('success!');
    }, function() {
        console.log('error :(');
    });

### get
Execute a GET request.  Takes a URL, parameters, and headers.

    cordovaHTTP.get("https://google.com/, {
        id: 12,
        message: "test"
    }, { Authorization: "OAuth2: token" }, function(response) {
        console.log(response.status);
        console.log(response.data);
        console.log(response.status);
    }, function(response) {
        console.error(response.error);
        console.error(response.headers);
    });

## Libraries

This plugin utilizes some awesome open source networking libraries.  These are both MIT licensed:

 - iOS - [AFNetworking](https://github.com/AFNetworking/AFNetworking)

## License

The MIT License

Copyright (c) 2014 Wymsee, Inc

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
