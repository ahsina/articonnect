# ArtiConnect - Analyse de Sécurité Approfondie

## 🔒 Vue d'Ensemble

Ce document détaille l'analyse complète des vulnérabilités potentielles de la plateforme ArtiConnect et les mesures de protection mises en place.

---

## 📋 Table des Matières

1. [Modèle de Menaces (Threat Model)](#modèle-de-menaces)
2. [OWASP Top 10 - Mitigation](#owasp-top-10)
3. [Authentification & Gestion des Sessions](#authentification)
4. [Protection des Données (RGPD)](#protection-données)
5. [Sécurité des Paiements](#sécurité-paiements)
6. [API Security](#api-security)
7. [Infrastructure & DevOps](#infrastructure)
8. [Sécurité Mobile (PWA)](#sécurité-mobile)
9. [Plan de Réponse aux Incidents](#incident-response)
10. [Audit & Conformité](#audit-conformité)

---

## 1️⃣ Modèle de Menaces (Threat Model)

### Acteurs Malveillants Potentiels

#### A. Attaquants Externes
**Motivations**: Vol de données, fraude financière, déni de service
**Capacités**: Techniques avancées, automatisation, ressources importantes
**Cibles**:
- Base de données utilisateurs
- Système de paiement
- API endpoints

#### B. Utilisateurs Malveillants (Clients/Artisans)
**Motivations**: Fraude, escroquerie, contournement commissions
**Capacités**: Accès légitime au système
**Cibles**:
- Manipulation de prix
- Faux avis
- Usurpation d'identité

#### C. Insiders (Employés)
**Motivations**: Vol de données, sabotage, espionnage
**Capacités**: Accès privilégié, connaissance interne
**Cibles**:
- Données sensibles
- Backdoors
- Configuration système

#### D. Concurrents
**Motivations**: Espionnage industriel, sabotage
**Capacités**: Ressources importantes, ingénierie sociale
**Cibles**:
- Algorithmes propriétaires
- Base de données artisans
- Stratégie commerciale

---

## 2️⃣ OWASP Top 10 - Mitigation Complète

### A01:2021 – Broken Access Control

#### Vulnérabilités
```javascript
// ❌ MAUVAIS - Pas de vérification d'ownership
app.get('/api/missions/:id', (req, res) => {
  const mission = db.getMission(req.params.id);
  res.json(mission); // N'importe qui peut voir n'importe quelle mission
});

// ❌ MAUVAIS - IDOR (Insecure Direct Object Reference)
app.delete('/api/users/:id', (req, res) => {
  db.deleteUser(req.params.id); // Peut supprimer n'importe quel user
});
```

#### Solutions Implémentées
```typescript
// ✅ BON - Vérification d'ownership
app.get('/api/missions/:id', authenticateUser, async (req, res) => {
  const mission = await db.missions.findUnique({
    where: { id: req.params.id }
  });

  // Vérifier que l'utilisateur a le droit d'accéder à cette mission
  if (mission.clientId !== req.user.id && mission.artisanId !== req.user.id) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  res.json(mission);
});

// ✅ BON - UUIDs au lieu d'IDs séquentiels
// ID: "550e8400-e29b-41d4-a716-446655440000" au lieu de 1, 2, 3...

// ✅ Middleware de vérification des rôles
const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Rôle insuffisant' });
    }
    next();
  };
};

app.delete('/api/users/:id',
  authenticateUser,
  requireRole(['ADMIN']),
  deleteUser
);
```

#### Contrôles Additionnels
- ✅ Principe du moindre privilège (least privilege)
- ✅ Matrice de permissions (RBAC - Role-Based Access Control)
- ✅ Logs d'accès complets
- ✅ Rate limiting par endpoint
- ✅ Tests automatisés des permissions

---

### A02:2021 – Cryptographic Failures

#### Données Sensibles Identifiées
- Mots de passe
- Tokens de session
- Numéros de carte bancaire (tokenisés par Stripe)
- Coordonnées bancaires artisans (IBAN)
- Documents d'identité
- Données de géolocalisation

#### Protection Implémentée

```typescript
// ✅ Hashing de mots de passe (bcrypt avec salt)
import bcrypt from 'bcrypt';

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12; // Coût computationnel
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// ✅ Chiffrement des données sensibles at-rest
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = process.env.ENCRYPTION_KEY; // 32 bytes, stocké dans vault

const encrypt = (text: string): { encrypted: string; iv: string; tag: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
};

// ✅ Chiffrement en transit (TLS 1.3)
// Configuration NGINX
server {
  listen 443 ssl http2;
  ssl_protocols TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # HSTS (HTTP Strict Transport Security)
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}

// ✅ Secrets management
// Utilisation de AWS Secrets Manager / HashiCorp Vault
// JAMAIS de secrets en clair dans le code ou .env en production
```

#### Checklist Cryptographie
- ✅ Pas de MD5/SHA1 (obsolètes)
- ✅ Bcrypt/Argon2 pour mots de passe
- ✅ AES-256-GCM pour chiffrement symétrique
- ✅ RSA-2048+ pour chiffrement asymétrique
- ✅ TLS 1.3 minimum
- ✅ Certificats SSL valides (Let's Encrypt)
- ✅ Perfect Forward Secrecy (PFS)
- ✅ Rotation régulière des clés

---

### A03:2021 – Injection

#### Types d'Injection à Prévenir
1. SQL Injection
2. NoSQL Injection
3. Command Injection
4. LDAP Injection
5. XPath Injection

#### Exemples de Vulnérabilités

```javascript
// ❌ SQL Injection
const email = req.body.email;
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Attaque: email = "' OR '1'='1"

// ❌ NoSQL Injection (MongoDB)
db.users.find({ username: req.body.username, password: req.body.password });
// Attaque: { username: { $gt: "" }, password: { $gt: "" } }

// ❌ Command Injection
const filename = req.body.filename;
exec(`cat ${filename}`);
// Attaque: filename = "file.txt; rm -rf /"
```

#### Solutions Implémentées

```typescript
// ✅ Utilisation d'ORM avec requêtes préparées (Prisma)
const user = await prisma.user.findUnique({
  where: { email: email } // Automatiquement protégé
});

// ✅ Validation stricte avec Zod
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Mot de passe doit contenir majuscule, minuscule, chiffre et caractère spécial'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
});

const validateInput = (schema: z.ZodSchema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: error.errors });
    }
  };
};

app.post('/api/register', validateInput(UserSchema), registerUser);

// ✅ Sanitization des inputs
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';

const sanitizeInput = (input: string): string => {
  // Échapper HTML
  let clean = validator.escape(input);

  // Autoriser seulement certaines balises
  clean = sanitizeHtml(clean, {
    allowedTags: ['b', 'i', 'em', 'strong'],
    allowedAttributes: {}
  });

  return clean.trim();
};

// ✅ Pas de dynamic queries
// Toujours utiliser l'ORM ou des requêtes préparées
```

#### Contrôles Additionnels
- ✅ Whitelist plutôt que blacklist
- ✅ Principe de validation stricte (fail-safe)
- ✅ Pas d'exécution de commandes système (si possible)
- ✅ Sandboxing des opérations dangereuses
- ✅ WAF (Web Application Firewall) - CloudFlare

---

### A04:2021 – Insecure Design

#### Failles de Conception Évitées

**1. Récupération de Mot de Passe**
```typescript
// ❌ MAUVAIS - Envoi du mot de passe par email
// ❌ MAUVAIS - Question secrète prévisible

// ✅ BON - Token à usage unique
const generateResetToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 heure

  await prisma.passwordResetToken.create({
    data: {
      token: await bcrypt.hash(token, 10),
      userId,
      expiresAt: expires,
      used: false
    }
  });

  return token; // Envoyé par email (une seule fois)
};

// ✅ Lien de reset invalide après utilisation
const resetPassword = async (token: string, newPassword: string) => {
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      expiresAt: { gt: new Date() },
      used: false
    },
    include: { user: true }
  });

  if (!resetToken || !(await bcrypt.compare(token, resetToken.token))) {
    throw new Error('Token invalide ou expiré');
  }

  // Changer le mot de passe
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { password: await hashPassword(newPassword) }
  });

  // Marquer le token comme utilisé
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { used: true }
  });

  // Invalider toutes les sessions existantes
  await invalidateAllSessions(resetToken.userId);
};
```

**2. Rate Limiting & Throttling**
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// ✅ Rate limiting global
const globalLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: 'Trop de requêtes, réessayez plus tard'
});

// ✅ Rate limiting strict pour login
const loginLimiter = rateLimit({
  store: new RedisStore({ client: redis, prefix: 'login' }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentatives
  skipSuccessfulRequests: true, // Ne compte que les échecs
  handler: (req, res) => {
    res.status(429).json({
      error: 'Trop de tentatives de connexion. Compte temporairement bloqué.'
    });
  }
});

// ✅ Protection contre l'énumération de comptes
// Même réponse pour "email inexistant" et "mot de passe incorrect"
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Toujours faire le bcrypt.compare même si user n'existe pas
  // Pour éviter timing attacks
  const hashedPassword = user?.password || await bcrypt.hash('dummy', 10);
  const isValid = await bcrypt.compare(password, hashedPassword);

  if (!user || !isValid) {
    // Même message générique
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  // Générer session...
};
```

**3. Système de Paiement Sécurisé**
```typescript
// ✅ Architecture Escrow (séquestre)
/*
Flow:
1. Client accepte prix → Paiement → Plateforme (hold)
2. Artisan effectue travail
3. Client valide → Fonds libérés vers artisan
4. Si litige → Médiation admin → Décision
*/

const processMissionPayment = async (missionId: string, clientId: string) => {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { artisan: true }
  });

  // ✅ Vérification d'ownership
  if (mission.clientId !== clientId) {
    throw new Error('Non autorisé');
  }

  // ✅ Vérification état
  if (mission.status !== 'AGREED') {
    throw new Error('Mission doit être acceptée');
  }

  // ✅ Création PaymentIntent Stripe avec hold
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(mission.totalAmount * 100), // En centimes
    currency: 'eur',
    customer: mission.client.stripeCustomerId,
    payment_method: mission.client.defaultPaymentMethod,
    confirm: true,
    capture_method: 'manual', // ⚠️ Important: hold manuel
    metadata: {
      missionId: mission.id,
      artisanId: mission.artisanId,
      type: 'mission_payment'
    }
  });

  // ✅ Enregistrer transaction
  await prisma.transaction.create({
    data: {
      missionId,
      stripePaymentIntentId: paymentIntent.id,
      amount: mission.totalAmount,
      status: 'HELD',
      type: 'MISSION'
    }
  });

  // Mission passe à PAID
  await prisma.mission.update({
    where: { id: missionId },
    data: { status: 'PAID', paidAt: new Date() }
  });
};

// ✅ Libération des fonds après validation
const completeMission = async (missionId: string, clientId: string) => {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { transaction: true, artisan: true }
  });

  if (mission.clientId !== clientId) throw new Error('Non autorisé');

  // ✅ Capture du paiement (48h après validation pour rétractation)
  await scheduleJob(new Date(Date.now() + 48 * 3600 * 1000), async () => {
    // Capturer le paiement
    await stripe.paymentIntents.capture(mission.transaction.stripePaymentIntentId);

    // Calculer commission
    const commission = mission.totalAmount * 0.12; // 12%
    const artisanAmount = mission.totalAmount - commission;

    // Transfer vers artisan via Stripe Connect
    await stripe.transfers.create({
      amount: Math.round(artisanAmount * 100),
      currency: 'eur',
      destination: mission.artisan.stripeAccountId,
      metadata: { missionId: mission.id }
    });

    // Mise à jour
    await prisma.mission.update({
      where: { id: missionId },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
  });
};
```

---

### A05:2021 – Security Misconfiguration

#### Configurations Sécurisées

**1. Headers de Sécurité**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  hidePoweredBy: true
}));

// ✅ CORS strict
import cors from 'cors';

const allowedOrigins = [
  'https://articonnect.com',
  'https://www.articonnect.com',
  'https://app.articonnect.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**2. Variables d'Environnement**
```bash
# ✅ .env (JAMAIS commité dans git)
DATABASE_URL="postgresql://user:pass@localhost:5432/articonnect"
JWT_SECRET="random-256-bit-secret-generated-by-crypto"
ENCRYPTION_KEY="32-bytes-hex-key-for-aes-256"
STRIPE_SECRET_KEY="sk_live_..."
REDIS_URL="redis://localhost:6379"

# ✅ Production: Utiliser AWS Secrets Manager
```

```typescript
// ✅ Validation des variables d'environnement au démarrage
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
});

const env = EnvSchema.parse(process.env);

export default env;
```

**3. Gestion des Erreurs**
```typescript
// ❌ MAUVAIS - Exposition d'informations sensibles
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack }); // ⚠️ Expose le code
});

