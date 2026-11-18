package in.gogocompany.crystalquest.nativeapp
import com.google.gson.JsonSyntaxException
import in.gogocompany.crystalquest.nativeapp.data.GameRepository
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgress
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgressDao
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertThrows
import org.junit.Test
class GameRepositoryTest{
 @Test fun malformedStoredGameIsReportedInsteadOfSilentlyStartingFresh()=runBlocking{
  val dao=mockk<GameProgressDao>()
  coEvery{dao.get("crystal-quest")} returns GameProgress("crystal-quest","{broken",1L)
  val repository=GameRepository(dao)
  assertThrows(JsonSyntaxException::class.java){runBlocking{repository.load()}}
 }
}