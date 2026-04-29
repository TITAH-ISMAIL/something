// zihaf.js

const ALEF = '\u0627';
const NOON = '\u0646';
const TEH  = '\u062a';

function deepCopyTafeela(tafeela) {
  const copy = Object.create(Object.getPrototypeOf(tafeela));
  copy.name = tafeela.name;
  copy.allowed_zehafs = tafeela.allowed_zehafs;
  copy.applied_ella_zehaf_class = tafeela.applied_ella_zehaf_class;
  copy.pattern = [...tafeela.pattern];
  copy.original_pattern = [...tafeela.original_pattern];
  copy.pattern_int = tafeela.pattern_int;
  return copy;
}

class BaseEllahZehaf {
  constructor(tafeela) {
    this.tafeela = deepCopyTafeela(tafeela);
    this._modified = false;
  }

  modifyTafeela() {}

  get modified_tafeela() {
    if (this._modified) return this.tafeela;
    if (this.assertions && !this.assertions.every(Boolean)) {
      throw new AssertionError('assertions failed');
    }
    this.modifyTafeela();
    this.tafeela.applied_ella_zehaf_class = this.constructor;
    this._modified = true;
    return this.tafeela;
  }
}

class AssertionError extends Error {}

function assert(condition, msg = 'Assertion failed') {
  if (!condition) throw new AssertionError(msg);
}

class NoZehafNorEllah extends BaseEllahZehaf {
  get modified_tafeela() {
    this.tafeela.applied_ella_zehaf_class = null;
    return this.tafeela;
  }
}

class BaseSingleHazfZehaf extends BaseEllahZehaf {
  static affected_index = 0;
  get affected_index() { return this.constructor.affected_index; }
  set affected_index(v) { this._affected_index = v; }

  modifyTafeela() {
    const idx = this._affected_index ?? this.constructor.affected_index;
    this.tafeela.deleteFromPattern(idx);
  }

  get modified_tafeela() {
    if (this._modified) return this.tafeela;
    this.modifyTafeela();
    this.tafeela.applied_ella_zehaf_class = this.constructor;
    this._modified = true;
    return this.tafeela;
  }
}

class BaseSingleTaskeenZehaf extends BaseEllahZehaf {
  static affected_index = 0;

  modifyTafeela() {
    const idx = this.constructor.affected_index;
    assert(this.tafeela.pattern[idx] === 1, `Index ${idx} should be mutaharrik (1)`);
    this.tafeela.editPatternAtIndex(idx, 0);
  }

  get modified_tafeela() {
    if (this._modified) return this.tafeela;
    this.modifyTafeela();
    this.tafeela.applied_ella_zehaf_class = this.constructor;
    this._modified = true;
    return this.tafeela;
  }
}

// ─── Single Zehafs ────────────────────────────────────────────────────────────

class Khaban extends BaseSingleHazfZehaf {}
Khaban.affected_index = 1;
Khaban.name_ar = 'خبن';

class Tay extends BaseSingleHazfZehaf {}
Tay.affected_index = 3;
Tay.name_ar = 'طي';

class Waqas extends BaseSingleHazfZehaf {}
Waqas.affected_index = 1;
Waqas.name_ar = 'وقص';

class Qabadh extends BaseSingleHazfZehaf {}
Qabadh.affected_index = 4;
Qabadh.name_ar = 'قبض';

class Kaff extends BaseSingleHazfZehaf {}
Kaff.affected_index = 6;
Kaff.name_ar = 'كف';

class Akal extends BaseSingleHazfZehaf {}
Akal.affected_index = 4;
Akal.name_ar = 'عقل';

class Kasf extends BaseSingleHazfZehaf {}
Kasf.affected_index = 6;
Kasf.name_ar = 'كسف';

class Tasheeth extends BaseSingleHazfZehaf {}
Tasheeth.affected_index = 2;
Tasheeth.name_ar = 'تشعيث';

class Thalm extends BaseSingleHazfZehaf {}
Thalm.affected_index = 0;
Thalm.name_ar = 'ثلم';

class Edmaar extends BaseSingleTaskeenZehaf {}
Edmaar.affected_index = 1;
Edmaar.name_ar = 'إضمار';

class Asab extends BaseSingleTaskeenZehaf {}
Asab.affected_index = 4;
Asab.name_ar = 'عصب';

class Ziyada extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela.addToPattern(3, 1, '1');
  }
}
Ziyada.name_ar = 'زيادة';

// ─── Doubled Zehafs ───────────────────────────────────────────────────────────

class BaseDoubledZehaf extends BaseEllahZehaf {
  static zehafs = [];

