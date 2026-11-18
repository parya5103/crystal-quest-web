package in.gogocompany.crystalquest.nativeapp.data
import com.google.gson.Gson
import com.google.gson.JsonParser
import com.google.gson.JsonObject
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgress
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgressDao
import in.gogocompany.crystalquest.nativeapp.domain.engine.Match3Engine
import in.gogocompany.crystalquest.nativeapp.domain.model.CrystalGameState
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
@Singleton class GameRepository @Inject constructor(private val dao:GameProgressDao){
 private val gson=Gson()
 private val engine=Match3Engine()
 fun observe():Flow<GameProgress?> = dao.observe("crystal-quest")
 suspend fun load():CrystalGameState?{
  val saved=dao.get("crystal-quest")?:return null
  val json=JsonParser.parseString(saved.payload).asJsonObject
  val level=(json.get("level")?.takeIf{it.isJsonPrimitive}?.asInt?:1).coerceIn(1,27)
  if(!json.has("targetScore"))json.addProperty("targetScore",engine.newLevel(level).targetScore)
  if(!json.has("levelName"))json.addProperty("levelName",engine.newLevel(level).levelName)
  if(!json.has("isWon"))json.addProperty("isWon",false)
  val levelDefaults=engine.newLevel(level)
  if(!json.has("star2Threshold"))json.addProperty("star2Threshold",levelDefaults.star2Threshold)
  if(!json.has("star3Threshold"))json.addProperty("star3Threshold",levelDefaults.star3Threshold)
  if(!json.has("stars"))json.addProperty("stars",0)
  if(!json.has("unlockedLevel"))json.addProperty("unlockedLevel",level)
  if(!json.has("bestStars"))json.add("bestStars",JsonObject())
  val state=gson.fromJson(json,CrystalGameState::class.java)?:throw IllegalStateException("Saved Crystal Quest state is empty")
  require(state.board.size==64){"Saved Crystal Quest board must contain 64 cells"}
  require(state.level in 1..27&&state.movesRemaining in 0..40&&state.score>=0&&state.targetScore>0){"Saved Crystal Quest progress is outside valid ranges"}
  return state
 }
 suspend fun save(state:CrystalGameState){dao.upsert(GameProgress("crystal-quest",gson.toJson(state),System.currentTimeMillis()))}
}