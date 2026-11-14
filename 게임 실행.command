#!/bin/zsh
set -eu
cd "${0:A:h}"
if [[ -x .tools/node ]]; then
  GETYA_NODE="$PWD/.tools/node"
elif command -v node >/dev/null 2>&1; then
  GETYA_NODE="$(command -v node)"
else
  print 'Node.js가 필요합니다. https://nodejs.org 에서 LTS 버전을 설치해 주세요.'
  read '?Enter 키를 누르면 닫힙니다.'
  exit 1
fi
if [[ ! -f node_modules/vite/bin/vite.js ]]; then
  print '프로젝트 의존성이 없습니다. 개발자에게 npm install 실행을 요청해 주세요.'
  read '?Enter 키를 누르면 닫힙니다.'
  exit 1
fi
print '겟야!를 실행합니다. 종료하려면 이 창에서 Control+C를 누르세요.'
exec "$GETYA_NODE" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort --open