  modifyTafeela() {
    const zehafs = this.constructor.zehafs;
    const hazf    = zehafs.filter(z => z.prototype instanceof BaseSingleHazfZehaf);
    const taskeen = zehafs.filter(z => z.prototype instanceof BaseSingleTaskeenZehaf);

    const indices = hazf.map(z => z.affected_index).sort((a, b) => b - a);
    for (const idx of indices) {
      this.tafeela.deleteFromPattern(idx);
    }
    for (const ZCls of taskeen) {
      this.tafeela = new ZCls(this.tafeela).modified_tafeela;
    }
  }
}

class Khabal extends BaseDoubledZehaf {}
Khabal.zehafs = [Khaban, Tay];
Khabal.name_ar = 'خبل';

class Khazal extends BaseDoubledZehaf {}
Khazal.zehafs = [Edmaar, Tay];
Khazal.name_ar = 'خزل';

class Shakal extends BaseDoubledZehaf {}
Shakal.zehafs = [Khaban, Kaff];
Shakal.name_ar = 'شكل';

class Nakas extends BaseDoubledZehaf {}
Nakas.zehafs = [Asab, Kaff];
Nakas.name_ar = 'نقص';

class TayAndKasf extends BaseDoubledZehaf {}
TayAndKasf.zehafs = [Tay, Kasf];
TayAndKasf.name_ar = 'طي وكسف';

class Tharm extends BaseDoubledZehaf {}
Tharm.zehafs = [Thalm, Qabadh];
Tharm.name_ar = 'ثرم';

// ─── Ellal (Causes) ───────────────────────────────────────────────────────────

class Hadhf extends BaseEllahZehaf {
  modifyTafeela() {
    const p = this.tafeela.pattern;
    assert(p[p.length - 2] === 1 && p[p.length - 1] === 0);
    this.tafeela.deleteFromPattern(p.length - 1);
    this.tafeela.deleteFromPattern(this.tafeela.pattern.length - 1);
  }
}
Hadhf.name_ar = 'حذف';

class HadhfAndKhaban extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Hadhf(this.tafeela).modified_tafeela;
    this.tafeela = new Khaban(this.tafeela).modified_tafeela;
  }
}
HadhfAndKhaban.name_ar = 'حذف وخبن';

class Qataf extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Hadhf(this.tafeela).modified_tafeela;
    this.tafeela = new Asab(this.tafeela).modified_tafeela;
  }
}
Qataf.name_ar = 'قطف';

class Qataa extends BaseEllahZehaf {
  modifyTafeela() {
    const p = this.tafeela.pattern;
    assert(p[p.length - 2] === 1 && p[p.length - 1] === 0);
    this.tafeela.deleteFromPattern(p.length - 1);
    this.tafeela.editPatternAtIndex(this.tafeela.pattern.length - 1, 0);
  }
}
Qataa.name_ar = 'قطع';

class Tatheel extends BaseEllahZehaf {
  modifyTafeela() {
    const p = this.tafeela.pattern;
    assert(p[p.length - 3] === 1 && p[p.length - 2] === 1 && p[p.length - 1] === 0);
    this.tafeela.addToPattern(p.length - 1, 0, ALEF);
  }
}
Tatheel.name_ar = 'تذييل';

class Tasbeegh extends BaseEllahZehaf {
  modifyTafeela() {
    const p = this.tafeela.pattern;
    assert(p[p.length - 2] === 1 && p[p.length - 1] === 0);
    this.tafeela.addToPattern(p.length - 1, 0, ALEF);
  }
}
Tasbeegh.name_ar = 'تسبيغ';

class TatheelAndEdmaar extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Tatheel(this.tafeela).modified_tafeela;
    this.tafeela = new Edmaar(this.tafeela).modified_tafeela;
  }
}
TatheelAndEdmaar.name_ar = 'تذييل وإضمار';

class Tarfeel extends BaseEllahZehaf {
  modifyTafeela() {
    const len = this.tafeela.pattern.length;
    this.tafeela.addToPattern(len, 1, TEH);
    this.tafeela.addToPattern(this.tafeela.pattern.length, 0, NOON);
  }
}
Tarfeel.name_ar = 'ترفيل';

class TarfeelAndEdmaar extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Tarfeel(this.tafeela).modified_tafeela;
    this.tafeela = new Edmaar(this.tafeela).modified_tafeela;
  }
}
TarfeelAndEdmaar.name_ar = 'ترفيل وإضمار';

class TarfeelAndKhaban extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Khaban(this.tafeela).modified_tafeela;
    this.tafeela = new Tarfeel(this.tafeela).modified_tafeela;
  }
}
TarfeelAndKhaban.name_ar = 'ترفيل وخبن';

