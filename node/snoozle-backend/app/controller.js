var app = angular.module('remoteControlApp', ['luegg.directives', 'ngAudio']);
window._stream = false;

app.factory('stomp', function($rootScope) {
	var stomp_location = "ws://127.0.0.1:61623";
	var options = {debug: true, protocols: webstomp.VERSIONS.supportedProtocols()};//
	if (location.hash.length > 1) {
		stomp_location = location.hash.substring(1);
	}
	
	console.log("connecting to stomp url: "+stomp_location);
	var client = webstomp.client(stomp_location, options);
	client.connect("admin", "password", function(c) {
		console.log("Connected to stomp.");
		location.hash = "#"+stomp_location;
		var subscriptionBML = client.subscribe('/topic/ASAPSnoozleBmlFeedback', function(msg) {
			console.log("StudyState:");
			console.log(msg);
		});
	}, function(c, e) {
		console.log("Error connecting to stomp: "+e);
	});
	
    return {
        send: function(topic, data) {
			client.send(topic, data, {
				'timestamp': new Date().getTime(),
				'NMSXDeliveryMode': false,
				'priority': 5,
				'persistent': false,
				'receipt': 0
			});
        }
    };
});

app.factory('socket', function($rootScope) {
    var socket = new eio.Socket();
    return {
        on: function (eventName, callback) {
          socket.on(eventName, function () {  
            var args = arguments;
            $rootScope.$apply(function () {
              callback.apply(socket, args);
            });
          });
        },
        send: function(data) {
            socket.send(data);
        },
        emit: function (eventName, data, callback) {
          socket.emit(eventName, data, function () {
            var args = arguments;
            $rootScope.$apply(function () {
              if (callback) {
                callback.apply(socket, args);
              }
            });
          })
        }
    };
});