// ✅ BON - Logs détaillés côté serveur, message générique côté client
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use((err, req, res, next) => {
  // Log complet côté serveur
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // Message générique côté client (production)
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Une erreur est survenue. Veuillez réessayer plus tard.',
      requestId: req.id // Pour le support
    });
  } else {
    // En développement, plus de détails
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});
```

---

### A06:2021 – Vulnerable and Outdated Components

#### Gestion des Dépendances

```json
// package.json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "outdated": "npm outdated"
  },
  "devDependencies": {
    "npm-check-updates": "^16.0.0"
  }
}
```

```bash
# ✅ Scan automatique des vulnérabilités (CI/CD)
# GitHub Actions
name: Security Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=high
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

#### Outils de Monitoring
- ✅ **Dependabot** (GitHub) - Mise à jour automatique
- ✅ **Snyk** - Scan de vulnérabilités
- ✅ **npm audit** - Audit régulier
- ✅ **OWASP Dependency-Check** - Analyse profonde

#### Politique de Mise à Jour
- ✅ Patchs de sécurité: < 24h
- ✅ Mises à jour mineures: Hebdomadaire
- ✅ Mises à jour majeures: Tests + déploiement mensuel
- ✅ Versions LTS privilégiées

---

### A07:2021 – Identification and Authentication Failures

