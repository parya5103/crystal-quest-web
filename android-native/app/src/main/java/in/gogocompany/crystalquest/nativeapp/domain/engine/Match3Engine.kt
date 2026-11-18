package in.gogocompany.crystalquest.nativeapp.domain.engine
import in.gogocompany.crystalquest.nativeapp.domain.model.*
import kotlin.random.Random
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
class Match3Engine{
 companion object{
  const val WIDTH=8;const val HEIGHT=8;private const val TYPES=6
  private val MOVES=intArrayOf(13,22,24,24,34,26,30,22,26,36,26,30,34,34,24,30,34,36,30,20,24,26,13,28,24,14,16)
  private val TARGETS=intArrayOf(4200,2000,2200,3000,3400,3600,4600,8000,7000,4800,6000,8000,7000,7000,10000,8000,9000,10000,11000,5000,2500,3200,8500,5000,3000,12000,5000)
  private val STAR2=intArrayOf(5400,3200,3400,4400,5000,5200,6400,10500,8800,6800,8200,10500,9500,9400,13500,10500,11800,13000,14500,7500,3800,4600,11000,6800,4200,15500,7500)
  private val STAR3=intArrayOf(6800,4600,4800,6000,6800,7000,8600,13600,11400,9000,10500,13600,12200,12400,17500,13200,15000,16500,18800,10000,5200,6200,14000,8800,5600,19500,10000)
  private val NAMES=arrayOf("Crystal Gate","Amber Hollow","Twin Veins","Stonewatch","Frozen Shelf","Prism Descent","The Lattice","Cascade Falls","Hollow Crown","Glacier Vault","Ember Run","Shattered Span","Deep Current","Obsidian Ring","Starfall Basin","Frost Lattice","Verdant Maze","Solar Forge","Crystal Throne","Ember Warden","First Resonance","Vein Weaver","Chain Current","Resonance Array","Quiet Hollow","Harmonic Vault","The Guardian")
 }
 private data class SpecialMatch(val index:Int,val gem:Gem)
 fun newGame(seed:Int=0xC0FFEE):CrystalGameState=newLevel(1,seed)
 fun newLevel(level:Int,seed:Int=0xC0FFEE):CrystalGameState{
  val safeLevel=level.coerceIn(1,27);val random=Random(seed);val cells=MutableList<Gem?>(64){null}
  for(row in 0 until HEIGHT)for(col in 0 until WIDTH){
   var gem:Gem;var attempts=0
   do{gem=Gem.entries[random.nextInt(TYPES)];attempts++}while(attempts<32&&makesImmediateMatch(cells,col,row,gem))
   cells[index(col,row)]=gem
  }
  ensurePlayable(cells,random)
  return CrystalGameState(cells,movesRemaining=MOVES[safeLevel-1],level=safeLevel,levelName=NAMES[safeLevel-1],targetScore=TARGETS[safeLevel-1],star2Threshold=STAR2[safeLevel-1],star3Threshold=STAR3[safeLevel-1])
 }
 fun tap(state:CrystalGameState,cell:Cell,seed:Int):CrystalGameState{
  if(state.isComplete||state.movesRemaining<=0||cell.column !in 0 until WIDTH||cell.row !in 0 until HEIGHT)return state
  val selected=state.selected
  if(selected==null)return state.copy(selected=cell)
  if(selected==cell)return state.copy(selected=null)
  if(kotlin.math.abs(selected.column-cell.column)+kotlin.math.abs(selected.row-cell.row)!=1)return state.copy(selected=cell)
  val cells=state.board.toMutableList()
  val a=index(selected.column,selected.row);val b=index(cell.column,cell.row)
  val temp=cells[a];cells[a]=cells[b];cells[b]=temp
  val swappedSpecials=listOf(a,b).filter{cells[it]?.isSpecial==true}
  var matches=findMatches(cells)
  if(matches.isEmpty()&&swappedSpecials.isEmpty())return state.copy(selected=null,message="No match — try another pair")
  val random=Random(seed);var cleared=0;var cascades=0;var specialBonus=0
  var firstMove=true;var preferred=b
  while((matches.isNotEmpty()||(firstMove&&swappedSpecials.isNotEmpty()))&&cascades<20){
   cascades++
   val created=if(firstMove&&swappedSpecials.isEmpty())createSpecial(cells,matches,preferred)else null
   if(created!=null){cells[created.index]=created.gem;specialBonus+=120}
   val clear=matches.toMutableSet()
   val triggered=linkedSetOf<Int>()
   if(firstMove)triggered.addAll(swappedSpecials)
   if(matches.isNotEmpty()){
    for(i in cells.indices)if(cells[i]?.isSpecial==true&&neighbors(i).any{it in matches})triggered+=i
   }
   val effects=linkedSetOf<Int>()
   if(firstMove&&swappedSpecials.size==2){
    effects+=comboEffect(cells,a,b)
   }else{
    for(specialIndex in triggered){
     val special=cells[specialIndex]?:continue
     val target=if(special==Gem.PRISM){
      val other=if(specialIndex==a)b else a
      cells[other]?.takeUnless{it.isSpecial}
     }else null
     effects+=specialEffect(cells,specialIndex,special,target)
    }
   }
   val activated=triggered.toMutableSet()
   var newlyActivated=effects.filter{cells[it]?.isSpecial==true&&it !in activated}
   while(newlyActivated.isNotEmpty()){
    val batch=newlyActivated.toList();activated.addAll(batch)
    for(specialIndex in batch){
     val special=cells[specialIndex]?:continue
     effects+=specialEffect(cells,specialIndex,special,null)
    }
    newlyActivated=effects.filter{cells[it]?.isSpecial==true&&it !in activated}
   }
   clear+=triggered;clear+=effects
   if(created!=null)clear.remove(created.index)
   specialBonus+=activated.size*120
   cleared+=clear.count{cells[it]!=null}
   clear.forEach{cells[it]=null}
   for(col in 0 until WIDTH){
    val remaining=(0 until HEIGHT).mapNotNull{row->cells[index(col,row)]}
    val empty=HEIGHT-remaining.size
    for(row in 0 until HEIGHT)cells[index(col,row)]=if(row<empty)null else remaining[row-empty]
    for(row in 0 until empty)cells[index(col,row)]=Gem.entries[random.nextInt(TYPES)]
   }
   matches=findMatches(cells)
   firstMove=false;preferred=-1
  }
  ensurePlayable(cells,random)
  val moves=(state.movesRemaining-1).coerceAtLeast(0)
  val newScore=state.score+cleared*60+specialBonus
  val won=newScore>=state.targetScore;val lost=!won&&moves==0
  val earnedStars=if(won)when{newScore>=state.star3Threshold->3;newScore>=state.star2Threshold->2;else->1}else state.stars
  val best=if(won&&!state.isDaily)state.bestStars.toMutableMap().apply{this[state.level]=maxOf(this[state.level]?:0,earnedStars)}else state.bestStars
  val bestScores=if(won&&!state.isDaily)state.bestScores.toMutableMap().apply{this[state.level]=maxOf(this[state.level]?:0,newScore)}else state.bestScores
  val dailyStreak=if(won&&state.isDaily)nextDailyStreak(state.lastDailyDate,state.dailyDate,state.dailyStreak)else state.dailyStreak
  val dailyCompleted=if(won&&state.isDaily)state.dailyDate else state.dailyCompletedDate
  return state.copy(board=cells,selected=null,score=newScore,movesRemaining=moves,message=when{won&&state.isDaily->"Daily challenge complete! +25 coins";won->"Level ${state.level} complete!";lost->"Out of moves — retry this level";else->"$cleared crystals cleared · $cascades cascade(s)"},isComplete=won||lost,isWon=won,stars=earnedStars,unlockedLevel=if(won&&!state.isDaily)maxOf(state.unlockedLevel,(state.level+1).coerceAtMost(27))else state.unlockedLevel,bestStars=best,bestScores=bestScores,coins=if(won)state.coins+(if(state.isDaily)25 else 10)else state.coins,dailyStreak=dailyStreak,dailyBest=if(won&&state.isDaily)maxOf(state.dailyBest,dailyStreak)else state.dailyBest,lastDailyDate=if(won&&state.isDaily)state.dailyDate else state.lastDailyDate,dailyCompletedDate=dailyCompleted)
 }
 private fun createSpecial(cells:List<Gem?>,matches:Set<Int>,preferred:Int):SpecialMatch?{
  val horizontal=runs(cells,true).filter{it.size>=3&&it.any{cell->cell in matches}}
  val vertical=runs(cells,false).filter{it.size>=3&&it.any{cell->cell in matches}}
  val five=(horizontal+vertical).filter{it.size>=5}.maxByOrNull{it.size}
  if(five!=null)return SpecialMatch(five.choose(preferred),Gem.PRISM)
  val crossPoint=horizontal.asSequence().flatMap{h->vertical.asSequence().flatMap{v->h.intersect(v).asSequence()}}.firstOrNull()
  if(crossPoint!=null)return SpecialMatch(crossPoint,Gem.BOMB)
  val fourH=horizontal.firstOrNull{it.size==4}
  if(fourH!=null)return SpecialMatch(fourH.choose(preferred),Gem.LINE_H)
  val fourV=vertical.firstOrNull{it.size==4}
  if(fourV!=null)return SpecialMatch(fourV.choose(preferred),Gem.LINE_V)
  return null
 }
 private fun List<Int>.choose(preferred:Int)=if(preferred in this)preferred else this[size/2]
 private fun runs(cells:List<Gem?>,horizontal:Boolean):List<List<Int>>{
  val result=mutableListOf<List<Int>>()
  val outer=if(horizontal)HEIGHT else WIDTH
  val inner=if(horizontal)WIDTH else HEIGHT
  for(line in 0 until outer){
   var pos=0
   while(pos<inner){
    val cell=if(horizontal)index(pos,line)else index(line,pos)
    val gem=cells[cell]
    if(gem==null||gem.isSpecial){pos++;continue}
    var end=pos+1
    while(end<inner){
     val next=if(horizontal)index(end,line)else index(line,end)
     if(cells[next]!=gem)break
     end++
    }
    if(end-pos>=3)result+= (pos until end).map{if(horizontal)index(it,line)else index(line,it)}
    pos=end
   }
  }
  return result
 }
 private fun specialEffect(cells:List<Gem?>,index:Int,special:Gem,targetColor:Gem?):Set<Int>{
  val col=index%WIDTH;val row=index/WIDTH
  return when(special){
   Gem.LINE_H->(0 until WIDTH).map{this.index(it,row)}.toSet()
   Gem.LINE_V->(0 until HEIGHT).map{this.index(col,it)}.toSet()
   Gem.BOMB->(maxOf(0,row-1)..minOf(HEIGHT-1,row+1)).flatMap{y->(maxOf(0,col-1)..minOf(WIDTH-1,col+1)).map{x->this.index(x,y)}}.toSet()
   Gem.PRISM->{
    val color=targetColor?:cells.filterNotNull().filter{!it.isSpecial}.groupingBy{it}.eachCount().maxByOrNull{it.value}?.key
    if(color==null)emptySet()else cells.indices.filter{cells[it]==color}.toSet()
   }
   else->emptySet()
  }
 }
 private fun comboEffect(cells:List<Gem?>,a:Int,b:Int):Set<Int>{
  val first=cells[a]?:return emptySet();val second=cells[b]?:return emptySet()
  if(first==Gem.PRISM&&second==Gem.PRISM)return cells.indices.toSet()
  if((first==Gem.LINE_H&&second==Gem.LINE_V)||(first==Gem.LINE_V&&second==Gem.LINE_H)){
   val row=a/WIDTH;val col=b%WIDTH
   return ((0 until WIDTH).map{index(it,row)}+(0 until HEIGHT).map{index(col,it)}).toSet()
  }
  if(first==Gem.BOMB&&second==Gem.BOMB){
   val ca=a%WIDTH;val ra=a/WIDTH;val cb=b%WIDTH;val rb=b/WIDTH
   return ((maxOf(0,ra-2)..minOf(HEIGHT-1,ra+2)).flatMap{y->(maxOf(0,ca-2)..minOf(WIDTH-1,ca+2)).map{x->index(x,y)}}+
    (maxOf(0,rb-2)..minOf(HEIGHT-1,rb+2)).flatMap{y->(maxOf(0,cb-2)..minOf(WIDTH-1,cb+2)).map{x->index(x,y)}}).toSet()
  }
  if(first==Gem.PRISM||second==Gem.PRISM){
   val prism=if(first==Gem.PRISM)a else b;val other=if(prism==a)b else a
   val otherGem=cells[other]
   if(otherGem?.isSpecial==true)return cells.indices.filter{cells[it]==otherGem}.toSet()+specialEffect(cells,prism,Gem.PRISM,null)
   return specialEffect(cells,prism,Gem.PRISM,otherGem)
  }
  return specialEffect(cells,a,first,null)+specialEffect(cells,b,second,null)
 }
 private fun neighbors(index:Int):Set<Int>{
  val col=index%WIDTH;val row=index/WIDTH
  return buildSet{if(col>0)add(index-1);if(col<WIDTH-1)add(index+1);if(row>0)add(index-WIDTH);if(row<HEIGHT-1)add(index+WIDTH)}
 }
 private fun nextDailyStreak(lastDate:String,currentDate:String,currentStreak:Int):Int{
  if(lastDate==currentDate)return currentStreak
  return runCatching{
   val format=SimpleDateFormat("yyyyMMdd",Locale.US)
   val last=format.parse(lastDate)?:return@runCatching 1
   val calendar=Calendar.getInstance().apply{time=last;add(Calendar.DAY_OF_YEAR,1)}
   if(format.format(calendar.time)==currentDate)currentStreak+1 else 1
  }.getOrDefault(1)
 }
 fun hasValidMove(cells:List<Gem?>):Boolean{
  if(cells.size!=64)return false
  for(row in 0 until HEIGHT)for(col in 0 until WIDTH){
   val a=index(col,row)
   if(col+1<WIDTH){val copy=cells.toMutableList();val b=index(col+1,row);val t=copy[a];copy[a]=copy[b];copy[b]=t;if(copy[a]?.isSpecial==true||copy[b]?.isSpecial==true||findMatches(copy).isNotEmpty())return true}
   if(row+1<HEIGHT){val copy=cells.toMutableList();val b=index(col,row+1);val t=copy[a];copy[a]=copy[b];copy[b]=t;if(copy[a]?.isSpecial==true||copy[b]?.isSpecial==true||findMatches(copy).isNotEmpty())return true}
  }
  return false
 }
 private fun ensurePlayable(cells:MutableList<Gem?>,random:Random){
  if(hasValidMove(cells))return
  val original=cells.filterNotNull()
  repeat(200){
   val shuffled=original.shuffled(random)
   for(i in cells.indices)cells[i]=shuffled.getOrNull(i)
   if(findMatches(cells).isEmpty()&&hasValidMove(cells))return
  }
  for(row in 0 until HEIGHT)for(col in 0 until WIDTH)cells[index(col,row)]=Gem.entries[(col+row*2)%TYPES]
  cells[index(1,1)]=Gem.entries[0];cells[index(1,2)]=Gem.entries[0]
 }
 fun findMatches(cells:List<Gem?>):Set<Int>{
  require(cells.size==64)
  val found=linkedSetOf<Int>()
  for(row in 0 until HEIGHT){
   var col=0
   while(col<WIDTH){
    val gem=cells[index(col,row)]
    if(gem==null||gem.isSpecial){col++;continue}
    var end=col+1
    while(end<WIDTH&&cells[index(end,row)]==gem)end++
    if(end-col>=3)for(x in col until end)found+=index(x,row)
    col=end
   }
  }
  for(col in 0 until WIDTH){
   var row=0
   while(row<HEIGHT){
    val gem=cells[index(col,row)]
    if(gem==null||gem.isSpecial){row++;continue}
    var end=row+1
    while(end<HEIGHT&&cells[index(col,end)]==gem)end++
    if(end-row>=3)for(y in row until end)found+=index(col,y)
    row=end
   }
  }
  return found
 }
 private fun makesImmediateMatch(cells:List<Gem?>,col:Int,row:Int,gem:Gem)=!gem.isSpecial&&((col>=2&&cells[index(col-1,row)]==gem&&cells[index(col-2,row)]==gem)||(row>=2&&cells[index(col,row-1)]==gem&&cells[index(col,row-2)]==gem))
 private fun index(col:Int,row:Int)=row*WIDTH+col
}