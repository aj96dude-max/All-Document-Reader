package android.print;

import android.print.PrintDocumentAdapter.LayoutResultCallback;
import android.print.PrintDocumentAdapter.WriteResultCallback;

/**
 * Bridge class to allow instantiation of package-private PrintDocumentAdapter callbacks.
 * This must be located in the android.print package to access the constructors.
 */
public class PrintCallbackBridge {
    public abstract static class LayoutResultCallbackBridge extends LayoutResultCallback {
        public LayoutResultCallbackBridge() {
            super();
        }
    }

    public abstract static class WriteResultCallbackBridge extends WriteResultCallback {
        public WriteResultCallbackBridge() {
            super();
        }
    }
}
