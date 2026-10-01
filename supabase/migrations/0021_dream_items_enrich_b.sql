-- ============================================================
-- 0021_dream_items_enrich_b — 꿈 사전 B 묶음: 신규 꿈 추가 + 검색 키워드 보완
-- - 신규 39건 (길몽 17 · 보통 18 · 흉몽 4): 사전에 없던 검색어
--   (닭·원숭이·독수리·여우·늑대·코끼리·개구리·나비·상어·고래·짝사랑·수술·지각·납치·교통사고·키스·바람피우는·이혼)
-- - keywords 18건: 한 글자 검색에서 빠지던 합성어 항목 보완(코피→피, 첫눈→눈 …), people-006 의 '이혼' 키워드 정리
--
-- 적용 방법: Supabase SQL Editor 에 통째로 붙여 한 번에 실행. 파일 전체가 do 블록 하나(= SQL 문 하나)라
-- 중간에 실패하면 백업까지 포함해 아무것도 바뀌지 않는다. 임시 테이블 없이 JSON 을 jsonb_to_recordset 으로 읽는다.
-- 적용 전 supabase/scripts/0021_precheck.sql 로 확인.
-- 되돌리기: supabase/scripts/0021_rollback.sql (backup.dream_items_0021 기준 — 신규 행 삭제 + keywords 복구).
-- 멱등성: 다시 실행해도 결과가 같다. 신규 행은 on conflict do nothing, 백업은 첫 실행 때 값만 보존.
-- keywords 는 생성 시점 값과 같을 때만 바꾼다 — 그 사이 누가 고쳤으면 전체 취소.
-- 생성: node supabase/seeds/enrich/b/build-migration.mjs (원본 데이터: supabase/seeds/enrich/b/new.json·keywords.json — 직접 수정하지 말 것)
-- ============================================================

do $mig$
declare
  new_rows jsonb := $new$
