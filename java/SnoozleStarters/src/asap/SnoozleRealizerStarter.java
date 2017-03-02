package asap;

import hmi.audioenvironment.AudioEnvironment;
import hmi.environmentbase.ClockDrivenCopyEnvironment;
import hmi.environmentbase.Environment;
import hmi.util.Console;
import hmi.util.SystemClock;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.GridLayout;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.util.ArrayList;

import nl.utwente.hmi.middleware.loader.GenericMiddlewareLoader;
import saiba.bml.BMLInfo;
import asap.bml.ext.bmlt.BMLTInfo;
import asap.environment.AsapEnvironment;
import asap.environment.AsapVirtualHuman;

public class SnoozleRealizerStarter
{
	
    public SnoozleRealizerStarter(String spec) throws IOException
    {
        Console.setEnabled(false);
        BMLTInfo.init();

        final AsapEnvironment ee = new AsapEnvironment();
        AudioEnvironment aue = new AudioEnvironment("LJWGL_JOAL");
        ClockDrivenCopyEnvironment ce = new ClockDrivenCopyEnvironment(1000 / 10);
        aue.init();
        ce.init();
        ArrayList<Environment> environments = new ArrayList<Environment>();
        environments.add(ee);
        environments.add(aue);
        environments.add(ce);
		SystemClock clock = new SystemClock(1000 / 20, "clock");
		ee.init(environments, clock);
		clock.start();
		clock.addClockListener(ee);

        System.out.println("loading spec "+spec);
        AsapVirtualHuman zeno = ee.loadVirtualHuman("", spec, "AsapRealizer - Snoozle");
        //zeno.getRealizerPort().performBML("<bml xmlns=\"http://www.bml-initiative.org/bml/bml-1.0\"  id=\"bml1\" xmlns:bmlt=\"http://hmi.ewi.utwente.nl/bmlt\"></bml>");

    }


    public static void main(String[] args) throws IOException
    {
    	String help = "Expecting commandline arguments in the form of \"-<argname> <arg>\".\nAccepting the following argnames: agentspec, middlewareprops";
    	
        String spec = "Snoozle/loaders/agentspec.xml";
    	String propFile = "defaultmiddleware.properties";
    	
        if(args.length % 2 != 0){
        	System.err.println(help);
        	System.exit(0);
        }
        
        for(int i = 0; i < args.length; i = i + 2){
        	if(args[i].equals("-agentspec")){
        		spec = args[i+1];
        	} else if(args[i].equals("-middlewareprops")){
        		propFile = args[i+1];
        	} else {
            	System.err.println("Unknown commandline argument: \""+args[i]+" "+args[i+1]+"\".\n"+help);
            	System.exit(0);
        	}
        }
    	
		GenericMiddlewareLoader.setGlobalPropertiesFile(propFile);
        SnoozleRealizerStarter demo = new SnoozleRealizerStarter(spec);
    }
}
