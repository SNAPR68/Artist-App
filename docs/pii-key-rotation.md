# PII Encryption Key Rotation Plan

## Overview

This document outlines the process for rotating the PII (Personally Identifiable Information) encryption key used to encrypt sensitive data in the Artist Booking Platform.

## Why Key Rotation Matters

- **Security Best Practices**: Regular key rotation reduces the risk of compromise
- **Compliance**: Many compliance standards (PCI-DSS, GDPR, HIPAA) require periodic key rotation
- **Risk Mitigation**: Limits the impact of potential key exposure

## Current Implementation

The application uses **AES-256-GCM encryption** with a 32-character key stored in the `PII_ENCRYPTION_KEY` environment variable.

Encrypted fields:
- User phone numbers
- User email addresses (when stored)
- Payment card information (tokens)
- Address details
- Artist bank account information

## Key Rotation Procedure

### Phase 1: Pre-Rotation Preparation (1-2 days before)

1. **Backup Database**
   ```bash
   # Create a full backup of the production database
   pg_dump -h <db_host> -U <db_user> -d artist_booking > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test Rotation Process**
   - Perform rotation in staging environment first
   - Verify all encrypted data is readable after rotation
   - Monitor for any performance issues

3. **Notify Team**
   - Inform DevOps and Security teams
   - Alert support team about potential minimal downtime
   - Schedule for low-traffic period

### Phase 2: Key Generation

Generate a new encryption key:

```bash
# Generate a secure 32-character key
openssl rand -base64 24 | head -c 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex').substring(0, 32))"
```

Store the new key securely:
- In production secrets manager (AWS Secrets Manager, Render dashboard, etc.)
- Keep the old key temporarily for dual-write period

### Phase 3: Rotation Strategy - Dual-Write Approach

This approach minimizes downtime and allows for safe rollback:

**Step 1: Enable Dual-Write Mode**

```typescript
// apps/api/src/infrastructure/encryption.ts
const ENCRYPTION_KEYS = [
  process.env.PII_ENCRYPTION_KEY_NEW,        // New key (for writing)
  process.env.PII_ENCRYPTION_KEY_OLD,        // Old key (for reading)
];

export function encryptPII(plaintext: string): string {
  // Write with new key
  return encrypt(plaintext, ENCRYPTION_KEYS[0]);
}

export function decryptPII(ciphertext: string): string {
  // Try new key first, then fall back to old key
  for (const key of ENCRYPTION_KEYS) {
    try {
      return decrypt(ciphertext, key);
    } catch {
      // Try next key
    }
  }
  throw new Error('Failed to decrypt with any available key');
}
```

**Step 2: Deploy Dual-Write**
```bash
# Add new key to environment
PII_ENCRYPTION_KEY_NEW=<new_key>
PII_ENCRYPTION_KEY_OLD=<old_key>

# Deploy to production
git push origin main  # Triggers CI/CD
```

**Step 3: Re-encrypt Existing Data**

Create a migration script:

```typescript
// apps/api/scripts/rotate-pii-keys.ts
import { db } from '../src/infrastructure/database.js';
import { encryptPII, decryptPII } from '../src/infrastructure/encryption.js';

async function rotatePIIKeys() {
  const batchSize = 100;
  let processedCount = 0;
  let failureCount = 0;

  // Re-encrypt user phone numbers
  const phoneUsers = await db('users')
    .where('phone_encrypted', 'is not null')
    .select('id', 'phone_encrypted')
    .limit(batchSize);

  for (const user of phoneUsers) {
    try {
      const plainPhone = decryptPII(user.phone_encrypted);
      const newEncrypted = encryptPII(plainPhone);

      await db('users')
        .where('id', user.id)
        .update({ phone_encrypted: newEncrypted });

      processedCount++;
    } catch (error) {
      console.error(`Failed to rotate phone for user ${user.id}:`, error);
      failureCount++;
    }
  }

  // Repeat for other encrypted fields: email, address, bank details, etc.

  console.log(`✅ Processed: ${processedCount}, Failed: ${failureCount}`);
}

rotatePIIKeys()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Rotation failed:', err);
    process.exit(1);
  });
```

Run the migration:

```bash
# SSH into production or use your deployment platform
cd apps/api && npx ts-node scripts/rotate-pii-keys.ts
```

**Step 4: Monitor and Verify**

```bash
# Check encryption success rate
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN phone_encrypted IS NOT NULL THEN 1 END) as encrypted,
  COUNT(CASE WHEN phone_encrypted IS NOT NULL THEN 1 END)::float / COUNT(*) as encryption_rate
FROM users;
```

**Step 5: Remove Old Key**

After 7 days of monitoring and confirming all data is readable:

```bash
# Remove old key from environment
unset PII_ENCRYPTION_KEY_OLD

# Update config
PII_ENCRYPTION_KEY=<new_key>

# Deploy
git push origin main
```

## Rollback Procedure

If rotation fails or causes issues:

```bash
# Restore from backup
psql -h <db_host> -U <db_user> -d artist_booking < backup_YYYYMMDD_HHMMSS.sql

# Revert to old key
PII_ENCRYPTION_KEY=<old_key>

# Deploy rollback
git push origin main
```

## Schedule

- **Frequency**: Every 90 days
- **Scheduled Rotations**:
  - Q1: March
  - Q2: June
  - Q3: September
  - Q4: December

## Automation

For automated key rotation, implement:

```typescript
// Cron job that triggers rotation
// apps/api/src/infrastructure/cron.ts

import cron from 'node-cron';

export function startCronJobs() {
  // Run key rotation every 90 days
  cron.schedule('0 2 1 */3 *', async () => {
    console.log('Starting automated PII key rotation...');
    // Call rotation service
  });
}
```

## Monitoring and Alerts

Set up alerts for:
- Decryption failures
- Unusual encryption/decryption latency
- Key rotation completion status

```sql
-- Monitor failed decryptions
SELECT COUNT(*) as failed_decryptions
FROM error_logs
WHERE error_type = 'DECRYPTION_ERROR'
  AND created_at > NOW() - INTERVAL '1 hour';
```

## Compliance Checklist

- [x] Key rotation procedure documented
- [x] Encryption algorithm: AES-256-GCM
- [x] Key derivation: Cryptographically random
- [x] Rotation frequency: Every 90 days
- [x] Audit trail: All operations logged
- [x] Rollback plan: Database backup + old key retention
- [x] Testing: Staging environment verification

## References

- [OWASP: Encryption Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [PCI-DSS 3.4: Rendering PAN Unreadable](https://www.pcisecuritystandards.org/)
- [NIST: Recommendations for Key Derivation](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf)

## Support

For questions about key rotation:
- Create an issue in the security repository
- Contact: security@artistbooking.com
- On-call security engineer: See runbooks
