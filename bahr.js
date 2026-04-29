// bahr.js
import {
  Fae_laton, Faelaton, Faelon, Fawlon,
  Mafaeelon, Mafaelaton, Mafoolato,
  Mustafe_lon, Mustafelon, Mutafaelon,
} from './tafeela.js';

import {
  Aql, Asab, Batr, Edmaar, Hadhf, HadhfAndKhaban, Hathath,
  HathathAndEdmaar, Kaff, Kasf, Khabal, KhabalAndKasf, Khaban,
  KhabanAndQataa, NoZehafNorEllah, Qabadh, Qasar, Qataa,
  QataaAndEdmaar, Qataf, Salam, Shakal, Tarfeel, TarfeelAndEdmaar,
  TarfeelAndKhaban, Tasbeegh, Tasheeth, Tatheel, TatheelAndEdmaar,
  Tay, TayAndKasf, Thalm, ThalmAndQasar, Tharm, Waqf, WaqfAndTay,
} from './zihaf.js';

function cartesianProduct(...arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap(a => arr.map(b => [...a, b])),
    [[]]
  );
}

class Bahr {
  constructor() {
    // Subclasses define these as static-like properties on instances
    this.tafeelat = this.constructor.tafeelat || [];
    this.arod_dharbs_map = this.constructor.arod_dharbs_map || {};
    this.sub_bahrs = this.constructor.sub_bahrs || [];
    this.only_one_shatr = this.constructor.only_one_shatr || false;
    this.disallowed_zehafs_for_hashw = this.constructor.disallowed_zehafs_for_hashw || {};
  }

  get last_tafeela() {
    const LastClass = this.tafeelat[this.tafeelat.length - 1];
    return new LastClass();
  }

  getShatrHashwCombinations(shatrIndex = 0) {
    const combinations = [];
    for (let i = 0; i < this.tafeelat.length - 1; i++) {
      const tafeela = new this.tafeelat[i]();
      let forms = tafeela.allZehafTafeela_forms();

      if (shatrIndex in this.disallowed_zehafs_for_hashw) {
        const disallowed = this.disallowed_zehafs_for_hashw[shatrIndex];
        if (i < disallowed.length) {
          forms = forms.filter(f => !disallowed[i].includes(f.applied_ella_zehaf_class));
        }
      }
      combinations.push(forms);
    }
    return combinations;
  }

  getAllowedFeetPatterns(shatrIndex = 0) {
    const allowedPerIndex = [];
    const hashwCombs = this.getShatrHashwCombinations(shatrIndex);

    for (const forms of hashwCombs) {
      allowedPerIndex.push(forms.map(f => ({
        pattern: f.toString(),
        name: f.name,
        zihaf: f.applied_ella_zehaf_class?.name_ar || null
      })));
    }

    const lastFeet = [];
    const lastPatterns = new Set();
    const map = this.arod_dharbs_map;

    const addFoot = (zCls) => {
      try {
        const tafeela = new zCls(this.last_tafeela).modified_tafeela;
        const pat = tafeela.toString();
        if (!lastPatterns.has(pat)) {
          lastFeet.push({
            pattern: pat,
            name: tafeela.name,
            zihaf: tafeela.applied_ella_zehaf_class?.name_ar || null
          });
          lastPatterns.add(pat);
        }
      } catch (e) { }
    };

    if (this.only_one_shatr) {
      const items = map instanceof Set ? [...map] : (map instanceof Map ? [...map.keys()] : Object.keys(map));
      for (const zCls of items) addFoot(zCls);
    } else {
      if (shatrIndex === 0) {
        const items = map instanceof Map ? [...map.keys()] : (map instanceof Set ? [...map] : Object.keys(map));
        for (const zCls of items) addFoot(zCls);
      } else {
        if (map instanceof Map) {
          for (const dList of map.values()) {
            for (const zCls of dList) addFoot(zCls);
          }
        } else if (map instanceof Set) {
          for (const zCls of map) addFoot(zCls);
        } else {
          for (const dList of Object.values(map)) {
            for (const zCls of dList) addFoot(zCls);
          }
        }
      }
    }

    allowedPerIndex.push(lastFeet);
    return allowedPerIndex;
  }


