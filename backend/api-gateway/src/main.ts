import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import helmet from 'helmet';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';

// Create logger instance for process-level error handling
const processLogger = new LoggerService();

// Global unhandled rejection handler
process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
  processLogger.error(`Unhandled Rejection at: ${promise}`, reason?.stack || reason);
  // Log the error but don't exit - let NestJS handle cleanup
});

// Global uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  processLogger.error('Uncaught Exception', error.stack);
  // For uncaught exceptions, we should exit after logging
  // The process manager (PM2, Docker, etc.) should restart the app
  process.exit(1);
});

async function bootstrap() {
  // Create custom logger instance
  const logger = new LoggerService();

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Cookie parser - must be before routes
  app.use(cookieParser());

  // Raw body for Stripe webhooks signature verification.
  // Le backend n'a PAS de préfixe global : la route reçue est /payments/webhook
  // (nginx retire le préfixe /api). On enregistre les deux chemins par sécurité.
  app.use(
    ['/payments/webhook', '/api/payments/webhook'],
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
      req.rawBody = req.body;
      next();
    },
  );

  // Security with strict CSP
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // Allow Google reCAPTCHA
          'https://www.google.com/recaptcha/',
          'https://www.gstatic.com/recaptcha/',
          // In dev, allow unsafe-eval for hot reload
          ...(!isProduction ? ["'unsafe-eval'"] : []),
        ],
        styleSrc: [
          "'self'",
          // Allow Google Fonts
          'https://fonts.googleapis.com',
          // Only allow unsafe-inline in development for hot reload convenience
          // In production, enforce strict CSP without unsafe-inline
          ...(!isProduction ? ["'unsafe-inline'"] : []),
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
          // S3 buckets for uploads
          process.env.AWS_S3_BUCKET ? `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com` : '',
        ].filter(Boolean),
        connectSrc: [
          "'self'",
          // API endpoints
          process.env.ALLOWED_ORIGINS?.split(',') || [],
        ].flat(),
        frameSrc: [
          "'self'",
          // Google reCAPTCHA
          'https://www.google.com/recaptcha/',
          'https://recaptcha.google.com/recaptcha/',
          // OAuth providers
          'https://accounts.google.com',
          'https://www.facebook.com',
          'https://appleid.apple.com',
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Needed for OAuth
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS - Production-ready configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'stripe-signature',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 3600, // Cache preflight requests for 1 hour
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Krafolt API')
      .setDescription(
        'API complète de la plateforme Krafolt - Mise en relation artisans et clients\n\n' +
        '## Fonctionnalités principales\n' +
        '- **Authentication**: Inscription, connexion, 2FA, gestion de sessions\n' +
        '- **Missions**: Recherche avancée, templates, négociations\n' +
        '- **Paiements**: Multi-devises (EUR, USD, GBP), Stripe Connect\n' +
        '- **Reviews**: Système d\'avis avec réponses\n' +
        '- **Disputes**: Résolution de litiges avec médiation\n' +
        '- **Chat**: Messagerie chiffrée de bout en bout\n' +
        '- **Marketplace**: Vente de produits artisanaux\n' +
        '- **Notifications**: Push notifications (FCM)\n\n' +
        '## Sécurité\n' +
        '- Rate limiting: 100 req/min par utilisateur\n' +
        '- Chiffrement E2E pour les messages\n' +
        '- Verrouillage de compte après 5 tentatives échouées\n' +
        '- Gestion multi-sessions avec révocation',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        'JWT-auth',
      )
      .addTag('Health', 'Endpoints de santé et monitoring')
      .addTag('Auth', 'Authentification et gestion des utilisateurs')
      .addTag('Sessions', 'Gestion des sessions multi-devices')
      .addTag('Missions', 'Gestion des missions et interventions')
      .addTag('Mission Search', 'Recherche avancée de missions')
      .addTag('Mission Templates', 'Templates de missions réutilisables')
      .addTag('Reviews', 'Système d\'avis et évaluations')
      .addTag('Review Responses', 'Réponses aux avis')
      .addTag('Payments', 'Paiements et transactions')
      .addTag('Disputes', 'Gestion des litiges')
      .addTag('Chat', 'Messagerie en temps réel')
      .addTag('Marketplace', 'Marketplace de produits')
      .addTag('Notifications', 'Notifications push')
      .addTag('Availability', 'Gestion de disponibilité artisans')
      .setContact(
        'Support Krafolt',
        'https://krafolt.com',
        'support@krafolt.com',
      )
      .setLicense('Proprietary', 'https://krafolt.com/license')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        // Disable token persistence for security - tokens should not be stored in localStorage
        persistAuthorization: false,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log(`📚 API Documentation available at http://localhost:${process.env.PORT || 4000}/api/docs`);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 Krafolt API running on http://localhost:${port}`);
  logger.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`✅ Health check: http://localhost:${port}/health`);
}

bootstrap();
