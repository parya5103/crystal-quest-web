package `in`.gogocompany.crystalquest.nativeapp
import android.app.Activity
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import com.google.android.libraries.ads.mobile.sdk.MobileAds
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig
import java.util.concurrent.atomic.AtomicBoolean

class AdsConsentManager(private val activity:Activity){
 companion object { private val initialized=AtomicBoolean(false); private const val TAG="AdsConsentManager" }
 private var consentInformation:ConsentInformation?=null
 var privacyOptionsRequired by mutableStateOf(false)
  private set
 fun start(){
  val info=UserMessagingPlatform.getConsentInformation(activity);consentInformation=info
  val parameters=ConsentRequestParameters.Builder().build()
  info.requestConsentInfoUpdate(activity,parameters,{
   refreshPrivacyOptions()
   UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity){refreshPrivacyOptions();initializeIfAllowed()}
  },{
   refreshPrivacyOptions();initializeIfAllowed()
  })
 }
 private fun refreshPrivacyOptions(){
  val required=consentInformation?.privacyOptionsRequirementStatus==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
  activity.runOnUiThread{privacyOptionsRequired=required}
 }
 private fun initializeIfAllowed(){
  val info=consentInformation?:return
  if(!info.canRequestAds()||!initialized.compareAndSet(false,true))return
  val appContext=activity.applicationContext
  val appId=appContext.getString(R.string.admob_app_id)
  Thread({
   try{MobileAds.initialize(appContext,InitializationConfig.Builder(appId).build()){}}
   catch(error:Exception){initialized.set(false);Log.e(TAG,"Google Mobile Ads initialization failed",error)}
  }, "crystal-ads-init").start()
 }
 fun showPrivacyOptions(){
  val info=consentInformation?:return
  if(info.privacyOptionsRequirementStatus!=ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED)return
  UserMessagingPlatform.showPrivacyOptionsForm(activity){refreshPrivacyOptions();initializeIfAllowed()}
 }
}