  get detailed_patterns() {
    const patterns = { sadr: [], ajuz: [], pairs: new Set() };
    const getFootInfo = (t) => ({
      pattern: t.toString(),
      name: t.name,
      zihaf: t.applied_ella_zehaf_class?.name_ar || null
    });

    if (this.only_one_shatr) {
      const hashw = this.getShatrHashwCombinations();
      const endings = [];
      const map = this.arod_dharbs_map;
      const items = map instanceof Set ? [...map] : _getMapKeys(map);

      for (const zCls of items) {
        try {
          endings.push(new zCls(this.last_tafeela).modified_tafeela);
        } catch (e) { continue; }
      }

      const perms = cartesianProduct(...hashw, endings);
      for (const p of perms) {
        const feetInfo = p.map(getFootInfo);
        const fullStr = feetInfo.map(f => f.pattern).join('');
        patterns.sadr.push({ pattern: fullStr, feet: feetInfo, type: 'single_shatr' });
        patterns.pairs.add(JSON.stringify([fullStr, '']));
      }

    } else {
      const sadrHashw = this.getShatrHashwCombinations(0);
      const ajuzHashw = this.getShatrHashwCombinations(1);
      const map = this.arod_dharbs_map;

      for (const [arudhZCls, dharbZList] of _getMapEntries(map)) {
        let arudhObj;
        try {
          arudhObj = new arudhZCls(this.last_tafeela).modified_tafeela;
        } catch (e) { continue; }

        const arudhStr = arudhObj.toString();
        const sadrPerms = cartesianProduct(...sadrHashw, [arudhObj]);

        for (const sp of sadrPerms) {
          const feetInfo = sp.map(getFootInfo);
          const fullSadr = feetInfo.map(f => f.pattern).join('');

          patterns.sadr.push({
            pattern: fullSadr,
            feet: feetInfo,
            arudh_foot: arudhStr,
            arudh_class: arudhZCls.name,
            arudh_zihaf: arudhObj.applied_ella_zehaf_class?.name_ar || null
          });

          const compatibleDharbs = [];
          for (const dZ of dharbZList) {
            try {
              compatibleDharbs.push(new dZ(this.last_tafeela).modified_tafeela);
            } catch (e) { continue; }
          }

          if (!compatibleDharbs.length) continue;

          const ajuzPerms = cartesianProduct(...ajuzHashw, compatibleDharbs);
          for (const ap of ajuzPerms) {
            const feetInfoA = ap.map(getFootInfo);
            const fullAjuz = feetInfoA.map(f => f.pattern).join('');

            patterns.ajuz.push({
              pattern: fullAjuz,
              feet: feetInfoA,
              dharb_foot: feetInfoA[feetInfoA.length - 1].pattern,
              allowed_arudhs: [arudhStr],
            });

            patterns.pairs.add(JSON.stringify([fullSadr, fullAjuz]));
          }
        }
      }
    }

    for (const SubBahr of this.sub_bahrs) {
      const subP = new SubBahr().detailed_patterns;
      patterns.sadr.push(...subP.sadr);
      patterns.ajuz.push(...subP.ajuz);
      for (const p of subP.pairs) patterns.pairs.add(p);
    }

    return patterns;
  }

  get bait_combinations() {
    const p = this.detailed_patterns;
    if (this.only_one_shatr) {
      return [...new Set(p.sadr.map(x => x.pattern))].sort((a, b) => a.length - b.length);
    }
    return [...p.pairs]
      .map(s => JSON.parse(s))
      .map(([s, a]) => s + a)
      .sort((a, b) => a.length - b.length);
  }
}

