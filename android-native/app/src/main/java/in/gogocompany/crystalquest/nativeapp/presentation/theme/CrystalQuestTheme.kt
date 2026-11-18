package `in`.gogocompany.crystalquest.nativeapp.presentation.theme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
@Composable fun CrystalQuestTheme(darkTheme:Boolean=true,content:@Composable ()->Unit){val scheme=if(darkTheme)darkColorScheme(primary=Color(0xFF9B8CFF),background=Color(0xFF10172A),surface=Color(0xFF1B2740))else lightColorScheme();MaterialTheme(colorScheme=scheme,content=content)}
