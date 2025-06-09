import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'; // Should be 32 characters
const ALGORITHM = 'aes-256-gcm';

export class EncryptionService {
  private static key: Buffer = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

  static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(ALGORITHM, this.key);
      cipher.setAAD(Buffer.from('github-token', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Return format: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error('Failed to encrypt token');
    }
  }

  static decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipher(ALGORITHM, this.key);
      decipher.setAAD(Buffer.from('github-token', 'utf8'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt token');
    }
  }

  static encryptGitHubToken(token: string): string {
    if (!token || token.trim() === '') {
      throw new Error('Token cannot be empty');
    }
    return this.encrypt(token);
  }

  static decryptGitHubToken(encryptedToken: string): string {
    if (!encryptedToken || encryptedToken.trim() === '') {
      throw new Error('Encrypted token cannot be empty');
    }
    return this.decrypt(encryptedToken);
  }
} 