# S3 bucket for migration artifacts: source snapshots, audit-log exports,
# reconciliation reports. Versioned + encrypted; lifecycle keeps costs flat.

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.project}-artifacts"
  tags   = { Name = "${var.project}-artifacts" }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    id     = "expire-old-exports"
    status = "Enabled"
    expiration {
      days = 90
    }
  }
}
