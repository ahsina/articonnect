import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;

  beforeEach(async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailTemplateService],
    }).compile();

    service = module.get<EmailTemplateService>(EmailTemplateService);
  });

  describe('welcomeClient', () => {
    it('should generate welcome email for client', () => {
      const result = service.welcomeClient('John', 'john@example.com');

      expect(result.subject).toBe('Bienvenue sur ArtiConnect !');
      expect(result.html).toContain('John');
      expect(result.html).toContain('john@example.com');
      expect(result.html).toContain('client/dashboard');
      expect(result.text).toContain('John');
    });

    it('should include proper HTML structure', () => {
      const result = service.welcomeClient('Jane', 'jane@example.com');

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html');
      expect(result.html).toContain('ArtiConnect');
      expect(result.html).toContain('</html>');
    });
  });

  describe('welcomeArtisan', () => {
    it('should generate welcome email for artisan', () => {
      const result = service.welcomeArtisan(
        'Pierre',
        'Pierre Plomberie',
        'pierre@example.com',
      );

      expect(result.subject).toContain('profil artisan');
      expect(result.html).toContain('Pierre');
      expect(result.html).toContain('Pierre Plomberie');
      expect(result.html).toContain('pierre@example.com');
      expect(result.html).toContain('artisan/dashboard');
    });

    it('should include artisan-specific instructions', () => {
      const result = service.welcomeArtisan('Test', 'Test Co', 'test@test.com');

      expect(result.html).toContain('certifications');
      expect(result.html).toContain('portfolio');
      expect(result.html).toContain('disponibilités');
    });
  });

  describe('missionCreated', () => {
    it('should generate mission created email', () => {
      const result = service.missionCreated(
        'John',
        'Fix Plumbing',
        'mission-123',
        250,
        'Plomberie',
      );

      expect(result.subject).toContain('Fix Plumbing');
      expect(result.html).toContain('John');
      expect(result.html).toContain('Fix Plumbing');
      expect(result.html).toContain('250€');
      expect(result.html).toContain('Plomberie');
      expect(result.html).toContain('mission-123');
    });

    it('should include mission tracking link', () => {
      const result = service.missionCreated('Test', 'Test', 'abc123', 100, 'Test');

      expect(result.html).toContain('/client/missions/abc123');
    });
  });

  describe('newMissionAvailable', () => {
    it('should generate new mission notification for artisan', () => {
      const result = service.newMissionAvailable(
        'Pierre',
        'Fix Sink',
        'mission-456',
        300,
        5.2,
        'Plomberie',
      );

      expect(result.subject).toContain('Fix Sink');
      expect(result.subject).toContain('5.2 km');
      expect(result.html).toContain('Pierre');
      expect(result.html).toContain('300€');
      expect(result.html).toContain('5.2 km');
    });

    it('should include urgency message', () => {
      const result = service.newMissionAvailable(
        'Test',
        'Test',
        'test',
        100,
        3,
        'Test',
      );

      expect(result.html).toContain('répondent rapidement');
    });
  });

  describe('missionAccepted', () => {
    it('should generate mission accepted notification', () => {
      const result = service.missionAccepted(
        'John',
        'Pierre Artisan',
        'Fix Plumbing',
        'mission-123',
        '15 janvier 2025 à 10h00',
      );

      expect(result.subject).toContain('Pierre Artisan');
      expect(result.html).toContain('John');
      expect(result.html).toContain('Pierre Artisan');
      expect(result.html).toContain('15 janvier 2025 à 10h00');
    });

    it('should include contact instructions', () => {
      const result = service.missionAccepted('A', 'B', 'C', 'D', 'E');

      expect(result.html).toContain('messagerie');
      expect(result.html).toContain('Contacter');
    });
  });

  describe('missionCompleted', () => {
    it('should generate mission completed notification', () => {
      const result = service.missionCompleted(
        'John',
        'Pierre',
        'Fix Plumbing',
        'mission-123',
      );

      expect(result.subject).toContain('terminée');
      expect(result.html).toContain('John');
      expect(result.html).toContain('Pierre');
      expect(result.html).toContain('avis');
    });

    it('should include review link', () => {
      const result = service.missionCompleted('A', 'B', 'C', 'mission-xyz');

      expect(result.html).toContain('/mission-xyz/review');
    });
  });

  describe('paymentReceived', () => {
    it('should generate payment received notification', () => {
      const result = service.paymentReceived(
        'Pierre',
        250,
        'Fix Plumbing',
        'mission-123',
      );

      expect(result.subject).toContain('250€');
      expect(result.html).toContain('Pierre');
      expect(result.html).toContain('250€');
      expect(result.html).toContain('Fix Plumbing');
    });

    it('should include payment timing info', () => {
      const result = service.paymentReceived('Test', 100, 'Test', 'test');

      expect(result.html).toContain('2-3 jours');
      expect(result.html).toContain('Stripe');
    });
  });

  describe('negotiationReceived', () => {
    it('should generate negotiation notification with price increase', () => {
      const result = service.negotiationReceived(
        'John',
        'Pierre',
        'Fix Plumbing',
        300,
        250,
        'mission-123',
      );

      expect(result.subject).toContain('300€');
      expect(result.html).toContain('+50€');
      expect(result.html).toContain('250€'); // Old price
      expect(result.html).toContain('300€'); // New price
    });

    it('should handle price decrease', () => {
      const result = service.negotiationReceived(
        'John',
        'Pierre',
        'Fix Plumbing',
        200,
        250,
        'mission-123',
      );

      expect(result.html).toContain('-50€');
    });

    it('should include response options', () => {
      const result = service.negotiationReceived('A', 'B', 'C', 100, 100, 'D');

      expect(result.html).toContain('Accepter');
      expect(result.html).toContain('contre-proposition');
      expect(result.html).toContain('Refuser');
    });
  });

  describe('noShowAlert', () => {
    it('should generate no-show alert notification', () => {
      const result = service.noShowAlert(
        'Pierre',
        'John Client',
        'Fix Plumbing',
        'mission-123',
        50,
      );

      expect(result.subject).toContain('non-présentation');
      expect(result.html).toContain('Pierre');
      expect(result.html).toContain('John Client');
      expect(result.html).toContain('50€');
    });

    it('should include review process info', () => {
      const result = service.noShowAlert('A', 'B', 'C', 'D', 50);

      expect(result.html).toContain('48-72h');
      expect(result.html).toContain('preuves');
    });
  });

  describe('weeklyClientSummary', () => {
    it('should generate weekly summary for client', () => {
      const upcomingMissions = [
        { title: 'Fix Sink', date: '20 janvier', artisanName: 'Pierre' },
        { title: 'Electrical Work', date: '22 janvier', artisanName: 'Jean' },
      ];

      const result = service.weeklyClientSummary(
        'John',
        3,
        2,
        500,
        upcomingMissions,
      );

      expect(result.subject).toContain('hebdomadaire');
      expect(result.html).toContain('3'); // Active missions
      expect(result.html).toContain('2'); // Completed
      expect(result.html).toContain('500€'); // Spent
      expect(result.html).toContain('Fix Sink');
      expect(result.html).toContain('Pierre');
    });

    it('should handle no upcoming missions', () => {
      const result = service.weeklyClientSummary('John', 0, 0, 0, []);

      expect(result.html).toContain('Aucune mission planifiée');
      expect(result.html).toContain('Créer une mission');
    });
  });

  describe('weeklyArtisanSummary', () => {
    it('should generate weekly summary for artisan', () => {
      const result = service.weeklyArtisanSummary('Pierre', 5, 3, 750, 4.8, 2);

      expect(result.subject).toContain('hebdomadaire');
      expect(result.html).toContain('5'); // Active
      expect(result.html).toContain('3'); // Completed
      expect(result.html).toContain('750€'); // Earned
      expect(result.html).toContain('4.8'); // Rating
      expect(result.html).toContain('2'); // New reviews
    });

    it('should display star rating', () => {
      const result = service.weeklyArtisanSummary('Pierre', 0, 0, 0, 4.2, 0);

      expect(result.html).toContain('★'); // Stars
    });

    it('should congratulate on completed missions', () => {
      const result = service.weeklyArtisanSummary('Pierre', 0, 5, 1000, 5.0, 3);

      expect(result.html).toContain('Félicitations');
      expect(result.html).toContain('5 mission');
    });
  });

  describe('disputeCreated', () => {
    it('should generate dispute created notification', () => {
      const result = service.disputeCreated(
        'John',
        'Fix Plumbing',
        'dispute-123',
        'Work not completed',
      );

      expect(result.subject).toContain('Litige');
      expect(result.html).toContain('John');
      expect(result.html).toContain('Fix Plumbing');
      expect(result.html).toContain('Work not completed');
      expect(result.html).toContain('/disputes/dispute-123');
    });

    it('should include resolution timeline', () => {
      const result = service.disputeCreated('A', 'B', 'C', 'D');

      expect(result.html).toContain('24-48h');
      expect(result.html).toContain('5-7 jours');
    });
  });

  describe('passwordReset', () => {
    it('should generate password reset email', () => {
      const result = service.passwordReset('John', 'reset-token-abc');

      expect(result.subject).toContain('mot de passe');
      expect(result.html).toContain('John');
      expect(result.html).toContain('reset-token-abc');
      expect(result.html).toContain('/reset-password?token=reset-token-abc');
    });

    it('should include security warning', () => {
      const result = service.passwordReset('Test', 'token');

      expect(result.html).toContain('1 heure');
      expect(result.html).toContain('Sécurité');
      expect(result.html).toContain('partagez jamais');
    });

    it('should include ignore instructions', () => {
      const result = service.passwordReset('Test', 'token');

      expect(result.html).toContain('ignorez cet email');
    });
  });
});