class KhabanAndQataa extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Qataa(this.tafeela).modified_tafeela;
    this.tafeela = new Khaban(this.tafeela).modified_tafeela;
  }
}
KhabanAndQataa.name_ar = 'خبن وقطع';

class QataaAndEdmaar extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Qataa(this.tafeela).modified_tafeela;
    this.tafeela = new Edmaar(this.tafeela).modified_tafeela;
  }
}
QataaAndEdmaar.name_ar = 'قطع وإضمار';

class Hathath extends BaseEllahZehaf {
  modifyTafeela() {
    const p = this.tafeela.pattern;
    assert(p[p.length - 3] === 1 && p[p.length - 2] === 1 && p[p.length - 1] === 0);
    for (let i = 0; i < 3; i++) {
      this.tafeela.deleteFromPattern(this.tafeela.pattern.length - 1);
    }
  }
}
Hathath.name_ar = 'حذذ';

class HathathAndEdmaar extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Hathath(this.tafeela).modified_tafeela;
    this.tafeela = new Edmaar(this.tafeela).modified_tafeela;
  }
}
HathathAndEdmaar.name_ar = 'حذذ وإضمار';

class Salam extends BaseEllahZehaf {
  modifyTafeela() {
    const p = this.tafeela.pattern;
    assert(p[p.length - 3] === 1 && p[p.length - 2] === 0 && p[p.length - 1] === 1);
    for (let i = 0; i < 3; i++) {
      this.tafeela.deleteFromPattern(this.tafeela.pattern.length - 1);
    }
  }
}
Salam.name_ar = 'صلم';

class Waqf extends BaseEllahZehaf {
  modifyTafeela() {
    const p = this.tafeela.pattern;
    assert(p[p.length - 3] === 1 && p[p.length - 2] === 0 && p[p.length - 1] === 1);
    this.tafeela.editPatternAtIndex(p.length - 1, 0);
  }
}
Waqf.name_ar = 'وقف';

class WaqfAndTay extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Tay(this.tafeela).modified_tafeela;
    this.tafeela = new Waqf(this.tafeela).modified_tafeela;
  }
}
WaqfAndTay.name_ar = 'وقف وطي';

class KhabalAndKasf extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Khabal(this.tafeela).modified_tafeela;
    const k = new Kasf(this.tafeela);
    k._affected_index = Kasf.affected_index - 2;
    this.tafeela = k.modified_tafeela;
  }
}
KhabalAndKasf.name_ar = 'خبل وكسف';

class Qasar extends BaseEllahZehaf {
  modifyTafeela() {
    const p = this.tafeela.pattern;
    assert(p[p.length - 2] === 1 && p[p.length - 1] === 0);
    this.tafeela.deleteFromPattern(p.length - 1);
    this.tafeela.editPatternAtIndex(this.tafeela.pattern.length - 1, 0);
  }
}
Qasar.name_ar = 'قصر';

class ThalmAndQasar extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Thalm(this.tafeela).modified_tafeela;
    this.tafeela = new Qasar(this.tafeela).modified_tafeela;
  }
}
ThalmAndQasar.name_ar = 'ثلم وقصر';

class Aql extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Qataf(this.tafeela).modified_tafeela;
    this.tafeela = new Khaban(this.tafeela).modified_tafeela;
  }
}
Aql.name_ar = 'عقل';

class Batr extends BaseEllahZehaf {
  modifyTafeela() {
    this.tafeela = new Hadhf(this.tafeela).modified_tafeela;
    this.tafeela = new Qataa(this.tafeela).modified_tafeela;
  }
}
Batr.name_ar = 'بتر';

export {
  AssertionError, assert,
  BaseEllahZehaf, BaseSingleHazfZehaf, BaseSingleTaskeenZehaf, BaseDoubledZehaf,
  NoZehafNorEllah,
  Khaban, Tay, Waqas, Qabadh, Kaff, Akal, Kasf, Tasheeth, Thalm,
  Edmaar, Asab, Ziyada,
  Khabal, Khazal, Shakal, Nakas, TayAndKasf, Tharm,
  Hadhf, HadhfAndKhaban, Qataf, Qataa, Tatheel, Tasbeegh,
  TatheelAndEdmaar, Tarfeel, TarfeelAndEdmaar, TarfeelAndKhaban,
  KhabanAndQataa, QataaAndEdmaar, Hathath, HathathAndEdmaar,
  Salam, Waqf, WaqfAndTay, KhabalAndKasf, Qasar, ThalmAndQasar,
  Aql, Batr,
};