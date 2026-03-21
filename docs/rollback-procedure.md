# Rollback Procedure - Artist Booking Platform

## Overview

This document outlines the comprehensive rollback procedures for the Artist Booking Platform in production. A rollback is performed when a deployment causes critical issues, data corruption, or severe performance degradation.

## Rollback Decision Criteria

Initiate a rollback if ANY of the following conditions occur:

- **Critical Errors**: More than 1% of requests returning 5xx errors
- **Data Loss**: Unintended data corruption or deletion
- **Performance Degradation**: Response time exceeds 5 seconds for > 10% requests
- **Security Breach**: Unauthorized access or data exposure detected
- **Payment Processing Failures**: > 5% of payment transactions failing
- **Authentication Issues**: Users unable to login or session issues
- **Database Connectivity**: Unable to connect to database for > 2 minutes

## Pre-Rollback Checklist

Before initiating rollback, complete the following:

- [ ] Notify all stakeholders via Slack #production-incidents
- [ ] Document the issue with timestamp and error messages
- [ ] Capture current system state (logs, metrics, database backups)
- [ ] Identify the last known good deployment version
- [ ] Ensure you have database backup from before current deployment
- [ ] Stop new deployments in the pipeline
- [ ] Alert customer support about potential service issues

## Rollback Procedures

### Option 1: Kubernetes Rollback (Recommended - Quick)

**Estimated Time**: 2-5 minutes

```bash
# 1. Check current deployment status
kubectl rollout history deployment/artist-booking-web -n production
kubectl rollout history deployment/artist-booking-api -n production

# 2. View previous revision details
kubectl rollout history deployment/artist-booking-web -n production --revision=<previous-revision>

# 3. Rollback to previous version
kubectl rollout undo deployment/artist-booking-web -n production
kubectl rollout undo deployment/artist-booking-api -n production

# 4. Verify rollback status
kubectl rollout status deployment/artist-booking-web -n production
kubectl rollout status deployment/artist-booking-api -n production

# 5. Verify pods are running
kubectl get pods -n production | grep artist-booking

# 6. Check logs for errors
kubectl logs -n production -l app=artist-booking-web --tail=50
kubectl logs -n production -l app=artist-booking-api --tail=50
```

### Option 2: Docker/Container Rollback

**Estimated Time**: 3-10 minutes

```bash
# 1. SSH into production server
ssh -i ~/.ssh/production-key user@production-server

# 2. Check available images
docker images | grep artist-booking

# 3. Get previous image ID
PREVIOUS_IMAGE=$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}" | grep artist-booking | head -2 | tail -1 | awk '{print $3}')

# 4. Stop current containers
docker-compose -f docker-compose.prod.yml down

# 5. Update .env or docker-compose.yml to reference previous image
sed -i 's/artist-booking:latest/artist-booking:'$PREVIOUS_TAG'/' docker-compose.prod.yml

# 6. Restart containers
docker-compose -f docker-compose.prod.yml up -d

# 7. Wait for containers to be healthy
sleep 30
docker-compose ps

# 8. Verify application is running
curl -s http://localhost:3000/health | jq .
curl -s http://localhost:3001/health | jq .
```

### Option 3: Git/Source Code Rollback

**Estimated Time**: 5-15 minutes

```bash
# 1. Check git log
git log --oneline -10

# 2. Identify previous stable commit
STABLE_COMMIT="<commit-hash-of-last-known-good-version>"

# 3. Create rollback tag for tracking
git tag -a rollback-$(date +%Y%m%d-%H%M%S) -m "Rollback to ${STABLE_COMMIT}"

# 4. Checkout previous version
git checkout ${STABLE_COMMIT}

# 5. Rebuild and redeploy
npm run build
npm run deploy:production

# 6. Monitor deployment
npm run monitor:deployment

# 7. Verify application
npm run health:check:prod
```

### Option 4: Database Rollback (If Data Corruption)

**CRITICAL - Do Not Attempt Without DBA Approval**

**Estimated Time**: 30-60 minutes (depends on backup size)

```bash
# 1. Stop application to prevent further data issues
kubectl scale deployment/artist-booking-api --replicas=0 -n production

# 2. Verify backup integrity
pg_dump -U postgres --list /backups/production-$(date -d "1 hour ago" +%Y%m%d-%H%M%S).sql.gz | head -20

# 3. Create pre-rollback backup (for investigation)
pg_dump -U postgres artist_booking > /backups/production-$(date +%Y%m%d-%H%M%S)-pre-rollback.sql

# 4. Restore from backup
BACKUP_FILE="/backups/production-BACKUP_TIMESTAMP.sql.gz"
gunzip -c ${BACKUP_FILE} | psql -U postgres -d artist_booking

# 5. Verify data integrity
psql -U postgres -d artist_booking -c "SELECT COUNT(*) FROM users;"
psql -U postgres -d artist_booking -c "SELECT COUNT(*) FROM bookings;"

# 6. Restart application
kubectl scale deployment/artist-booking-api --replicas=3 -n production

# 7. Run health checks
kubectl exec -it pod/artist-booking-api-xxxx -n production -- npm run health:check
```

