package in.gogocompany.crystalquest.nativeapp.domain.model
enum class Gem{AMBER,AQUA,ROSE,VERDANT,VIOLET,SOLAR}
data class Cell(val column:Int,val row:Int)
data class CrystalGameState(val board:List<Gem?>,val selected:Cell?=null,val score:Int=0,val movesRemaining:Int=24,val level:Int=1,val message:String="Match three or more crystals",val isComplete:Boolean=false){init{require(board.size==64){"Crystal board must contain 64 cells"}}}
sealed interface CrystalUiEvent{data class TapCell(val cell:Cell):CrystalUiEvent;data object Restart:CrystalUiEvent}