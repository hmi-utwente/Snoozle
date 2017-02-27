var app = angular.module('remoteControlApp', ['luegg.directives', 'ngAudio']);
window._stream = false;

app.factory('stomp', function($rootScope) {
	var stomp_location = "ws://127.0.0.1:61623";
	var options = {debug: false, protocols: webstomp.VERSIONS.supportedProtocols()};//
	if (location.hash.length > 1) {
		stomp_location = location.hash.substring(1);
	}
	
	console.log("connecting to stomp url: "+stomp_location);
	var client = webstomp.client(stomp_location, options);
	client.connect("admin", "password", function(c) {
		console.log("Connected to stomp.");
		location.hash = "#"+stomp_location;
		var subscriptionBML = client.subscribe('/topic/ASAPSnoozleBmlFeedback', function(msg) {
			console.log("BmlFeedback: "+msg);
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
    $scope.defaultBml = '<bmlt:audiofile start="0" id="audio0" fileName="Snoozle/audio/Snooze/weeeeh.wav" />\n'+
                        '<mw:sendJsonMessage start="0" id="serv0">{\n'+
                        '  "msgType": "setServo",\n'+
                        '  "servo": [1,2,3,4],\n'+
                        '  "position": 20\n'+
                        '  "stepDelay": 5,\n'+
                        '  "stepSize": 1\n'+
                        '}</mw:sendJsonMessage>'
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

    $scope.resetPillow = function() {
        var resetBml = '<mw:sendJsonMessage id="serv0" start="0">{ "msgType": "setServo", "position": 20 }</mw:sendJsonMessage>';
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
        try {
		    stomp.send('/topic/ASAPSnoozleBmlRequest', JSON.stringify(msg));
        } catch(err) {
            console.log("Websocket? ", err);
        }
	}
	
	$scope.randomID = function() {
		var S4 = function() {
		   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		};
		return (S4()+'_'+S4());
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
      if (msg.type == "dialog") {
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
