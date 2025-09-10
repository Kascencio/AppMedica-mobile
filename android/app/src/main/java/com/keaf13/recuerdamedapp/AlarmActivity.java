package com.keaf13.recuerdamedapp;

import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;

public class AlarmActivity extends ReactActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // These flags are essential for showing the activity over the lock screen
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                             WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                             WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                             WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     * We'll register "AlarmScreen" in a new JS file in the next step.
     */
    @Override
    protected String getMainComponentName() {
        return "AlarmScreen";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new ReactActivityDelegate(this, getMainComponentName()) {
            @Override
            protected Bundle getLaunchOptions() {
                // This is how we pass data from the native Intent to the React Native component
                Intent intent = getIntent();
                Bundle bundle = intent.getExtras();

                Bundle initialProps = new Bundle();
                if (bundle != null) {
                    initialProps.putString("kind", bundle.getString("kind"));
                    initialProps.putString("refId", bundle.getString("refId"));
                    initialProps.putString("scheduledFor", bundle.getString("scheduledFor"));
                    initialProps.putString("name", bundle.getString("name"));
                    initialProps.putString("dosage", bundle.getString("dosage"));
                    initialProps.putString("instructions", bundle.getString("instructions"));
                    initialProps.putString("time", bundle.getString("time"));
                    initialProps.putString("location", bundle.getString("location"));
                    initialProps.putString("appointmentId", bundle.getString("appointmentId"));
                    initialProps.putString("doctorName", bundle.getString("doctorName"));
                    initialProps.putString("notes", bundle.getString("notes"));
                }

                return initialProps;
            }
        };
    }
}
