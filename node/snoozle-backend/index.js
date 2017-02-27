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
if (process.argv.length > 1) {
    serialPortName = process.argv[2];
}

function XBeeSerialHandler(dbh, xb) {
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
                //self.dbHandler.SetState('serialPortState','open');
            });

            self.serialport.on('error', function(err) {
                reject(err);
            })
        }).catch(function(err) {
            console.log("ConnectError: "+util.inspect(err));
            reject(err);
        });
    });
}

XBeeSerialHandler.prototype.ServoPacket = function(addr, srv, val, dly, stp) {
	// TODO: make sure params are cast/added as single byte.
	return {
		type: C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST,
		destination64: addr,
		data: [ 0x00, 0x00, 0x00, srv, val, dly, stp ],
	};
}

XBeeSerialHandler.prototype.PlayAnimation = function(name) {
	var self = this;
	//self.dbh.GetAnimation(name).then(function(anim) {
	//}).catch(function(err) { console.log(err) });
}

//var db = new PouchDB('snoozle');
//var dbh = new PouchDBHandler(db);
var xbh = new XBeeSerialHandler({}, xbeeAPI);
//dbh.Init();
xbh.Connect().catch(function(err) {
    console.log("Failed to connect on SerialPort: "+err);
});

middleware.connect(function(sessionId) {
    middleware.subscribe(readTopic, function(body, headers) {
        console.log(body);
        var obj = JSON.parse(body);
        if (obj['msgType'] && obj.msgType == 'setServo') {
            var _defaultSetServoMsg = {
                "servo": 0,
                "position": 90,
                "stepDelay": 5,
                "stepSize": 1
            }
            obj = Object.assign(_defaultSetServoMsg, obj);
            var packet = xbh.ServoPacket(remoteXBeeAddr, obj.servo, obj.position, obj.stepDelay, obj.stepSize);
            xbh.serialport.write(packet);
            console.log(util.inspect(packet));
        }
    });

    middleware.publish(writeTopic, JSON.stringify({
        msgType: 'status',
        msg: 'connected'
    }));
}, function(err) {
    console.log("Failed to connect to stomp: "+err);
});

console.log("Using serial port: "+serialPortName);
console.log("STOMP readTopic: "+readTopic);
console.log("STOMP writeTopic: "+writeTopic);
