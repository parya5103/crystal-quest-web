plugins {
 alias(libs.plugins.android.application)
 alias(libs.plugins.kotlin.compose)
 alias(libs.plugins.ksp)
 alias(libs.plugins.hilt)
}
val releaseStorePath = providers.gradleProperty("ANDROID_KEYSTORE_PATH").orNull
val releaseStorePassword = providers.gradleProperty("ANDROID_KEYSTORE_PASSWORD").orNull
val releaseKeyAlias = providers.gradleProperty("ANDROID_KEY_ALIAS").orNull
val releaseKeyPassword = providers.gradleProperty("ANDROID_KEY_PASSWORD").orNull
val hasReleaseSigning = listOf(releaseStorePath, releaseStorePassword, releaseKeyAlias, releaseKeyPassword).all { !it.isNullOrBlank() }
val admobAppId = providers.gradleProperty("ADMOB_APP_ID").orElse("ca-app-pub-3940256099942544~3347511713").get()

android {
 namespace = "in.gogocompany.crystalquest.nativeapp"
 compileSdk = 37
 defaultConfig {
  applicationId = "in.gogocompany.crystalquest"
  minSdk = 24
  targetSdk = 36
  versionCode = 2
  versionName = "1.1.0"
  resValue("string", "admob_app_id", admobAppId)
  testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
 }
 signingConfigs {
  create("release") {
   if (hasReleaseSigning) {
    storeFile = file(requireNotNull(releaseStorePath))
    storePassword = requireNotNull(releaseStorePassword)
    keyAlias = requireNotNull(releaseKeyAlias)
    keyPassword = requireNotNull(releaseKeyPassword)
   }
  }
 }
 buildTypes {
  getByName("release") {
   if (hasReleaseSigning) signingConfig = signingConfigs.getByName("release")
  }
 }
 buildFeatures { resValues = true; compose = true }
 compileOptions {
  sourceCompatibility = JavaVersion.VERSION_17
  targetCompatibility = JavaVersion.VERSION_17
 }
 kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
 packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}
dependencies {
 implementation(platform(libs.androidx.compose.bom))
 androidTestImplementation(platform(libs.androidx.compose.bom))
 implementation(libs.androidx.activity.compose)
 implementation(libs.androidx.compose.ui)
 implementation(libs.androidx.compose.animation)
 implementation(libs.androidx.compose.material3)
 implementation(libs.androidx.compose.ui.tooling.preview)
 debugImplementation(libs.androidx.compose.ui.tooling)
 implementation(libs.androidx.lifecycle.runtime.compose)
 implementation(libs.androidx.lifecycle.viewmodel.compose)
 implementation(libs.androidx.lifecycle.viewmodel.ktx)
 implementation(libs.androidx.hilt.lifecycle.compose)
 implementation(libs.androidx.room.runtime)
 implementation(libs.androidx.room.ktx)
 ksp(libs.androidx.room.compiler)
 implementation(libs.androidx.datastore.preferences)
 implementation(libs.kotlinx.coroutines.android)
 implementation(libs.gson)
 implementation(libs.user.messaging.platform)
 implementation(libs.mobile.ads.nextgen)
 implementation(libs.hilt.android)
 ksp(libs.hilt.compiler)
 testImplementation(libs.junit)
 testImplementation(libs.mockk)
 testImplementation(libs.turbine)
 androidTestImplementation(libs.androidx.compose.ui.test.junit4)
 debugImplementation(libs.androidx.compose.ui.test.manifest)
}
