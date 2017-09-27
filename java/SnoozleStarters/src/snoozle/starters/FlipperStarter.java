package snoozle.starters;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import hmi.flipper2.launcher.FlipperLauncher;
import hmi.flipper2.launcher.FlipperLauncherThread;

import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.joran.JoranConfigurator;
import ch.qos.logback.core.joran.spi.JoranException;
import ch.qos.logback.core.util.StatusPrinter;

public class FlipperStarter {

	final static Logger logger = LoggerFactory.getLogger(FlipperStarter.class.getName());
	
	private static FlipperLauncherThread flt;
	
	public static void main(String[] args) {
		String help = "Expecting commandline arguments in the form of \"-<argname> <arg>\".\nAccepting the following argnames: config";
    	String flipperPropFile = "flipper.properties";
    	
        if(args.length % 2 != 0) {
        	logger.info(help);
        	System.exit(0);
        }
        
        for(int i = 0; i < args.length; i = i + 2){
        	if(args[i].equals("-config")) {
        		flipperPropFile = args[i+1];
        	} else {
        		logger.warn("Unknown commandline argument: \""+args[i]+" "+args[i+1]+"\".\n"+help);
            	System.exit(0);
        	}
        }
        
		Properties ps = new Properties();
        InputStream flipperPropStream = FlipperLauncher.class.getClassLoader().getResourceAsStream(flipperPropFile);

        try {
            ps.load(flipperPropStream);
        } catch (IOException ex) {
            logger.warn("Could not load flipper settings from "+flipperPropFile);
            ex.printStackTrace();
        }

        // If you want to check templates based on events (i.e. messages on middleware),
        // you can run  flt.forceCheck(); from a callback to force an immediate check.
        logger.debug("Starting Thread");
        flt = new FlipperLauncherThread(ps);
        flt.start();
	}
	
}