package in.gogocompany.crystalquest.nativeapp.data.local
import androidx.room.*
import kotlinx.coroutines.flow.Flow
@Entity(tableName="game_progress") data class GameProgress(@PrimaryKey val gameId:String,val payload:String,val updatedAt:Long)
@Dao interface GameProgressDao{
 @Query("SELECT * FROM game_progress WHERE gameId=:gameId LIMIT 1") fun observe(gameId:String):Flow<GameProgress?>
 @Query("SELECT * FROM game_progress WHERE gameId=:gameId LIMIT 1") suspend fun get(gameId:String):GameProgress?
 @Insert(onConflict=OnConflictStrategy.REPLACE) suspend fun upsert(progress:GameProgress)
}
@Database(entities=[GameProgress::class],version=1,exportSchema=false) abstract class GameDatabase:RoomDatabase(){abstract fun progressDao():GameProgressDao}