/**
 * Cyber Runner - Java Launcher & Desktop Bridge
 * 
 * Note: Cyber Runner is built with HTML5 Canvas, modern JavaScript (runner.js),
 * and CSS (style.css). This Java file provides a native desktop launcher to
 * instantly execute and play the game in your default web browser from any Java IDE or terminal.
 */
import java.awt.Desktop;
import java.io.File;
import java.io.IOException;
import java.net.URI;

public class runner {
    public static void main(String[] args) {
        System.out.println("=========================================");
        System.out.println("      CYBER RUNNER // NEON PROTOCOL      ");
        System.out.println("=========================================");
        System.out.println("Launching HTML5 Arcade Game in default browser...");

        try {
            File htmlFile = new File("index.html");
            if (!htmlFile.exists()) {
                System.err.println("Error: index.html not found in current directory.");
                return;
            }

            URI fileUri = htmlFile.toURI();
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(fileUri);
                System.out.println("Cyber Runner successfully initialized at: " + fileUri);
            } else {
                // Fallback for Windows desktop execution
                Runtime.getRuntime().exec("rundll32 url.dll,FileProtocolHandler " + fileUri.toString());
                System.out.println("Launched via system protocol handler.");
            }
        } catch (IOException e) {
            System.err.println("Failed to launch browser: " + e.getMessage());
            System.out.println("Please open index.html directly in Google Chrome, Edge, or Firefox.");
        }
    }
}
