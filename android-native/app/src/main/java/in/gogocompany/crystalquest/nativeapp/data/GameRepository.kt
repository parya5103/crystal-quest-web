package in.gogocompany.crystalquest.nativeapp.data
import com.google.gson.Gson
import com.google.gson.JsonParser
import com.google.gson.JsonObject
import com.google.gson.JsonArray
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgress
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgressDao
import in.gogocompany.crystalquest.nativeapp.domain.engine.Match3Engine
import in.gogocompany.crystalquest.nativeapp.domain.model.CrystalGameState
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
@Singleton class GameRepository @Inject constructor(private val dao:GameProgressDao,private val catalog:CrystalLevelCatalog){
 private val gson=Gson()
 private val engine=Match3Engine()
 fun observe():Flow<GameProgress?> = dao.observe("crystal-quest")
 fun newLevel(level:Int,seed:Int=0xC0FFEE):CrystalGameState{
  val spec=catalog.get(level)
  return engine.newLevel(spec.id,seed).copy(
   levelName=spec.name,movesRemaining=spec.moves,targetScore=spec.stars[0],
   star2Threshold=spec.stars[1],star3Threshold=spec.stars[2]
  )
 }
 suspend fun load():CrystalGameState{
  val saved=dao.get("crystal-quest")?:return newLevel(1)
  val json=JsonParser.parseString(saved.payload).asJsonObject
  val level=(json.get("level")?.takeIf{it.isJsonPrimitive}?.asInt?:1).coerceIn(1,27)
  val levelDefaults=newLevel(level)
  json.addProperty("targetScore",levelDefaults.targetScore)
  json.addProperty("levelName",levelDefaults.levelName)
  json.addProperty("star2Threshold",levelDefaults.star2Threshold)
  json.addProperty("star3Threshold",levelDefaults.star3Threshold)
  if(!json.has("isWon"))json.addProperty("isWon",false)
  if(!json.has("stars"))json.addProperty("stars",0)
  if(!json.has("unlockedLevel"))json.addProperty("unlockedLevel",level)
  if(!json.has("bestStars"))json.add("bestStars",JsonObject())
  if(!json.has("bestScores"))json.add("bestScores",JsonObject())
  if(!json.has("settings"))json.add("settings",JsonObject())
  if(!json.has("relics"))json.add("relics",JsonArray())
  if(!json.has("forestSeen"))json.add("forestSeen",JsonArray())
  if(!json.has("storySeen"))json.add("storySeen",JsonArray())
  if(!json.has("dailyDate"))json.addProperty("dailyDate","")
  if(!json.has("dailyStreak"))json.addProperty("dailyStreak",0)
  if(!json.has("dailyBest"))json.addProperty("dailyBest",0)
  val state=gson.fromJson(json,CrystalGameState::class.java)?:throw IllegalStateException("Saved Crystal Quest state is empty")
  require(state.board.size==64){"Saved Crystal Quest board must contain 64 cells"}
  require(state.level in 1..27&&state.movesRemaining in 0..40&&state.score>=0&&state.targetScore>0){"Saved Crystal Quest progress is outside valid ranges"}
  return state
 }
 suspend fun importLegacy(code:String):CrystalGameState{
  val imported=LegacySaveImporter.importCode(code)?:throw IllegalArgumentException("Invalid Crystal Quest save code")
  val state=newLevel(imported.lastLevel).copy(
   unlockedLevel=imported.unlocked,bestStars=imported.stars,bestScores=imported.best,
   settings=imported.settings,relics=imported.relics,forestSeen=imported.forestSeen,
   storySeen=imported.storySeen,dailyDate=imported.dailyDate,dailyStreak=imported.dailyStreak,
   dailyBest=imported.dailyBest,legacySaveJson=imported.rawSaveJson,
   message="Browser progress imported — welcome back!"
  )
  save(state)
  return state
 }
 suspend fun save(state:CrystalGameState){dao.upsert(GameProgress("crystal-quest",gson.toJson(state),System.currentTimeMillis()))}
}