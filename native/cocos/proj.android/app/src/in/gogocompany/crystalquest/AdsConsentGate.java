package in.gogocompany.crystalquest;

import android.app.Activity;
import android.os.Build;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import com.google.android.libraries.ads.mobile.sdk.MobileAds;
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig;
import java.util.concurrent.atomic.AtomicBoolean;

public final class AdsConsentGate {
    public interface PrivacyOptionsListener { void onRequired(boolean required); }
    private static final AtomicBoolean initialized = new AtomicBoolean(false);
    private static volatile ConsentInformation consentInformation;

    private AdsConsentGate() {}

    public static void start(Activity activity, PrivacyOptionsListener listener) {
        consentInformation = UserMessagingPlatform.getConsentInformation(activity);
        ConsentRequestParameters parameters = new ConsentRequestParameters.Builder().build();
        consentInformation.requestConsentInfoUpdate(
            activity,
            parameters,
            () -> {
                notifyPrivacyOptions(activity, listener);
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> {
                    notifyPrivacyOptions(activity, listener);
                    initializeOnlyIfAllowed(activity);
                });
            },
            requestError -> {
                notifyPrivacyOptions(activity, listener);
                initializeOnlyIfAllowed(activity);
            }
        );
        // UMP may already have a valid decision from the previous session.
        initializeOnlyIfAllowed(activity);
    }

    private static void notifyPrivacyOptions(Activity activity, PrivacyOptionsListener listener) {
        if (listener == null || consentInformation == null) return;
        boolean required = consentInformation.getPrivacyOptionsRequirementStatus()
            == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
        activity.runOnUiThread(() -> listener.onRequired(required));
    }

    private static void initializeOnlyIfAllowed(Activity activity) {
        ConsentInformation info = consentInformation;
        if (info == null || !info.canRequestAds() || !initialized.compareAndSet(false, true)) return;
        final String appId = activity.getString(R.string.admob_app_id);
        new Thread(() -> {
            if (Build.VERSION.SDK_INT >= 24 && !activity.isFinishing()) {
                MobileAds.initialize(
                    activity,
                    new InitializationConfig.Builder(appId).build(),
                    status -> { }
                );
            }
        }, "gma-consent-gated-init").start();
    }

    public static void showPrivacyOptions(Activity activity) {
        ConsentInformation info = consentInformation;
        if (info == null || info.getPrivacyOptionsRequirementStatus()
            != ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED) return;
        UserMessagingPlatform.showPrivacyOptionsForm(activity, formError -> initializeOnlyIfAllowed(activity));
    }
}
