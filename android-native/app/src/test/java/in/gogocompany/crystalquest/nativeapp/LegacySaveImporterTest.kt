package in.gogocompany.crystalquest.nativeapp
import in.gogocompany.crystalquest.nativeapp.data.LegacySaveImporter
import org.junit.Assert.*
import org.junit.Test
class LegacySaveImporterTest{
 @Test fun importsActualV2SaveProgressSettingsAndWorld(){
  val result=LegacySaveImporter.import("""{"v":2,"unlocked":19,"lastLevel":12,"best":{"3":12500,"28":999999},"stars":{"3":3,"19":2},"settings":{"sfx":false,"music":true,"motion":true,"symbols":false},"world":{"relics":["forest-key","moon-shard"],"forest":{"seen":["intro","guardian"]},"daily":{"date":"2026-11-18","streak":8,"best":12},"story":["chapter-1"]}}""")
  assertEquals("crystal-quest-save-v1",LegacySaveImporter.LEGACY_KEY);assertEquals(19,result.unlocked);assertEquals(12,result.lastLevel)
  assertEquals(12500,result.best[3]);assertEquals(3,result.stars[3]);assertFalse(result.best.containsKey(28))
  assertEquals(false,result.settings["sfx"]);assertEquals(setOf("forest-key","moon-shard"),result.relics)
  assertEquals(setOf("intro","guardian"),result.forestSeen);assertEquals(setOf("chapter-1"),result.storySeen)
  assertEquals("2026-11-18",result.dailyDate);assertEquals(8,result.dailyStreak);assertEquals(12,result.dailyBest)
 }
 @Test fun clampsProgressAndDefaultsMissingFields(){
  val result=LegacySaveImporter.import("""{"unlocked":900,"best":{"0":4,"bad":9},"stars":{"1":-2}}""")
  assertEquals(27,result.unlocked);assertEquals(1,result.lastLevel);assertTrue(result.best.isEmpty());assertEquals(0,result.stars[1]);assertTrue(result.relics.isEmpty())
 }
}