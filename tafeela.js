// tafeela.js
import {
  Akal, Asab, Edmaar, Kaff, Kasf, Khabal, Khaban,
  Khazal, Nakas, Qabadh, Shakal, Tasheeth, Tay,
  Thalm, Tharm, Waqas,
} from './zihaf.js';

const SUKUN = '\u0652';

class Tafeela {
  static name_ = '';
  static allowed_zehafs = [];
  static pattern_int = 0;

  constructor() {
    this.name = this.constructor.name_ || '';
    this.allowed_zehafs = this.constructor.allowed_zehafs || [];
    this.applied_ella_zehaf_class = null;

    this.original_pattern = String(this.constructor.pattern_int).split('').map(Number);
    this.pattern = [...this.original_pattern];
    this.pattern_int = this.constructor.pattern_int;
    this._manageSukunChar();
  }

  _manageSukunChar() {}

  deleteFromPattern(index) {
    if (index >= 0 && index < this.pattern.length) {
      this.pattern.splice(index, 1);
      this.pattern_int = parseInt(this.pattern.join(''), 10);
    }
  }

  addToPattern(index, number, charMask) {
    this.pattern.splice(index, 0, number);
    this.pattern_int = parseInt(this.pattern.join(''), 10);
  }

  editPatternAtIndex(index, number) {
    if (index >= 0 && index < this.pattern.length) {
      this.pattern[index] = number;
      this.pattern_int = parseInt(this.pattern.join(''), 10);
    }
  }

  allZehafTafeela_forms() {
    const forms = [this];
    for (const ZehafClass of this.allowed_zehafs) {
      try {
        const zehaf = new ZehafClass(this);
        forms.push(zehaf.modified_tafeela);
      } catch (e) {
        if (e instanceof AssertionError) continue;
        throw e;
      }
    }
    return forms;
  }

  toString() {
    return this.pattern.join('');
  }

  repr() {
    return `${this.name}(${this.pattern_int})`;
  }

  equals(other) {
    if (other instanceof Tafeela) {
      return this.pattern_int === other.pattern_int;
    }
    return false;
  }
}

// Simple AssertionError class for JS
class AssertionError extends Error {}

class Fawlon extends Tafeela {}
Fawlon.name_ = 'فعولن';
Fawlon.allowed_zehafs = [Qabadh, Thalm, Tharm];
Fawlon.pattern_int = 11010;

class Faelon extends Tafeela {}
Faelon.name_ = 'فاعلن';
Faelon.allowed_zehafs = [Khaban, Tasheeth];
Faelon.pattern_int = 10110;

class Mafaeelon extends Tafeela {}
Mafaeelon.name_ = 'مفاعيلن';
Mafaeelon.allowed_zehafs = [Qabadh, Kaff];
Mafaeelon.pattern_int = 1101010;

class Mustafelon extends Tafeela {}
Mustafelon.name_ = 'مستفعلن';
Mustafelon.allowed_zehafs = [Khaban, Tay, Khabal];
Mustafelon.pattern_int = 1010110;

class Mutafaelon extends Tafeela {}
Mutafaelon.name_ = 'متفاعلن';
Mutafaelon.allowed_zehafs = [Edmaar, Waqas, Khazal];
Mutafaelon.pattern_int = 1110110;

class Mafaelaton extends Tafeela {}
Mafaelaton.name_ = 'مفاعلتن';
Mafaelaton.allowed_zehafs = [Asab, Akal, Nakas];
Mafaelaton.pattern_int = 1101110;

class Mafoolato extends Tafeela {}
Mafoolato.name_ = 'مفعولات';
Mafoolato.allowed_zehafs = [Khaban, Tay, Khabal, Kasf];
Mafoolato.pattern_int = 1010101;

class Fae_laton extends Tafeela {}
Fae_laton.name_ = 'فاع لاتن';
Fae_laton.allowed_zehafs = [Kaff];
Fae_laton.pattern_int = 1011010;

class Mustafe_lon extends Tafeela {}
Mustafe_lon.name_ = 'مستفع لن';
Mustafe_lon.allowed_zehafs = [Khaban, Kaff, Tay, Shakal];
Mustafe_lon.pattern_int = 1010110;

class Faelaton extends Tafeela {}
Faelaton.name_ = 'فاعلاتن';
Faelaton.allowed_zehafs = [Khaban, Kaff, Shakal];
Faelaton.pattern_int = 1011010;

export {
  Tafeela, AssertionError, SUKUN,
  Fawlon, Faelon, Mafaeelon, Mustafelon, Mutafaelon,
  Mafaelaton, Mafoolato, Fae_laton, Mustafe_lon, Faelaton,
};