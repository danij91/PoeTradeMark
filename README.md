# PoE Trade Bookmark

Path of Exile / Path of Exile 2 공식 거래소에서 검색을 즐겨찾기하고, poe.ninja 환율로 가격을 환산하는 Chrome 확장 프로그램입니다.

비공식 팬 도구이며 Grinding Gear Games와 무관합니다. 거래소 페이지를 읽기만 하며, 자동 귓속말·자동 구매·자동 이동은 하지 않습니다.

## 기능

- 현재 검색을 즐겨찾기로 저장하고, 거래소 오른쪽 사이드바에서 다시 열기
- 이름 변경, 복사, 삭제, 드래그로 순서 변경, 목록 검색
- PoE1(`/trade`)과 PoE2(`/trade2`)를 URL로 구분해 목록을 나눔
- 한국·글로벌·대만 등 언어별 거래소 지원
- poe.ninja 환율로 매물 가격 환산, 기축 화폐 선택, 두 화폐 환율 표
- UI 언어 전환 (한국어, English, 日本語, Español, Français, Deutsch, ไทย, Русский, Português, 繁體中文)
- 헤더에서 PoEDB, poe.ninja, 이 저장소로 이동

## 설치 (Chrome unpacked)

1. 이 저장소를 클론합니다.
2. Chrome에서 `chrome://extensions`를 엽니다.
3. **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다**를 누르고, 저장소 안의 **`extension`** 폴더를 선택합니다.
   - 저장소 루트가 아니라 `extension` 폴더여야 합니다.
5. 거래소 탭을 새로고침합니다. 코드를 바꾼 뒤에는 확장 프로그램에서 **새로고침(Reload)** 한 다음 탭도 새로고침합니다.

## 지원하는 거래소

- 한국: `https://poe.kakaogames.com/trade`, `/trade2`
- 글로벌: `https://www.pathofexile.com/trade`, `/trade2` 및 언어별 서브도메인
- 대만: `https://pathofexile.tw/trade`, `/trade2`

## 사용

1. 거래소에서 검색(또는 환전) 페이지를 엽니다.
2. 오른쪽 아래 **즐겨찾기** 버튼으로 현재 검색을 저장합니다.
3. **목록** 버튼으로 사이드바를 엽니다. 항목의 이동 아이콘을 누르면 그 검색으로 돌아갑니다.
4. 사이드바에서 기축 화폐와 환율 표를 쓸 수 있습니다. 환율은 poe.ninja에서 가져오며 약 30분 캐시됩니다.

## 라이선스 / 에셋

코드는 이 저장소의 내용을 따릅니다. 화폐 아이콘은 Path of Exile 클라이언트/CDN에서 온 게임 에셋이며 GGG 소유입니다. 확장 표시용으로만 번들되어 있습니다.