#### Implémentation JWT Sécurisée

```typescript
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

// ✅ Access Token courte durée
const generateAccessToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: uuidv4() // Pour invalidation
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15m', // ⚠️ Courte durée
    issuer: 'articonnect',
    audience: 'articonnect-api'
  });
};

// ✅ Refresh Token longue durée (stocké en DB)
const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(64).toString('hex');
  const hashedToken = await bcrypt.hash(token, 10);

  await prisma.refreshToken.create({
    data: {
      token: hashedToken,
      userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 jours
      deviceInfo: req.headers['user-agent']
    }
  });

  return token;
};

// ✅ Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'articonnect',
      audience: 'articonnect-api'
    }) as TokenPayload;

    // Vérifier que la session n'a pas été révoquée
    const sessionValid = await redis.get(`session:${payload.sessionId}`);
    if (!sessionValid) {
      return res.status(401).json({ error: 'Session invalide' });
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expiré', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// ✅ Refresh endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token manquant' });
  }

  // Trouver le token en DB
  const tokens = await prisma.refreshToken.findMany({
    where: {
      expiresAt: { gt: new Date() },
      revoked: false
    },
    include: { user: true }
  });

  // Comparer avec bcrypt
  let validToken = null;
  for (const t of tokens) {
    if (await bcrypt.compare(refreshToken, t.token)) {
      validToken = t;
      break;
    }
  }

  if (!validToken) {
    return res.status(403).json({ error: 'Refresh token invalide' });
  }

  // Générer nouveaux tokens
  const accessToken = generateAccessToken(validToken.user);
  const newRefreshToken = await generateRefreshToken(validToken.user.id);

  // Révoquer l'ancien refresh token (rotation)
  await prisma.refreshToken.update({
    where: { id: validToken.id },
    data: { revoked: true }
  });

  res.json({ accessToken, refreshToken: newRefreshToken });
});
```

