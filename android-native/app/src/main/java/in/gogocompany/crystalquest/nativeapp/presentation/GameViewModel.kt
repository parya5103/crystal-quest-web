package in.gogocompany.crystalquest.nativeapp.presentation
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import in.gogocompany.crystalquest.nativeapp.data.GameRepository
import in.gogocompany.crystalquest.nativeapp.di.IoDispatcher
import in.gogocompany.crystalquest.nativeapp.domain.engine.Match3Engine
import in.gogocompany.crystalquest.nativeapp.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
@HiltViewModel class GameViewModel @Inject constructor(private val repository:GameRepository,@IoDispatcher private val io:CoroutineDispatcher):ViewModel(){
 private val engine=Match3Engine()
 private val _uiState=MutableStateFlow(engine.newGame())
 val uiState=_uiState.asStateFlow()
 private val _isRestoring=MutableStateFlow(true)
 private val _importMessage=MutableStateFlow("")
 val importMessage=_importMessage.asStateFlow()
 val isRestoring=_isRestoring.asStateFlow()
 private val saveQueue=Channel<CrystalGameState>(Channel.CONFLATED)
 init{
  viewModelScope.launch(io){
   try{_uiState.value=repository.load()}
   catch(cancelled:CancellationException){throw cancelled}
   catch(error:Exception){_uiState.update{it.copy(message="Could not restore saved game: ${error.message?: "unknown error"}")}}
   finally{_isRestoring.value=false}
  }
  viewModelScope.launch(io){
   for(snapshot in saveQueue){
    try{repository.save(snapshot)}
    catch(cancelled:CancellationException){throw cancelled}
    catch(error:Exception){_uiState.update{it.copy(message="Progress save failed: ${error.message?: "unknown error"}")}}
   }
  }
 }
 fun importLegacy(code:String){
  if(_isRestoring.value)return
  viewModelScope.launch(io){
   try{val imported=repository.importLegacy(code);_uiState.value=imported;saveQueue.trySend(imported);_importMessage.value="Browser progress imported successfully"}
   catch(cancelled:CancellationException){throw cancelled}
   catch(error:Exception){_importMessage.value="Import failed: ${error.message?: "invalid save code"}"}
  }
 }
 fun onEvent(event:CrystalUiEvent){
  if(_isRestoring.value)return
  when(event){
   is CrystalUiEvent.TapCell->{_uiState.update{engine.tap(it,event.cell,it.score xor (it.movesRemaining*31))};saveQueue.trySend(_uiState.value)}
   CrystalUiEvent.Restart->openLevel(_uiState.value.level)
   CrystalUiEvent.Continue->{
    val current=_uiState.value
    if(current.isWon&&current.level>=27)_uiState.update{it.copy(message="All 27 native levels completed!")}
    else if(current.isWon)openLevel(current.level+1)
   }
  }
 }
 private fun openLevel(level:Int){
  val current=_uiState.value
  viewModelScope.launch(io){
   try{
    val next=repository.newLevel(level).copy(unlockedLevel=current.unlockedLevel,bestStars=current.bestStars)
    _uiState.value=next
    saveQueue.trySend(next)
   }catch(cancelled:CancellationException){throw cancelled}
   catch(error:Exception){_uiState.update{it.copy(message="Could not open level: ${error.message?: "unknown error"}")}}
  }
 }
 override fun onCleared(){saveQueue.close();super.onCleared()}
}