[
{"id":"animal-031","category_id":"animal","title":"닭이 힘차게 우는 꿈","preview":"기다리던 소식이 들려오고 막힌 일이 트이는 길몽","description":"새벽에 닭이 힘차게 우는 꿈은 긴 기다림이 끝나고 새로운 하루가 열리는 것을 상징한다. 닭 울음은 예로부터 어둠을 걷고 아침을 알리는 소리로 여겨져, 막혀 있던 일이 풀리는 신호로 받아들여졌다. 울음소리가 맑고 크게 울려 퍼졌다면 반가운 소식이 멀리까지 전해진다는 뜻으로 풀이된다. 준비해 온 일이 있다면 이제 움직여도 좋을 때라는 뜻으로 해석된다.","emoji":"🐔","tags":["길몽","소식","닭"],"keywords":["닭","닭꿈","닭 우는 꿈","닭꿈 해몽"],"luck_index":78,"is_warning":false,"mood_tags":["설렘"],"is_lucky":"lucky","conditions":[{"if":"닭이 울다가 갑자기 멈추면","then":"시작한 일이 잠시 주춤할 수 있으니 서두르지 말라는 뜻으로 풀이된다"}]},
{"id":"animal-032","category_id":"animal","title":"닭이 알을 낳는 꿈","preview":"작은 노력이 쌓여 살림이 넉넉해지는 길몽","description":"닭이 둥지에서 알을 낳는 꿈은 꾸준히 들인 정성이 눈에 보이는 결실로 돌아오는 것을 상징한다. 알은 생명과 불어남을 뜻해, 집에서 기르는 닭이 알을 낳는 모습은 살림이 조금씩 늘어나는 것으로 여겨져 왔다. 알이 여러 개였다면 수입이 한 군데가 아니라 여러 곳에서 들어온다는 뜻으로 풀이된다. 낳은 알을 직접 거두어 들였다면 그 이익이 온전히 자기 몫이 된다는 뜻으로 해석된다.","emoji":"🥚","tags":["길몽","재물","닭"],"keywords":["닭","닭이 알 낳는 꿈","달걀 꿈","닭꿈 재물"],"luck_index":80,"is_warning":false,"mood_tags":["뿌듯함"],"is_lucky":"lucky","conditions":[{"if":"알이 깨져 있으면","then":"기대한 이익 일부가 새어 나갈 수 있으니 마무리를 꼼꼼히 하라는 뜻이다"}]},
{"id":"animal-033","category_id":"animal","title":"원숭이가 재주를 부리는 꿈","preview":"재치가 빛나지만 가벼운 말은 아껴야 하는 꿈","description":"원숭이가 눈앞에서 재주를 부리는 꿈은 번뜩이는 재치와 순발력이 주목받는 상황을 상징한다. 원숭이는 영리하고 손재주가 좋은 동물로 여겨지는 한편, 가볍고 꾀가 많은 성질을 함께 떠올리게 한다. 재주를 보며 즐거웠다면 주변의 재미있는 사람 덕분에 분위기가 밝아진다는 뜻으로 풀이된다. 다만 재주가 지나치게 요란했다면 겉으로 보이는 말솜씨에 쉽게 마음을 주지 말라는 뜻으로 해석된다.","emoji":"🐒","tags":["원숭이","재치"],"keywords":["원숭이","원숭이꿈","원숭이 재주 꿈","원숭이꿈 해몽"],"luck_index":52,"is_warning":false,"mood_tags":["신기함"],"is_lucky":"neutral","conditions":[{"if":"원숭이가 재주를 마치고 손을 내밀면","then":"누군가 대가를 바라고 다가올 수 있다는 뜻으로 풀이된다"}]},
{"id":"animal-034","category_id":"animal","title":"원숭이에게 물건을 빼앗기는 꿈","preview":"약삭빠른 사람에게 몫을 빼앗길 수 있다는 흉몽","description":"원숭이가 재빨리 다가와 손에 든 물건을 낚아채 가는 꿈은 방심한 틈에 자기 몫을 잃는 상황을 상징한다. 원숭이의 날랜 손놀림은 약삭빠르게 이익을 챙기는 사람을 뜻해, 가까운 곳에서 잇속을 노리는 이가 있음을 알려 준다고 풀이된다. 빼앗긴 물건이 지갑이나 돈이었다면 금전 거래에서 손해를 조심하라는 뜻이다. 큰일로 번질 꿈은 아니니 계약서와 약속을 한 번 더 확인하면 충분하다.","emoji":"🐒","tags":["흉몽","원숭이","손실"],"keywords":["원숭이","원숭이에게 뺏기는 꿈","원숭이꿈 흉몽"],"luck_index":32,"is_warning":true,"mood_tags":["당황"],"is_lucky":"unlucky","conditions":[{"if":"빼앗긴 물건을 다시 되찾으면","then":"잃을 뻔한 것을 지켜 내고 오히려 상대의 속셈을 알게 된다는 뜻이다"}]},
{"id":"animal-035","category_id":"animal","title":"독수리가 하늘 높이 나는 꿈","preview":"높은 자리에 오르고 뜻을 크게 펼치게 되는 길몽","description":"독수리가 넓은 하늘을 높이 날며 맴도는 꿈은 큰 뜻을 품고 높은 곳에 오르는 것을 상징한다. 독수리는 하늘의 새 가운데 으뜸으로 여겨져 권위와 넓은 시야를 뜻해 왔다. 날개를 크게 펼친 모습이 당당했다면 승진이나 시험처럼 위로 올라가는 일에서 좋은 결과를 얻는다는 뜻으로 풀이된다. 독수리가 자기 머리 위를 맴돌았다면 윗사람의 눈에 들어 중요한 일을 맡게 된다는 뜻으로 해석된다.","emoji":"🦅","tags":["길몽","출세","독수리"],"keywords":["독수리","독수리꿈","독수리 나는 꿈","독수리꿈 해몽"],"luck_index":82,"is_warning":false,"mood_tags":["벅참"],"is_lucky":"lucky","conditions":[{"if":"독수리가 내려와 어깨에 앉으면","then":"든든한 후원자를 얻어 힘을 보태 받는다는 뜻이다"}]},
{"id":"animal-036","category_id":"animal","title":"독수리가 먹이를 낚아채는 꿈","preview":"놓치기 쉬운 기회를 정확히 붙잡게 되는 길몽","description":"독수리가 단숨에 내려와 먹이를 낚아채는 꿈은 때를 놓치지 않고 기회를 붙잡는 것을 상징한다. 높은 곳에서 오래 살피다 정확한 순간에 움직이는 독수리는 판단력과 결단을 뜻한다. 사냥이 한 번에 성공했다면 오래 노려 온 일이 단번에 풀린다는 뜻으로 풀이된다. 자신이 독수리가 된 듯 느껴졌다면 망설이던 결정을 내려도 좋을 때라는 뜻으로 해석된다.","emoji":"🦅","tags":["길몽","기회","독수리"],"keywords":["독수리","독수리 사냥 꿈","독수리 먹이 꿈"],"luck_index":75,"is_warning":false,"mood_tags":["긴장","뿌듯함"],"is_lucky":"lucky","conditions":[{"if":"독수리가 먹이를 놓치면","then":"서두르기보다 한 번 더 때를 살피라는 뜻으로 풀이된다"}]},
{"id":"animal-037","category_id":"animal","title":"여우가 집 안으로 들어오는 꿈","preview":"달콤한 말로 다가오는 사람을 가려 봐야 하는 흉몽","description":"여우가 슬그머니 집 안으로 들어오는 꿈은 속마음을 감춘 사람이 생활 가까이 들어오는 상황을 상징한다. 여우는 예로부터 꾀가 많고 사람을 홀리는 동물로 여겨져, 겉과 속이 다른 관계를 뜻해 왔다. 여우가 온순한 척 다가왔다면 지나치게 듣기 좋은 제안이나 부탁을 조심하라는 뜻으로 풀이된다. 미리 알아차린 것만으로도 손해를 피할 수 있으니 돈이 오가는 약속은 천천히 정하는 것이 좋다.","emoji":"🦊","tags":["흉몽","여우","구설"],"keywords":["여우","여우꿈","여우 들어오는 꿈","여우꿈 해몽"],"luck_index":33,"is_warning":true,"mood_tags":["불안"],"is_lucky":"unlucky","conditions":[{"if":"여우를 집 밖으로 내쫓으면","then":"속셈을 품은 사람을 스스로 멀리하게 된다는 뜻이다"}]},
{"id":"animal-038","category_id":"animal","title":"여우를 잡는 꿈","preview":"숨은 속임수를 간파하고 내 몫을 지켜 내는 길몽","description":"꾀 많은 여우를 직접 붙잡는 꿈은 숨겨진 속셈을 꿰뚫어 보고 상황을 주도하는 것을 상징한다. 여우는 쉽게 잡히지 않는 영리한 짐승이라, 그것을 손에 넣는 것은 남보다 한발 앞선 판단을 뜻한다. 경쟁이나 협상을 앞두고 있다면 유리한 위치에 서게 된다는 뜻으로 풀이된다. 잡은 여우의 털이 곱고 윤기가 났다면 뜻밖의 이익까지 함께 따라온다는 뜻으로 해석된다.","emoji":"🦊","tags":["길몽","여우","승리"],"keywords":["여우","여우 잡는 꿈","여우꿈 길몽"],"luck_index":72,"is_warning":false,"mood_tags":["후련함"],"is_lucky":"lucky","conditions":[{"if":"잡았던 여우가 다시 달아나면","then":"마지막까지 긴장을 늦추지 말라는 뜻으로 풀이된다"}]},
{"id":"animal-039","category_id":"animal","title":"늑대에게 쫓기는 꿈","preview":"경쟁과 압박이 커지니 혼자 버티지 말라는 흉몽","description":"늑대가 뒤를 쫓아오는 꿈은 경쟁이나 주변의 요구가 거세게 몰려오는 상황을 상징한다. 늑대는 무리를 지어 끈질기게 따라붙는 짐승이라, 한꺼번에 밀려드는 부담과 견제를 뜻한다. 쫓기며 숨이 찼다면 몸과 마음이 지쳐 있다는 신호이니 일의 양을 조절하라는 뜻으로 풀이된다. 혼자 감당하기보다 믿을 만한 사람과 짐을 나누면 걱정한 일도 생각보다 수월하게 지나간다.","emoji":"🐺","tags":["흉몽","늑대","압박"],"keywords":["늑대","늑대꿈","늑대에게 쫓기는 꿈","늑대꿈 해몽"],"luck_index":32,"is_warning":true,"mood_tags":["긴장"],"is_lucky":"unlucky","conditions":[{"if":"쫓기다가 문을 닫고 안전한 곳에 숨으면","then":"어려움 속에서도 기댈 곳을 찾아 무사히 넘긴다는 뜻이다"}]},
{"id":"animal-040","category_id":"animal","title":"늑대를 물리치는 꿈","preview":"버거웠던 상대를 이겨 내고 내 자리를 지키는 길몽","description":"달려드는 늑대를 맞서 물리치는 꿈은 버겁게 느껴지던 상대나 문제를 스스로 이겨 내는 것을 상징한다. 늑대는 사납고 끈질긴 위협을 뜻해, 그것을 쫓아내는 것은 그만큼 힘과 용기가 차올랐음을 보여 준다. 늑대가 꼬리를 내리고 달아났다면 경쟁에서 확실히 앞서게 된다는 뜻으로 풀이된다. 주변 사람과 함께 물리쳤다면 협력이 성공의 열쇠가 된다는 뜻으로 해석된다.","emoji":"🐺","tags":["길몽","늑대","승리"],"keywords":["늑대","늑대 물리치는 꿈","늑대 이기는 꿈"],"luck_index":74,"is_warning":false,"mood_tags":["후련함"],"is_lucky":"lucky","conditions":[{"if":"늑대가 무리로 다시 몰려오면","then":"한 번의 승리에 안심하지 말고 대비를 이어 가라는 뜻이다"}]},
{"id":"animal-041","category_id":"animal","title":"코끼리를 타는 꿈","preview":"큰 힘을 등에 업고 한 단계 높은 자리에 오르는 길몽","description":"커다란 코끼리 등에 올라타는 꿈은 든든한 힘을 얻어 한 단계 높은 자리에 서는 것을 상징한다. 코끼리는 크고 묵직하면서도 온순한 동물로, 흔들림 없는 권위와 오래가는 복을 뜻해 왔다. 코끼리가 천천히 걸으며 자신을 태워 주었다면 서두르지 않아도 일이 안정적으로 커진다는 뜻으로 풀이된다. 높은 곳에서 멀리 내다보였다면 앞날의 방향이 뚜렷해진다는 뜻으로 해석된다.","emoji":"🐘","tags":["길몽","출세","코끼리"],"keywords":["코끼리","코끼리꿈","코끼리 타는 꿈","코끼리꿈 해몽"],"luck_index":85,"is_warning":false,"mood_tags":["벅참"],"is_lucky":"lucky","conditions":[{"if":"코끼리 등에서 미끄러지면","then":"좋은 기회를 얻더라도 겸손하게 자리를 다지라는 뜻으로 풀이된다"}]},
{"id":"animal-042","category_id":"animal","title":"코끼리가 집으로 들어오는 꿈","preview":"집안에 크고 오래가는 복이 자리를 잡는 길몽","description":"코끼리가 대문을 지나 집 안으로 들어오는 꿈은 커다란 복이 생활 속에 자리 잡는 것을 상징한다. 코끼리는 덩치만큼 넉넉한 재물과 장수를 뜻하는 동물로 여겨져 왔다. 코끼리가 편안하게 머물렀다면 집안 살림이 오래도록 든든해진다는 뜻으로 풀이된다. 아이를 기다리는 집이라면 듬직하고 너그러운 아이를 얻는 태몽으로도 해석된다.","emoji":"🐘","tags":["길몽","재물","코끼리"],"keywords":["코끼리","코끼리 들어오는 꿈","코끼리 태몽"],"luck_index":82,"is_warning":false,"mood_tags":["설렘"],"is_lucky":"lucky","conditions":[{"if":"코끼리가 문이 좁아 들어오지 못하면","then":"복을 담을 준비가 아직 덜 되었으니 자리를 넓히라는 뜻이다"}]},
{"id":"animal-043","category_id":"animal","title":"개구리가 집 안으로 뛰어드는 꿈","preview":"뜻밖의 수입과 반가운 손님이 찾아오는 길몽","description":"개구리가 펄쩍 뛰어 집 안으로 들어오는 꿈은 예상하지 못한 이득이 생활 안으로 들어오는 것을 상징한다. 개구리는 알을 많이 낳고 비를 부르는 동물로 여겨져 불어남과 풍요를 뜻해 왔다. 여러 마리가 한꺼번에 들어왔다면 작은 수입이 여러 갈래로 모인다는 뜻으로 풀이된다. 개구리 빛깔이 밝고 선명했다면 기다리던 사람에게서 좋은 연락이 온다는 뜻으로 해석된다.","emoji":"🐸","tags":["길몽","재물","개구리"],"keywords":["개구리","개구리꿈","개구리 들어오는 꿈","개구리꿈 해몽"],"luck_index":76,"is_warning":false,"mood_tags":["반가움"],"is_lucky":"lucky","conditions":[{"if":"개구리가 들어왔다가 곧 다시 나가면","then":"들어온 돈이 쉽게 빠져나갈 수 있으니 지출을 살피라는 뜻이다"}]},
{"id":"animal-044","category_id":"animal","title":"개구리가 우는 소리를 듣는 꿈","preview":"주변에서 들려오는 소식과 말에 귀 기울이게 되는 꿈","description":"개구리 울음소리가 들려오는 꿈은 주변에서 오가는 이야기와 소식이 많아지는 시기를 상징한다. 개구리 울음은 비 소식을 알리는 소리로 여겨져, 다가올 변화를 미리 알려 주는 신호로 받아들여졌다. 소리가 정겹게 들렸다면 반가운 연락이나 모임이 생긴다는 뜻으로 풀이된다. 시끄럽게 느껴졌다면 남의 말에 휩쓸리지 말고 필요한 이야기만 가려 들으라는 뜻으로 해석된다.","emoji":"🐸","tags":["개구리","소식"],"keywords":["개구리","개구리 우는 꿈","개구리 울음 꿈"],"luck_index":58,"is_warning":false,"mood_tags":["차분함"],"is_lucky":"neutral","conditions":[{"if":"울음소리가 갑자기 그치면","then":"기다리던 소식이 조금 늦어질 수 있다는 뜻으로 풀이된다"}]},
{"id":"animal-045","category_id":"animal","title":"나비가 날아드는 꿈","preview":"좋은 인연과 기쁜 소식이 가볍게 찾아오는 길몽","description":"나비가 팔랑이며 곁으로 날아드는 꿈은 반가운 사람이나 기쁜 일이 자연스럽게 다가오는 것을 상징한다. 나비는 꽃을 찾아다니는 모습 때문에 사랑과 화합, 그리고 새로운 시작을 뜻해 왔다. 나비가 몸이나 손에 살포시 앉았다면 마음이 통하는 인연을 만나게 된다는 뜻으로 풀이된다. 여러 마리가 함께 춤추듯 날았다면 모임이나 행사에서 즐거운 일이 생긴다는 뜻으로 해석된다.","emoji":"🦋","tags":["길몽","인연","나비"],"keywords":["나비","나비꿈","나비 날아드는 꿈","나비꿈 해몽"],"luck_index":74,"is_warning":false,"mood_tags":["설렘"],"is_lucky":"lucky","conditions":[{"if":"나비가 곧 멀리 날아가 버리면","then":"찾아온 인연을 붙잡으려면 먼저 마음을 표현하라는 뜻이다"}]},
{"id":"animal-046","category_id":"animal","title":"나비가 고치에서 나오는 꿈","preview":"오래 준비한 일이 마침내 모습을 드러내는 길몽","description":"번데기 고치를 뚫고 나비가 날개를 펴는 꿈은 오랜 준비 끝에 새로운 모습으로 거듭나는 것을 상징한다. 고치는 겉으로 보이지 않게 힘을 기르는 시간을, 날개를 편 나비는 그 결실을 뜻한다. 날개가 크고 빛깔이 고왔다면 공부나 일의 성과가 남들 눈에 띄게 드러난다는 뜻으로 풀이된다. 이직이나 이사처럼 환경을 바꾸려는 사람에게는 변화가 좋은 방향으로 흐른다는 뜻으로 해석된다.","emoji":"🦋","tags":["길몽","변화","나비"],"keywords":["나비","나비 탈피 꿈","번데기 꿈"],"luck_index":78,"is_warning":false,"mood_tags":["벅참"],"is_lucky":"lucky","conditions":[{"if":"나비가 고치에서 나오다 멈추면","then":"조급해하지 말고 조금 더 힘을 기르라는 뜻으로 풀이된다"}]},
{"id":"animal-047","category_id":"animal","title":"상어에게 쫓기는 꿈","preview":"날카로운 경쟁자와 금전 다툼을 조심하라는 흉몽","description":"물속에서 상어가 뒤를 쫓아오는 꿈은 익숙하지 않은 환경에서 거센 경쟁이나 견제를 받는 상황을 상징한다. 상어는 바닷속의 강한 포식자라, 이익을 두고 날카롭게 맞서는 상대를 뜻한다. 쫓기는 동안 물이 탁했다면 상황이 잘 보이지 않으니 큰 결정을 잠시 미루라는 뜻으로 풀이된다. 무리한 투자나 다툼만 피하면 손해 없이 지나갈 수 있는 꿈이다.","emoji":"🦈","tags":["흉몽","상어","경쟁"],"keywords":["상어","상어꿈","상어에게 쫓기는 꿈","상어꿈 해몽"],"luck_index":30,"is_warning":true,"mood_tags":["긴장"],"is_lucky":"unlucky","conditions":[{"if":"쫓기다 배나 육지로 무사히 올라오면","then":"위기를 벗어나 안전한 자리를 되찾는다는 뜻이다"}]},
{"id":"animal-048","category_id":"animal","title":"상어를 잡는 꿈","preview":"강한 상대를 넘어서고 큰 이익을 손에 쥐는 길몽","description":"커다란 상어를 낚거나 붙잡는 꿈은 만만치 않은 상대를 넘어서고 큰 성과를 거두는 것을 상징한다. 상어는 쉽게 다룰 수 없는 힘센 물고기라, 그것을 잡는 것은 능력과 배짱을 인정받는 일로 여겨진다. 잡은 상어가 컸을수록 손에 들어오는 이익이나 성과도 크다는 뜻으로 풀이된다. 경쟁 입찰이나 시험을 앞두고 있다면 좋은 결과를 기대해도 된다는 뜻으로 해석된다.","emoji":"🦈","tags":["길몽","재물","상어"],"keywords":["상어","상어 잡는 꿈","상어꿈 길몽"],"luck_index":78,"is_warning":false,"mood_tags":["뿌듯함"],"is_lucky":"lucky","conditions":[{"if":"잡은 상어를 다시 놓아주면","then":"욕심을 덜어 낸 덕분에 사람들의 신뢰를 얻는다는 뜻이다"}]},
{"id":"animal-049","category_id":"animal","title":"고래를 보는 꿈","preview":"생각보다 큰 재물과 기회가 가까이 다가오는 길몽","description":"넓은 바다에서 고래가 헤엄치는 모습을 보는 꿈은 그릇이 큰 기회나 재물이 가까이 다가오는 것을 상징한다. 고래는 바다에서 가장 큰 생물이라 넉넉한 복과 너른 마음을 뜻해 왔다. 고래가 물을 높이 뿜어 올렸다면 오래 쌓아 둔 운이 한꺼번에 터져 나온다는 뜻으로 풀이된다. 아이를 기다리는 집에서는 마음이 넓고 크게 될 아이를 얻는 태몽으로도 해석된다.","emoji":"🐋","tags":["길몽","재물","고래"],"keywords":["고래","고래꿈","고래 보는 꿈","고래꿈 해몽"],"luck_index":84,"is_warning":false,"mood_tags":["벅참"],"is_lucky":"lucky","conditions":[{"if":"고래가 금세 깊은 곳으로 사라지면","then":"기회가 왔을 때 망설이지 말고 잡으라는 뜻으로 풀이된다"}]},
{"id":"animal-050","category_id":"animal","title":"고래 등에 올라타는 꿈","preview":"큰 흐름에 올라 뜻을 멀리 펼치게 되는 길몽","description":"거대한 고래의 등에 올라타 바다를 가르는 꿈은 큰 흐름의 도움을 받아 멀리 나아가는 것을 상징한다. 고래는 깊고 넓은 바다를 거침없이 다니는 존재라, 그 등에 오르는 것은 힘 있는 조직이나 사람의 지원을 뜻한다. 물결이 잔잔했다면 계획한 일이 큰 장애 없이 순조롭게 커진다는 뜻으로 풀이된다. 해외나 먼 지역과 관련된 일을 하고 있다면 그쪽에서 좋은 기회가 열린다는 뜻으로 해석된다.","emoji":"🐋","tags":["길몽","출세","고래"],"keywords":["고래","고래 타는 꿈","고래 등 꿈"],"luck_index":86,"is_warning":false,"mood_tags":["벅참"],"is_lucky":"lucky","conditions":[{"if":"고래가 물속으로 들어가 몸이 젖으면","then":"큰일을 맡기 전에 체력과 마음을 먼저 챙기라는 뜻이다"}]},
{"id":"people-031","category_id":"people","title":"짝사랑하는 사람이 나오는 꿈","preview":"말하지 못한 마음이 꿈속에서 모습을 드러낸 꿈","description":"짝사랑하는 사람이 꿈에 나타나는 것은 낮 동안 마음속에 담아 둔 생각이 잠든 사이 모습을 드러낸 것이다. 좋아하는 상대를 자주 떠올릴수록 꿈에도 나오기 쉬워, 이 꿈은 상대의 마음보다 자신의 마음이 얼마나 큰지를 보여 준다. 꿈속 분위기가 따뜻했다면 관계를 조금 더 가까이 가져가 보고 싶다는 바람이 담긴 것으로 풀이된다. 설레는 마음을 부담으로 여기기보다 작은 인사나 대화로 자연스럽게 표현해 보라는 뜻으로 해석된다.","emoji":"💘","tags":["짝사랑","인연"],"keywords":["짝사랑","짝사랑 꿈","짝사랑하는 사람 꿈","좋아하는 사람 꿈"],"luck_index":55,"is_warning":false,"mood_tags":["설렘","그리움"],"is_lucky":"neutral","conditions":[{"if":"상대가 꿈속에서 먼저 말을 걸어오면","then":"관계를 시작할 용기가 차오르고 있다는 뜻으로 풀이된다"}]},
{"id":"people-032","category_id":"people","title":"짝사랑하는 사람에게 고백받는 꿈","preview":"마음을 확인받고 싶은 바람과 자신감이 담긴 꿈","description":"짝사랑하는 사람에게서 고백을 받는 꿈은 상대에게 인정받고 싶은 바람이 꿈속에서 이루어진 모습이다. 고백은 오랫동안 숨겨 온 마음이 밖으로 나오는 순간을 뜻해, 관계가 한 걸음 나아가기를 바라는 마음을 비춘다. 꿈에서 기쁨이 컸다면 자신감이 붙고 있어 현실에서도 먼저 다가갈 힘이 생긴다는 뜻으로 풀이된다. 꿈을 그대로 믿기보다 상대와 편하게 나눌 수 있는 이야깃거리를 늘려 가라는 뜻으로 해석된다.","emoji":"💌","tags":["짝사랑","고백"],"keywords":["짝사랑","고백받는 꿈","짝사랑 고백 꿈"],"luck_index":60,"is_warning":false,"mood_tags":["설렘"],"is_lucky":"neutral","conditions":[{"if":"고백을 받고도 대답하지 못하면","then":"아직 마음을 정리할 시간이 필요하다는 뜻이다"}]},
{"id":"people-033","category_id":"people","title":"짝사랑하는 사람이 다른 사람과 있는 꿈","preview":"놓칠까 하는 조바심이 커져 있음을 알려 주는 꿈","description":"짝사랑하는 사람이 다른 누군가와 다정하게 있는 꿈은 상대를 놓칠지 모른다는 조바심이 커진 상태를 보여 준다. 마음을 전하지 못한 채 기다리는 시간이 길어질수록 이런 장면이 꿈에 자주 나타난다. 꿈을 꾸고 속상했다면 그만큼 상대가 소중하다는 뜻이니 지금의 마음을 스스로 인정하라는 뜻으로 풀이된다. 실제 상황과는 상관없는 경우가 많으니 꿈 때문에 성급하게 단정하지 않는 것이 좋다.","emoji":"💔","tags":["짝사랑","불안"],"keywords":["짝사랑","짝사랑 다른 사람 꿈","좋아하는 사람 연애 꿈"],"luck_index":45,"is_warning":false,"mood_tags":["아쉬움","불안"],"is_lucky":"neutral","conditions":[{"if":"꿈속에서 담담하게 지켜보았다면","then":"마음이 정리되며 새로운 관계를 맞을 준비가 되었다는 뜻이다"}]},
{"id":"people-034","category_id":"people","title":"연인과 키스하는 꿈","preview":"관계가 깊어지고 마음이 가까워지기를 바라는 꿈","description":"연인이나 좋아하는 사람과 입을 맞추는 꿈은 서로의 마음이 더 가까워지기를 바라는 마음을 상징한다. 입맞춤은 말보다 깊은 신뢰와 애정을 나누는 행동이라, 관계에 대한 기대와 안정감이 꿈에 드러난 것이다. 분위기가 편안하고 따뜻했다면 지금 관계가 좋은 흐름을 타고 있다는 뜻으로 풀이된다. 키스가 어색하게 느껴졌다면 서로 속도를 맞추는 대화가 필요하다는 뜻으로 해석된다.","emoji":"💋","tags":["키스","애정"],"keywords":["키스","키스 꿈","키스하는 꿈","키스꿈 해몽","뽀뽀 꿈"],"luck_index":65,"is_warning":false,"mood_tags":["설렘"],"is_lucky":"neutral","conditions":[{"if":"연인이 키스를 피하면","then":"상대에게 서운한 마음이 쌓여 있지 않은지 살펴보라는 뜻이다"}]},
{"id":"people-035","category_id":"people","title":"모르는 사람과 키스하는 꿈","preview":"새로운 경험과 낯선 기회에 마음이 열리는 꿈","description":"얼굴을 모르는 사람과 키스하는 꿈은 익숙하지 않은 일이나 사람에게 마음이 열리고 있음을 상징한다. 꿈속의 낯선 상대는 특정한 누군가라기보다 아직 겪어 보지 않은 새로운 경험을 뜻한다. 당황스럽지만 싫지 않았다면 새로운 모임이나 일에서 뜻밖의 즐거움을 찾게 된다는 뜻으로 풀이된다. 연인이 있는데 이런 꿈을 꾸었다면 관계에 새로운 활력이 필요하다는 마음이 드러난 것으로 해석된다.","emoji":"💋","tags":["키스","새로운 만남"],"keywords":["키스","모르는 사람 키스 꿈","낯선 사람 키스 꿈"],"luck_index":50,"is_warning":false,"mood_tags":["당황","신기함"],"is_lucky":"neutral","conditions":[{"if":"키스 뒤에 상대의 얼굴이 아는 사람으로 바뀌면","then":"그 사람에게 생각보다 마음이 가 있다는 뜻으로 풀이된다"}]},
{"id":"people-036","category_id":"people","title":"연인이 바람피우는 꿈","preview":"관계를 잃을까 하는 불안이 커져 있다는 꿈","description":"연인이 다른 사람과 바람을 피우는 꿈은 상대가 떠날지도 모른다는 불안이 마음속에 쌓여 있음을 보여 준다. 이런 꿈은 실제 상대의 행동보다 자신이 관계에서 충분히 사랑받고 있는지 확인하고 싶은 마음에서 비롯되는 경우가 많다. 꿈에서 크게 화가 났다면 최근 서운했던 일을 미뤄 두지 말고 이야기하라는 뜻으로 풀이된다. 예로부터 꿈속의 이별이나 배신은 현실의 관계가 오히려 단단해지는 계기로 해석되기도 한다.","emoji":"💔","tags":["바람","불안","연인"],"keywords":["바람피우는 꿈","애인이 바람피우는 꿈","바람꿈 해몽","외도 꿈"],"luck_index":48,"is_warning":false,"mood_tags":["불안","배신감"],"is_lucky":"neutral","conditions":[{"if":"바람피운 상대를 용서하고 다시 손을 잡으면","then":"관계의 위기를 대화로 넘기며 더 깊은 믿음이 생긴다는 뜻이다"}]},
{"id":"people-037","category_id":"people","title":"내가 바람피우는 꿈","preview":"지금의 관계에 새로운 활력이 필요하다는 꿈","description":"자신이 연인이나 배우자를 두고 다른 사람을 만나는 꿈은 반복되는 일상에서 잠시 벗어나고 싶은 마음을 상징한다. 꿈속의 다른 상대는 실제 사람이라기보다 지금 생활에 부족하다고 느끼는 설렘이나 자유를 뜻하는 경우가 많다. 꿈에서 죄책감이 컸다면 현재 관계를 소중히 여기는 마음이 그만큼 크다는 뜻으로 풀이된다. 연인과 함께 새로운 곳에 가거나 새로운 일을 해 보며 관계에 활력을 더하라는 뜻으로 해석된다.","emoji":"🙈","tags":["바람","일탈"],"keywords":["바람피우는 꿈","내가 바람피우는 꿈","외도하는 꿈"],"luck_index":45,"is_warning":false,"mood_tags":["당황","불안"],"is_lucky":"neutral","conditions":[{"if":"바람피우다 들켜 진땀을 흘리면","then":"미뤄 둔 문제를 솔직하게 털어놓을 때가 되었다는 뜻이다"}]},
{"id":"people-038","category_id":"people","title":"배우자가 바람피우는 꿈","preview":"부부 사이에 더 많은 관심과 대화가 필요하다는 꿈","description":"남편이나 아내가 다른 사람과 바람을 피우는 꿈은 배우자의 관심이 줄었다고 느끼는 서운함을 상징한다. 함께 보내는 시간이 짧아지거나 대화가 줄었을 때 이런 꿈이 자주 찾아온다. 꿈속에서 배우자를 붙잡으려 애썼다면 관계를 지키고 싶은 마음이 크다는 뜻으로 풀이된다. 꿈 내용을 그대로 의심하기보다 함께하는 시간을 의도적으로 늘리는 계기로 삼으라는 뜻으로 해석된다.","emoji":"💔","tags":["바람","부부"],"keywords":["바람피우는 꿈","남편 바람 꿈","아내 바람 꿈","배우자 외도 꿈"],"luck_index":46,"is_warning":false,"mood_tags":["불안","배신감"],"is_lucky":"neutral","conditions":[{"if":"배우자가 꿈속에서 먼저 사과하면","then":"서로 마음을 털어놓을 기회가 곧 생긴다는 뜻이다"}]},
{"id":"people-039","category_id":"people","title":"배우자와 이혼하는 꿈","preview":"관계를 새롭게 정리하고 다지는 계기가 되는 꿈","description":"배우자와 이혼 서류에 도장을 찍는 꿈은 관계의 한 시기를 정리하고 새로운 방식으로 나아가려는 마음을 상징한다. 이혼은 끝을 뜻하지만 꿈에서는 흔히 묵은 습관이나 역할을 바꾸는 변화로 나타난다. 꿈에서 오히려 홀가분했다면 그동안 혼자 짊어진 부담을 나누고 싶다는 뜻으로 풀이된다. 예로부터 이런 꿈은 현실의 부부 사이가 다시 가까워지는 반대의 뜻으로 해석되기도 한다.","emoji":"📄","tags":["이혼","부부","변화"],"keywords":["이혼","이혼하는 꿈","이혼 꿈 해몽","남편과 이혼하는 꿈"],"luck_index":50,"is_warning":false,"mood_tags":["불안","후련함"],"is_lucky":"neutral","conditions":[{"if":"이혼 뒤에 다시 배우자를 만나 웃으면","then":"갈등을 넘기고 관계가 새롭게 회복된다는 뜻이다"}]},
{"id":"people-040","category_id":"people","title":"부모님이 이혼하는 꿈","preview":"집안의 안정에 대한 걱정이 마음에 쌓여 있는 꿈","description":"부모님이 서로 헤어지는 꿈은 집안의 분위기나 가족 관계에 대한 염려가 마음에 쌓여 있음을 보여 준다. 부모님은 생활의 뿌리와 안정감을 뜻해, 그 관계가 흔들리는 장면은 자신이 기댈 곳이 약해진 듯한 불안을 비춘다. 최근 가족 사이에 다툼이나 변화가 있었다면 그 일을 마음속에서 정리하는 과정으로 풀이된다. 부모님께 안부를 묻거나 함께 식사하는 작은 시간이 마음을 한결 편하게 해 준다는 뜻으로 해석된다.","emoji":"🏠","tags":["이혼","부모님","가족"],"keywords":["이혼","부모님 이혼 꿈","부모 이혼하는 꿈"],"luck_index":45,"is_warning":false,"mood_tags":["불안","슬픔"],"is_lucky":"neutral","conditions":[{"if":"꿈속에서 부모님이 다시 화해하면","then":"가족 사이의 걱정이 자연스럽게 풀려 간다는 뜻이다"}]},
{"id":"body-040","category_id":"body","title":"수술을 받는 꿈","preview":"묵은 문제를 덜어 내고 새롭게 회복되는 길몽","description":"수술대에 누워 수술을 받는 꿈은 오래 끌어 온 고민이나 걸림돌을 도려내고 새로 출발하는 것을 상징한다. 수술은 아픈 곳을 정확히 찾아 고치는 일이라, 미뤄 둔 문제를 근본부터 해결하는 과정을 뜻한다. 수술이 무사히 끝나고 마음이 놓였다면 복잡하던 일이 깔끔하게 정리된다는 뜻으로 풀이된다. 실제 건강을 염려하기보다 생활 습관을 한번 돌아보고 몸을 쉬게 하라는 가벼운 신호로 받아들이면 된다.","emoji":"🏥","tags":["길몽","회복","수술"],"keywords":["수술","수술 꿈","수술받는 꿈","수술꿈 해몽"],"luck_index":72,"is_warning":false,"mood_tags":["긴장","안도"],"is_lucky":"lucky","conditions":[{"if":"수술 도중에 깨어나 불안했다면","then":"해결을 서두르기보다 충분히 준비하고 움직이라는 뜻이다"}]},
{"id":"body-041","category_id":"body","title":"가족이 수술을 받는 꿈","preview":"가족을 아끼는 마음과 걱정이 함께 담긴 꿈","description":"가족이 수술실로 들어가는 모습을 보는 꿈은 가까운 사람을 아끼는 마음과 염려가 함께 드러난 것이다. 수술은 어려운 고비를 넘는 과정을 뜻해, 가족이 겪고 있는 고민을 대신 짊어지고 싶은 마음을 비춘다. 수술이 잘 끝났다는 말을 들었다면 가족의 문제가 머지않아 좋게 풀린다는 뜻으로 풀이된다. 꿈에 나온 가족에게 안부를 전하고 이야기를 들어 주라는 뜻으로 해석된다.","emoji":"🏥","tags":["수술","가족"],"keywords":["수술","가족 수술 꿈","부모님 수술 꿈"],"luck_index":52,"is_warning":false,"mood_tags":["걱정"],"is_lucky":"neutral","conditions":[{"if":"수술실 앞에서 오래 기다리면","then":"가족의 일이 해결되기까지 시간이 조금 걸리니 곁에서 기다려 주라는 뜻이다"}]},
{"id":"daily-031","category_id":"daily","title":"약속이나 출근에 지각하는 꿈","preview":"할 일에 쫓겨 마음이 조급해져 있다는 꿈","description":"약속이나 출근 시간에 늦어 허둥대는 꿈은 해야 할 일이 많아 마음이 쫓기고 있음을 보여 준다. 시간에 늦는 장면은 기대에 미치지 못할까 하는 부담이나 준비가 덜 되었다는 느낌을 비춘다. 꿈속에서 시계를 계속 확인했다면 일정이 빠듯하다는 신호이니 우선순위를 정리하라는 뜻으로 풀이된다. 늦었지만 결국 도착했다면 걱정한 것보다 일이 무난하게 마무리된다는 뜻으로 해석된다.","emoji":"⏰","tags":["지각","조급함"],"keywords":["지각","지각하는 꿈","늦는 꿈","출근 늦는 꿈","약속에 늦는 꿈"],"luck_index":45,"is_warning":false,"mood_tags":["초조함"],"is_lucky":"neutral","conditions":[{"if":"늦었는데도 아무도 탓하지 않으면","then":"스스로에게 너무 엄격했으니 마음의 짐을 조금 내려놓으라는 뜻이다"}]},
{"id":"daily-032","category_id":"daily","title":"시험에 늦는 꿈","preview":"실력을 보여 줄 자리에 대한 부담이 커진 꿈","description":"시험장에 늦게 도착하거나 시험 시간을 놓치는 꿈은 평가를 앞두고 준비가 부족하다고 느끼는 부담을 보여 준다. 시험은 자신의 능력을 확인받는 자리라, 그곳에 늦는 장면은 기회를 놓칠까 하는 염려를 비춘다. 실제 시험이나 면접을 앞두고 있다면 긴장이 높아진 자연스러운 반응으로 풀이된다. 준비물과 시간을 미리 확인해 두면 마음이 한결 가벼워진다는 뜻으로 해석된다.","emoji":"📝","tags":["지각","시험","부담"],"keywords":["지각","시험에 늦는 꿈","시험 지각 꿈","늦는 꿈"],"luck_index":42,"is_warning":false,"mood_tags":["긴장"],"is_lucky":"neutral","conditions":[{"if":"늦었지만 시험을 무사히 치르면","then":"걱정과 달리 실력을 충분히 보여 줄 수 있다는 뜻이다"}]},
{"id":"daily-033","category_id":"daily","title":"누군가에게 납치당하는 꿈","preview":"내 뜻대로 하지 못하는 답답함이 드러난 꿈","description":"누군가에게 붙들려 어딘가로 끌려가는 꿈은 생활의 주도권을 잃은 듯한 답답함을 상징한다. 자기 의지와 상관없이 옮겨지는 장면은 남의 결정이나 일정에 휘둘리고 있다는 느낌을 비춘다. 꿈이 생생했더라도 실제 위험을 알리는 것이라기보다 지친 마음이 보내는 신호로 풀이된다. 거절해야 할 부탁은 거절하고 스스로 정할 수 있는 일부터 하나씩 되찾으라는 뜻으로 해석된다.","emoji":"🚐","tags":["납치","압박"],"keywords":["납치","납치 꿈","납치당하는 꿈","납치꿈 해몽","끌려가는 꿈"],"luck_index":40,"is_warning":false,"mood_tags":["불안"],"is_lucky":"neutral","conditions":[{"if":"납치한 사람이 아는 사람이면","then":"그 사람과의 관계에서 부담을 느끼고 있다는 뜻으로 풀이된다"}]},
{"id":"daily-034","category_id":"daily","title":"납치된 곳에서 빠져나오는 꿈","preview":"얽매였던 상황에서 벗어나 자유를 되찾는 길몽","description":"갇혀 있던 곳에서 스스로 빠져나오는 꿈은 자신을 묶어 두던 상황에서 벗어나 주도권을 되찾는 것을 상징한다. 탈출은 막힌 길을 스스로 여는 행동이라, 문제를 해결할 힘이 생겼다는 뜻으로 여겨진다. 빠져나온 뒤 밝은 곳에 섰다면 답답하던 일이 풀리고 마음이 홀가분해진다는 뜻으로 풀이된다. 누군가의 도움으로 나왔다면 주변에 믿을 만한 조력자가 있다는 뜻으로 해석된다.","emoji":"🚪","tags":["길몽","납치","해방"],"keywords":["납치","납치 탈출 꿈","탈출하는 꿈"],"luck_index":72,"is_warning":false,"mood_tags":["후련함"],"is_lucky":"lucky","conditions":[{"if":"빠져나오다 다시 붙잡히면","then":"해결이 눈앞이니 조금만 더 버티라는 뜻이다"}]},
{"id":"daily-035","category_id":"daily","title":"교통사고가 나는 꿈","preview":"속도를 늦추고 일정을 돌아보라는 신호의 꿈","description":"운전하거나 차를 타고 가다 사고가 나는 꿈은 일이나 생활의 속도가 지나치게 빨라졌다는 신호로 풀이된다. 차는 목표를 향해 나아가는 수단을 뜻해, 그것이 부딪히는 장면은 계획끼리 엇갈리거나 무리하고 있음을 비춘다. 크게 다치지 않고 차에서 내렸다면 놀랄 일이 있어도 무사히 넘긴다는 뜻으로 해석된다. 실제 사고를 예고하는 꿈이라기보다 쉬어 갈 때를 알려 주는 꿈이니 일정에 여유를 두면 충분하다.","emoji":"🚗","tags":["교통사고","속도 조절"],"keywords":["교통사고","교통사고 꿈","교통사고 나는 꿈","차 사고 꿈","교통사고꿈 해몽"],"luck_index":42,"is_warning":false,"mood_tags":["놀람"],"is_lucky":"neutral","conditions":[{"if":"사고 뒤에 차가 멀쩡하면","then":"걱정했던 일이 생각보다 가볍게 지나간다는 뜻이다"}]},
{"id":"daily-036","category_id":"daily","title":"교통사고를 목격하는 꿈","preview":"남의 일을 보며 교훈과 지혜를 얻게 되는 꿈","description":"길에서 다른 사람의 교통사고를 지켜보는 꿈은 주변에서 벌어지는 다툼이나 변화를 가까이서 보게 되는 상황을 상징한다. 자신이 직접 부딪히지 않고 바라보는 입장이라, 남의 일에서 교훈을 얻는다는 뜻으로 여겨진다. 사고 현장을 돕는 쪽이었다면 주변 사람에게 힘이 되어 주는 역할을 맡게 된다는 뜻으로 풀이된다. 남의 갈등에 깊이 끼어들기보다 한 발 떨어져 지켜보는 것이 좋다는 뜻으로 해석된다.","emoji":"🚦","tags":["교통사고","목격"],"keywords":["교통사고","교통사고 목격 꿈","사고 보는 꿈"],"luck_index":48,"is_warning":false,"mood_tags":["놀람"],"is_lucky":"neutral","conditions":[{"if":"사고 난 사람이 아는 사람이면","then":"그 사람에게 안부를 묻고 도움이 필요한지 살피라는 뜻이다"}]},
{"id":"daily-037","category_id":"daily","title":"교통사고에서 무사히 살아나는 꿈","preview":"큰 고비를 넘기고 오히려 흐름이 트이는 길몽","description":"교통사고가 났지만 다친 곳 없이 무사히 빠져나오는 꿈은 큰 고비를 넘기고 새로 시작하는 것을 상징한다. 위험한 장면에서 살아남는 것은 예로부터 액운을 미리 털어 내는 것으로 여겨졌다. 사고 뒤에 오히려 마음이 가벼워졌다면 오래 막혀 있던 일이 정리되고 흐름이 바뀐다는 뜻으로 풀이된다. 고비를 넘긴 만큼 앞으로는 계획을 차분히 세워 나가면 좋은 결과가 따른다는 뜻으로 해석된다.","emoji":"🚗","tags":["길몽","교통사고","고비"],"keywords":["교통사고","사고에서 살아나는 꿈","사고 났는데 무사한 꿈"],"luck_index":74,"is_warning":false,"mood_tags":["안도"],"is_lucky":"lucky","conditions":[{"if":"함께 탄 사람도 모두 무사하면","then":"가족이나 동료와 함께 어려움을 넘긴다는 뜻이다"}]}
]
$new$;
  kw_rows jsonb := $kw$
