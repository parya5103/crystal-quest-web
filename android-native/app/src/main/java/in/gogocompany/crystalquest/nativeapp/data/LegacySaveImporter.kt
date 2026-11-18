package in.gogocompany.crystalquest.nativeapp.data
import com.google.gson.JsonElement
import com.google.gson.JsonParser
import java.nio.charset.StandardCharsets
import java.util.Base64

data class ImportedCrystalProgress(
 val unlocked:Int,val best:Map<Int,Int>,val stars:Map<Int,Int>,val lastLevel:Int,
 val settings:Map<String,Boolean>,val relics:Set<String>,val forestSeen:Set<String>,
 val storySeen:Set<String>,val dailyDate:String,val dailyStreak:Int,val dailyBest:Int,val rawSaveJson:String
)
object LegacySaveImporter{
 const val LEGACY_KEY="crystal-quest-save-v1"
 const val BACKUP_KEY="crystal-quest-save-backup"
 const val EXPORT_PREFIX="CQSAVE2-"
 const val SAVE_VERSION=2
 fun importCode(code:String):ImportedCrystalProgress?{
  val trimmed=code.trim()
  if(!trimmed.startsWith(EXPORT_PREFIX))return null
  val encoded=trimmed.removePrefix(EXPORT_PREFIX)
  if(encoded.isBlank())return null
  return runCatching{
   val decoded=Base64.getDecoder().decode(encoded)
   import(String(decoded,StandardCharsets.US_ASCII))
  }.getOrNull()
 }
 fun import(json:String):ImportedCrystalProgress{
  val root=JsonParser.parseString(json).asJsonObject
  require(root.get("v")?.takeIf{it.isJsonPrimitive}?.asInt==SAVE_VERSION){"Unsupported Crystal Quest save version"}
  val unlocked=(root.get("unlocked")?.takeIf{it.isJsonPrimitive}?.asInt?:1).coerceIn(1,27)
  val lastLevel=(root.get("lastLevel")?.takeIf{it.isJsonPrimitive}?.asInt?:1).coerceIn(1,27)
  fun numberMap(key:String,max:Int)=root.getAsJsonObject(key)?.entrySet()?.mapNotNull{(name,value)->
   name.toIntOrNull()?.takeIf{it in 1..27}?.let{id->runCatching{id to value.asInt.coerceIn(0,max)}.getOrNull()}
  }?.toMap().orEmpty()
  val rawSettings=root.getAsJsonObject("settings")
  val settings=listOf("sfx","music","motion","symbols").mapNotNull{key->
   rawSettings?.get(key)?.takeIf{it.isJsonPrimitive&&it.asJsonPrimitive.isBoolean}?.let{key to it.asBoolean}
  }.toMap()
  val world=root.getAsJsonObject("world")
  fun strings(element:JsonElement?)=runCatching{element?.asJsonArray?.mapNotNull{it.takeIf{v->v.isJsonPrimitive&&v.asJsonPrimitive.isString}?.asString}?.toSet().orEmpty()}.getOrDefault(emptySet())
  val daily=world?.getAsJsonObject("daily")
  return ImportedCrystalProgress(
   unlocked=unlocked,best=numberMap("best",Int.MAX_VALUE),stars=numberMap("stars",3),lastLevel=lastLevel,
   settings=settings,relics=strings(world?.get("relics")),forestSeen=strings(world?.getAsJsonObject("forest")?.get("seen")),
   storySeen=strings(world?.get("story")),dailyDate=daily?.get("date")?.takeIf{it.isJsonPrimitive}?.asString.orEmpty(),
   dailyStreak=(daily?.get("streak")?.takeIf{it.isJsonPrimitive}?.asInt?:0).coerceIn(0,3650),
   dailyBest=(daily?.get("best")?.takeIf{it.isJsonPrimitive}?.asInt?:0).coerceAtLeast(0),rawSaveJson=root.toString()
  )
 }
}