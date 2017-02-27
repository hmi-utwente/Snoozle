# Snoozle
The software to control the Snoozle pillow, our submission to the HRI student design competition 2017.

## Installation
Clone/download this repository, then put a copy of [hmibuild](https://github.com/ArticulatedSocialAgentsPlatform/hmibuild/archive/master.zip) in the `java` folder (rename it from `hmibuild-master` to `hmibuild` if necessary).
Requirements: jdk/jre (latest, 64bit), python (2.7.x), ant & node.js installed on your system.
It is usefull if ant & node are in your PATH.

For ASAP got to `java/SnoozleStarters`:
```
ant resolve 
ant compile
```

and then run with:
```
ant run
```

For backend go to `node/snoozle-backend`:
```
npm install
```

and then run with:
```
node index.js COM_PORT_HERE [serial/xbee]
```

The wizard interface is hosted on [http://127.0.0.1:5601/](http://127.0.0.1:5601/)
