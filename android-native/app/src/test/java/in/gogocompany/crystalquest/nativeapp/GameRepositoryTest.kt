package in.gogocompany.crystalquest.nativeapp
import com.google.gson.JsonSyntaxException
import com.google.gson.JsonObject
import in.gogocompany.crystalquest.nativeapp.data.GameRepository
import in.gogocompany.crystalquest.nativeapp.data.CrystalLevelCatalog
import in.gogocompany.crystalquest.nativeapp.data.CrystalLevelDto
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgress
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgressDao
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
class GameRepositoryTest{
 @Test fun malformedStoredGameIsReportedInsteadOfSilentlyStartingFresh()=runBlocking{
  val dao=mockk<GameProgressDao>();val catalog=mockk<CrystalLevelCatalog>(relaxed=true)
  coEvery{dao.get("crystal-quest")} returns GameProgress("crystal-quest","{broken",1L)
  val repository=GameRepository(dao,catalog)
  assertThrows(JsonSyntaxException::class.java){runBlocking{repository.load()}}
 }
 @Test fun newCampaignUsesCanonicalLevelDefinition()=runBlocking{
  val dao=mockk<GameProgressDao>();val catalog=mockk<CrystalLevelCatalog>()
  coEvery{dao.get("crystal-quest")} returns null
  every{catalog.get(1)} returns CrystalLevelDto(1,"Crystal Gate",13,List(8){"........"},listOf(JsonObject().apply{addProperty("type","score");addProperty("target",4200)}),listOf(4200,5400,6800),"Match three crystals")
  val state=GameRepository(dao,catalog).load()
  assertEquals("Crystal Gate",state.levelName);assertEquals(13,state.movesRemaining);assertEquals(4200,state.targetScore);assertEquals(5400,state.star2Threshold);assertEquals(6800,state.star3Threshold)
 }
}