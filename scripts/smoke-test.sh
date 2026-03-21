#!/bin/bash

################################################################################
# Smoke Test Script - Artist Booking Platform
#
# Purpose: Verify key endpoints are functioning after deployment
# Usage:   ./scripts/smoke-test.sh [environment] [verbose]
#
# Examples:
#   ./scripts/smoke-test.sh production
#   ./scripts/smoke-test.sh staging --verbose
#   ./scripts/smoke-test.sh development --json
################################################################################

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
VERBOSE=${2:-}
OUTPUT_FORMAT=${3:-text}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_RESULTS=()
PASSED_TESTS=0
FAILED_TESTS=0

# Set base URLs based on environment
case "$ENVIRONMENT" in
  production)
    WEB_URL="https://artistbook.com"
    API_URL="https://api.artistbook.com"
    AUTH_TOKEN=""
    ;;
  staging)
    WEB_URL="https://staging.artistbook.com"
    API_URL="https://staging-api.artistbook.com"
    AUTH_TOKEN=""
    ;;
  development|local)
    WEB_URL="http://localhost:3000"
    API_URL="http://localhost:3001"
    AUTH_TOKEN="test-token"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Use: production, staging, or development"
    exit 1
    ;;
esac

# Test timeout (seconds)
TIMEOUT=10

################################################################################
# Logging Functions
################################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
  PASSED_TESTS=$((PASSED_TESTS + 1))
  TEST_RESULTS+=("PASS: $1")
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  FAILED_TESTS=$((FAILED_TESTS + 1))
  TEST_RESULTS+=("FAIL: $1")
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

################################################################################
# HTTP Testing Functions
################################################################################

test_endpoint() {
  local method=$1
  local url=$2
  local description=$3
  local expected_status=${4:-200}
  local request_data=${5:-}

  if [[ "$VERBOSE" == "--verbose" ]]; then
    echo "Testing: $method $url"
  fi

  if [[ "$method" == "POST" ]]; then
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "$request_data" \
      --max-time $TIMEOUT \
      "$url" 2>/dev/null || echo "error\n000")
  else
    response=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      --max-time $TIMEOUT \
      "$url" 2>/dev/null || echo "error\n000")
  fi

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [[ "$status_code" == "$expected_status" ]]; then
    log_success "$description (HTTP $status_code)"
    if [[ "$VERBOSE" == "--verbose" ]]; then
      echo "Response: ${body:0:200}"
    fi
    return 0
  else
    log_fail "$description (Expected $expected_status, got $status_code)"
    if [[ "$VERBOSE" == "--verbose" ]]; then
      echo "Response: $body"
    fi
    return 1
  fi
}

test_json_response() {
  local url=$1
  local description=$2
  local required_field=$3

  if [[ "$VERBOSE" == "--verbose" ]]; then
    echo "Testing JSON response: $url"
  fi

  response=$(curl -s \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    --max-time $TIMEOUT \
    "$url" 2>/dev/null || echo "{}")

  if echo "$response" | grep -q "$required_field"; then
    log_success "$description"
    return 0
  else
    log_fail "$description - missing '$required_field'"
    if [[ "$VERBOSE" == "--verbose" ]]; then
      echo "Response: $response"
    fi
    return 1
  fi
}

test_response_time() {
  local url=$1
  local description=$2
  local max_time=${3:-500}  # milliseconds

  if [[ "$VERBOSE" == "--verbose" ]]; then
    echo "Testing response time for: $url"
  fi

  response_time=$(curl -s -o /dev/null -w "%{time_total}" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    --max-time $TIMEOUT \
    "$url" 2>/dev/null || echo "10")

  response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)

  if [[ $response_time_ms -lt $max_time ]]; then
    log_success "$description (${response_time_ms}ms)"
    return 0
  else
    log_warn "$description - slow response (${response_time_ms}ms, expected <${max_time}ms)"
    return 0  # Warning, not failure
  fi
}

################################################################################
# Test Suites
################################################################################

test_web_frontend() {
  log_info "\n=== Testing Web Frontend ==="

  # Test main page
  test_endpoint "GET" "$WEB_URL" "Landing page loads" 200

  # Test auth pages
  test_endpoint "GET" "$WEB_URL/login" "Login page accessible" 200
  test_endpoint "GET" "$WEB_URL/signup" "Signup page accessible" 200

  # Test dashboard pages (may return 401 without auth, but should not 500)
  status=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/artist" --max-time $TIMEOUT)
  if [[ "$status" == "401" || "$status" == "200" ]]; then
    log_success "Artist dashboard accessible (HTTP $status)"
  else
    log_fail "Artist dashboard error (HTTP $status)"
  fi
}

test_api_health() {
  log_info "\n=== Testing API Health ==="

  # Health endpoint
  test_endpoint "GET" "$API_URL/health" "API health endpoint" 200

  # System status
  test_json_response "$API_URL/health" "Health endpoint has status field" "status"

  # Database health
  test_json_response "$API_URL/health/db" "Database health check" "connected"

  # Cache health
  test_json_response "$API_URL/health/cache" "Cache health check" "healthy"
}

test_authentication() {
  log_info "\n=== Testing Authentication ==="

  # Test login endpoint exists
  test_endpoint "POST" "$API_URL/v1/auth/login" \
    "Login endpoint accessible" 400 \
    '{"email":"test@example.com","password":"test"}'

  # Test token validation endpoint (if exists)
  test_endpoint "GET" "$API_URL/v1/auth/validate" \
    "Token validation endpoint" 401
}