function RemoteCTRL($scope, socket, stomp, ngAudio) {
    $scope.glued = true;
    $scope.cmddata = "";
    $scope.log = [];
    $scope.f_agentSpeech = [];
	$scope.agentClips = {};
	$scope.l_distance = 0;
	$scope.dialogEditMode = false;
	$scope.experimentRunning = false;
	$scope.bmlId = 0;
	
	$scope.dialogJson = {
		"blocks": []
	};

	$scope.startExperiment = function() {
		if (window.confirm("Unpaused PhysioRecording?")) {
			if (window.confirm("Calibrated Eye-tracker?")) {
				$scope.experimentRunning = true;
				$scope.dialogEditMode = false;
				$scope.experimentControl('START');
				//$scope.send('START_EXPERIMENT');
				angular.element('.pure-button').removeClass('playing');
				angular.element('.pure-button').removeClass('completed');
			}
		}
	}
	
	$scope.endExperiment = function() {
		$scope.experimentRunning = false;
		//angular.element('#timer').removeClass('running');
		$scope.experimentControl('STOP');
		//$scope.send('STOP_EXPERIMENT');
		//window.confirm("Stop video recordings!.");
	}
	
    $scope.send = function(raw) {
		console.log("Send broken...")
		
    }

    $scope.resetPillow = function() {
         var resetBml = '<mw:sendJsonMessage id="serv1" start="0">{'+
                        '    "msgType": "setServo",'+
                        '    "servo": 1,'+
                        '    "position": 20'+
                        '}</mw:sendJsonMessage>'+
                        '<mw:sendJsonMessage id="serv2" start="0">{'+
                        '    "msgType": "setServo",'+
                        '    "servo": 2,'+
                        '    "position": 20'+
                        '}</mw:sendJsonMessage>'+
                        '<mw:sendJsonMessage id="serv3" start="0">{'+
                        '    "msgType": "setServo",'+
                        '    "servo": 3,'+
                        '    "position": 20'+
                        '}</mw:sendJsonMessage>'+
                        '<mw:sendJsonMessage id="serv4" start="0">{'+
                        '    "msgType": "setServo",'+
                        '    "servo": 4,'+
                        '    "position": 20'+
                        '}</mw:sendJsonMessage>';
        $scope.pillowBML(resetBml);
    }
	
	$scope.pillowBML = function(text) {
		var prefix = "<bml xmlns=\"http://www.bml-initiative.org/bml/bml-1.0\" id=\"servobml"+$scope.bmlId+"\" xmlns:bmlt=\"http://hmi.ewi.utwente.nl/bmlt\" xmlns:mw=\"http://hmi.ewi.utwente.nl/middlewareengine\">";
		var suffix = "</bml>";
		$scope.bmlId++;
        var msg = {
          bml: {
			  content: encodeURIComponent((prefix+text+suffix))
		  }
        };
		stomp.send('/topic/ASAPSnoozleBmlRequest', JSON.stringify(msg));
	}
	
	$scope.experimentControl = function(cmd) {
		var msg = {
          type:"cmd",
          data: { cmd: cmd }
        };
        socket.send(JSON.stringify(msg));
	}
	
	$scope.randomID = function() {
		var S4 = function() {
		   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		};
		return (S4()+'_'+S4());
	}
	
	$scope.updateIDs = function() {
		
	}
	
	$scope.toggleEditMode = function() {
		$scope.dialogEditMode = !$scope.dialogEditMode;
	}
	
	$scope.saveDialog = function() {
		$scope.dialogEditMode = false;
		var msg = {
			type:'save_dialog',
			data: JSON.parse(angular.toJson($scope.dialogJson))
		}
        socket.send(JSON.stringify(msg));
	}
	
	$scope.loadDialog = function() {
		$scope.dialogEditMode = false;
		var msg = {
			type:'load_dialog',
			data: {}
		}
        socket.send(JSON.stringify(msg));
		console.log('sent loading request');
	}

    $scope.sendCmd = function() {
        var msg = {
          type:"cmd",
          data: $scope.cmddata
        };
        socket.send(JSON.stringify(msg));
    }

    $scope.refresh = function() {
        var msg = {
          type:"refresh"
        };
        socket.send(JSON.stringify(msg));
    }

    socket.on('message', function(data){
      var msg = JSON.parse(data);
      if (msg.type == "refresh") {
		  /*
        $scope.f_agentSpeech = [];
		$scope.agentClips = {};
        for (var i = 0; i < msg.agentSpeech.length; i++) {
          if (msg.agentSpeech[i].indexOf(".ogg") > 1 && msg.agentSpeech[i].indexOf(".meta") < 0) {
            $scope.f_agentSpeech.push(msg.agentSpeech[i].split('.')[0]);
			$scope.agentClips[msg.agentSpeech[i].split('.')[0]] = ngAudio.load(msg.agentSpeech[i]);
          }
        }*/
      } else if (msg.type == "res") {
		  if (msg.data[0] == 'c') {
			var cmd = msg.data.substring(2).split(" ");
			$scope.experimentState = cmd[0];
			minutes = parseInt(cmd[1] / 60, 10);
			seconds = parseInt(cmd[1] % 60, 10);
			minutes = minutes < 10 ? "0" + minutes : minutes;
			seconds = seconds < 10 ? "0" + seconds : seconds;
			$scope.timer = minutes + ":" + seconds;

			  /*
			if (cmd[0] == "DIST") {
				$scope.l_distance = parseFloat(cmd[1]);
			} else if (cmd[0] == "SAYING") {
				if ($scope.agentClips[cmd[1]]) {
					$scope.agentClips[cmd[1]].play();
					console.log("Playing: "+cmd[1]);
				} else {
					console.log("Don't know audio clip for "+cmd[1]);
				}
				
				angular.element('.pure-button').removeClass('playing');
				angular.element('#'+cmd[1]).addClass('playing');
				angular.element('#'+cmd[1]).addClass('completed');
			} else if (cmd[0] == 'STOPSAYING') {
				angular.element('.pure-button').removeClass('playing');
			}*/
		  } else {
			var cls = "log_"+msg.data[0];
			$scope.log.push({ class:cls, txt:msg.data.substring(2) });
		  }
		  
      } else if (msg.type == "dialog") {
		  $scope.dialogJson = msg.dialog;
	  }
    });

    socket.on('close', function(){
    });
    socket.on('open', function(){
      $scope.refresh();
	  $scope.loadDialog();
    });
}
