package com.theroom.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VoiceForegroundService")
public class VoiceForegroundPlugin extends Plugin {

    private BroadcastReceiver endCallReceiver;

    @Override
    public void load() {
        super.load();
        endCallReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.theroom.app.VOICE_CALL_END_REQUESTED".equals(intent.getAction())) {
                    notifyListeners("endCallRequested", new JSObject());
                }
            }
        };

        IntentFilter filter = new IntentFilter("com.theroom.app.VOICE_CALL_END_REQUESTED");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(endCallReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(endCallReceiver, filter);
        }
    }

    @PluginMethod
    public void startService(PluginCall call) {
        String title = call.getString("title", "TheRoom Voice Call");
        String content = call.getString("content", "Microphone active in background");
        Double startTimeD = call.getDouble("startTime");
        long startTime = startTimeD != null ? startTimeD.longValue() : System.currentTimeMillis();

        Context context = getContext();
        Intent intent = new Intent(context, VoiceService.class);
        intent.setAction(VoiceService.ACTION_START);
        intent.putExtra("title", title);
        intent.putExtra("content", content);
        intent.putExtra("startTime", startTime);

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
        intent.setAction(VoiceService.ACTION_STOP);
        try {
            context.stopService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop voice foreground service: " + e.getMessage(), e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (endCallReceiver != null) {
            try {
                getContext().unregisterReceiver(endCallReceiver);
            } catch (Exception ignored) {}
        }
        super.handleOnDestroy();
    }
}
