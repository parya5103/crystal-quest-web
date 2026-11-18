package in.gogocompany.crystalquest.nativeapp.data
import com.google.gson.JsonParser
data class ImportedCrystalProgress(val unlocked:Int,val best:Map<Int,Int>,val stars:Map<Int,Int>)
object LegacySaveImporter{
 const val LEGACY_KEY="crystal-quest-save-v1"
 fun import(json:String):ImportedCrystalProgress{val root=JsonParser.parseString(json).asJsonObject;val unlocked=(root.get("unlocked")?.asInt?:1).coerceIn(1,27);fun read(key:String)=root.getAsJsonObject(key)?.entrySet()?.mapNotNull{(name,value)->name.toIntOrNull()?.takeIf{it in 1..27}?.let{id->runCatching{id to value.asInt.coerceAtLeast(0)}.getOrNull()}}?.toMap().orEmpty();return ImportedCrystalProgress(unlocked,read("best"),read("stars"))}
}