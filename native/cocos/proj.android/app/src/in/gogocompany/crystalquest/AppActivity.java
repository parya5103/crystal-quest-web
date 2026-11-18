package in.gogocompany.crystalquest;

import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import org.cocos2dx.lib.Cocos2dxActivity;

public final class AppActivity extends Cocos2dxActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Button privacy = new Button(this);
        privacy.setText("Privacy");
        privacy.setTextSize(11f);
        privacy.setVisibility(View.GONE);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
            dp(72), dp(38), Gravity.TOP | Gravity.END
        );
        params.topMargin = dp(8);
        params.rightMargin = dp(8);
        addContentView(privacy, params);
        privacy.setOnClickListener(view -> AdsConsentGate.showPrivacyOptions(this));
        AdsConsentGate.start(this, required -> privacy.setVisibility(required ? View.VISIBLE : View.GONE));
    }
    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
