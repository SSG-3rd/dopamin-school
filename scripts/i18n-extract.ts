// 콘텐츠 번역 원본을 만든다: content/i18n/ko.json (문장 키 → 한국어 원문).
// 콘텐츠 JSON의 문장을 고치면 이 스크립트를 다시 돌려 커밋한다. validate-content가 어긋남을 잡는다.
// 다른 언어(content/i18n/en.json 등)는 이 파일과 같은 키를 모두 가져야 한다.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONTENT_TEXT_KO } from '../src/engine/content';

const out = resolve(import.meta.dirname, '../content/i18n/ko.json');
writeFileSync(out, `${JSON.stringify(CONTENT_TEXT_KO, null, 2)}\n`);
console.log(`${Object.keys(CONTENT_TEXT_KO).length} keys → ${out}`);
