#!/bin/bash
# Initialize LocalStack resources for local development

echo "Creating S3 buckets..."
awslocal s3 mb s3://artist-booking-media
awslocal s3 mb s3://artist-booking-documents

echo "Creating SQS queues..."
awslocal sqs create-queue --queue-name notifications
awslocal sqs create-queue --queue-name booking-events
awslocal sqs create-queue --queue-name media-transcode

echo "LocalStack initialization complete!"
