import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfigValidation } from './config/app-config.validation';
import { DatabaseModule } from './database/database.module';
import { CatmatClassificationModule } from './modules/catmat-classification/catmat-classification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: appConfigValidation,
    }),
    DatabaseModule,
    CatmatClassificationModule,
  ],
})
export class AppModule {}