[
{"id":"body-012","old_keywords":["코피 나는 꿈","코피꿈 해몽","코피 흘리는 꿈"],"keywords":["코피 나는 꿈","코피꿈 해몽","코피 흘리는 꿈","피"]},
{"id":"lucky-028","old_keywords":["첫눈 꿈","첫눈 맞는 꿈","첫눈꿈 해몽"],"keywords":["첫눈 꿈","첫눈 맞는 꿈","첫눈꿈 해몽","눈"]},
{"id":"daily-004","old_keywords":["집짓는 꿈","기와집 꿈","새집 짓는 꿈"],"keywords":["집짓는 꿈","기와집 꿈","새집 짓는 꿈","집"]},
{"id":"lucky-022","old_keywords":["새집 얻는 꿈","좋은집 꿈","넓은집 꿈 해몽"],"keywords":["새집 얻는 꿈","좋은집 꿈","넓은집 꿈 해몽","집"]},
{"id":"lucky-018","old_keywords":["등불 꿈","등불꿈 해몽","밝은빛 꿈"],"keywords":["등불 꿈","등불꿈 해몽","밝은빛 꿈","불"]},
{"id":"lucky-020","old_keywords":["황금들판 꿈","들판 꿈","가을들판 꿈 해몽"],"keywords":["황금들판 꿈","들판 꿈","가을들판 꿈 해몽","금"]},
{"id":"crawled-047","old_keywords":["인기","몰락"],"keywords":["인기","몰락","꽃","분꽃"]},
{"id":"pregnancy-019","old_keywords":["박꽃꿈 태몽","박꽃 보는 꿈","박꽃 태몽"],"keywords":["박꽃꿈 태몽","박꽃 보는 꿈","박꽃 태몽","꽃"]},
{"id":"nature-009","old_keywords":["흙탕물 꿈","흙탕물에 빠지는 꿈","더러운 물 꿈"],"keywords":["흙탕물 꿈","흙탕물에 빠지는 꿈","더러운 물 꿈","물"]},
{"id":"nature-010","old_keywords":["큰물 꿈","홍수 꿈","물 넘치는 꿈"],"keywords":["큰물 꿈","홍수 꿈","물 넘치는 꿈","물"]},
{"id":"nature-019","old_keywords":["우물 마르는 꿈","우물꿈 해몽","샘물 마르는 꿈"],"keywords":["우물 마르는 꿈","우물꿈 해몽","샘물 마르는 꿈","물"]},
{"id":"pregnancy-017","old_keywords":["우물물꿈 태몽","우물 마시는 꿈","우물 태몽"],"keywords":["우물물꿈 태몽","우물 마시는 꿈","우물 태몽","물"]},
{"id":"unlucky-017","old_keywords":["검은강물 꿈","흐린물 꿈","강물꿈 흉몽"],"keywords":["검은강물 꿈","흐린물 꿈","강물꿈 흉몽","물"]},
{"id":"animal-020","old_keywords":["암말꿈","말이 집에 들어오는 꿈","결혼운 꿈"],"keywords":["암말꿈","말이 집에 들어오는 꿈","결혼운 꿈","말"]},
{"id":"crawled-112","old_keywords":["불","자동차","목표달성","성공","열정"],"keywords":["불","자동차","목표달성","성공","열정","차"]},
{"id":"daily-021","old_keywords":["기차 놓치는 꿈","버스 놓치는 꿈","놓치는 꿈 해몽"],"keywords":["기차 놓치는 꿈","버스 놓치는 꿈","놓치는 꿈 해몽","차"]},
{"id":"body-026","old_keywords":["손발 묶이는 꿈","묶이는 꿈 해몽","밧줄꿈"],"keywords":["손발 묶이는 꿈","묶이는 꿈 해몽","밧줄꿈","손","발"]},
{"id":"people-006","old_keywords":["부부꿈","잔치 꿈","이혼 꿈 해몽"],"keywords":["부부꿈","잔치 꿈","부부 꿈 해몽"]}
]
$kw$;
  n int;
