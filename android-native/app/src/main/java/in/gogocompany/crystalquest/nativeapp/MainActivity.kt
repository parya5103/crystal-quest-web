package in.gogocompany.crystalquest.nativeapp
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import dagger.hilt.android.AndroidEntryPoint
import in.gogocompany.crystalquest.nativeapp.presentation.GameRoute
import in.gogocompany.crystalquest.nativeapp.presentation.theme.CrystalQuestTheme
@AndroidEntryPoint class MainActivity:ComponentActivity(){override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);setContent{CrystalQuestTheme{GameRoute()}}}}