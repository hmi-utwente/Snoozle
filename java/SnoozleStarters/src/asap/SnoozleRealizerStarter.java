package asap;

import hmi.audioenvironment.AudioEnvironment;
import hmi.environmentbase.ClockDrivenCopyEnvironment;
import hmi.environmentbase.Environment;
import hmi.jcomponentenvironment.JComponentEnvironment;
import hmi.util.Console;
import hmi.util.SystemClock;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.GridLayout;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.util.ArrayList;

import javax.swing.JFrame;
import javax.swing.JPanel;

import nl.utwente.hmi.middleware.loader.GenericMiddlewareLoader;
import saiba.bml.BMLInfo;
import asap.bml.ext.bmlt.BMLTInfo;
import asap.environment.AsapEnvironment;
import asap.environment.AsapVirtualHuman;

public class SnoozleRealizerStarter
{

    protected JFrame mainJFrame = null;
	
    public SnoozleRealizerStarter(JFrame j, String spec) throws IOException
    {
        Console.setEnabled(false);
        mainJFrame = j;
        BMLTInfo.init();

        final AsapEnvironment ee = new AsapEnvironment();
        AudioEnvironment aue = new AudioEnvironment("LJWGL_JOAL");
        ClockDrivenCopyEnvironment ce = new ClockDrivenCopyEnvironment(1000 / 10);
        final JComponentEnvironment jce = setupJComponentEnvironment();
        aue.init();
        ce.init();
        ArrayList<Environment> environments = new ArrayList<Environment>();
        environments.add(ee);
        environments.add(aue);
        environments.add(jce);
        environments.add(ce);
		SystemClock clock = new SystemClock(1000 / 20, "clock");
		ee.init(environments, clock);
		clock.start();
		clock.addClockListener(ee);

        System.out.println("loading spec "+spec);
        AsapVirtualHuman zeno = ee.loadVirtualHuman("", spec, "AsapRealizer - Snoozle");
        //zeno.getRealizerPort().performBML("<bml xmlns=\"http://www.bml-initiative.org/bml/bml-1.0\"  id=\"bml1\" xmlns:bmlt=\"http://hmi.ewi.utwente.nl/bmlt\"></bml>");
        j.addWindowListener(new java.awt.event.WindowAdapter()
        {
            public void windowClosing(WindowEvent winEvt)
            {
                System.exit(0);
            }
        });

        mainJFrame.setSize(1000, 600);
        mainJFrame.setVisible(true);
    }

    private JComponentEnvironment setupJComponentEnvironment()
    {
        final JComponentEnvironment jce = new JComponentEnvironment();
                mainJFrame.setLayout(new BorderLayout());

                JPanel jPanel = new JPanel();
                jPanel.setPreferredSize(new Dimension(400, 40));
                jPanel.setLayout(new GridLayout(1, 1));
                jce.registerComponent("textpanel", jPanel);
                mainJFrame.add(jPanel, BorderLayout.SOUTH);
        return jce;
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
        SnoozleRealizerStarter demo = new SnoozleRealizerStarter(new JFrame("AsapRealizer - Snoozle"), spec);
    }
}
