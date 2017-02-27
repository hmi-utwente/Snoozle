var util = require('util');
var events = require('events');
var Stomp = require('stomp-client');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
var xbeeAPI = new xbee_api.XBeeAPI({
    api_mode: 1,
    module: "ZigBee"
});

var middleware = new Stomp('127.0.0.1', 61613, 'admin', 'password');
var readTopic = "/topic/SnoozleRequests";
var writeTopic = "/topic/SnoozleFeedback";
var serialPortName = 'COM1';
var remoteXBeeAddr = "0013A20040628226";
var useXBee = true;

if (process.argv.length > 2) {
    serialPortName = process.argv[2];
} if (process.argv.length > 3) {
    if (process.argv[3] == 'xbee') {
        useXBee = true;
    } else if (process.argv[3] == 'serial') {
        useXBee = false;
    }
}

function XBeeSerialHandler(xb) {
    var self = this;
	self.xbeeAPI = xb;
	self.serialport = undefined;
}

XBeeSerialHandler.prototype.Close = function () {
    var self = this;
	return new Promise(function (fullfill, reject) {
		if (self.serialport && self.serialport.isOpen) {
			self.serialport.close(function(err) {
				if (err) reject(err);
				else fullfill();
			});
		} else fullfill();
	});
}

XBeeSerialHandler.prototype.Connect = function () {
    var self = this;
    return new Promise(function(fullfill, reject) {
        self.Close().then(function(res) {
            self.serialport = new SerialPort(serialPortName, {
              baudrate: 57600,
              parser: self.xbeeAPI.rawParser()
            });

            self.serialport.on('open', function() {
                console.log('Serialport open');
                fullfill();
            });

            self.serialport.on('error', function(err) {
                reject(err);
            })
        }).catch(function(err) {
            reject(err);
        });
    });
}

console.log("Using serial port: "+serialPortName);
console.log("Use XBee?: "+useXBee);
console.log("STOMP readTopic: "+readTopic);
console.log("STOMP writeTopic: "+writeTopic);

var xbh = new XBeeSerialHandler(xbeeAPI);
xbh.Connect().catch(function(err) {
    console.log("Failed to connect on SerialPort: "+err);
});

middleware.connect(function(sessionId) {
    middleware.subscribe(readTopic, function(body, headers) {
        console.log(body);
        var obj = JSON.parse(body);
        if (obj['msgType'] && obj.msgType == 'setServo') {
            var _defaultSetServoMsg = {
                servo: 1,
                position: 90,
                stepDelay: 5,
                stepSize: 1
            } // Apply defaults to message:
            obj = Object.assign(_defaultSetServoMsg, obj);
            // Make sure we don't pass properties bigger than a single byte:
            var ser = parseInt(obj.servo,10) & 255;
            var pos = parseInt(obj.position,10) & 255;
            var std = parseInt(obj.stepDelay,10) & 255;
            var sts = parseInt(obj.stepSize,10) & 255;
            var packet = [ 0x00, 0x00, 0x00, ser, pos, std, sts ];
            if (useXBee) {// Turn into a xbee-api frame...
                packet = xbeeAPI.buildFrame({
                    type: C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST,
                    destination64: remoteXBeeAddr,
                    data: packet
                });
            }
            console.log(util.inspect(packet));
            xbh.serialport.write(packet);
        }
    });

    middleware.publish(writeTopic, JSON.stringify({
        msgType: 'status',
        msg: 'connected'
    }));
}, function(err) {
    console.log("Failed to connect to stomp: "+err);
});

