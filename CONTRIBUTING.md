# Guide de Contribution - ArtiConnect

Merci de votre intérêt pour contribuer à ArtiConnect ! Ce document explique comment contribuer au projet.

## 📋 Table des Matières

1. [Code de Conduite](#code-de-conduite)
2. [Comment Contribuer](#comment-contribuer)
3. [Processus de Développement](#processus-de-développement)
4. [Standards de Code](#standards-de-code)
5. [Tests](#tests)
6. [Documentation](#documentation)

---

## Code de Conduite

### Notre Engagement

Nous nous engageons à faire de la participation à ce projet une expérience exempte de harcèlement pour tout le monde, indépendamment de l'âge, de la taille, du handicap, de l'origine ethnique, de l'identité de genre, du niveau d'expérience, de la nationalité, de l'apparence personnelle, de la race, de la religion ou de l'identité et orientation sexuelle.

### Standards

**Comportements encouragés:**
- Utiliser un langage accueillant et inclusif
- Respecter les points de vue et expériences différents
- Accepter gracieusement les critiques constructives
- Se concentrer sur ce qui est meilleur pour la communauté
- Faire preuve d'empathie envers les autres membres

**Comportements inacceptables:**
- Utilisation de langage ou d'images sexualisés
- Trolling, commentaires insultants ou dérogatoires
- Harcèlement public ou privé
- Publication d'informations privées sans permission
- Tout autre comportement inapproprié en contexte professionnel

---

## Comment Contribuer

### Signaler un Bug

1. Vérifier que le bug n'a pas déjà été signalé dans les [Issues](https://github.com/articonnect/articonnect/issues)
2. Créer une nouvelle issue en utilisant le template "Bug Report"
3. Inclure:
   - Description claire du problème
   - Steps to reproduce
   - Comportement attendu vs actuel
   - Screenshots si applicable
   - Environnement (OS, navigateur, version Node.js)

### Proposer une Fonctionnalité

1. Créer une issue avec le template "Feature Request"
2. Décrire:
   - Le problème que la fonctionnalité résout
   - La solution proposée
   - Des alternatives considérées
   - Impact sur les utilisateurs existants

### Soumettre une Pull Request

1. **Fork** le repository
2. **Créer une branche** depuis `develop`:
   ```bash
   git checkout -b feature/ma-nouvelle-fonctionnalite
   ```
3. **Développer** votre fonctionnalité
4. **Tester** localement
5. **Commit** avec des messages clairs:
   ```bash
   git commit -m "feat: ajout de la fonctionnalité X"
   ```
6. **Push** vers votre fork:
   ```bash
   git push origin feature/ma-nouvelle-fonctionnalite
   ```
7. **Ouvrir une Pull Request** vers `develop`

---

## Processus de Développement

### Branches

- `main` - Production (stable)
- `develop` - Développement (intégration)
- `feature/*` - Nouvelles fonctionnalités
- `bugfix/*` - Corrections de bugs
- `hotfix/*` - Corrections urgentes en production

### Workflow Git

```
1. develop ← feature/nouvelle-fonctionnalite
2. Tests passent ✅
3. Code review ✅
4. Merge dans develop
5. develop → staging (tests additionnels)
6. staging → main (release)
```

---

## Standards de Code

### TypeScript/JavaScript

```typescript
// ✅ BON
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

const getUserById = async (id: string): Promise<User> => {
  return await prisma.user.findUnique({ where: { id } });
};

// ❌ MAUVAIS
const get_user = async (i) => {
  return await prisma.user.findUnique({ where: { id: i } });
};
```

### Conventions de Nommage

**Variables & Functions**: `camelCase`
```typescript
const userName = 'John';
function getUserData() {}
```

**Classes & Interfaces**: `PascalCase`
```typescript
class UserService {}
interface UserProfile {}
```

**Constants**: `UPPER_SNAKE_CASE`
```typescript
const MAX_LOGIN_ATTEMPTS = 5;
```

**Fichiers**:
- Components: `PascalCase.tsx` (ex: `UserCard.tsx`)
- Utilities: `camelCase.ts` (ex: `formatDate.ts`)
- Modules: `kebab-case.ts` (ex: `user-service.ts`)

### ESLint & Prettier

Le projet utilise ESLint et Prettier. Avant de commit:

```bash
# Backend
cd backend/api-gateway
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
npm run format
```

---

## Tests

### Backend (NestJS)

```typescript
// user.service.spec.ts
describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, PrismaService],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should get user by id', async () => {
    const user = { id: '1', email: 'test@example.com' };
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(user);

    expect(await service.getById('1')).toEqual(user);
  });
});
```

### Frontend (React)

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Lancer les Tests

```bash
# Backend
cd backend/api-gateway
npm run test           # Tests unitaires
npm run test:e2e       # Tests E2E
npm run test:cov       # Coverage

# Frontend
cd frontend
npm run test
npm run test:watch
```

### Coverage Minimum

- Lignes: 80%
- Branches: 75%
- Functions: 80%
- Statements: 80%

---

## Documentation

### Code Comments

```typescript
/**
 * Crée un nouvel utilisateur dans la base de données
 *
 * @param data - Les données de l'utilisateur à créer
 * @returns L'utilisateur créé avec son ID
 * @throws {ConflictException} Si l'email existe déjà
 *
 * @example
 * ```typescript
 * const user = await createUser({
 *   email: 'john@example.com',
 *   password: 'securePassword123',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 * ```
 */
async createUser(data: CreateUserDto): Promise<User> {
  // Implementation
}
```

### README

Chaque module important doit avoir un README expliquant:
- Purpose
- Installation
- Usage
- API (si applicable)
- Examples

---

## Pull Request Checklist

Avant de soumettre votre PR, vérifiez que:

- [ ] Le code compile sans erreurs
- [ ] Les tests passent (`npm test`)
- [ ] Le linting passe (`npm run lint`)
- [ ] La documentation est à jour
- [ ] Les commits suivent la convention:
  - `feat:` nouvelle fonctionnalité
  - `fix:` correction de bug
  - `docs:` documentation seulement
  - `style:` formatage, point-virgules manquants, etc.
  - `refactor:` refactoring du code
  - `test:` ajout de tests
  - `chore:` maintenance (dépendances, config, etc.)
- [ ] La PR a une description claire
- [ ] Les breaking changes sont documentés
- [ ] Les screenshots sont inclus (si UI)

---

## Code Review

### Pour les Reviewers

Vérifier:
1. **Fonctionnalité**: Le code fait ce qu'il est censé faire
2. **Tests**: Coverage adéquat
3. **Sécurité**: Pas de vulnérabilités évidentes
4. **Performance**: Pas de problèmes de performance
5. **Style**: Respect des conventions
6. **Documentation**: Commentaires et docs à jour

### Feedback Constructif

✅ **BON**:
> "Cette fonction pourrait bénéficier d'un early return pour améliorer la lisibilité. Par exemple:
> ```typescript
> if (!user) return null;
> ```
> Qu'en penses-tu?"

❌ **MAUVAIS**:
> "Ce code est nul, refais-le."

---

## Questions?

- **Slack**: #articonnect-dev
- **Email**: dev@articonnect.com
- **Issues**: Pour les questions techniques

---

## Remerciements

Merci à tous les contributeurs qui aident à améliorer ArtiConnect ! 🙏

---

**Version**: 1.0
**Dernière mise à jour**: 2025-11-07
