package snoozle.starters;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import nl.utwente.hmi.middleware.Middleware;
import nl.utwente.hmi.middleware.MiddlewareListener;
import nl.utwente.hmi.middleware.loader.GenericMiddlewareLoader;
import nl.utwente.hmi.middleware.worker.AbstractWorker;
import snoozle.arduino.SnoozleToMiddleware;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.JsonNode;

public class ArduinoStarter {
	private static Logger logger = LoggerFactory.getLogger(ArduinoStarter.class.getName());

		
	public static void main(String[] args){
		try {
			ArduinoStarter rs = new ArduinoStarter(args);
		} catch(Exception e){
			e.printStackTrace();
			System.exit(1);
		}
    }
	
	
    public ArduinoStarter(String[] args){

    	String help = "Expecting commandline arguments in the form of \"-<argname> <arg>\".\nAccepting the following argnames: middlewareprops, comport";
    	
    	String mwPropFile = "defaultmiddleware.properties";
    	String[] comPorts = new String[] {"COM2","COM3","COM4","COM5","COM6","COM7","COM8","COM9","COM10","/dev/tty.usbmodem1421"};

        if(args.length % 2 != 0){
        	System.err.println(help);
        	System.exit(1);
        }
        
        for(int i = 0; i < args.length; i = i + 2){
        	if(args[i].equals("-comport")){
        		String comPortArg = args[i+1];
        		
        		//is there more than 1?
        		if(comPortArg.contains(",")){
        			comPorts = comPortArg.split(",");
        		} else {
        			comPorts = new String[] {comPortArg};
        		}
        	} else if(args[i].equals("-middlewareprops")){
        		mwPropFile = args[i+1];
        	} else {
            	System.err.println("Unknown commandline argument: \""+args[i]+" "+args[i+1]+"\".\n"+help);
            	System.exit(1);
        	}
        }

		GenericMiddlewareLoader.setGlobalPropertiesFile(mwPropFile);
        
		//TODO: make this configurable (through commandline..?)
		Properties ps = new Properties();
		ps.put("iTopic", "/topic/snoozleCommands");
		ps.put("oTopic", "/topic/snoozleSensors");
		
        GenericMiddlewareLoader gml = new GenericMiddlewareLoader("nl.utwente.hmi.middleware.stomp.STOMPMiddlewareLoader", ps);
        Middleware mw = gml.load();

        //create the serial connection and start receiving/sending data :-)
        SnoozleToMiddleware usbListener = new SnoozleToMiddleware(comPorts, mw);

	}

}
