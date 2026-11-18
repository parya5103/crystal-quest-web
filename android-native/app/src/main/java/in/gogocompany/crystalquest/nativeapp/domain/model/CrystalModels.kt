package `in`.gogocompany.crystalquest.nativeapp.domain.model
enum class Gem(val isSpecial:Boolean=false){AMBER,AQUA,ROSE,VERDANT,VIOLET,SOLAR,LINE_H(true),LINE_V(true),BOMB(true),PRISM(true)}
data class Cell(val column:Int,val row:Int)
data class CrystalGameState(
 val board:List<Gem?>,
 val selected:Cell?=null,
 val score:Int=0,
 val movesRemaining:Int=13,
 val level:Int=1,
 val levelName:String="Crystal Gate",
 val targetScore:Int=4200,
 val star2Threshold:Int=5400,
 val star3Threshold:Int=6800,
 val stars:Int=0,
 val unlockedLevel:Int=1,
 val bestStars:Map<Int,Int> = emptyMap(),
 val bestScores:Map<Int,Int> = emptyMap(),
 val settings:Map<String,Boolean> = emptyMap(),
 val relics:Set<String> = emptySet(),
 val forestSeen:Set<String> = emptySet(),
 val storySeen:Set<String> = emptySet(),
 val dailyDate:String="",
 val lastDailyDate:String="",
 val dailyCompletedDate:String="",
 val isDaily:Boolean=false,
 val coins:Int=0,
 val dailyStreak:Int=0,
 val dailyBest:Int=0,
 val legacySaveJson:String?=null,
 val message:String="Match three or more crystals",
 val isComplete:Boolean=false,
 val isWon:Boolean=false
){init{require(board.size==64){"Crystal board must contain 64 cells"}}}
sealed interface CrystalUiEvent{
 data class TapCell(val cell:Cell):CrystalUiEvent
 data object Restart:CrystalUiEvent
 data object Continue:CrystalUiEvent;data class SelectLevel(val level:Int):CrystalUiEvent;data object DailyChallenge:CrystalUiEvent;data object ExitDaily:CrystalUiEvent
}