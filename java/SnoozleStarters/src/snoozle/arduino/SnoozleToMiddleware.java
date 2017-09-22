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
import java.util.Arrays;
import java.util.Enumeration;
import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
import nl.utwente.hmi.middleware.loader.GenericMiddlewareLoader;
import nl.utwente.hmi.usb.USBWrapper;
import nl.utwente.hmi.usb.USBWrapper.DataProcessingException;

/**
 * This class will read the output from the Ramp setup, convert it to JSON,
 * and send it to the middleware so other modules can use the data.
 * 
 * TODO: it would be cool if the USB communication would somehow also implement a Middleware, thus making bridging much easier.. this is conceptually a bit tricky though, since USB is not really a middleware...
 * 
 * @author Daniel Davison
 *
 */
public class SnoozleToMiddleware extends USBWrapper {

	private static Logger logger = LoggerFactory.getLogger(SnoozleToMiddleware.class.getName());

	private JsonNode previousData = null;
	private Middleware mw;

	private DataOutputStream byteStreamOut;

	/**
	 * Constructs this converter with the given middleware.. we attempt to make a connection to one of the given COM ports
	 * @param mw the middleware on which we want to send/receive data
	 * @param comPorts the com ports on which to search
	 */
	public SnoozleToMiddleware(String[] comPorts, Middleware mw){
		super(comPorts);
		this.mw = mw;
		
		try {
			logger.info("Starting the byteStreamOut for the serial connection");
			this.byteStreamOut = new DataOutputStream(serialPort.getOutputStream());
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		//we need to sleep a bit, so the arduino has time to restart
		try {
			Thread.sleep(2000);
		} catch (InterruptedException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	/**
	 * Send some bytes to the serial port.. this automatically flushes
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
	
	
	@Override
	protected void processData(String data) throws DataProcessingException {
		//JsonNode jData = parseSensorData(data);
		logger.info("got message: {}", data);
		//only send if data has actually changed
		//TODO: should keep rfid data separate from beam data
//		if(!jData.equals(previousData)){
//			logger.info("Sending ramp sensor data [{}] to middleware: {}", data.toString(), jData.toString());
//			mw.sendData(jData);
//		}
//		
//		previousData = jData;
	
	}
	
	/**
	 * Parse a line of data from the sensors and produces a JsonNode that can be sent to the middleware
	 * The data follows the following format: 
	 * - starting with "ID" if it is an RFID event, followed by the actual rfid tag id: ["ID"][rfidtag]
	 * - or containing the state of the ramp as a sequence of several blocks of data 'B', 'AL', 'AR', 'P', 'TL', 'TR', matching the REGEX "AL([0-9]+)AR([0-9]+)P[01]TL([0-9]+)TR([0-9]+)": AL[angleleft]AR[angleright]P[buttonpressed]TL[timeleft]TR[timeright]
	 * where angleleft and angleright are angles (between about 17-41 increments of 2), buttonpressed is 0 or 1 and timeleft and timeright are the milliseconds it took the ball to roll to the finish after pressing the button
	 * Example data: AL19AR16P0TL1301TR1458
	 * @param data a line of incoming sensor data
	 * @return a JSonNode that contains the data suitable for sending over the middleware
	 * @throws DataProcessingException if data does not match the expected format
	 */
	private JsonNode parseSensorData(String data) throws DataProcessingException {
		if(data == null){
			throw new DataProcessingException("Got null data: "+data);
		}
		
		if(data.matches("AL([0-9]+)AR([0-9]+)P[01]TL([0-9]+)TR([0-9]+)")) {
			logger.debug("Processing ramp sensor data: {}", data);

			//second block contains info about the angle of both ramps, between 'AL', 'AR' and 'P' markers
			//TODO: convert raw angles into low, med, high?
			int angleLeft = Integer.parseInt(data.substring(data.indexOf("AL") + 2, data.indexOf("AR")));
			int angleRight = Integer.parseInt(data.substring(data.indexOf("AR") + 2, data.indexOf("P")));
			
			//third block contains info about a button press
			String buttonPress = parseBoolean(data.substring(data.indexOf("P") + 1, data.indexOf("TL"))) ? "TRUE" : "FALSE";
			
			//last block contains the timings from the start to finish
			int timeLeft = Integer.parseInt(data.substring(data.indexOf("TL") + 2, data.indexOf("TR")));
			int timeRight = Integer.parseInt(data.substring(data.indexOf("TR") + 2, data.length()));
			
			//now build the JSON: {sensordata:{ramp:{ball:{left:"0-9", right:"0-9"}, angle:{left:"0.0", right:"0.0"}, button:"TRUE|FALSE", time:{left:"0.0", right:"0.0"}}}}
			JsonNode json = object("sensordata", object()
								.with("ramp", object()
									.with("angle", object()
											.with("left", angleLeft)
											.with("right", angleRight)
										)
									.with("button", buttonPress)
									.with("time", object()
											.with("left", timeLeft)
											.with("right", timeRight)
										)
								)
							).end();
			
			return json;
		} else {
			logger.error("Got malformed line of data: {}", data);
			throw new DataProcessingException("Unable to process data: "+data);
		}
	}
	
	/**
	 * Small utility function to parse a boolean string.. '1' or 'true' will result in TRUE, all else will result in FALSE
	 * This is used in favor of the normal Boolean.parseBoolean() because at this point I'm not sure what the output from Arduino will be
	 * @param b the string to parse as boolean
	 * @return true iff b equals '1' or 'true' (ignoring case)
	 */
	private boolean parseBoolean(String b){
		boolean pb = ("1".equalsIgnoreCase(b) || "true".equalsIgnoreCase(b));
		//logger.debug("Parsing boolean [{}]: {}", b, pb);
		return pb;
	}

}
