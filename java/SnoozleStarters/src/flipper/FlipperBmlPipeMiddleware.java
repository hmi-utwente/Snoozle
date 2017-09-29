package flipper;


import static nl.utwente.hmi.middleware.helpers.JsonNodeBuilders.object;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

import com.fasterxml.jackson.databind.JsonNode;

import nl.utwente.hmi.middleware.helpers.JsonNodeBuilders.ObjectNodeBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FlipperBmlPipeMiddleware extends FlipperMiddleware {

	private static Logger logger = LoggerFactory.getLogger(FlipperBmlPipeMiddleware.class.getName());
	
	public FlipperBmlPipeMiddleware(String middlewareProps) {
		super(middlewareProps);
	}

	/**
	 * To send BML data to an ASAP BML pipe middleware, it needs to be 
	 * formatted in the following way:
	 *   { "content": { "bml": "$data" } }
	 */
	public void send(String data) {
		logger.debug("Send: "+data);
        ObjectNodeBuilder on = object();
        try {
			on.with("content", URLEncoder.encode(data, "UTF-8"));
		} catch (UnsupportedEncodingException e) {
			e.printStackTrace();
			return;
		}
        ObjectNodeBuilder onWrap = object();
        onWrap.with("bml", on.end());
        middleware.sendData(onWrap.end());
	}
	
	
}