## Post-Rollback Verification

After rollback completes, verify the system is healthy:

```bash
# 1. Check application health endpoints
curl -s https://api.artistbook.com/health | jq .
curl -s https://artistbook.com/api/health | jq .

# 2. Verify database connectivity
curl -s https://api.artistbook.com/v1/system/health | jq .

# 3. Test critical flows
- User login (authentication)
- Artist search (discovery)
- Booking creation (payment flow)
- Notification delivery

# 4. Monitor error rates
# Check Sentry/Datadog for error spike resolution

# 5. Monitor performance metrics
# Check response times are back to normal (<500ms p95)

# 6. Check payment processing
# Verify Razorpay integration is working

# 7. Monitor user sessions
# Ensure users are not experiencing issues
```

## Post-Rollback Actions

Once rollback is verified successful:

1. **Document the Incident**
   - Create incident post-mortem in Jira
   - Document root cause
   - Note timeline of events
   - Identify prevention measures

2. **Root Cause Analysis**
   ```bash
   # Compare deployments to identify what changed
   git diff <previous-version>..<problematic-version>

   # Review recent code changes
   git log --oneline <previous-version>..<problematic-version>
   ```

3. **Fix and Re-Test**
   - Create hotfix branch from main
   - Apply necessary fixes
   - Run full test suite
   - Get code review before redeployment

4. **Communication**
   - Update status page (if public-facing issues)
   - Send incident summary to stakeholders
   - Schedule retrospective meeting
   - Notify customers via email if applicable

5. **Monitor Closely**
   - Increase monitoring for 24 hours post-rollback
   - Watch for any residual issues
   - Monitor system performance metrics
   - Check for any data inconsistencies

## Rollback Checklist - Post-Execution

- [ ] Deployment rolled back successfully
- [ ] All pods/containers are running
- [ ] Health checks are passing (200 status)
- [ ] Error rate is below 1%
- [ ] Database is responding normally
- [ ] Users can login (test with test account)
- [ ] Artist search returns results
- [ ] Booking creation is successful
- [ ] Payments are processing
- [ ] Notifications are being sent
- [ ] Logs show no critical errors
- [ ] Incident documented in Jira
- [ ] Stakeholders notified
- [ ] Monitoring alerts reviewed

## Rollback Failure Recovery

If rollback itself fails:

1. **Immediate Actions**
   - Do NOT attempt another rollback
   - Stop all deployment/scale operations
   - Escalate to Senior DevOps Engineer
   - Call incident bridge: [phone number]

2. **Data Recovery**
   - Restore from latest clean backup
   - May require database recovery specialist
   - Estimated time: 1-2 hours

3. **Manual Intervention**
   - May require manual container restarts
   - Check service dependencies (Redis, PostgreSQL, etc.)
   - Verify network policies and security groups

## Quick Reference Commands

```bash
# Kubernetes Quick Rollback
kubectl rollout undo deployment/artist-booking-api -n production

# Check Rollout Status
kubectl rollout status deployment/artist-booking-api -n production

# Get Previous Versions
kubectl rollout history deployment/artist-booking-api -n production

# View Current Pods
kubectl get pods -n production

# Check Recent Logs
kubectl logs -n production -l app=artist-booking-api --tail=100 --timestamps=true

# Emergency Scale Down
kubectl scale deployment/artist-booking-api --replicas=0 -n production

# Emergency Scale Up
kubectl scale deployment/artist-booking-api --replicas=3 -n production
```

## Contact Information

- **On-Call Engineer**: Check PagerDuty
- **DevOps Lead**: devops-lead@artistbook.com
- **Database Admin**: dba@artistbook.com
- **Engineering Manager**: engineering-manager@artistbook.com
- **Incident Channel**: #production-incidents on Slack

## Testing Rollback Procedure

Rollback procedures should be tested monthly in staging environment:

```bash
# Monthly Rollback Drill (Staging Only)
# Ensure the procedure is documented and team is familiar

1. Deploy staging application
2. Simulate issue (introduce breaking change)
3. Execute rollback procedure
4. Verify application is healthy
5. Document any issues discovered
6. Update procedure as needed
```

## Related Documentation

- [Deployment Guide](./deployment.md)
- [Disaster Recovery Plan](./disaster-recovery.md)
- [Monitoring Guide](./monitoring.md)
- [Incident Response](./incident-response.md)
- [Security Procedures](./security.md)

---

**Last Updated**: 2025-03-21
**Document Version**: 1.0
**Next Review Date**: 2025-06-21
