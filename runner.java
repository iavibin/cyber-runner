import java.awt.Desktop;
import java.io.File;
import java.net.URI;

/**
 * Cyber Runner - Desktop Bridge Launcher
 * Launches index.html in the default system browser.
 */
public class runner {
    public static void main(String[] args) {
        System.out.println("[CYBER RUNNER] Initializing Neon Protocol launcher...");
        try {
            File htmlFile = new File("index.html");
            if (!htmlFile.exists()) {
                System.err.println("Error: index.html not found in workspace.");
                return;
            }
            URI fileUri = htmlFile.toURI();
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(fileUri);
            } else {
                String os = System.getProperty("os.name").toLowerCase();
                if (os.contains("win")) {
                    new ProcessBuilder("rundll32", "url.dll,FileProtocolHandler", fileUri.toString()).start();
                } else if (os.contains("mac")) {
                    new ProcessBuilder("open", fileUri.toString()).start();
                } else {
                    new ProcessBuilder("xdg-open", fileUri.toString()).start();
                }
            }
            System.out.println("[CYBER RUNNER] Game successfully launched in browser.");
        } catch (Exception e) {
            System.err.println("Failed to launch browser: " + e.getMessage());
            System.out.println("Please open index.html directly in Chrome, Edge, or Firefox.");
        }
    }
}