#### 2FA (Two-Factor Authentication)

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// ✅ Activation 2FA
app.post('/api/auth/2fa/enable', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId }
  });

  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: '2FA déjà activé' });
  }

  // Générer secret
  const secret = speakeasy.generateSecret({
    name: `ArtiConnect (${user.email})`,
    issuer: 'ArtiConnect'
  });

  // Générer QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  // Stocker temporairement (confirmation nécessaire)
  await redis.setex(
    `2fa:setup:${user.id}`,
    600, // 10 minutes
    secret.base32
  );

  res.json({
    secret: secret.base32,
    qrCode: qrCodeUrl
  });
});

// ✅ Confirmation 2FA
app.post('/api/auth/2fa/confirm', authenticateToken, async (req, res) => {
  const { token } = req.body;

  const secret = await redis.get(`2fa:setup:${req.user.userId}`);
  if (!secret) {
    return res.status(400).json({ error: 'Setup expiré' });
  }

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2 // Tolérance de ±2 intervalles (60s)
  });

  if (!verified) {
    return res.status(400).json({ error: 'Code invalide' });
  }

  // Activer 2FA
  await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      twoFactorSecret: await encrypt(secret),
      twoFactorEnabled: true
    }
  });

  // Générer codes de backup
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex')
  );

  await prisma.backupCode.createMany({
    data: backupCodes.map(code => ({
      userId: req.user.userId,
      code: await bcrypt.hash(code, 10)
    }))
  });

  res.json({
    success: true,
    backupCodes // Afficher UNE SEULE FOIS
  });
});

// ✅ Login avec 2FA
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password, twoFactorToken } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  // Si 2FA activé
  if (user.twoFactorEnabled) {
    if (!twoFactorToken) {
      return res.status(200).json({
        requires2FA: true,
        tempToken: generateTempToken(user.id) // Token temporaire pour 2FA
      });
    }

    // Vérifier code 2FA
    const secret = await decrypt(user.twoFactorSecret);
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: twoFactorToken,
      window: 2
    });

    if (!verified) {
      // Essayer avec backup codes
      const backupCodes = await prisma.backupCode.findMany({
        where: { userId: user.id, used: false }
      });

      let validBackup = false;
      for (const bc of backupCodes) {
        if (await bcrypt.compare(twoFactorToken, bc.code)) {
          await prisma.backupCode.update({
            where: { id: bc.id },
            data: { used: true, usedAt: new Date() }
          });
          validBackup = true;
          break;
        }
      }

      if (!validBackup) {
        return res.status(401).json({ error: 'Code 2FA invalide' });
      }
    }
  }

  // Générer tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  res.json({ accessToken, refreshToken });
});
```

---

### A08:2021 – Software and Data Integrity Failures

#### Vérification de l'Intégrité

```typescript
// ✅ Signature des données critiques (prix négociés)
import crypto from 'crypto';

