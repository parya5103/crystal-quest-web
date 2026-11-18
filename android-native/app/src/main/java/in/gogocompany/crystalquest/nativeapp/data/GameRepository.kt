package in.gogocompany.crystalquest.nativeapp.data
import com.google.gson.Gson
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgress
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgressDao
import in.gogocompany.crystalquest.nativeapp.domain.model.CrystalGameState
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
@Singleton class GameRepository @Inject constructor(private val dao:GameProgressDao){
 private val gson=Gson()
 fun observe():Flow<GameProgress?> = dao.observe("crystal-quest")
 suspend fun load():CrystalGameState?{
  val saved=dao.get("crystal-quest")?:return null
  val state=gson.fromJson(saved.payload,CrystalGameState::class.java)?:throw IllegalStateException("Saved Crystal Quest state is empty")
  require(state.board.size==64){"Saved Crystal Quest board must contain 64 cells"}
  require(state.level in 1..27&&state.movesRemaining in 0..24&&state.score>=0){"Saved Crystal Quest progress is outside valid ranges"}
  return state
 }
 suspend fun save(state:CrystalGameState){dao.upsert(GameProgress("crystal-quest",gson.toJson(state),System.currentTimeMillis()))}
}