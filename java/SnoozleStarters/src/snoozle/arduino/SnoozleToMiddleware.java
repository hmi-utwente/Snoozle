package snoozle.arduino;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import gnu.io.CommPortIdentifier;
import gnu.io.SerialPort;
import gnu.io.SerialPortEvent;
import gnu.io.SerialPortEventListener;
import static nl.utwente.hmi.middleware.helpers.JsonNodeBuilders.array;
import static nl.utwente.hmi.middleware.helpers.JsonNodeBuilders.object;

import nl.utwente.hmi.middleware.Middleware;
import nl.utwente.hmi.middleware.MiddlewareListener;
import nl.utwente.hmi.middleware.loader.GenericMiddlewareLoader;
import nl.utwente.hmi.usb.USBWrapper;
import nl.utwente.hmi.usb.USBWrapper.DataProcessingException;

/**
 * This class will read the sensor output from Snoozle, convert it to JSON,
 * and send it to the middleware so other modules can use the data.
 * 
 * Similarly, it will receive motor commands from the middleware, translate them to bytecode and send it on to Snoozle
 * 
 * @author Daniel Davison
 *
 */
public class SnoozleToMiddleware extends USBWrapper implements MiddlewareListener {

	private static Logger logger = LoggerFactory.getLogger(SnoozleToMiddleware.class.getName());

	private Middleware mw;

	/**
	 * This is our byte stream handle with which we send info to Snoozle
	 */
	private DataOutputStream byteStreamOut;

	/**
	 * Constructs this converter with the given middleware.. we attempt to make a connection to one of the given COM ports
	 * @param mw the initiated middleware on which we want to send/receive data
	 * @param comPorts the com ports on which to search
	 */
	public SnoozleToMiddleware(String[] comPorts, Middleware mw){
		super(comPorts);
		this.mw = mw;
		mw.addListener(this);
		
		try {
			logger.info("Starting the byteStreamOut for the serial connection");
			this.byteStreamOut = new DataOutputStream(serialPort.getOutputStream());
		} catch (IOException e) {
			logger.error("Unable to initiate the bytestream to arduino");
			e.printStackTrace();
		}
		
		//we need to sleep a bit, so the arduino has time to automatically restart
		try {
			Thread.sleep(2000);
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	/**
	 * Send some bytes to the serial port.. this function automatically flushes the buffer after writing all bytes
	 * @param bytes the bytes to send
	 */
	public void sendBytes(byte[] bytes){
		try {
			byteStreamOut.write(bytes);
			byteStreamOut.flush();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	/**
	 * Receives Snoozle sensordata from USB, hopefully as a JSON string, and sends it on to the middleware
	 */
	@Override
	protected void processData(String data) throws DataProcessingException {
		if(data.startsWith("DEBUG: ")){
			logger.debug("Got debug string from SNOOZLE: {}", data);
			return;
		}
		
		//parse json string and create JsonObject
		ObjectMapper mapper = new ObjectMapper();
		
		try {
			logger.info("Got data from SNOOZLE: {}", data);
			JsonNode jn = mapper.readTree(data);
			logger.debug("Transformed data to json object: {}", jn.toString());
			
			mw.sendData(jn);
		} catch (JsonProcessingException e) {
			logger.warn("Error while parsing data from SNOOZLE as JSON \"{}\": {}", data, e.getMessage());
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
	}

	/**
	 * Receives a JSON command from the middleware, transforms it to byte data and sends on to Snoozle through USB
	 * TODO: do some sanity checking on the values
	 * @param jn the JSON data
	 */
	@Override
	public void receiveData(JsonNode jn) {
		logger.debug("Got new motor command: {}", jn.toString());
		
		ArrayList<Integer> servos = new ArrayList<Integer>();
		int position = 10;
		int stepDelay = 10;
		int stepSize = 1;
		
		//first, parse the servo(s)
		//the servo field might be an array, or it might be just 1 int
		if(jn.get("servo") != null && jn.get("servo").isArray()){
			for(JsonNode s : jn.get("servo")){
				if(s.isInt()){
					servos.add(s.asInt());
				} else {
					logger.warn("Got a malformed servo request: {} (Full JSON: {})", s.toString(), jn.toString());
				}
			}
		} else if(jn.get("servo") != null && jn.get("servo").isInt()){
			servos.add(jn.get("servo").asInt());
		} else {
			logger.info("No servo field found, defaulting to all servos");
			servos.addAll(Arrays.asList(1,2,3,4));
		}
		
		//then, parse the rest of the fields
		if(jn.get("position") != null && jn.get("position").isInt()){
			position = jn.get("position").asInt();
		}
		if(jn.get("stepDelay") != null && jn.get("stepDelay").isInt()){
			stepDelay = jn.get("stepDelay").asInt();
		}
		if(jn.get("stepSize") != null && jn.get("stepSize").isInt()){
			stepSize = jn.get("stepSize").asInt();
		}
		
		//finally, construct the byte array and send it on to Snoozle
		for(int s : servos){
	    	byte[] bs = new byte[7];
	    	
	    	//three 0 bytes as header (0x00) 
	    	bs[0] = (byte) 0;
	    	bs[1] = (byte) 0;
	    	bs[2] = (byte) 0;
	    	
	    	//then the motor commands in the next 4 bytes
	    	bs[3] = (byte) s;
	    	bs[4] = (byte) position;
	    	bs[5] = (byte) stepDelay;
	    	bs[6] = (byte) stepSize;
	    	
	    	logger.debug("Sending bytes to arduino: {}", bs);
	    	
    		sendBytes(bs);
		}
	}
	
}
