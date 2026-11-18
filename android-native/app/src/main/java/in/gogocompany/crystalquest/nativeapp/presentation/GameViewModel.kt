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
 val isRestoring=_isRestoring.asStateFlow()
 private val saveQueue=Channel<CrystalGameState>(Channel.CONFLATED)
 init{
  viewModelScope.launch(io){
   try{repository.load()?.let{_uiState.value=it}}
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
 fun onEvent(event:CrystalUiEvent){
  if(_isRestoring.value)return
  when(event){
   is CrystalUiEvent.TapCell->_uiState.update{engine.tap(it,event.cell,it.score xor (it.movesRemaining*31))}
   CrystalUiEvent.Restart->_uiState.update{current->engine.newLevel(current.level).copy(unlockedLevel=current.unlockedLevel,bestStars=current.bestStars)}
   CrystalUiEvent.Continue->_uiState.update{current->
    if(!current.isWon)current
    else if(current.level>=27)current.copy(message="All 27 native levels completed!")
    else engine.newLevel(current.level+1).copy(unlockedLevel=maxOf(current.unlockedLevel,current.level+1),bestStars=current.bestStars)
   }
  }
  saveQueue.trySend(_uiState.value)
 }
 override fun onCleared(){saveQueue.close();super.onCleared()}
}