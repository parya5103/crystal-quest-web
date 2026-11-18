package in.gogocompany.crystalquest.nativeapp
import in.gogocompany.crystalquest.nativeapp.domain.engine.Match3Engine
import in.gogocompany.crystalquest.nativeapp.domain.model.*
import org.junit.Assert.*
import org.junit.Test
class Match3EngineTest{
 private val engine=Match3Engine()
 @Test fun seededBoardHasNoStartingMatches(){val board=engine.newGame(123).board;assertTrue(engine.findMatches(board).isEmpty());assertTrue(engine.hasValidMove(board))}
 @Test fun detectsHorizontalAndVerticalRuns(){val board=MutableList<Gem?>(64){null};board[0]=Gem.AMBER;board[1]=Gem.AMBER;board[2]=Gem.AMBER;board[8]=Gem.AQUA;board[16]=Gem.AQUA;board[24]=Gem.AQUA;assertEquals(setOf(0,1,2,8,16,24),engine.findMatches(board))}
 @Test fun invalidNonAdjacentMoveDoesNotConsumeMove(){val selected=engine.tap(engine.newGame(8),Cell(0,0),1);val next=engine.tap(selected,Cell(2,2),2);assertEquals(24,next.movesRemaining)}
 @Test fun deterministicSeedProducesSameBoard(){assertEquals(engine.newGame(5),engine.newGame(5))}
 @Test fun firstLevelUsesOfficialMoveLimitAndScoreGoal(){val level=engine.newLevel(1,5);assertEquals(13,level.movesRemaining);assertEquals(4200,level.targetScore)}
 @Test fun reachingTargetScoreCompletesLevelAndAllowsProgression(){
  val board=MutableList<Gem?>(64){null}
  board[0]=Gem.AQUA;board[1]=Gem.AMBER;board[2]=Gem.AQUA;board[3]=Gem.AQUA
  val start=CrystalGameState(board,movesRemaining=1,targetScore=180)
  val selected=engine.tap(start,Cell(0,0),11)
  val result=engine.tap(selected,Cell(1,0),1234)
  assertTrue(result.isComplete);assertTrue(result.isWon);assertTrue(result.score>=180)
  assertEquals(0,result.movesRemaining)
 }
 @Test fun officialStarThresholdsAwardStarsAndUnlockNextLevel(){
  val board=MutableList<Gem?>(64){null}
  board[0]=Gem.AQUA;board[1]=Gem.AMBER;board[2]=Gem.AQUA;board[3]=Gem.AQUA
  val start=CrystalGameState(board,movesRemaining=1,targetScore=180,star2Threshold=180,star3Threshold=180)
  val selected=engine.tap(start,Cell(0,0),11)
  val result=engine.tap(selected,Cell(1,0),1234)
  assertEquals(3,result.stars);assertEquals(2,result.unlockedLevel);assertEquals(3,result.bestStars[1])
 }
 @Test fun exhaustingMovesWithoutMeetingGoalIsALoss(){
  val board=MutableList<Gem?>(64){null}
  board[0]=Gem.AQUA;board[1]=Gem.AMBER;board[2]=Gem.AQUA;board[3]=Gem.AQUA
  val start=CrystalGameState(board,movesRemaining=1,targetScore=9999)
  val selected=engine.tap(start,Cell(0,0),11)
  val result=engine.tap(selected,Cell(1,0),1234)
  assertTrue(result.isComplete);assertFalse(result.isWon);assertEquals(0,result.movesRemaining)
 }
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