#!/bin/bash
cd "$(dirname "$0")"
clear

echo ""
echo "========================================"
echo " Sales Digital Card Mobile Demo for Mac"
echo "========================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found on this Mac."
  echo ""
  echo "Please install Node.js LTS first:"
  echo "https://nodejs.org/"
  echo ""
  echo "You can still open the static preview HTML file if needed."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

if [ ! -d "node_modules/express" ]; then
  echo "Preparing dependencies. First run may take 1-3 minutes..."
  npm install
  if [ $? -ne 0 ]; then
    echo ""
    echo "Dependency installation failed. Please ask a technical colleague to help."
    read -n 1 -s -r -p "Press any key to close..."
    exit 1
  fi
fi

npm run setup >/dev/null 2>&1

LOCAL_IP="$(node scripts/detect-local-ip.mjs 2>/dev/null)"
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="localhost"
fi

export CARD_BASE_URL="http://${LOCAL_IP}:4173"
MOBILE_URL="${CARD_BASE_URL}/amelia-clarke"
printf 'window.MOBILE_DEMO_URL = "%s";\n' "$MOBILE_URL" > mobile-url.js
npm run cards >/dev/null 2>&1

echo ""
echo "Mobile demo URL:"
echo "$MOBILE_URL"
echo ""
echo "QR business cards have been regenerated for this local address."
echo "If you scan an older saved card image, it may still point to card.company.com."
echo ""
echo "Please make sure the phone and this Mac are on the same Wi-Fi."
echo "Important: do not scan QR files directly after unzip."
echo "Run this command first, then scan the QR opened by the browser or the newly regenerated business cards."
echo "A browser window will open with a QR code. Scan it with the phone."
echo ""
echo "Keep this window open while presenting. Close it to stop the demo."
echo ""

open "http://localhost:4173/mobile-share.html"
node server.js
