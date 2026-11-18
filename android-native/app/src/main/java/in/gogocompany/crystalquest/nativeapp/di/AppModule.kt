package in.gogocompany.crystalquest.nativeapp.di
import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.Qualifier
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import in.gogocompany.crystalquest.nativeapp.data.local.GameDatabase
import in.gogocompany.crystalquest.nativeapp.data.local.GameProgressDao
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class IoDispatcher
@Module @InstallIn(SingletonComponent::class) object AppModule{
 @Provides @Singleton fun database(@ApplicationContext context:Context):GameDatabase=Room.databaseBuilder(context,GameDatabase::class.java,"crystal-quest.db").build()
 @Provides fun progressDao(database:GameDatabase):GameProgressDao=database.progressDao()
 @Provides @IoDispatcher fun ioDispatcher():CoroutineDispatcher=Dispatchers.IO
}