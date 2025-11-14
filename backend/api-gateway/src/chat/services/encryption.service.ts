import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly pbkdf2Iterations = 100000;

  /**
   * Generate a secure encryption key from a password using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.pbkdf2Iterations,
      this.keyLength,
      'sha256'
    );
  }

  /**
   * Encrypt a message using AES-256-GCM
   * Returns encrypted data with IV, salt, and auth tag
   */
  encryptMessage(message: string, conversationKey: string): string {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derive encryption key from conversation key
      const key = this.deriveKey(conversationKey, salt);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt the message
      let encrypted = cipher.update(message, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine salt + iv + authTag + encrypted data
      const result = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex'),
      ]);

      return result.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a message using AES-256-GCM
   */
  decryptMessage(encryptedMessage: string, conversationKey: string): string {
    try {
      // Convert from base64
      const data = Buffer.from(encryptedMessage, 'base64');

      // Extract components
      const salt = data.slice(0, this.saltLength);
      const iv = data.slice(this.saltLength, this.saltLength + this.ivLength);
      const authTag = data.slice(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = data.slice(this.saltLength + this.ivLength + this.tagLength);

      // Derive decryption key
      const key = this.deriveKey(conversationKey, salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the message
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a unique conversation key for two users
   * Uses sorted user IDs to ensure same key for both directions
   */
  generateConversationKey(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    const combined = sortedIds.join(':');
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Hash sensitive data (one-way)
   */
  hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Verify if a message can be decrypted (integrity check)
   */
  canDecrypt(encryptedMessage: string, conversationKey: string): boolean {
    try {
      this.decryptMessage(encryptedMessage, conversationKey);
      return true;
    } catch {
      return false;
    }
  }
}
