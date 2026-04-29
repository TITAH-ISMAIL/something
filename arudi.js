// arudi.js
// Arabic Unicode constants (matching pyarabic.araby)
const ALEF = '\u0627';
const ALEF_MADDA = '\u0622';
const ALEF_MAKSURA = '\u0649';
const DAMMA = '\u064f';
const DAMMATAN = '\u064c';
const FATHA = '\u064e';
const FATHATAN = '\u064b';
const KASRA = '\u0650';
const KASRATAN = '\u064d';
const SHADDA = '\u0651';
const SUKUN = '\u0652';
const WAW = '\u0648';
const YEH = '\u064a';

const ARABIC_LETTERS = 'ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي';

function stripTashkeel(text) {
  return text.replace(/[\u064b-\u065f\u0670]/g, '');
}

class ArudiConverter {
  constructor() {
    this.harakat = [KASRA, FATHA, DAMMA];
    this.sukun = [SUKUN];
    this.mostly_saken = [ALEF, WAW, ALEF_MAKSURA, YEH];
    this.tnween_chars = [DAMMATAN, KASRATAN, FATHATAN];
    this.shadda_chars = [SHADDA];
    this.all_chars = [...ARABIC_LETTERS, ' '];
    this.prem_chars = new Set([
      ...this.harakat,
      ...this.sukun,
      ...this.mostly_saken,
      ...this.tnween_chars,
      ...this.shadda_chars,
      ...this.all_chars,
    ]);

    this.CHANGE_LST = {
      'هذا': 'هَاذَا',
      'هذه': 'هَاذِه',
      'هذان': 'هَاذَان',
      'هذين': 'هَاذَين',
      'هؤلاء': 'هَاؤُلَاء',
      'ذلك': 'ذَالِك',
      'ذلكما': 'ذَالِكُمَا',
      'ذلكم': 'ذَالِكُم',
      'أولئك': 'أُلَائِك',
      'أولئكم': 'أُلَائِكُم',
      'الله': 'اللَّاه',
      'اللهم': 'اللَّاهُمّ',
      'إله': 'إِلَاه',
      'الإله': 'الإِلَاه',
      'إلهي': 'إِلَاهي',
      'إلهنا': 'إِلَاهنا',
      'إلهكم': 'إِلَاهكم',
      'إلههم': 'إِلَاههم',
      'إلههن': 'إِلَاههن',
      'رحمن': 'رَحمَان',
      'الرحمن': 'الرَّحمَان',
      'طاوس': 'طَاوُوس',
      'داود': 'دَاوُود',
      'لكن': 'لَاكِن',
      'لكنّ': 'لَاكِنّ',
      'لكنه': 'لَاكِنّهُ',
      'طه': 'طَاهَ' + FATHA,
      'لله': 'لِللَاهِ',
      'آه': 'أَاهِ',
      'هو': 'هْوَ',
      'هي': 'هْيَ',
    };
  }

  registerCustomSpelling(word, replacement) {
    this.CHANGE_LST[word] = replacement;
  }

  _normalizeShadda(text) {
    const harakatAll = [...this.harakat, ...this.tnween_chars].join('');
    const shadda = this.shadda_chars.join('');
    return text.replace(
      new RegExp(`([${harakatAll}])([${shadda}])`, 'g'),
      '$2$1'
    );
  }

  _normalizeOrthography(text) {
    // Normalize Dagger Alif to standard Alif
    text = text.replace(/\u0670/g, ALEF);
    // Remove Harakat from bare Alef
    const harakatPat = `[${FATHA}${DAMMA}${KASRA}]`;
    text = text.replace(new RegExp(`${ALEF}${harakatPat}`, 'g'), ALEF);
    // Normalize Alif + Tanween Fath
    text = text.replace(new RegExp(`${ALEF}${FATHATAN}`, 'g'), `${FATHATAN}${ALEF}`);
    return text;
  }

