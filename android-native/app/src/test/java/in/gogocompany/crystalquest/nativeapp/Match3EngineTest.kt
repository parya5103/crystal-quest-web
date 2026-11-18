package in.gogocompany.crystalquest.nativeapp
import in.gogocompany.crystalquest.nativeapp.domain.engine.Match3Engine
import in.gogocompany.crystalquest.nativeapp.domain.model.*
import org.junit.Assert.*
import org.junit.Test
class Match3EngineTest{
 private val engine=Match3Engine()
 @Test fun seededBoardHasNoStartingMatches(){assertTrue(engine.findMatches(engine.newGame(123).board).isEmpty())}
 @Test fun detectsHorizontalAndVerticalRuns(){val board=MutableList<Gem?>(64){null};board[0]=Gem.AMBER;board[1]=Gem.AMBER;board[2]=Gem.AMBER;board[8]=Gem.AQUA;board[16]=Gem.AQUA;board[24]=Gem.AQUA;assertEquals(setOf(0,1,2,8,16,24),engine.findMatches(board))}
 @Test fun invalidNonAdjacentMoveDoesNotConsumeMove(){val selected=engine.tap(engine.newGame(8),Cell(0,0),1);val next=engine.tap(selected,Cell(2,2),2);assertEquals(24,next.movesRemaining)}
 @Test fun deterministicSeedProducesSameBoard(){assertEquals(engine.newGame(5),engine.newGame(5))}
 @Test fun validAdjacentSwapClearsMatchAndConsumesOneMove(){
  val board=MutableList<Gem?>(64){null}
  board[0]=Gem.AQUA;board[1]=Gem.AMBER;board[2]=Gem.AQUA;board[3]=Gem.AQUA
  val start=CrystalGameState(board)
  val selected=engine.tap(start,Cell(0,0),11)
  val result=engine.tap(selected,Cell(1,0),1234)
  assertEquals(23,result.movesRemaining)
  assertTrue(result.score>=180)
  assertNull(result.selected)
 }
}