begin
  -- 1) 점검 — 신규 id 가 다른 항목으로 이미 쓰이고 있으면 취소 (재실행으로 이미 들어간 같은 행은 통과)
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(new_rows) as e(id text, title text) using (id)
  where d.title is distinct from e.title;
  if n > 0 then
    raise exception '신규 id % 건이 다른 항목으로 이미 있습니다. 적용을 취소합니다.', n;
  end if;

  -- keywords 대상이 전부 있고, 생성 시점 값(또는 이미 반영된 새 값)인지
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(kw_rows) as e(id text, old_keywords text[], keywords text[]) using (id)
  where d.keywords = e.old_keywords or d.keywords = e.keywords;
  if n <> 18 then
    raise exception 'keywords 대상 % / 18 건만 생성 시점 값과 같습니다. build-migration.mjs 를 다시 돌리세요.', n;
  end if;

  -- 2) 백업 — PostgREST 에 노출되지 않는 backup 스키마. action = insert(되돌릴 때 삭제) / keywords(값 복구)
  create schema if not exists backup;
  create table if not exists backup.dream_items_0021 (
    id           text primary key,
    action       text not null check (action in ('insert', 'keywords')),
    keywords     text[],
    backed_up_at timestamptz not null default now()
  );
  insert into backup.dream_items_0021 (id, action, keywords)
  select d.id, 'keywords', d.keywords
  from public.dream_items d
  join jsonb_to_recordset(kw_rows) as e(id text) using (id)
  on conflict (id) do nothing;
  insert into backup.dream_items_0021 (id, action)
  select e.id, 'insert'
  from jsonb_to_recordset(new_rows) as e(id text)
  where not exists (select 1 from public.dream_items d where d.id = e.id)
  on conflict (id) do nothing;

  -- 3) 신규 항목
  insert into public.dream_items (
    id, category_id, title, preview, description, emoji,
    tags, keywords, bookmark_count, luck_index, is_warning,
    mood_tags, is_lucky, conditions, source_url
  )
  select e.id, e.category_id, e.title, e.preview, e.description, e.emoji,
         e.tags, e.keywords, 0, e.luck_index, e.is_warning,
         e.mood_tags, e.is_lucky, e.conditions, null
  from jsonb_to_recordset(new_rows) as e(
    id text, category_id text, title text, preview text, description text, emoji text,
    tags text[], keywords text[], luck_index integer, is_warning boolean,
    mood_tags jsonb, is_lucky text, conditions jsonb
  )
  on conflict (id) do nothing;

  -- 4) keywords 보완
  update public.dream_items d
  set keywords = e.keywords
  from jsonb_to_recordset(kw_rows) as e(id text, keywords text[])
  where d.id = e.id;

  -- 5) 결과 확인
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(new_rows) as e(id text, description text) using (id)
  where d.description = e.description;
  if n <> 39 then
    raise exception '신규 반영 확인 실패: % / 39 건. 적용을 취소합니다.', n;
  end if;
  select count(*) into n
  from public.dream_items d
  join jsonb_to_recordset(kw_rows) as e(id text, keywords text[]) using (id)
  where d.keywords = e.keywords;
  if n <> 18 then
    raise exception 'keywords 반영 확인 실패: % / 18 건. 적용을 취소합니다.', n;
  end if;

  raise notice '0021 적용 완료: 신규 39 건, keywords 18 건';
end
$mig$;
