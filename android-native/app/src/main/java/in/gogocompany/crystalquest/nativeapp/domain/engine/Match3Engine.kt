package in.gogocompany.crystalquest.nativeapp.domain.engine
import in.gogocompany.crystalquest.nativeapp.domain.model.*
import kotlin.random.Random
class Match3Engine{
 companion object{const val WIDTH=8;const val HEIGHT=8;private const val TYPES=6}
 fun newGame(seed:Int=0xC0FFEE):CrystalGameState{val random=Random(seed);val cells=MutableList<Gem?>(64){null};for(row in 0 until HEIGHT)for(col in 0 until WIDTH){var gem:Gem;var attempts=0;do{gem=Gem.entries[random.nextInt(TYPES)];attempts++}while(attempts<32&&makesImmediateMatch(cells,col,row,gem));cells[index(col,row)]=gem};return CrystalGameState(cells)}
 fun tap(state:CrystalGameState,cell:Cell,seed:Int):CrystalGameState{
  if(state.isComplete||state.movesRemaining<=0||cell.column !in 0 until WIDTH||cell.row !in 0 until HEIGHT)return state
  val selected=state.selected;if(selected==null)return state.copy(selected=cell);if(selected==cell)return state.copy(selected=null)
  if(kotlin.math.abs(selected.column-cell.column)+kotlin.math.abs(selected.row-cell.row)!=1)return state.copy(selected=cell)
  val cells=state.board.toMutableList();val a=index(selected.column,selected.row);val b=index(cell.column,cell.row);val temp=cells[a];cells[a]=cells[b];cells[b]=temp
  var matches=findMatches(cells);if(matches.isEmpty())return state.copy(selected=null,message="No match — try another pair")
  val random=Random(seed);var cleared=0;var cascades=0
  while(matches.isNotEmpty()&&cascades<20){cascades++;cleared+=matches.size;matches.forEach{cells[it]=null};for(col in 0 until WIDTH){val remaining=(0 until HEIGHT).mapNotNull{row->cells[index(col,row)]};val empty=HEIGHT-remaining.size;for(row in 0 until HEIGHT)cells[index(col,row)]=if(row<empty)null else remaining[row-empty];for(row in 0 until empty)cells[index(col,row)]=Gem.entries[random.nextInt(TYPES)]};matches=findMatches(cells)}
  val moves=(state.movesRemaining-1).coerceAtLeast(0);return state.copy(board=cells,selected=null,score=state.score+cleared*60,movesRemaining=moves,message=if(moves==0)"Out of moves — restart to try again" else "$cleared crystals cleared · $cascades cascade(s)",isComplete=moves==0)
 }
 fun findMatches(cells:List<Gem?>):Set<Int>{require(cells.size==64);val found=linkedSetOf<Int>();for(row in 0 until HEIGHT){var col=0;while(col<WIDTH){val gem=cells[index(col,row)];if(gem==null){col++;continue};var end=col+1;while(end<WIDTH&&cells[index(end,row)]==gem)end++;if(end-col>=3)for(x in col until end)found+=index(x,row);col=end}};for(col in 0 until WIDTH){var row=0;while(row<HEIGHT){val gem=cells[index(col,row)];if(gem==null){row++;continue};var end=row+1;while(end<HEIGHT&&cells[index(col,end)]==gem)end++;if(end-row>=3)for(y in row until end)found+=index(col,y);row=end}};return found}
 private fun makesImmediateMatch(cells:List<Gem?>,col:Int,row:Int,gem:Gem)=(col>=2&&cells[index(col-1,row)]==gem&&cells[index(col-2,row)]==gem)||(row>=2&&cells[index(col,row-1)]==gem&&cells[index(col,row-2)]==gem)
 private fun index(col:Int,row:Int)=row*WIDTH+col
}