// Helpers to work with Map-like objects where keys are class references
function _getMapKeys(map) {
  if (map instanceof Map) return [...map.keys()];
  if (map instanceof Set) return [...map];
  if (!map) return [];
  return Object.keys(map);
}

function _getMapValues(map) {
  if (map instanceof Map) return [...map.values()];
  if (map instanceof Set) return [...map];
  if (!map) return [];
  return Object.values(map);
}

function _getMapEntries(map) {
  if (map instanceof Map) return [...map.entries()];
  if (map instanceof Set) return [...map].map(x => [x, null]);
  if (!map) return [];
  return Object.entries(map);
}

// ─── Sub-Bahrs ────────────────────────────────────────────────────────────────

class RajazManhook extends Bahr {}
RajazManhook.tafeelat = [Mustafelon, Mustafelon];
RajazManhook.arod_dharbs_map = new Set([NoZehafNorEllah, Khaban, Tay, Khabal, Qataa, KhabanAndQataa]);
RajazManhook.only_one_shatr = true;

class RajazMashtoor extends Bahr {}
RajazMashtoor.tafeelat = [Mustafelon, Mustafelon, Mustafelon];
RajazMashtoor.arod_dharbs_map = new Set([NoZehafNorEllah, Khaban, Tay, Khabal, Qataa, KhabanAndQataa]);
RajazMashtoor.only_one_shatr = true;

class RajazMajzoo extends Bahr {}
RajazMajzoo.tafeelat = [Mustafelon, Mustafelon];
RajazMajzoo.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Khaban, Tay, Khabal]],
  [Khaban,          [NoZehafNorEllah, Khaban, Tay, Khabal]],
  [Tay,             [NoZehafNorEllah, Khaban, Tay, Khabal]],
  [Khabal,          [NoZehafNorEllah, Khaban, Tay, Khabal]],
]);

class RamalMajzoo extends Bahr {}
RamalMajzoo.tafeelat = [Faelaton, Faelaton];
RamalMajzoo.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Khaban, Tasbeegh, Hadhf, HadhfAndKhaban]],
  [Khaban,          [NoZehafNorEllah, Khaban, Tasbeegh, Hadhf, HadhfAndKhaban]],
]);
RamalMajzoo.disallowed_zehafs_for_hashw = { 0: [[Tasheeth]], 1: [[Tasheeth]] };

class SareeMashtoor extends Bahr {}
SareeMashtoor.tafeelat = [Mustafelon, Mustafelon, Mafoolato];
SareeMashtoor.arod_dharbs_map = new Set([Waqf, Kasf]);
SareeMashtoor.only_one_shatr = true;

class MunsarehManhook extends Bahr {}
MunsarehManhook.tafeelat = [Mustafelon, Mafoolato];
MunsarehManhook.arod_dharbs_map = new Set([Waqf, Kasf]);
MunsarehManhook.only_one_shatr = true;

class KhafeefMajzoo extends Bahr {}
KhafeefMajzoo.tafeelat = [Faelaton, Mustafe_lon];
KhafeefMajzoo.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, KhabanAndQataa]],
  [Khaban,          [Khaban]],
]);
KhafeefMajzoo.disallowed_zehafs_for_hashw = { 0: [[Kaff, Shakal, Tasheeth]], 1: [[Kaff, Shakal, Tasheeth]] };

class MutakarebMajzoo extends Bahr {}
MutakarebMajzoo.tafeelat = [Fawlon, Fawlon, Fawlon];
MutakarebMajzoo.arod_dharbs_map = new Map([[Hadhf, [Hadhf, Batr]]]);
MutakarebMajzoo.disallowed_zehafs_for_hashw = { 0: [[], [Thalm, Tharm]], 1: [[Thalm, Tharm], [Thalm, Tharm]] };

