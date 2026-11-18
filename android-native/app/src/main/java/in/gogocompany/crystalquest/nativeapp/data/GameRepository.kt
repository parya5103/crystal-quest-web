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
 suspend fun load():CrystalGameState? = dao.get("crystal-quest")?.payload?.let{gson.fromJson(it,CrystalGameState::class.java)}
 suspend fun save(state:CrystalGameState){dao.upsert(GameProgress("crystal-quest",gson.toJson(state),System.currentTimeMillis()))}
}