import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  describe('encryptMessage and decryptMessage', () => {
    it('should encrypt and decrypt a message successfully', () => {
      const message = 'Hello, this is a secret message!';
      const conversationKey = 'test-conversation-key';

      const encrypted = service.encryptMessage(message, conversationKey);
      const decrypted = service.decryptMessage(encrypted, conversationKey);

      expect(decrypted).toBe(message);
    });

    it('should produce different encrypted output for same message', () => {
      const message = 'Hello, this is a secret message!';
      const conversationKey = 'test-conversation-key';

      const encrypted1 = service.encryptMessage(message, conversationKey);
      const encrypted2 = service.encryptMessage(message, conversationKey);

      // Each encryption should use different IV and salt
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle unicode characters', () => {
      const message = 'Bonjour! Ça va? 你好 🎉';
      const conversationKey = 'unicode-test-key';

      const encrypted = service.encryptMessage(message, conversationKey);
      const decrypted = service.decryptMessage(encrypted, conversationKey);

      expect(decrypted).toBe(message);
    });

    it('should handle empty strings', () => {
      const message = '';
      const conversationKey = 'empty-test-key';

      const encrypted = service.encryptMessage(message, conversationKey);
      const decrypted = service.decryptMessage(encrypted, conversationKey);

      expect(decrypted).toBe(message);
    });

    it('should handle long messages', () => {
      const message = 'A'.repeat(10000);
      const conversationKey = 'long-message-key';

      const encrypted = service.encryptMessage(message, conversationKey);
      const decrypted = service.decryptMessage(encrypted, conversationKey);

      expect(decrypted).toBe(message);
    });

    it('should fail decryption with wrong key', () => {
      const message = 'Secret message';
      const correctKey = 'correct-key';
      const wrongKey = 'wrong-key';

      const encrypted = service.encryptMessage(message, correctKey);

      expect(() => service.decryptMessage(encrypted, wrongKey)).toThrow(
        'Decryption failed',
      );
    });

    it('should fail decryption with corrupted data', () => {
      const conversationKey = 'test-key';
      const corruptedData = 'not-valid-base64-encrypted-data!@#$';

      expect(() =>
        service.decryptMessage(corruptedData, conversationKey),
      ).toThrow('Decryption failed');
    });

    it('should produce base64 encoded output', () => {
      const message = 'Test message';
      const conversationKey = 'test-key';

      const encrypted = service.encryptMessage(message, conversationKey);

      // Check if output is valid base64
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      expect(base64Regex.test(encrypted)).toBe(true);
    });
  });

  describe('generateConversationKey', () => {
    it('should generate consistent key for same user pair', () => {
      const key1 = service.generateConversationKey('user-a', 'user-b');
      const key2 = service.generateConversationKey('user-a', 'user-b');

      expect(key1).toBe(key2);
    });

    it('should generate same key regardless of user order', () => {
      const key1 = service.generateConversationKey('user-a', 'user-b');
      const key2 = service.generateConversationKey('user-b', 'user-a');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different user pairs', () => {
      const key1 = service.generateConversationKey('user-a', 'user-b');
      const key2 = service.generateConversationKey('user-a', 'user-c');

      expect(key1).not.toBe(key2);
    });

    it('should return a 64-character hex string', () => {
      const key = service.generateConversationKey('user-1', 'user-2');

      expect(key.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(key)).toBe(true);
    });
  });

  describe('hashData', () => {
    it('should hash data consistently', () => {
      const data = 'sensitive-data';

      const hash1 = service.hashData(data);
      const hash2 = service.hashData(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = service.hashData('data-1');
      const hash2 = service.hashData('data-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return a 64-character hex string', () => {
      const hash = service.hashData('test-data');

      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of default length', () => {
      const token = service.generateSecureToken();

      // Default 32 bytes = 64 hex characters
      expect(token.length).toBe(64);
    });

    it('should generate token of specified length', () => {
      const token = service.generateSecureToken(16);

      // 16 bytes = 32 hex characters
      expect(token.length).toBe(32);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(service.generateSecureToken());
      }

      expect(tokens.size).toBe(100);
    });

    it('should return hex string', () => {
      const token = service.generateSecureToken();

      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });
  });

  describe('canDecrypt', () => {
    it('should return true for valid encrypted message', () => {
      const message = 'Test message';
      const conversationKey = 'test-key';

      const encrypted = service.encryptMessage(message, conversationKey);
      const canDecrypt = service.canDecrypt(encrypted, conversationKey);

      expect(canDecrypt).toBe(true);
    });

    it('should return false for wrong key', () => {
      const message = 'Test message';
      const encrypted = service.encryptMessage(message, 'correct-key');

      const canDecrypt = service.canDecrypt(encrypted, 'wrong-key');

      expect(canDecrypt).toBe(false);
    });

    it('should return false for corrupted data', () => {
      const canDecrypt = service.canDecrypt('corrupted-data', 'any-key');

      expect(canDecrypt).toBe(false);
    });

    it('should return false for tampered encrypted data', () => {
      const message = 'Test message';
      const conversationKey = 'test-key';

      const encrypted = service.encryptMessage(message, conversationKey);
      // Tamper with the encrypted data
      const tampered = encrypted.slice(0, -4) + 'XXXX';

      const canDecrypt = service.canDecrypt(tampered, conversationKey);

      expect(canDecrypt).toBe(false);
    });
  });

  describe('integration: conversation encryption', () => {
    it('should allow two users to securely communicate', () => {
      const userId1 = 'alice-123';
      const userId2 = 'bob-456';

      // Both users generate the same conversation key
      const aliceKey = service.generateConversationKey(userId1, userId2);
      const bobKey = service.generateConversationKey(userId2, userId1);

      expect(aliceKey).toBe(bobKey);

      // Alice sends a message
      const aliceMessage = 'Hello Bob!';
      const encryptedByAlice = service.encryptMessage(aliceMessage, aliceKey);

      // Bob decrypts it
      const decryptedByBob = service.decryptMessage(encryptedByAlice, bobKey);
      expect(decryptedByBob).toBe(aliceMessage);

      // Bob responds
      const bobMessage = 'Hi Alice!';
      const encryptedByBob = service.encryptMessage(bobMessage, bobKey);

      // Alice decrypts it
      const decryptedByAlice = service.decryptMessage(encryptedByBob, aliceKey);
      expect(decryptedByAlice).toBe(bobMessage);
    });

    it('should prevent third party from reading messages', () => {
      const userId1 = 'alice-123';
      const userId2 = 'bob-456';
      const userId3 = 'eve-789';

      const conversationKey = service.generateConversationKey(userId1, userId2);
      const eveKey = service.generateConversationKey(userId1, userId3);

      const message = 'Secret message between Alice and Bob';
      const encrypted = service.encryptMessage(message, conversationKey);

      // Eve cannot decrypt with her key
      expect(conversationKey).not.toBe(eveKey);
      expect(() => service.decryptMessage(encrypted, eveKey)).toThrow();
    });
  });
});
