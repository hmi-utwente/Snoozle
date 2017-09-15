var fs = require('fs');
var engine = require('engine.io');
var express = require('express')
var serveStatic = require('serve-static')
var open = require('open');
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

var baudrate = 57600;

if (process.argv.length > 2) {
    serialPortName = process.argv[2];
}

if (process.argv.length > 3) {
    if (process.argv[3] == 'xbee') {
        useXBee = true;
    } else if (process.argv[3] == 'serial') {
        useXBee = false;
    }
}

if (process.argv.length > 4) {
    baudrate = parseInt(process.argv[4]);
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
              baudrate: baudrate,
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
        var obj = JSON.parse(body);
        if (obj['msgType'] && obj.msgType == 'setServo') {
            var _defaultSetServoMsg = {
                servo: [1, 2, 3, 4],
                position: 90,
                stepDelay: 5,
                stepSize: 1
            } // Apply defaults to message:
            obj = Object.assign(_defaultSetServoMsg, obj);
            console.log(util.inspect(obj));

            if (typeof(obj.servo) === 'number') {
                obj.servo = [obj.servo];
            }

			for (var s = 0; s < obj.servo.length; s++) {
                // Make sure we don't pass properties bigger than a single byte:
                var ser = parseInt(obj.servo[s],10) & 255;
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
        }
    });

    middleware.publish(writeTopic, JSON.stringify({
        msgType: 'status',
        msg: 'connected'
    }));
}, function(err) {
    console.log("Failed to connect to stomp: "+err);
});



var app = express();
var http = require('http').createServer(app);
var webPort = 5601;
 
var dialogsFolder = "dialogs";
var defaultDialogFile = "default.json";
 
app.use(serveStatic(__dirname + '/app'));
http.listen(webPort);

var server = engine.attach(http);
var sockets = [];
function removeSocket(s) { sockets.splice(sockets.indexOf(s), 1); }
function broadcast(msg) {
    var data = JSON.stringify(msg);
    sockets.forEach(function(s) {
        s.send(data);
    });
}
 
server.on('connection', function(socket) {
    sockets.push(socket);
    socket.on('message', function(msg) {
        var parsed = JSON.parse(msg);
		console.log(util.inspect(parsed));
        if (parsed.type == "refresh") {
          var res = {
            type:"refresh",
			data: {}
          }
          socket.send(JSON.stringify(res));
        } else if (parsed.type == "save_dialog") {
			fs.renameSync("./"+dialogsFolder+"/"+defaultDialogFile, "./"+dialogsFolder+"/"+defaultDialogFile+".backup_"+(new Date().getTime()));
			fs.writeFile("./"+dialogsFolder+"/"+defaultDialogFile, JSON.stringify(parsed.data), function(err) {
				if(err) {
				  broadcast({
					type:"res",
					data: 'e Dialog could not be saved ('+err+')'
				  });
				} else {
				  broadcast({
					type:"res",
					data: 'l Dialog saved.'
				  });
				}
			}); 
			
			var csvOut = "name|text";
			var blocks = parsed.data.blocks;
			for (var b = 0; b < blocks.length; b++) {
				for (var c = 0; c < blocks[b].columns.length; c++) {
					for (var u = 0; u < blocks[b].columns[c].utterances.length; u++) {
						var utterance = blocks[b].columns[c].utterances[u];
						csvOut = csvOut+"\n"+utterance.id+"|"+utterance.text;
					}
				}
			}
		} else if (parsed.type == "load_dialog") {
		  var res = {
            type:"dialog",
            dialog: JSON.parse(fs.readFileSync("./"+dialogsFolder+"/"+defaultDialogFile, 'utf8'))
          }
          socket.send(JSON.stringify(res));
		}
    });
	
    socket.on('close', function() {
        removeSocket(socket);
    });
});