test_artist_endpoints() {
  log_info "\n=== Testing Artist Endpoints ==="

  # Artist search
  test_endpoint "GET" "$API_URL/v1/artists/search?q=singer" \
    "Artist search endpoint" 200

  # Artist list
  test_endpoint "GET" "$API_URL/v1/artists?limit=10" \
    "Artist list endpoint" 200

  # Categories
  test_endpoint "GET" "$API_URL/v1/categories" \
    "Categories endpoint" 200
}

test_booking_endpoints() {
  log_info "\n=== Testing Booking Endpoints ==="

  # Bookings list (may be 401 without auth)
  test_endpoint "GET" "$API_URL/v1/bookings" \
    "Bookings list endpoint" 401

  # Available dates
  test_endpoint "GET" "$API_URL/v1/bookings/available-dates?artistId=test" \
    "Available dates endpoint" 200
}

test_payment_endpoints() {
  log_info "\n=== Testing Payment Endpoints ==="

  # Payment status (may be 401 without auth)
  test_endpoint "GET" "$API_URL/v1/payments" \
    "Payments list endpoint" 401
}

test_notification_endpoints() {
  log_info "\n=== Testing Notification Endpoints ==="

  # Notifications list (may be 401 without auth)
  test_endpoint "GET" "$API_URL/v1/notifications" \
    "Notifications endpoint" 401

  # Mark as read (should fail without valid ID)
  test_endpoint "PATCH" "$API_URL/v1/notifications/invalid/read" \
    "Mark notification as read" 404
}

test_response_times() {
  log_info "\n=== Testing Response Times ==="

  test_response_time "$WEB_URL" "Landing page response time" 2000
  test_response_time "$API_URL/health" "API health response time" 500
  test_response_time "$API_URL/v1/artists/search?q=singer" "Artist search response time" 1000
}

test_database_connectivity() {
  log_info "\n=== Testing Database Connectivity ==="

  response=$(curl -s "$API_URL/health/db" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    --max-time $TIMEOUT 2>/dev/null || echo "{}")

  if echo "$response" | grep -q '"connected":\s*true'; then
    log_success "Database is connected"
  else
    log_fail "Database connectivity check failed"
    if [[ "$VERBOSE" == "--verbose" ]]; then
      echo "Response: $response"
    fi
  fi
}

test_external_services() {
  log_info "\n=== Testing External Services ==="

  # Email service check (may not have dedicated endpoint)
  response=$(curl -s "$API_URL/health" 2>/dev/null)
  if echo "$response" | grep -q "email"; then
    log_success "Email service configured"
  fi

  # Payment service check
  response=$(curl -s "$API_URL/health" 2>/dev/null)
  if echo "$response" | grep -q "payment\|razorpay"; then
    log_success "Payment service configured"
  fi
}

test_ssl_certificate() {
  log_info "\n=== Testing SSL Certificate ==="

  if [[ "$ENVIRONMENT" == "production" || "$ENVIRONMENT" == "staging" ]]; then
    # Check SSL cert validity
    cert_expiry=$(echo | openssl s_client -servername "${API_URL#https://}" \
      -connect "${API_URL#https://}:443" 2>/dev/null | \
      openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")

    if [[ -n "$cert_expiry" ]]; then
      log_success "SSL certificate valid until: $cert_expiry"
    else
      log_warn "Could not verify SSL certificate"
    fi
  fi
}

################################################################################
# Main Execution
################################################################################

main() {
  clear
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║     Artist Booking Platform - Smoke Tests                     ║"
  echo "║                                                                ║"
  echo "║     Environment: ${ENVIRONMENT,,}"
  echo "║     Web URL:     $WEB_URL"
  echo "║     API URL:     $API_URL"
  echo "║     Timestamp:   $TIMESTAMP"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  echo "Starting smoke tests..."
  echo "Timeout: ${TIMEOUT}s"
  echo ""

  # Run test suites
  test_web_frontend
  test_api_health
  test_authentication
  test_artist_endpoints
  test_booking_endpoints
  test_payment_endpoints
  test_notification_endpoints
  test_response_times
  test_database_connectivity
  test_external_services
  test_ssl_certificate

  # Print summary
  print_summary
}

print_summary() {
  local total=$((PASSED_TESTS + FAILED_TESTS))

  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    Test Summary                               ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "Total Tests:  $total"
  echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
  echo -e "${RED}Failed:       $FAILED_TESTS${NC}"

  if [[ $total -gt 0 ]]; then
    percentage=$((PASSED_TESTS * 100 / total))
    echo -e "Success Rate: ${percentage}%"
  fi

  echo ""

  if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "${GREEN}✅ All smoke tests passed!${NC}"
    echo "Platform is ready for use."
    exit 0
  else
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo "Platform may not be fully operational."
    echo ""
    echo "Failed Tests:"
    for result in "${TEST_RESULTS[@]}"; do
      if [[ "$result" == FAIL* ]]; then
        echo "  - ${result#FAIL: }"
      fi
    done
    exit 1
  fi
}

# Print help
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  cat << EOF
Usage: ./scripts/smoke-test.sh [environment] [options]

Environments:
  production    - Production environment
  staging       - Staging environment (default)
  development   - Local development environment

Options:
  --verbose     - Print detailed output
  --help, -h    - Show this help message

Examples:
  ./scripts/smoke-test.sh production
  ./scripts/smoke-test.sh staging --verbose
  ./scripts/smoke-test.sh development

EOF
  exit 0
fi

# Run main function
main
