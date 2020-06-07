#!/bin/bash

WD=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

package() {
  TARGET=$1

  pushd "$WD" || exit

    VERSION=$(cat "resources/manifest.$TARGET.json" | grep '"version"' | cut -d'"' -f 4)
    echo "----------------------------------------"
    echo "Building version $VERSION for $TARGET"
    echo "----------------------------------------"
    echo ""

    OUTPUT="dist/${VERSION}/${TARGET}_${VERSION}.zip"

    rm -f "$OUTPUT"

    rm -rf build/tmp/
    mkdir -p build/tmp/
    cp -r resources/* build/tmp/
    cp LICENSE build/tmp/

    npm install
    npx webpack src/index.ts -o build/tmp/js/index.js

    pushd build/tmp || exit
      mv "manifest.$TARGET.json" manifest.json
      rm -f manifest.*.json
      rm -f _locales/duplicate
      if [ "$TARGET" == "firefox" ]; then
        rm -f js/analytics.js
      fi

      zip -r archive.zip ./* -x **/.*
    popd || exit

    mkdir -p "dist/${VERSION}"
    mv build/tmp/archive.zip "$OUTPUT"
    rm -rf build/tmp/

    if [ "$TARGET" == "firefox" ]; then
      SOURCE_OUTPUT="dist/$VERSION/${TARGET}_${VERSION}_sources.zip"
      rm -f "$SOURCE_OUTPUT"
      zip -r archive.zip ./* -x **/.* -x *.iml -x "node_modules/*" -x "build/*" -x "dist/*"
      mv archive.zip "$SOURCE_OUTPUT"
    fi

  popd || exit
}

package "chrome"
package "firefox"
