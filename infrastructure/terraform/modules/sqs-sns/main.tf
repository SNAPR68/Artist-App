variable "project_name" { type = string }
variable "environment" { type = string }

# ─── Notification Queue ───────────────────────────────────────
resource "aws_sqs_queue" "notifications" {
  name                       = "${var.project_name}-${var.environment}-notifications"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 604800 # 7 days
  receive_wait_time_seconds  = 10     # Long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notifications_dlq.arn
    maxReceiveCount     = 3
  })

  tags = { Environment = var.environment }
}

resource "aws_sqs_queue" "notifications_dlq" {
  name                      = "${var.project_name}-${var.environment}-notifications-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = { Environment = var.environment }
}

# ─── Booking Events Queue ────────────────────────────────────
resource "aws_sqs_queue" "booking_events" {
  name                       = "${var.project_name}-${var.environment}-booking-events"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 604800

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.booking_events_dlq.arn
    maxReceiveCount     = 5
  })

  tags = { Environment = var.environment }
}

resource "aws_sqs_queue" "booking_events_dlq" {
  name                      = "${var.project_name}-${var.environment}-booking-events-dlq"
  message_retention_seconds = 1209600

  tags = { Environment = var.environment }
}

# ─── Media Transcode Queue ───────────────────────────────────
resource "aws_sqs_queue" "media_transcode" {
  name                       = "${var.project_name}-${var.environment}-media-transcode"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 604800

  tags = { Environment = var.environment }
}

output "notification_queue_url" {
  value = aws_sqs_queue.notifications.url
}

output "booking_events_queue_url" {
  value = aws_sqs_queue.booking_events.url
}

output "media_transcode_queue_url" {
  value = aws_sqs_queue.media_transcode.url
}
