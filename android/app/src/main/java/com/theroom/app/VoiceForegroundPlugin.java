package com.theroom.app;

import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VoiceForegroundService")
public class VoiceForegroundPlugin extends Plugin {

    @PluginMethod
    public void startService(PluginCall call) {
        String title = call.getString("title", "TheRoom Voice Call");
        String content = call.getString("content", "Microphone active in background");

        Context context = getContext();
        Intent intent = new Intent(context, VoiceService.class);
        intent.putExtra("title", title);
        intent.putExtra("content", content);

        try {
            ContextCompat.startForegroundService(context, intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start voice foreground service: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, VoiceService.class);
        try {
            context.stopService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop voice foreground service: " + e.getMessage(), e);
        }
    }
}
