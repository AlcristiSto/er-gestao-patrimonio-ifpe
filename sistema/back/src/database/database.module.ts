import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Db, MongoClient } from 'mongodb';
import { MONGO_CLIENT, MONGO_DATABASE } from './database.constants';

@Module({
  providers: [
    {
      provide: MONGO_CLIENT,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<MongoClient> => {
        const client = new MongoClient(configService.getOrThrow<string>('MONGO_URI'));
        return client.connect();
      },
    },
    {
      provide: MONGO_DATABASE,
      inject: [MONGO_CLIENT, ConfigService],
      useFactory: (client: MongoClient, configService: ConfigService): Db => {
        return client.db(configService.getOrThrow<string>('MONGO_DATABASE'));
      },
    },
  ],
  exports: [MONGO_CLIENT, MONGO_DATABASE],
})
export class DatabaseModule {}