  _normalizeLigatures(text) {
    const harakatPat = `[${[...this.harakat, ...this.tnween_chars].join('')}]`;
    const hr = new RegExp(harakatPat);

    const decompose = (ligBase, letter) => (match) => {
      const haraka = match.length > ligBase.length ? match.slice(ligBase.length) : '';
      return 'ل' + haraka + letter;
    };

    text = text.replace(new RegExp(`ﻻ(${harakatPat})?`, 'g'), decompose('ﻻ', 'ا'));
    text = text.replace(new RegExp(`ﻷ(${harakatPat})?`, 'g'), decompose('ﻷ', 'أ'));
    text = text.replace(new RegExp(`ﻹ(${harakatPat})?`, 'g'), decompose('ﻹ', 'إ'));
    text = text.replace(new RegExp(`ﻵ(${harakatPat})?`, 'g'), decompose('ﻵ', 'آ'));
    return text;
  }

  _resolveWasl(text) {
    text = text.replace(/([^\s]\S*)([اىيو])\s+ا/g, '$1');
    text = text.replace(/\s+ا/g, '');

    const prefixes = '\u0641\u0648\u0628\u062a\u0643';
    const harakat = this.harakat.join('');
    text = text.replace(
      new RegExp(`([${prefixes}])([${harakat}]?)ا(لل)`, 'g'),
      '$1$2$3'
    );
    return text;
  }

  _handleSpace(plainChars) {
    if (!plainChars) return plainChars;
    if (plainChars[plainChars.length - 1] === ' ') {
      return plainChars.slice(0, -2);
    } else {
      return plainChars;
    }
  }

