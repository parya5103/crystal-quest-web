package `in`.gogocompany.crystalquest.nativeapp
import `in`.gogocompany.crystalquest.nativeapp.domain.engine.Match3Engine
import `in`.gogocompany.crystalquest.nativeapp.domain.model.*
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
  assertEquals(3,result.stars);assertEquals(2,result.unlockedLevel);assertEquals(3,result.bestStars[1]);assertEquals(result.score,result.bestScores[1])
 }
 @Test fun dailyChallengeAwardsCoinsAndContinuesStreakWithoutUnlockingCampaign(){
  val board=MutableList<Gem?>(64){null}
  board[0]=Gem.AQUA;board[1]=Gem.AMBER;board[2]=Gem.AQUA;board[3]=Gem.AQUA
  val start=CrystalGameState(board,movesRemaining=1,targetScore=180,star2Threshold=180,star3Threshold=180,isDaily=true,dailyDate="20261119",lastDailyDate="20261118",dailyStreak=2)
  val selected=engine.tap(start,Cell(0,0),11)
  val result=engine.tap(selected,Cell(1,0),1234)
  assertTrue(result.isWon);assertEquals(3,result.dailyStreak);assertEquals(3,result.dailyBest)
  assertEquals(25,result.coins);assertEquals("20261119",result.dailyCompletedDate);assertEquals(1,result.unlockedLevel);assertTrue(result.bestStars.isEmpty())
 }
 @Test fun fourMatchCreatesHorizontalLineSpecial(){
  val board=MutableList<Gem?>(64){null}
  board[0]=Gem.AQUA;board[1]=Gem.AMBER;board[2]=Gem.AQUA;board[3]=Gem.AQUA;board[4]=Gem.AQUA
  val result=engine.tap(engine.tap(CrystalGameState(board),Cell(0,0),1),Cell(1,0),2)
  assertTrue(result.board.contains(Gem.LINE_H))
 }
 @Test fun tShapedMatchCreatesBombSpecialAtTheIntersection(){
  val board=MutableList<Gem?>(64){null}
  board[16]=Gem.AQUA;board[17]=Gem.AQUA;board[18]=Gem.AMBER;board[19]=Gem.AQUA
  board[10]=Gem.AQUA;board[26]=Gem.AQUA
  val result=engine.tap(engine.tap(CrystalGameState(board),Cell(2,2),1),Cell(3,2),2)
  assertTrue(result.board.contains(Gem.BOMB))
 }
 @Test fun fiveMatchCreatesPrismSpecial(){
  val board=MutableList<Gem?>(64){null}
  board[0]=Gem.AQUA;board[1]=Gem.AMBER;board[2]=Gem.AQUA;board[3]=Gem.AQUA;board[4]=Gem.AQUA;board[5]=Gem.AQUA
  val result=engine.tap(engine.tap(CrystalGameState(board),Cell(0,0),1),Cell(1,0),2)
  assertTrue(result.board.contains(Gem.PRISM))
 }
 @Test fun swappingLineSpecialActivatesItsWholeRow(){
  val board=MutableList<Gem?>(64){null};board[0]=Gem.LINE_H
  for(col in 1 until 8)board[col]=if(col%2==0)Gem.AQUA else Gem.AMBER
  val result=engine.tap(engine.tap(CrystalGameState(board),Cell(0,0),1),Cell(1,0),2)
  assertFalse(result.board.contains(Gem.LINE_H));assertTrue(result.score>=480)
 }
 @Test fun swappingTwoLineSpecialsCreatesCrossClear(){
  val board=MutableList<Gem?>(64){null};board[0]=Gem.LINE_H;board[1]=Gem.LINE_V
  for(col in 2 until 8)board[col]=if(col%2==0)Gem.AQUA else Gem.AMBER
  for(row in 1 until 8)board[row*8+1]=if(row%2==0)Gem.AQUA else Gem.AMBER
  val result=engine.tap(engine.tap(CrystalGameState(board),Cell(0,0),1),Cell(1,0),2)
  assertFalse(result.board.contains(Gem.LINE_H));assertFalse(result.board.contains(Gem.LINE_V));assertTrue(result.score>=840)
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