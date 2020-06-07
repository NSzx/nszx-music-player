#!/bin/bash

WD=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

pushd "$WD" || exit

  rm -rf build/dev/
  mkdir -p build/dev/
  cp -r resources/* build/dev/

  if [ "$1" == "firefox" ]; then
    rm build/dev/js/analytics.js
    rm build/dev/manifest.chrome.json
    mv build/dev/manifest.firefox.json build/dev/manifest.json
  else
    rm build/dev/manifest.firefox.json
    mv build/dev/manifest.chrome.json build/dev/manifest.json
  fi
  find build/dev -type f -name '.*' -delete
  rm build/dev/_locales/duplicate

  npm install
  npx webpack src/index.ts -o build/dev/js/index.js

popd || exit

echo "------------------------------------------------------------------------"
echo "Extension available in $WD/build/dev/"
echo "------------------------------------------------------------------------"
