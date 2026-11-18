package `in`.gogocompany.crystalquest.nativeapp.data
import android.content.Context
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonElement
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

private data class CrystalLevelCatalogDto(val version:Int,val levels:List<CrystalLevelDto>)
data class CrystalLevelDto(
 val id:Int,
 val name:String,
 val moves:Int,
 val layout:List<String>,
 val objectives:List<JsonObject>,
 val stars:List<Int>,
 val hint:String,
 val guardian:JsonElement?=null
)
@Singleton class CrystalLevelCatalog @Inject constructor(@ApplicationContext private val context:Context){
 private val gson=Gson()
 private val levels:List<CrystalLevelDto> by lazy{
  context.assets.open("crystal-levels.v1.json").bufferedReader().use{gson.fromJson(it,CrystalLevelCatalogDto::class.java)}
   .also{require(it.version==1&&it.levels.size==27){"Crystal Quest campaign catalog is incomplete"}}
   .levels
 }
 fun get(level:Int):CrystalLevelDto{
  val safe=level.coerceIn(1,27)
  return levels.getOrNull(safe-1)?.also{require(it.id==safe&&it.stars.size==3&&it.layout.size==8)}
   ?:throw IllegalStateException("Missing Crystal Quest level $safe")
 }
 fun count()=levels.size
}