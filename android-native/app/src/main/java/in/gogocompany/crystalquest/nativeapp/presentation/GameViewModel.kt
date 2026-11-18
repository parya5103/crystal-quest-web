package in.gogocompany.crystalquest.nativeapp.presentation
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import in.gogocompany.crystalquest.nativeapp.data.GameRepository
import in.gogocompany.crystalquest.nativeapp.di.IoDispatcher
import in.gogocompany.crystalquest.nativeapp.domain.engine.Match3Engine
import in.gogocompany.crystalquest.nativeapp.domain.model.*
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
@HiltViewModel class GameViewModel @Inject constructor(private val repository:GameRepository,@IoDispatcher private val ioDispatcher:CoroutineDispatcher):ViewModel(){
 private val engine=Match3Engine()
 private val _uiState=MutableStateFlow(engine.newGame())
 val uiState=_uiState.asStateFlow()
 fun onEvent(event:CrystalUiEvent){when(event){is CrystalUiEvent.TapCell->_uiState.update{engine.tap(it,event.cell,it.score xor(it.movesRemaining*31))};CrystalUiEvent.Restart->_uiState.value=engine.newGame()};viewModelScope.launch(ioDispatcher){val state=_uiState.value;try{repository.save(state.level,state.score,state.movesRemaining)}catch(cancelled:CancellationException){throw cancelled}catch(error:Exception){_uiState.update{it.copy(message="Progress save failed: ${error.message ?: "unknown error"}")}}}}
}