package in.gogocompany.crystalquest.nativeapp
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import dagger.hilt.android.AndroidEntryPoint
import in.gogocompany.crystalquest.nativeapp.presentation.GameRoute
import in.gogocompany.crystalquest.nativeapp.presentation.theme.CrystalQuestTheme
@AndroidEntryPoint class MainActivity:ComponentActivity(){
 private lateinit var adsConsentManager:AdsConsentManager
 override fun onCreate(savedInstanceState:Bundle?){
  super.onCreate(savedInstanceState)
  adsConsentManager=AdsConsentManager(this)
  adsConsentManager.start()
  setContent{CrystalQuestTheme{GameRoute(privacyOptionsRequired=adsConsentManager.privacyOptionsRequired,onShowPrivacyOptions=adsConsentManager::showPrivacyOptions)}}
 }
}