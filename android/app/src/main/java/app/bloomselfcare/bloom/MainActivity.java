package app.bloomselfcare.bloom;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BloomWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