class MutadarakMashtoor extends Bahr {}
MutadarakMashtoor.tafeelat = [Faelon, Faelon, Faelon];
MutadarakMashtoor.arod_dharbs_map = new Set([NoZehafNorEllah, Khaban, Tasheeth, Tatheel, TarfeelAndKhaban]);
MutadarakMashtoor.only_one_shatr = true;

class MutadarakMajzoo extends Bahr {}
MutadarakMajzoo.tafeelat = [Faelon, Faelon, Faelon];
MutadarakMajzoo.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Khaban, Tasheeth, Tatheel, TarfeelAndKhaban]],
  [Khaban,          [NoZehafNorEllah, Khaban, Tasheeth, Tatheel, TarfeelAndKhaban]],
  [Tasheeth,        [NoZehafNorEllah, Khaban, Tasheeth, Tatheel, TarfeelAndKhaban]],
]);

// ─── Main Meters ──────────────────────────────────────────────────────────────

class Taweel extends Bahr {}
Taweel.tafeelat = [Fawlon, Mafaeelon, Fawlon, Mafaeelon];
Taweel.arod_dharbs_map = new Map([[Qabadh, [Qabadh, Hadhf, NoZehafNorEllah]]]);
Taweel.disallowed_zehafs_for_hashw = {
  0: [[], [], [Thalm, Tharm]],
  1: [[Thalm, Tharm], [], [Thalm, Tharm]],
};

class Madeed extends Bahr {}
Madeed.tafeelat = [Faelaton, Faelon, Faelaton];
Madeed.arod_dharbs_map = new Map([
  [NoZehafNorEllah,  [NoZehafNorEllah]],
  [Hadhf,            [Hadhf, Batr]],
  [HadhfAndKhaban,   [HadhfAndKhaban]],
  [Batr,             [Batr]],
]);
Madeed.disallowed_zehafs_for_hashw = {
  0: [[Shakal, Tasheeth], [Tasheeth]],
  1: [[Shakal, Tasheeth], [Tasheeth]],
};

class BaseetMajzoo extends Bahr {}
BaseetMajzoo.tafeelat = [Mustafelon, Faelon, Mustafelon];
BaseetMajzoo.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Tatheel, Qataa]],
  [Qataa,           [NoZehafNorEllah]],
]);
BaseetMajzoo.disallowed_zehafs_for_hashw = { 0: [[], [Tasheeth]], 1: [[], [Tasheeth]] };

class BaseetMukhalla extends BaseetMajzoo {}
BaseetMukhalla.arod_dharbs_map = new Map([[KhabanAndQataa, [KhabanAndQataa]]]);
BaseetMukhalla.disallowed_zehafs_for_hashw = { 0: [[], [Tasheeth]], 1: [[], [Tasheeth]] };

class Baseet extends Bahr {}
Baseet.tafeelat = [Mustafelon, Faelon, Mustafelon, Faelon];
Baseet.arod_dharbs_map = new Map([[Khaban, [Khaban, Qataa]]]);
Baseet.disallowed_zehafs_for_hashw = { 0: [[], [Tasheeth], []], 1: [[], [Tasheeth], []] };
Baseet.sub_bahrs = [BaseetMajzoo, BaseetMukhalla];

class WaferMajzoo extends Bahr {}
WaferMajzoo.tafeelat = [Mafaelaton, Mafaelaton];
WaferMajzoo.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Asab]],
  [Asab,            [NoZehafNorEllah, Asab]],
]);

class Wafer extends Bahr {}
Wafer.tafeelat = [Mafaelaton, Mafaelaton, Mafaelaton];
Wafer.arod_dharbs_map = new Map([[Qataf, [Qataf, Aql]]]);
Wafer.sub_bahrs = [WaferMajzoo];

