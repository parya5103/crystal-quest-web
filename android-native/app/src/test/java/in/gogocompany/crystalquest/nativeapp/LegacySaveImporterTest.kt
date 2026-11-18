package in.gogocompany.crystalquest.nativeapp
import in.gogocompany.crystalquest.nativeapp.data.LegacySaveImporter
import org.junit.Assert.*
import org.junit.Test
class LegacySaveImporterTest{
 @Test fun importsKnownLegacyKeyAndCampaignProgress(){val result=LegacySaveImporter.import("""{"unlocked":19,"best":{"3":12500,"28":999999},"stars":{"3":3,"19":2}}""");assertEquals(LegacySaveImporter.LEGACY_KEY,"crystal-quest-save-v1");assertEquals(19,result.unlocked);assertEquals(12500,result.best[3]);assertEquals(3,result.stars[3]);assertFalse(result.best.containsKey(28))}
 @Test fun defaultsAndClampsMalformedProgress(){val result=LegacySaveImporter.import("""{"unlocked":900,"best":{"0":4,"bad":9},"stars":{"1":-2}}""");assertEquals(27,result.unlocked);assertTrue(result.best.isEmpty());assertEquals(0,result.stars[1])}
}