  _removeExtraHarakat(text) {
    let out = '';
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) {
      if (i < chars.length - 1 &&
          this.harakat.includes(chars[i]) &&
          this.harakat.includes(chars[i + 1])) {
        i++;
        continue;
      }
      out += chars[i];
    }
    return out;
  }

  _processSpecialsBefore(bait) {
    if (bait && bait[0] === 'ا') {
      bait = 'أَ' + bait.slice(1);
    }

    bait = bait.replace(/(^|\s)([فوبتك])([\u064e\u064f\u0650])?ال/g, '$1$2$3 ال');

    const sunLetters = 'تثدذرزسشصضطظلن';
    bait = bait.replace(new RegExp(` ال([${sunLetters}])`, 'g'), ' ا$1');

    bait = bait.replace(/وا /g, 'و ');
    if (bait.endsWith('وا')) bait = bait.slice(0, -1);
    bait = bait.replace(/وْا/g, 'و');
    if (bait.endsWith('وْا')) bait = bait.slice(0, -2) + 'و';

    bait = bait.replace(/الله/g, 'اللاه');
    bait = bait.replace(/اللّه/g, 'الله');
    bait = bait.replace(/إلَّا/g, 'إِلّا');
    bait = bait.replace(/نْ ال/g, 'نَ ال');
    bait = bait.replace(/لْ ال/g, 'لِ ال');
    bait = bait.replace(/إلَى/g, 'إِلَى');
    bait = bait.replace(/إذَا/g, 'إِذَا');
    bait = bait.replace(/ك /g, 'كَ ');
    bait = bait.replace(/ ال /g, ' الْ ');
    bait = bait.replace(/ْ ال/g, 'ِ ال');
    bait = bait.replace(/عَمْرٍو/g, 'عَمْرٍ');
    bait = bait.replace(/عَمْرُو/g, 'عَمْرُ');

    // Word replacements from CHANGE_LST
    const removableChars = [...this.harakat, ...this.sukun, ...this.tnween_chars];
    const stripHarakatPattern = new RegExp(`[${removableChars.join('')}]`, 'g');
    const validPrefixes = ['و', 'ف', 'ك', 'ب', 'ل', 'وب', 'فك', 'ول', 'فل'];
    const prefixHarakat = { 'و': 'وَ', 'ف': 'فَ', 'ك': 'كَ', 'ب': 'بِ', 'ل': 'لِ' };

    const out = [];
    for (const word of bait.split(' ')) {
      const cleanedWithShadda = word.replace(stripHarakatPattern, '');
      const cleanedPlain = stripTashkeel(word);

      let found = false;

      for (const candidate of [cleanedWithShadda, cleanedPlain]) {
        if (candidate in this.CHANGE_LST) {
          out.push(this.CHANGE_LST[candidate]);
          found = true;
          break;
        }
      }

      if (!found) {
        outer:
        for (const candidate of [cleanedWithShadda, cleanedPlain]) {
          for (const [key, replacement] of Object.entries(this.CHANGE_LST)) {
            if (candidate.endsWith(key)) {
              const prefix = candidate.slice(0, -key.length);
              if (validPrefixes.includes(prefix)) {
                let newPrefix = '';
                for (const pChar of [...prefix]) {
                  newPrefix += prefixHarakat[pChar] || pChar;
                }
                out.push(newPrefix + replacement);
                found = true;
                break outer;
              }
            }
          }
        }
      }

      if (!found) out.push(word);
    }

    bait = out.join(' ');

    if (bait.length > 1 && this.all_chars.includes(bait[1])) {
      bait = bait[0] + this.harakat[1] + bait.slice(1);
    }

    // Filter trailing alif after tanween
    const finalChars = [];
    const baitChars = [...bait];
    let i = 0;
    while (i < baitChars.length) {
      if (
        baitChars[i] === 'ا' &&
        i > 0 &&
        this.tnween_chars.includes(baitChars[i - 1])
      ) {
        i++;
        if (
          i < baitChars.length &&
          [...this.harakat, ...this.sukun, ...this.tnween_chars, ...this.shadda_chars].includes(baitChars[i])
        ) {
          i++;
        }
        continue;
      }
      finalChars.push(baitChars[i]);
      i++;
    }

    return finalChars.join('');
  }

  _processSpecialsAfter(bait) {
    return bait.replace(/ةن/g, 'تن');
  }

  _extractPattern(text, saturate = true, muqayyad = false) {
    text = this._removeExtraHarakat(text);
    let chars = [...text.replace(new RegExp(ALEF_MADDA, 'g'), 'ءَا').trim()];
    chars = chars.filter(c => this.prem_chars.has(c));
    chars = [...[...chars].join('').replace(/ +/g, ' ').trim()];

    let outPattern = '';
    let plainChars = '';

    let i = 0;
    while (i < chars.length - 1) {
      const char = chars[i];
      let nextChar = chars[i + 1];

      if (this.all_chars.includes(char)) {
        if (char === ' ') {
          plainChars += char;
          i++;
          continue;
        }

        if (nextChar === ' ' && i + 2 < chars.length) {
          nextChar = chars[i + 2];
        }

        let nextNextChar = null;
        if (i < chars.length - 2) {
          nextNextChar = chars[i + 2];
        }

        const prevDigit = outPattern.length > 0 ? outPattern[outPattern.length - 1] : '';

        if (this.harakat.includes(nextChar)) {
          const isLastGroup = i + 2 >= chars.length;
          if (muqayyad && isLastGroup) {
            outPattern += '0';
            plainChars += char;
          } else {
            outPattern += '1';
            plainChars += char;
          }
        } else if (this.sukun.includes(nextChar)) {
          if (prevDigit !== '0') {
            outPattern += '0';
            plainChars += char;
          } else if (i + 1 === chars.length - 1) {
            outPattern += '0';
            plainChars += char;
          } else {
            plainChars = this._handleSpace(plainChars) + char;
          }
        } else if (this.tnween_chars.includes(nextChar)) {
          if (char !== 'ا') plainChars += char;
          plainChars += 'ن';
          outPattern += '10';

          if (i + 2 < chars.length && chars[i + 2] === 'ا') {
            i++;
          }
        } else if (this.shadda_chars.includes(nextChar)) {
          if (prevDigit !== '0') {
            plainChars += char + char;
            outPattern += '01';
          } else {
            plainChars = this._handleSpace(plainChars) + char + char;
            outPattern += '1';
          }

          if (i + 2 < chars.length) {
            if (this.harakat.includes(chars[i + 2])) {
              const isLastShaddaGroup = i + 3 >= chars.length;
              if (muqayyad && isLastShaddaGroup) {
                outPattern = outPattern.slice(0, -1) + '0';
                i++;
              } else {
                i++;
              }
            } else if (this.tnween_chars.includes(chars[i + 2])) {
              i++;
              plainChars += 'ن';
              outPattern += '0';
              if (i + 2 < chars.length && chars[i + 2] === 'ا') {
                i++;
              }
            }
          }
        } else if ([ALEF, ALEF_MAKSURA].includes(nextChar)) {
          outPattern += '10';
          plainChars += char + nextChar;
        } else if (this.all_chars.includes(nextChar)) {
          if (prevDigit !== '0') {
            outPattern += '0';
            plainChars += char;
          } else if (prevDigit === '0' && i + 1 < chars.length && chars[i + 1] === ' ') {
            outPattern += '1';
            plainChars += char;
          } else {
            plainChars = this._handleSpace(plainChars) + char;
            outPattern += '0';
          }
          i--;
        }

        // Ha' al-Gha'ib handling
        if (!muqayyad && nextNextChar === ' ' && prevDigit !== '0') {
          if (char === 'ه') {
            if (nextChar === this.harakat[0]) { // Kasra
              plainChars += 'ي';
              outPattern += '0';
            }
            if (nextChar === this.harakat[2]) { // Damma
              plainChars += 'و';
              outPattern += '0';
            }
          }
        }

        i += 2;
      } else if (char === 'ا') {
        outPattern += '0';
        plainChars += char;
        i++;
      } else {
        i++;
      }
    }

    if (!muqayyad && saturate && outPattern && outPattern[outPattern.length - 1] !== '0') {
      outPattern += '0';
    }

    // Ashba' (Saturation) of last letter
    if (!muqayyad && saturate && chars.length > 0) {
      const lastChar = chars[chars.length - 1];
      if (lastChar === this.harakat[0]) {         // Kasra
        plainChars += 'ي';
      } else if (lastChar === this.tnween_chars[1]) { // Kasratan
        plainChars = plainChars.slice(0, -1) + 'ي';
      } else if (lastChar === this.harakat[1]) {  // Fatha
        plainChars += 'ا';
      } else if (lastChar === this.harakat[2]) {  // Damma
        plainChars += 'و';
      } else if (lastChar === this.tnween_chars[0]) { // Dammatan
        plainChars = plainChars.slice(0, -1) + 'و';
      } else if (
        this.mostly_saken.includes(lastChar) &&
        chars.length > 1 &&
        !this.tnween_chars.includes(chars[chars.length - 2])
      ) {
        plainChars += lastChar;
      }
    }

    return [plainChars, outPattern];
  }

  prepareText(text, saturate = true, muqayyad = false) {
    text = text.trim();
    if (!text) return ['', ''];

    text = this._normalizeOrthography(text);
    text = this._normalizeLigatures(text);
    text = this._normalizeShadda(text);
    let preprocessed = this._processSpecialsBefore(text);
    preprocessed = this._resolveWasl(preprocessed);
    let [arudiStyle, pattern] = this._extractPattern(preprocessed, saturate, muqayyad);
    arudiStyle = this._processSpecialsAfter(arudiStyle);

    return [arudiStyle, pattern];
  }
}

export { ArudiConverter, stripTashkeel };
export const ARABIC_CONSTANTS = {
  ALEF, ALEF_MADDA, ALEF_MAKSURA, DAMMA, DAMMATAN,
  FATHA, FATHATAN, KASRA, KASRATAN, SHADDA, SUKUN, WAW, YEH,
  ARABIC_LETTERS
};