class KamelMajzoo extends Bahr {}
KamelMajzoo.tafeelat = [Mutafaelon, Mutafaelon];
KamelMajzoo.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Edmaar, Qataa, QataaAndEdmaar, Tatheel, TatheelAndEdmaar, Tarfeel, TarfeelAndEdmaar]],
  [Edmaar,          [NoZehafNorEllah, Edmaar, Qataa, QataaAndEdmaar, Tatheel, TatheelAndEdmaar, Tarfeel, TarfeelAndEdmaar]],
]);

class Kamel extends Bahr {}
Kamel.tafeelat = [Mutafaelon, Mutafaelon, Mutafaelon];
Kamel.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Edmaar, Qataa, QataaAndEdmaar, HathathAndEdmaar]],
  [Edmaar,          [NoZehafNorEllah, Edmaar, Qataa, QataaAndEdmaar, HathathAndEdmaar]],
  [Hathath,         [Hathath, HathathAndEdmaar]],
]);
Kamel.sub_bahrs = [KamelMajzoo];

class Hazaj extends Bahr {}
Hazaj.tafeelat = [Mafaeelon, Mafaeelon];
Hazaj.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Hadhf]],
  [Kaff,            [NoZehafNorEllah, Hadhf]],
]);
Hazaj.disallowed_zehafs_for_hashw = { 0: [[Qabadh]], 1: [[Qabadh]] };

class Rajaz extends Bahr {}
Rajaz.tafeelat = [Mustafelon, Mustafelon, Mustafelon];
Rajaz.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Khaban, Tay, Khabal, Qataa, KhabanAndQataa]],
  [Khaban,          [NoZehafNorEllah, Khaban, Tay, Khabal, Qataa, KhabanAndQataa]],
  [Tay,             [NoZehafNorEllah, Khaban, Tay, Khabal, Qataa, KhabanAndQataa]],
  [Khabal,          [NoZehafNorEllah, Khaban, Tay, Khabal, Qataa, KhabanAndQataa]],
]);
Rajaz.sub_bahrs = [RajazMajzoo, RajazMashtoor, RajazManhook];

class Ramal extends Bahr {}
Ramal.tafeelat = [Faelaton, Faelaton, Faelaton];
Ramal.arod_dharbs_map = new Map([
  [NoZehafNorEllah,  [NoZehafNorEllah, Khaban, Hadhf, HadhfAndKhaban, Qataa, KhabanAndQataa]],
  [Hadhf,            [NoZehafNorEllah, Khaban, Hadhf, HadhfAndKhaban, Qasar, KhabanAndQataa]],
  [HadhfAndKhaban,   [NoZehafNorEllah, Khaban, Hadhf, HadhfAndKhaban, Qataa, KhabanAndQataa]],
]);
Ramal.sub_bahrs = [RamalMajzoo];
Ramal.disallowed_zehafs_for_hashw = { 0: [[Tasheeth], [Tasheeth]], 1: [[Tasheeth], [Tasheeth]] };

class Saree extends Bahr {}
Saree.tafeelat = [Mustafelon, Mustafelon, Mafoolato];
Saree.arod_dharbs_map = new Map([
  [TayAndKasf,   [TayAndKasf, Salam, WaqfAndTay]],
  [KhabalAndKasf,[KhabalAndKasf, Salam]],
]);
Saree.sub_bahrs = [SareeMashtoor];

class Munsareh extends Bahr {}
Munsareh.tafeelat = [Mustafelon, Mafoolato, Mustafelon];
Munsareh.arod_dharbs_map = new Map([[Tay, [Tay, Qataa]]]);
Munsareh.sub_bahrs = [MunsarehManhook];

class Khafeef extends Bahr {}
Khafeef.tafeelat = [Faelaton, Mustafe_lon, Faelaton];
Khafeef.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Khaban, Tasheeth, Hadhf, HadhfAndKhaban]],
  [Khaban,          [NoZehafNorEllah, Khaban, Tasheeth, Hadhf, HadhfAndKhaban]],
  [Hadhf,           [NoZehafNorEllah, Khaban, Tasheeth, Hadhf, HadhfAndKhaban]],
]);
Khafeef.sub_bahrs = [KhafeefMajzoo];
Khafeef.disallowed_zehafs_for_hashw = { 0: [[Kaff, Shakal], []], 1: [[Kaff, Shakal], []] };

