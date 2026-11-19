package `in`.gogocompany.crystalquest.nativeapp
import com.google.gson.JsonSyntaxException
import com.google.gson.JsonObject
import `in`.gogocompany.crystalquest.nativeapp.data.GameRepository
import `in`.gogocompany.crystalquest.nativeapp.data.CrystalLevelCatalog
import `in`.gogocompany.crystalquest.nativeapp.data.CrystalLevelDto
import `in`.gogocompany.crystalquest.nativeapp.data.local.GameProgress
import `in`.gogocompany.crystalquest.nativeapp.data.local.GameProgressDao
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import java.util.Base64
class GameRepositoryTest{
 @Test fun malformedStoredGameIsReportedInsteadOfSilentlyStartingFresh() {
  runBlocking {
   val dao=mockk<GameProgressDao>();val catalog=mockk<CrystalLevelCatalog>(relaxed=true)
   coEvery{dao.get("crystal-quest")} returns GameProgress("crystal-quest","{broken",1L)
   val repository=GameRepository(dao,catalog)
   assertThrows(JsonSyntaxException::class.java){runBlocking{repository.load()}}
  }
 }
 @Test fun newCampaignUsesCanonicalLevelDefinition()=runBlocking{
  val dao=mockk<GameProgressDao>();val catalog=mockk<CrystalLevelCatalog>()
  coEvery{dao.get("crystal-quest")} returns null
  every{catalog.get(1)} returns CrystalLevelDto(1,"Crystal Gate",13,List(8){"........"},listOf(JsonObject().apply{addProperty("type","score");addProperty("target",4200)}),listOf(4200,5400,6800),"Match three crystals")
  val state=GameRepository(dao,catalog).load()
  assertEquals("Crystal Gate",state.levelName);assertEquals(13,state.movesRemaining);assertEquals(4200,state.targetScore);assertEquals(5400,state.star2Threshold);assertEquals(6800,state.star3Threshold)
 }
 @Test fun advancingLevelPreservesAllCampaignProfileData()=runBlocking{
  val dao=mockk<GameProgressDao>();val catalog=mockk<CrystalLevelCatalog>()
  every{catalog.get(2)} returns CrystalLevelDto(2,"Amber Hollow",22,List(8){"........"},emptyList(),listOf(2000,3200,4600),"hint")
  val previous=GameRepository(dao,catalog).newLevel(2).copy(
   unlockedLevel=8,bestStars=mapOf(1 to 3),bestScores=mapOf(1 to 9000),
   settings=mapOf("sfx" to false),relics=setOf("forest-key"),forestSeen=setOf("intro"),
   storySeen=setOf("chapter-1"),dailyDate="2026-11-19",dailyStreak=4,dailyBest=7,
   legacySaveJson="""{"v":2}"""
  )
  val next=GameRepository(dao,catalog).newLevel(2,progress=previous)
  assertEquals(8,next.unlockedLevel)
  assertEquals(mapOf(1 to 3),next.bestStars)
  assertEquals(mapOf(1 to 9000),next.bestScores)
  assertEquals(mapOf("sfx" to false),next.settings)
  assertEquals(setOf("forest-key"),next.relics)
  assertEquals(setOf("intro"),next.forestSeen)
  assertEquals(setOf("chapter-1"),next.storySeen)
  assertEquals("2026-11-19",next.dailyDate)
  assertEquals(4,next.dailyStreak)
  assertEquals(7,next.dailyBest)
  assertEquals("""{"v":2}""",next.legacySaveJson)
 }
 @Test fun eachCampaignLevelGetsAStableButDistinctBoard()=runBlocking{
  val dao=mockk<GameProgressDao>();val catalog=mockk<CrystalLevelCatalog>()
  every{catalog.get(1)} returns CrystalLevelDto(1,"Crystal Gate",13,List(8){"........"},emptyList(),listOf(4200,5400,6800),"hint")
  every{catalog.get(2)} returns CrystalLevelDto(2,"Amber Hollow",22,List(8){"........"},emptyList(),listOf(2000,3200,4600),"hint")
  val repository=GameRepository(dao,catalog)
  val first=repository.newLevel(1)
  val second=repository.newLevel(2)
  assertEquals(first.board,repository.newLevel(1).board)
  assertNotEquals(first.board,second.board)
  assertTrue(first.board.all{it!=null})
  assertTrue(second.board.all{it!=null})
 }
 @Test fun importsRealCqsave2CodeAndPreservesWorldProgress()=runBlocking{
  val dao=mockk<GameProgressDao>();val catalog=mockk<CrystalLevelCatalog>()
  val json="""{"v":2,"unlocked":8,"lastLevel":3,"best":{"2":9000},"stars":{"2":3},"settings":{"sfx":false,"music":true},"world":{"relics":["forest-key"],"forest":{"seen":["intro"]},"daily":{"date":"2026-11-19","streak":4,"best":7},"story":["chapter-1"]}}"""
  val encoded="CQSAVE2-"+Base64.getEncoder().encodeToString(json.toByteArray(Charsets.US_ASCII))
  every{catalog.get(3)} returns CrystalLevelDto(3,"Twin Veins",24,List(8){"........"},listOf(JsonObject().apply{addProperty("type","score");addProperty("target",2200)}),listOf(2200,3400,4800),"hint")
  coEvery{dao.upsert(any())} returns Unit
  val state=GameRepository(dao,catalog).importLegacy(encoded)
  assertEquals(3,state.level);assertEquals(8,state.unlockedLevel);assertEquals(3,state.bestStars[2]);assertEquals(9000,state.bestScores[2])
  assertEquals(false,state.settings["sfx"]);assertEquals(setOf("forest-key"),state.relics);assertEquals(setOf("intro"),state.forestSeen)
  assertEquals(setOf("chapter-1"),state.storySeen);assertEquals(4,state.dailyStreak);assertTrue(state.legacySaveJson!!.contains("world"))
 }
}