const signData = (data: any): string => {
  const hmac = crypto.createHmac('sha256', process.env.SIGNING_SECRET);
  hmac.update(JSON.stringify(data));
  return hmac.digest('hex');
};

const verifySignature = (data: any, signature: string): boolean => {
  const expectedSignature = signData(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// ✅ Application: Négociation de prix
app.post('/api/missions/:id/accept-price', authenticateToken, async (req, res) => {
  const { price, signature } = req.body;

  const missionId = req.params.id;

  // Vérifier signature
  const dataToSign = { missionId, price, timestamp: req.body.timestamp };
  if (!verifySignature(dataToSign, signature)) {
    return res.status(400).json({ error: 'Signature invalide - prix possiblement manipulé' });
  }

  // Vérifier que timestamp est récent (< 5 min)
  const age = Date.now() - req.body.timestamp;
  if (age > 5 * 60 * 1000) {
    return res.status(400).json({ error: 'Requête expirée' });
  }

  // Procéder avec la mise à jour
  await prisma.mission.update({
    where: { id: missionId },
    data: { agreedPrice: price, status: 'AGREED' }
  });

  res.json({ success: true });
});

// ✅ Frontend: Signature avant envoi
const acceptPrice = async (missionId: string, price: number) => {
  const timestamp = Date.now();
  const dataToSign = { missionId, price, timestamp };

  // Obtenir signature du backend (endpoint dédié)
  const { signature } = await fetch('/api/signatures/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataToSign)
  }).then(r => r.json());

  // Envoyer avec signature
  await fetch(`/api/missions/${missionId}/accept-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price, signature, timestamp })
  });
};
```

#### Intégrité des Dépendances

```json
// package.json
{
  "scripts": {
    "preinstall": "npm run verify-lockfile",
    "verify-lockfile": "lockfile-lint --path package-lock.json --validate-https --allowed-hosts npm"
  },
  "devDependencies": {
    "lockfile-lint": "^4.10.0"
  }
}
```

---

### A09:2021 – Security Logging and Monitoring Failures

#### Logging Complet

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'articonnect-api' },
  transports: [
    // Erreurs
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),

    // Tous les logs
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),

    // Logs de sécurité (authentification, accès, etc.)
    new DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '90d', // Rétention plus longue
      zippedArchive: true
    })
  ]
});

// Console en développement
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// ✅ Middleware de logging des requêtes
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info({
      type: 'http_request',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.userId,
      requestId: req.id
    });

    // Alertes sur erreurs
    if (res.statusCode >= 500) {
      logger.error({
        type: 'http_error',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        userId: req.user?.userId
      });
    }
  });

  next();
});

// ✅ Events de sécurité à logger
const logSecurityEvent = (event: string, details: any) => {
  logger.warn({
    type: 'security_event',
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Exemples d'utilisation
// Login réussi
logSecurityEvent('login_success', {
  userId: user.id,
  email: user.email,
  ip: req.ip
});

// Login échoué
logSecurityEvent('login_failed', {
  email: req.body.email,
  ip: req.ip,
  reason: 'invalid_credentials'
});

// Accès refusé
logSecurityEvent('access_denied', {
  userId: req.user?.id,
  resource: req.url,
  reason: 'insufficient_permissions'
});

// Changement de mot de passe
logSecurityEvent('password_changed', {
  userId: user.id,
  ip: req.ip
});

// 2FA activé/désactivé
logSecurityEvent('2fa_enabled', {
  userId: user.id
});

// Données sensibles accédées
logSecurityEvent('sensitive_data_access', {
  userId: req.user.id,
  dataType: 'payment_info',
  targetUserId: targetUser.id
});
```

#### Monitoring & Alerting

```typescript
// ✅ Intégration Sentry (Erreurs & Performance)
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% des transactions
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
    new Tracing.Integrations.Prisma({ client: prisma })
  ],
  beforeSend(event, hint) {
    // Ne pas envoyer de données sensibles
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['authorization'];
      }
    }
    return event;
  }
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... routes ...

app.use(Sentry.Handlers.errorHandler());