class Mudhare extends Bahr {}
Mudhare.tafeelat = [Mafaeelon, Fae_laton];
Mudhare.arod_dharbs_map = new Map([[NoZehafNorEllah, [NoZehafNorEllah]]]);

class Muqtadheb extends Bahr {}
Muqtadheb.tafeelat = [Mafoolato, Mustafelon];
Muqtadheb.arod_dharbs_map = new Map([
  [Tay,   [Tay]],
  [Khabal,[Tay]],
]);
Muqtadheb.disallowed_zehafs_for_hashw = { 0: [[]], 1: [[]] };

class Mujtath extends Bahr {}
Mujtath.tafeelat = [Mustafe_lon, Faelaton];
Mujtath.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Khaban, Tasheeth]],
  [Khaban,          [NoZehafNorEllah, Khaban, Tasheeth]],
]);
Mujtath.disallowed_zehafs_for_hashw = { 0: [[Kaff]], 1: [[Kaff]] };

class Mutakareb extends Bahr {}
Mutakareb.tafeelat = [Fawlon, Fawlon, Fawlon, Fawlon];
Mutakareb.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Hadhf, Qataa, Batr, Qasar, ThalmAndQasar]],
  [Qabadh,          [NoZehafNorEllah, Hadhf, Qataa, Batr, Qasar, ThalmAndQasar]],
  [Hadhf,           [NoZehafNorEllah, Hadhf, Qataa, Batr, Qasar, ThalmAndQasar]],
]);
Mutakareb.disallowed_zehafs_for_hashw = {
  0: [[], [Thalm, Tharm], [Thalm, Tharm]],
  1: [[Thalm, Tharm], [Thalm, Tharm], [Thalm, Tharm]],
};
Mutakareb.sub_bahrs = [MutakarebMajzoo];

class Mutadarak extends Bahr {}
Mutadarak.tafeelat = [Faelon, Faelon, Faelon, Faelon];
Mutadarak.arod_dharbs_map = new Map([
  [NoZehafNorEllah, [NoZehafNorEllah, Khaban, Tasheeth]],
  [Khaban,          [NoZehafNorEllah, Khaban, Tasheeth]],
  [Tasheeth,        [NoZehafNorEllah, Khaban, Tasheeth]],
]);
Mutadarak.sub_bahrs = [MutadarakMajzoo, MutadarakMashtoor];

function getAllMeters() {
  return {
    taweel:    Taweel,
    madeed:    Madeed,
    baseet:    Baseet,
    wafer:     Wafer,
    kamel:     Kamel,
    hazaj:     Hazaj,
    rajaz:     Rajaz,
    ramal:     Ramal,
    saree:     Saree,
    munsareh:  Munsareh,
    khafeef:   Khafeef,
    mudhare:   Mudhare,
    muqtadheb: Muqtadheb,
    mujtath:   Mujtath,
    mutakareb: Mutakareb,
    mutadarak: Mutadarak,
  };
}

export {
  Bahr, getAllMeters,
  Taweel, Madeed, Baseet, Wafer, Kamel, Hazaj, Rajaz, Ramal,
  Saree, Munsareh, Khafeef, Mudhare, Muqtadheb, Mujtath,
  Mutakareb, Mutadarak,
  RajazManhook, RajazMashtoor, RajazMajzoo, RamalMajzoo,
  SareeMashtoor, MunsarehManhook, KhafeefMajzoo, MutakarebMajzoo,
  MutadarakMashtoor, MutadarakMajzoo, BaseetMajzoo, BaseetMukhalla,
  WaferMajzoo, KamelMajzoo,
  cartesianProduct, _getMapKeys, _getMapValues, _getMapEntries,
};