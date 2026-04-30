#!/bin/bash
cd "$(dirname "$0")"
clear

echo ""
echo "========================================"
echo " Sales Digital Card Full Demo for Mac"
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
npm run cards >/dev/null 2>&1

echo ""
echo "Opening demo:"
echo "http://localhost:4173/"
echo ""
echo "Phone-scan QR target:"
echo "${CARD_BASE_URL}/amelia-clarke"
echo ""
echo "Keep this window open while presenting. Close it to stop the demo."
echo ""

open "http://localhost:4173/"
node server.js
