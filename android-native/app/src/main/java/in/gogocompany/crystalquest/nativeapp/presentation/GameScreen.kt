package in.gogocompany.crystalquest.nativeapp.presentation
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import in.gogocompany.crystalquest.nativeapp.domain.model.*
import in.gogocompany.crystalquest.nativeapp.presentation.theme.CrystalQuestTheme
private val gemColors=mapOf(Gem.AMBER to Color(0xFFFFA62B),Gem.AQUA to Color(0xFF36D7E8),Gem.ROSE to Color(0xFFFF5C8A),Gem.VERDANT to Color(0xFF42D392),Gem.VIOLET to Color(0xFF9B72F2),Gem.SOLAR to Color(0xFFFFD34E))
@Composable fun GameRoute(viewModel:GameViewModel=hiltViewModel(),privacyOptionsRequired:Boolean=false,onShowPrivacyOptions:()->Unit={}){
 val state by viewModel.uiState.collectAsStateWithLifecycle()
 val restoring by viewModel.isRestoring.collectAsStateWithLifecycle()
 val importMessage by viewModel.importMessage.collectAsStateWithLifecycle()
 GameScreen(state,viewModel::onEvent,privacyOptionsRequired=privacyOptionsRequired,onShowPrivacyOptions=onShowPrivacyOptions,isRestoring=restoring,onImportSave=viewModel::importLegacy,importMessage=importMessage)
}
@Composable fun GameScreen(state:CrystalGameState,onEvent:(CrystalUiEvent)->Unit,modifier:Modifier=Modifier,privacyOptionsRequired:Boolean=false,onShowPrivacyOptions:()->Unit={},isRestoring:Boolean=false,onImportSave:(String)->Unit={},importMessage:String=""){
 val haptics=LocalHapticFeedback.current
 var showImport by remember{mutableStateOf(false)}
 var importText by remember{mutableStateOf("")}
 Scaffold(modifier=modifier.fillMaxSize(),containerColor=Color(0xFF10172A)){padding->
  Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(padding).padding(horizontal=16.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(14.dp)){
   Spacer(Modifier.height(8.dp));Text("CRYSTAL QUEST",style=MaterialTheme.typography.headlineMedium,color=Color.White)
   Text(state.levelName,style=MaterialTheme.typography.titleMedium,color=Color(0xFFFFD66B))
   Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){StatCard("SCORE",state.score.toString());StatCard("MOVES",state.movesRemaining.toString());StatCard("LEVEL",state.level.toString())}
   Text(if(isRestoring)"Restoring your progress…" else state.message,color=if(state.isWon)Color(0xFFFFD66B)else Color(0xFFB8C6E5),style=MaterialTheme.typography.bodyMedium)
   LinearProgressIndicator(progress={(state.score.toFloat()/state.targetScore.coerceAtLeast(1)).coerceIn(0f,1f)},modifier=Modifier.fillMaxWidth(),color=Color(0xFFFFD66B),trackColor=Color(0xFF34415E))
   Text("Goal: ${state.targetScore} points   ·   Best: ${state.bestStars[state.level]?:0} ★   ·   Earned: ${state.stars} ★",color=Color(0xFF9BAAC8),style=MaterialTheme.typography.labelMedium)
   Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Color(0xFF1B2740)).padding(7.dp),verticalArrangement=Arrangement.spacedBy(3.dp)){
    for(row in 0 until 8)Row(horizontalArrangement=Arrangement.spacedBy(3.dp)){for(col in 0 until 8){val gem=state.board[row*8+col];val selected=state.selected==Cell(col,row);val target=if(gem==null)Color.Transparent else gemColors.getValue(gem);val color by animateColorAsState(if(selected)Color.White else target,animationSpec=spring(),label="gem")
     Box(Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(9.dp)).background(color).border(if(selected)3.dp else 1.dp,if(selected)Color(0xFFFFE28A)else Color(0x334B5E83),RoundedCornerShape(9.dp)).clickable(enabled=!isRestoring&&!state.isComplete){haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove);onEvent(CrystalUiEvent.TapCell(Cell(col,row)))},contentAlignment=Alignment.Center){if(gem!=null)Text(listOf("◆","✦","●","✿","✧","✺")[gem.ordinal],color=Color(0xFF172039),style=MaterialTheme.typography.titleMedium)}
    }}
   }
   if(state.isWon)Button(onClick={onEvent(CrystalUiEvent.Continue)},enabled=!isRestoring&&state.level<27,modifier=Modifier.fillMaxWidth()){Text(if(state.level<27)"Continue to Level ${state.level+1}" else "Campaign complete")}
   Button(onClick={onEvent(CrystalUiEvent.Restart)},enabled=!isRestoring,modifier=Modifier.fillMaxWidth()){Text(if(state.isComplete&&!state.isWon)"Retry level" else "Restart level")}
   TextButton(onClick={showImport=!showImport},enabled=!isRestoring){Text(if(showImport)"Close progress import" else "Import existing PWA progress")}
   if(showImport){
    Text("On the Crystal Quest PWA, open Settings → Export save code, copy the CQSAVE2 code and paste it here. Your browser save is not changed.",color=Color(0xFF9BAAC8),style=MaterialTheme.typography.bodySmall)
    OutlinedTextField(value=importText,onValueChange={importText=it},modifier=Modifier.fillMaxWidth(),minLines=3,maxLines=6,label={Text("Crystal Quest save code")})
    Button(onClick={onImportSave(importText)},enabled=!isRestoring&&importText.isNotBlank(),modifier=Modifier.fillMaxWidth()){Text("Import and restore progress")}
    if(importMessage.isNotBlank())Text(importMessage,color=Color(0xFF9BAAC8),style=MaterialTheme.typography.bodySmall)
   }
   if(privacyOptionsRequired)TextButton(onClick=onShowPrivacyOptions){Text("Privacy options",color=Color(0xFFB8C6E5))}
   Text("Swap adjacent crystals to make a match of three or more.",color=Color(0xFF8494B6),style=MaterialTheme.typography.bodySmall)
  }
 }
}
@Composable private fun StatCard(label:String,value:String){Card(colors=CardDefaults.cardColors(containerColor=Color(0xFF202D49))){Column(Modifier.padding(horizontal=18.dp,vertical=10.dp),horizontalAlignment=Alignment.CenterHorizontally){Text(label,color=Color(0xFF9BAAC8),style=MaterialTheme.typography.labelSmall);Text(value,color=Color.White,style=MaterialTheme.typography.titleLarge)}}}
@Preview(showBackground=true) @Composable private fun GamePreviewLight(){CrystalQuestTheme(false){GameScreen(CrystalGameState(List(64){Gem.entries[it%6]}),{})}}
@Preview(showBackground=true) @Composable private fun GamePreviewDark(){CrystalQuestTheme(true){GameScreen(CrystalGameState(List(64){Gem.entries[it%6]}),{})}}
