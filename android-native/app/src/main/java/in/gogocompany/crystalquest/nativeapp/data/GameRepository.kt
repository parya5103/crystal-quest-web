package in.gogocompany.crystalquest.nativeapp.data
import com.google.gson.Gson
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgress
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgressDao
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
@Singleton class GameRepository @Inject constructor(private val dao:GameProgressDao){private val gson=Gson();fun observe():Flow<GameProgress?> = dao.observe("crystal-quest");suspend fun save(unlocked:Int,score:Int,moves:Int){dao.upsert(GameProgress("crystal-quest",gson.toJson(mapOf("unlocked" to unlocked,"bestScore" to score,"moves" to moves)),System.currentTimeMillis()))}}