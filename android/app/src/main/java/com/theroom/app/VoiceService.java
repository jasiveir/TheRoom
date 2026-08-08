package com.theroom.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

public class VoiceService extends Service {
    public static final String CHANNEL_ID = "theroom_voice_call_channel";
    public static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_START = "com.theroom.app.ACTION_START_VOICE_SERVICE";
    public static final String ACTION_STOP = "com.theroom.app.ACTION_STOP_VOICE_SERVICE";
    public static final String ACTION_END_CALL = "com.theroom.app.ACTION_END_CALL_NOTIFICATION";

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;

    private Handler handler;
    private Runnable updateNotificationRunnable;
    private long startTimeMs = 0;
    private String callTitle = "TheRoom — Voice Call";
    private NotificationManager notificationManager;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        handler = new Handler(Looper.getMainLooper());

        // 1. Acquire Partial WakeLock to keep CPU running when app is backgrounded / screen off
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TheRoom:VoiceCallWakeLock");
            wakeLock.setReferenceCounted(false);
            if (!wakeLock.isHeld()) {
                wakeLock.acquire();
            }
        }

        // 2. Acquire High Performance WifiLock to keep WebRTC network connection alive
        WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm != null) {
            wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "TheRoom:VoiceCallWifiLock");
            wifiLock.setReferenceCounted(false);
            if (!wifiLock.isHeld()) {
                wifiLock.acquire();
            }
        }

        // 3. Request Android Communication Mode & Audio Focus for WebRTC background voice call
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.setSpeakerphoneOn(true);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();

                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(focusChange -> {})
                        .build();

                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN);
            }
        }

        // 4. Runnable to update the call duration natively every second
        updateNotificationRunnable = new Runnable() {
            @Override
            public void run() {
                if (startTimeMs > 0) {
                    updateNotification();
                    handler.postDelayed(this, 1000);
                }
            }
        };
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_END_CALL.equals(action)) {
                // User pressed "End Call" on the notification shade
                sendEndCallBroadcast();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_STOP.equals(action)) {
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }

            if (intent.hasExtra("title")) {
                callTitle = intent.getStringExtra("title");
            }
            if (intent.hasExtra("startTime")) {
                startTimeMs = intent.getLongExtra("startTime", System.currentTimeMillis());
            } else if (startTimeMs == 0) {
                startTimeMs = System.currentTimeMillis();
            }
        } else if (startTimeMs == 0) {
            startTimeMs = System.currentTimeMillis();
        }

        Notification notification = buildCallNotification();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE | ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        // Start native 1-second interval loop for live duration notification updates
        handler.removeCallbacks(updateNotificationRunnable);
        handler.post(updateNotificationRunnable);

        return START_STICKY;
    }

    private Notification buildCallNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setAction(Intent.ACTION_MAIN);
        notificationIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        
        PendingIntent contentPendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, pendingFlags);

        // "Maximize" / "Return to Call" PendingIntent
        PendingIntent maximizePendingIntent = PendingIntent.getActivity(this, 1, notificationIntent, pendingFlags);

        // "End Call" PendingIntent
        Intent endCallIntent = new Intent(this, VoiceService.class);
        endCallIntent.setAction(ACTION_END_CALL);
        PendingIntent endCallPendingIntent = PendingIntent.getService(this, 2, endCallIntent, pendingFlags);

        long elapsedSec = (System.currentTimeMillis() - startTimeMs) / 1000;
        if (elapsedSec < 0) elapsedSec = 0;
        long mins = elapsedSec / 60;
        long secs = elapsedSec % 60;
        long hrs = mins / 60;
        mins = mins % 60;

        String durationStr = hrs > 0 
                ? String.format(Locale.US, "%02d:%02d:%02d", hrs, mins, secs)
                : String.format(Locale.US, "%02d:%02d", mins, secs);

        String contentText = "Call ongoing • " + durationStr;

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(callTitle)
                .setContentText(contentText)
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentIntent(contentPendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .addAction(android.R.drawable.ic_menu_search, "Maximize", maximizePendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "End Call", endCallPendingIntent)
                .setOnlyAlertOnce(true)
                .build();
    }

    private void updateNotification() {
        if (notificationManager != null && startTimeMs > 0) {
            Notification notification = buildCallNotification();
            notificationManager.notify(NOTIFICATION_ID, notification);
        }
    }

    private void sendEndCallBroadcast() {
        Intent intent = new Intent("com.theroom.app.VOICE_CALL_END_REQUESTED");
        intent.setPackage(getPackageName());
        sendBroadcast(intent);
    }

    @Override
    public void onDestroy() {
        if (handler != null && updateNotificationRunnable != null) {
            handler.removeCallbacks(updateNotificationRunnable);
        }
        startTimeMs = 0;

        // Release WakeLock
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }

        // Release WifiLock
        if (wifiLock != null && wifiLock.isHeld()) {
            try {
                wifiLock.release();
            } catch (Exception ignored) {}
        }

        // Reset Audio Focus & Mode
        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                } else {
                    audioManager.abandonAudioFocus(null);
                }
                audioManager.setMode(AudioManager.MODE_NORMAL);
            } catch (Exception ignored) {}
        }

        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "TheRoom Voice Call Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Keeps microphone audio active and shows ongoing call status");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
}