// ✅ Alertes personnalisées
const checkSecurityMetrics = async () => {
  // Vérifier taux d'échecs login
  const failedLogins = await redis.get('metrics:failed_logins:last_hour');
  if (parseInt(failedLogins) > 100) {
    Sentry.captureMessage('Unusual number of failed logins', {
      level: 'warning',
      extra: { count: failedLogins }
    });

    // Notifier équipe sécurité
    await sendSlackAlert({
      channel: '#security',
      message: `⚠️ ${failedLogins} tentatives de connexion échouées dans la dernière heure`
    });
  }

  // Vérifier erreurs 500
  const serverErrors = await redis.get('metrics:5xx_errors:last_hour');
  if (parseInt(serverErrors) > 50) {
    Sentry.captureMessage('High rate of server errors', {
      level: 'error',
      extra: { count: serverErrors }
    });
  }
};

// Exécuter toutes les 5 minutes
setInterval(checkSecurityMetrics, 5 * 60 * 1000);
```

---

### A10:2021 – Server-Side Request Forgery (SSRF)

#### Protection SSRF

```typescript
import axios from 'axios';
import { isIP } from 'net';
import dns from 'dns/promises';

// ✅ Validation stricte des URLs
const isSafeURL = async (url: string): Promise<boolean> => {
  try {
    const parsed = new URL(url);

    // ❌ Bloquer protocoles dangereux
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // ❌ Bloquer IPs privées
    const hostname = parsed.hostname;

    // Résoudre DNS
    const addresses = await dns.resolve4(hostname).catch(() => []);

    for (const addr of addresses) {
      // Bloquer plages privées
      if (
        addr.startsWith('10.') ||
        addr.startsWith('192.168.') ||
        addr.startsWith('172.16.') || // 172.16.0.0 - 172.31.255.255
        addr === '127.0.0.1' ||
        addr === 'localhost' ||
        addr.startsWith('169.254.') // Link-local
      ) {
        return false;
      }
    }

    // ❌ Bloquer metadata endpoints cloud
    const blockedHosts = [
      '169.254.169.254', // AWS, Azure, GCP metadata
      'metadata.google.internal',
      '127.0.0.1',
      'localhost'
    ];

    if (blockedHosts.includes(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

// ✅ Fetch sécurisé
const safeFetch = async (url: string): Promise<any> => {
  // Valider URL
  if (!(await isSafeURL(url))) {
    throw new Error('URL non autorisée');
  }

  // Fetch avec timeout et size limit
  const response = await axios.get(url, {
    timeout: 5000, // 5s max
    maxContentLength: 1024 * 1024, // 1MB max
    maxRedirects: 0, // Pas de redirections
    validateStatus: (status) => status === 200
  });

  return response.data;
};

// Exemple: Webhook utilisateur
app.post('/api/webhooks/register', authenticateToken, async (req, res) => {
  const { url } = req.body;

  if (!(await isSafeURL(url))) {
    return res.status(400).json({
      error: 'URL de webhook non autorisée (IP privée ou protocole invalide)'
    });
  }

  // Enregistrer webhook...
  await prisma.webhook.create({
    data: {
      userId: req.user.userId,
      url,
      events: req.body.events
    }
  });

  res.json({ success: true });
});
```

---

## 3️⃣ Protection des Données RGPD

### Principes Implémentés

#### 1. Minimisation des Données
```typescript
// ✅ Collecter uniquement ce qui est nécessaire
interface ClientProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  // ❌ PAS de: date de naissance, SSN, etc. (sauf si absolument nécessaire)
}

interface ArtisanProfile extends ClientProfile {
  companyName: string;
  siret: string; // Obligatoire pour facturation
  address: string;
  specialties: string[];
  // TVA number stocké chiffré
}
```

#### 2. Consentement Granulaire
```typescript
interface UserConsents {
  userId: string;
  marketing: boolean; // Newsletters
  analytics: boolean; // Google Analytics
  geolocation: boolean; // Suivi position
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  dataSharing: boolean; // Partage avec partenaires
  consentDate: Date;
  ipAddress: string; // Preuve du consentement
}

// ✅ Demande de consentement explicite
app.post('/api/users/consents', authenticateToken, async (req, res) => {
  const consents = req.body;

  await prisma.userConsent.upsert({
    where: { userId: req.user.userId },
    update: {
      ...consents,
      consentDate: new Date(),
      ipAddress: req.ip
    },
    create: {
      userId: req.user.userId,
      ...consents,
      ipAddress: req.ip
    }
  });

  res.json({ success: true });
});
```

#### 3. Droit à la Portabilité
```typescript
// ✅ Export des données utilisateur (format JSON)
app.get('/api/users/export', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  // Collecter toutes les données
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      missions: true,
      reviews: true,
      messages: true,
      products: true,
      transactions: true,
      consents: true
    }
  });

  // Anonymiser données sensibles
  const exportData = {
    profile: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt
    },
    missions: user.missions.map(m => ({
      id: m.id,
      description: m.description,
      price: m.agreedPrice,
      status: m.status,
      createdAt: m.createdAt
    })),
    reviews: user.reviews,
    // ... autres données
  };

  // Générer fichier JSON
  res.setHeader('Content-Disposition', 'attachment; filename=articonnect-data.json');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(exportData, null, 2));
});
```

#### 4. Droit à l'Oubli
```typescript
// ✅ Suppression complète des données
app.delete('/api/users/account', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  // Vérifier qu'il n'y a pas de missions en cours
  const activeMissions = await prisma.mission.count({
    where: {
      OR: [
        { clientId: userId },
        { artisanId: userId }
      ],
      status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] }
    }
  });

  if (activeMissions > 0) {
    return res.status(400).json({
      error: 'Impossible de supprimer le compte avec des missions en cours'
    });
  }

  // Anonymiser plutôt que supprimer (pour garder historique transactionnel - obligation légale)
  await prisma.$transaction([
    // Anonymiser données personnelles
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@articonnect.com`,
        firstName: '[Supprimé]',
        lastName: '[Supprimé]',
        phone: null,
        password: null,
        deleted: true,
        deletedAt: new Date()
      }
    }),

    // Supprimer données non-essentielles
    prisma.message.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] }}),
    prisma.savedArtisan.deleteMany({ where: { clientId: userId } }),
    prisma.notification.deleteMany({ where: { userId } }),

    // Garder transactions (obligation comptable 10 ans)
    // Mais anonymiser
    prisma.mission.updateMany({
      where: { clientId: userId },
      data: { clientDeleted: true }
    }),

    // Supprimer fichiers S3
    // (à implémenter séparément)
  ]);

  // Invalider toutes les sessions
  await invalidateAllSessions(userId);

  res.json({ success: true, message: 'Compte supprimé' });
});
```

#### 5. Durée de Conservation
```typescript
// ✅ Purge automatique des données (CRON job)
const purgeOldData = async () => {
  const now = new Date();

  // Supprimer logs > 90 jours
  const logRetentionDate = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
  await prisma.log.deleteMany({
    where: { createdAt: { lt: logRetentionDate } }
  });

  // Supprimer reset tokens expirés
  await prisma.passwordResetToken.deleteMany({
    where: { expiresAt: { lt: now } }
  });

  // Supprimer refresh tokens expirés
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: now } }
  });

  // Anonymiser comptes inactifs > 3 ans
  const inactivityDate = new Date(now.getTime() - 3 * 365 * 24 * 3600 * 1000);
  await prisma.user.updateMany({
    where: {
      lastLoginAt: { lt: inactivityDate },
      deleted: false
    },
    data: {
      email: null,
      phone: null,
      inactive: true
    }
  });

  logger.info('Purge automatique des données effectuée');
};

// Exécuter tous les jours à 3h du matin
cron.schedule('0 3 * * *', purgeOldData);
```

---

## 4️⃣ Plan de Réponse aux Incidents

### Phases de Réponse

#### 1. Détection
- ✅ Monitoring 24/7 (Sentry, DataDog)
- ✅ Alertes automatiques (Slack, PagerDuty)
- ✅ Analyse des logs en temps réel
- ✅ Signalements utilisateurs

#### 2. Analyse
```
[Incident Détecté]
    ↓
[Vérification & Classification]
    ├─ Critique (données compromises)
    ├─ Majeur (service impacté)
    ├─ Mineur (bug non-critique)
    └─ Fausse alerte
    ↓
[Investigation]
    ├─ Scope: Quelles données ?
    ├─ Impact: Combien d'utilisateurs ?
    ├─ Cause: Comment c'est arrivé ?
    └─ Timeline: Depuis quand ?
```

#### 3. Containment (Confinement)
```typescript
// ✅ Actions immédiates selon le type d'incident

// Exemple: Détection de login suspects
const containSuspiciousActivity = async (userId: string) => {
  // 1. Bloquer le compte temporairement
  await prisma.user.update({
    where: { id: userId },
    data: { locked: true, lockedReason: 'SUSPICIOUS_ACTIVITY' }
  });

  // 2. Invalider toutes les sessions
  await invalidateAllSessions(userId);

  // 3. Notifier l'utilisateur
  await sendEmail({
    to: user.email,
    subject: 'Activité suspecte détectée',
    template: 'security-alert',
    data: {
      message: 'Nous avons détecté une activité suspecte sur votre compte...'
    }
  });

  // 4. Alerter équipe sécurité
  await sendSlackAlert({
    channel: '#security-incidents',
    message: `🚨 Compte ${userId} bloqué pour activité suspecte`
  });

  logger.warn({
    type: 'security_incident',
    action: 'account_locked',
    userId,
    reason: 'suspicious_activity'
  });
};

// Exemple: Data breach détecté
const handleDataBreach = async (affectedUserIds: string[]) => {
  // 1. Notification CNIL (72h - RGPD)
  await notifyCNIL({
    incidentType: 'data_breach',
    affectedUsers: affectedUserIds.length,
    dataTypes: ['email', 'phone'],
    mitigationActions: '...'
  });

  // 2. Notification utilisateurs
  for (const userId of affectedUserIds) {
    await sendEmail({
      to: user.email,
      subject: 'Important: Incident de sécurité',
      template: 'data-breach-notification'
    });
  }

  // 3. Forcer reset password
  await prisma.user.updateMany({
    where: { id: { in: affectedUserIds } },
    data: { mustResetPassword: true }
  });

  // 4. Communication publique (si > 500 utilisateurs)
  if (affectedUserIds.length > 500) {
    await publishSecurityBulletin({
      title: 'Incident de sécurité',
      content: '...'
    });
  }
};
```

#### 4. Eradication
- ✅ Patcher la vulnérabilité
- ✅ Déploiement d'urgence
- ✅ Vérification complète

#### 5. Recovery
- ✅ Restauration du service
- ✅ Vérification de l'intégrité des données
- ✅ Déblocage progressif des utilisateurs

#### 6. Lessons Learned
- ✅ Post-mortem détaillé
- ✅ Mise à jour des procédures
- ✅ Formation équipe
- ✅ Amélioration monitoring

---

## 5️⃣ Checklist de Sécurité Pré-Production

### Infrastructure
- [ ] HTTPS avec certificat valide (Let's Encrypt)
- [ ] Firewall configuré (ports 80, 443 uniquement)
- [ ] SSH key-based auth (pas de password)
- [ ] Fail2ban installé et configuré
- [ ] Backups automatiques quotidiens (chiffrés)
- [ ] Disaster Recovery Plan testé
- [ ] CDN configuré (CloudFlare)
- [ ] WAF activé
- [ ] DDoS protection

### Application
- [ ] Toutes les dépendances à jour
- [ ] Audit de sécurité npm/yarn passé
- [ ] Variables d'environnement dans vault
- [ ] Pas de secrets en clair dans le code
- [ ] Logs de sécurité activés
- [ ] Rate limiting sur tous les endpoints
- [ ] CORS configuré strictement
- [ ] Headers de sécurité (helmet)
- [ ] Validation de tous les inputs
- [ ] ORM avec requêtes préparées
- [ ] Chiffrement at-rest et in-transit
- [ ] JWT avec expiration courte
- [ ] 2FA pour artisans et admins
- [ ] RBAC implémenté
- [ ] Tests de sécurité automatisés

### Base de Données
- [ ] Accès par IP whitelist uniquement
- [ ] Credentials rotés régulièrement
- [ ] Principe du moindre privilège
- [ ] Backups chiffrés
- [ ] Monitoring des requêtes lentes
- [ ] Audit logs activés

### Monitoring
- [ ] Sentry configuré
- [ ] Logs centralisés (ELK/DataDog)
- [ ] Alertes configurées
- [ ] Uptime monitoring (Pingdom)
- [ ] Performance monitoring (APM)

### Conformité
- [ ] CGU/CGV validées juridiquement
- [ ] Politique de confidentialité conforme RGPD
- [ ] Cookie banner implémenté
- [ ] Consentements granulaires
- [ ] Export de données fonctionnel
- [ ] Suppression de compte fonctionnelle
- [ ] DPO désigné
- [ ] Registre des traitements à jour
- [ ] DPIA (Data Protection Impact Assessment) réalisée

### Tests de Sécurité
- [ ] Pentest externe réalisé
- [ ] OWASP ZAP scan passé
- [ ] Tests d'injection (SQL, XSS, etc.)
- [ ] Tests de broken access control
- [ ] Tests de brute force
- [ ] Scan de vulnérabilités (Nessus)
- [ ] Code review sécurité

---

## 📞 Contacts Sécurité

**Security Team**: security@articonnect.com
**Bug Bounty**: hackers@articonnect.com
**DPO**: dpo@articonnect.com
**Incident Response**: incidents@articonnect.com (24/7)

---

**Version**: 1.0
**Dernière mise à jour**: 2025-11-07
**Prochaine revue**: Trimestrielle
