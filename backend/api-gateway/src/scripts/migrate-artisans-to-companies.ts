import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ArtisanToCompanyMigrationService } from '../common/migrations/artisan-to-company-migration.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('MigrationScript');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const migrationService = app.get(ArtisanToCompanyMigrationService);

  try {
    logger.log('Starting migration: Converting solo artisans to company owners...');

    const soloArtisanIds = await migrationService.getAllSoloArtisansWithoutCompany();

    if (soloArtisanIds.length === 0) {
      logger.log('No solo artisans found to migrate. All artisans already have companies or no artisans exist.');
      await app.close();
      return;
    }

    logger.log(`Found ${soloArtisanIds.length} solo artisans to migrate`);

    const confirmMigration = process.argv.includes('--confirm');

    if (!confirmMigration) {
      logger.warn('');
      logger.warn('⚠️  DRY RUN MODE - No changes will be made');
      logger.warn('');
      logger.warn(`This script will convert ${soloArtisanIds.length} solo artisans to company owners.`);
      logger.warn('');
      logger.warn('To execute the migration, run:');
      logger.warn('  npm run migrate:artisans -- --confirm');
      logger.warn('');
      await app.close();
      return;
    }

    logger.warn('');
    logger.warn('🚀 EXECUTING MIGRATION - Changes will be committed to the database');
    logger.warn('');

    const result = await migrationService.bulkConvertArtisansToCompanies(soloArtisanIds);

    logger.log('');
    logger.log('Migration complete!');
    logger.log(`✅ Successful conversions: ${result.successCount}`);
    logger.log(`❌ Failed conversions: ${result.failureCount}`);
    logger.log('');

    if (result.failureCount > 0) {
      logger.error('Failed migrations:');
      Object.entries(result.results).forEach(([userId, migrationResult]) => {
        if (!migrationResult.success) {
          logger.error(`  User ${userId}: ${migrationResult.errors?.join(', ')}`);
        }
      });
    }

    if (result.successCount > 0) {
      logger.log('Successfully migrated users:');
      Object.entries(result.results).forEach(([userId, migrationResult]) => {
        if (migrationResult.success) {
          logger.log(`  User ${userId} → Company ${migrationResult.companyId}, Employee ${migrationResult.employeeId}`);
        }
      });
    }

  } catch (error) {
    logger.error('Migration failed with error:', error);
    process.exit(1);
  }

  await app.close();
}

bootstrap();
