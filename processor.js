// processor.js
import { ArudiConverter } from './arudi.js';
import { getAllMeters } from './bahr.js';

function sequenceMatcherRatio(a, b) {
  if (!a.length && !b.length) return 1.0;
  if (!a.length || !b.length) return 0.0;

  // Simple LCS-based similarity matching difflib.SequenceMatcher behavior
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i-1][j-1] + 1;
      else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  const matches = dp[m][n];
  return (2.0 * matches) / (m + n);
}

class ArudhProcessor {
  constructor() {
    this.converter = new ArudiConverter();
    this.meter_classes = getAllMeters();
    this.precomputed_patterns = {};
    this._precomputePatterns();
  }

  _precomputePatterns() {
    for (const [name, BahrCls] of Object.entries(this.meter_classes)) {
      const inst = new BahrCls();
      this.precomputed_patterns[name] = inst.detailed_patterns;
    }
  }

  _getSimilarity(a, b) {
    return Math.pow(sequenceMatcherRatio(a, b), 6);
  }

  processPoem(verses, meterName = null) {
    const detectedCounts = {};
    const tempResults = [];

    for (let i = 0; i < verses.length; i++) {
      const [sadr, ajuz] = verses[i];

      const sadrResSat   = this.converter.prepareText(sadr, true,  false);
      const sadrResUnsat = this.converter.prepareText(sadr, false, false);

      let ajuzResSat   = this.converter.prepareText(ajuz, true,  false);
      let ajuzResUnsat = this.converter.prepareText(ajuz, false, true);

      if (!ajuz) {
        ajuzResSat   = ['', ''];
        ajuzResUnsat = ['', ''];
      }

      const sadrCandidates = [sadrResSat];
      if (sadrResUnsat[1] !== sadrResSat[1]) sadrCandidates.push(sadrResUnsat);

      const ajuzCandidates = [ajuzResSat];
      if (ajuzResUnsat[1] !== ajuzResSat[1]) ajuzCandidates.push(ajuzResUnsat);

      const candidates = this._findBestMeter(sadrCandidates, ajuzCandidates, meterName);
      let matchInfo = null;
      if (candidates.length) {
        matchInfo = candidates[0];
        const m = matchInfo.meter;
        detectedCounts[m] = (detectedCounts[m] || 0) + 1;
      }

      let chosenSadr = sadrCandidates[0];
      let chosenAjuz = ajuzCandidates[0];

      if (matchInfo) {
        if (matchInfo.sadr_input_pattern) {
          for (const cand of sadrCandidates) {
            if (cand[1] === matchInfo.sadr_input_pattern) { chosenSadr = cand; break; }
          }
        }
        if (matchInfo.ajuz_input_pattern) {
          for (const cand of ajuzCandidates) {
            if (cand[1] === matchInfo.ajuz_input_pattern) { chosenAjuz = cand; break; }
          }
        }
      }

      tempResults.push({
        index: i,
        sadr: { text: sadr, pattern: chosenSadr[1], arudi: chosenSadr[0] },
        ajuz: { text: ajuz, pattern: chosenAjuz[1], arudi: chosenAjuz[0] },
        match: matchInfo,
      });
    }

    let globalMeter;
    if (meterName) {
      globalMeter = meterName;
    } else if (Object.keys(detectedCounts).length) {
      globalMeter = Object.entries(detectedCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
    } else {
      return { error: 'Could not detect any valid meter.' };
    }

    const finalAnalysis = tempResults.map(res => this._analyzeVerse(res, globalMeter));
    return { meter: globalMeter, verses: finalAnalysis };
  }

  _findBestMeter(sadrCandidates, ajuzCandidates, targetMeter = null) {
    const METER_PRIORITY = {
      rajaz: 20, kamel: 10, hazaj: 20, wafer: 10,
      saree: 20, munsareh: 10, baseet: 10,
      ramal: 15, mutadarak: 15, mutakareb: 15,
    };

    let metersToCheck = Object.entries(this.precomputed_patterns);
    if (targetMeter) {
      if (!(targetMeter in this.precomputed_patterns)) return [];
      metersToCheck = [[targetMeter, this.precomputed_patterns[targetMeter]]];
    }

    const candidates = [];

    for (const [name, patterns] of metersToCheck) {
      // Best Sadr
      let bestSadr = null, bestSadrScore = -1, bestSadrInput = '';
      for (const cand of sadrCandidates) {
        const match = this._findBestComponentMatch(cand[1], patterns.sadr);
        if (match.score > bestSadrScore) {
          bestSadrScore = match.score;
          bestSadr = match;
          bestSadrInput = cand[1];
        }
      }

      // Best Ajuz
      let bestAjuz = null, bestAjuzScore = -1, bestAjuzInput = '';
      const hasAjuz = ajuzCandidates.some(c => c[1]);
      if (hasAjuz) {
        for (const cand of ajuzCandidates) {
          if (!cand[1]) continue;
          const match = this._findBestComponentMatch(cand[1], patterns.ajuz);
          if (match.score > bestAjuzScore) {
            bestAjuzScore = match.score;
            bestAjuz = match;
            bestAjuzInput = cand[1];
          }
        }
      }

      // Pair validity
      let isValidPair = false;
      if (bestSadr?.ref && (!hasAjuz || bestAjuz?.ref)) {
        const sPat = bestSadr.ref.pattern;
        const aPat = bestAjuz?.ref?.pattern ?? '';
        const key = JSON.stringify([sPat, aPat]);
        if (patterns.pairs.has(key)) isValidPair = true;
      }

      const totalScore = hasAjuz
        ? (bestSadrScore + bestAjuzScore) / 2
        : bestSadrScore;

      candidates.push({
        meter: name,
        score: totalScore,
        sadr_match: bestSadr,
        ajuz_match: bestAjuz,
        valid_pair: isValidPair,
        sadr_input_pattern: bestSadrInput,
        ajuz_input_pattern: bestAjuzInput,
      });
    }

    candidates.sort((a, b) => {
      const scoreDiff = Math.round(b.score * 1000) - Math.round(a.score * 1000);
      if (scoreDiff !== 0) return scoreDiff;
      if (b.valid_pair !== a.valid_pair) return b.valid_pair ? 1 : -1;
      return (METER_PRIORITY[b.meter] || 0) - (METER_PRIORITY[a.meter] || 0);
    });

    return candidates;
  }

  _findBestComponentMatch(inputPattern, componentPatterns) {
    let bestScore = -1, bestRef = null;
    for (const item of componentPatterns) {
      const score = this._getSimilarity(item.pattern, inputPattern);
      if (score > bestScore) { bestScore = score; bestRef = item; }
    }
    return { score: bestScore, ref: bestRef };
  }

  _analyzeVerse(res, meterName) {
    const patterns = this.precomputed_patterns[meterName];
    if (!patterns) return { error: 'Meter data not found' };

    const sadrMatch = this._findBestComponentMatch(res.sadr.pattern, patterns.sadr);
    let ajuzMatch = null;
    if (res.ajuz.pattern) {
      ajuzMatch = this._findBestComponentMatch(res.ajuz.pattern, patterns.ajuz);
    }

    const BahrCls = this.meter_classes[meterName];
    let allowedSadr = [], allowedAjuz = [];
    if (BahrCls) {
      const inst = new BahrCls();
      allowedSadr = inst.getAllowedFeetPatterns(0);
      allowedAjuz = inst.getAllowedFeetPatterns(1);
    }

    const sadrAnalysis = this._analyzeFeet(res.sadr.pattern, allowedSadr, sadrMatch.ref);
    const ajuzAnalysis = res.ajuz.pattern
      ? this._analyzeFeet(res.ajuz.pattern, allowedAjuz, ajuzMatch?.ref)
      : null;

    const scoreCount = ajuzMatch ? 2 : 1;
    const scoreSum = sadrMatch.score + (ajuzMatch?.score ?? 0);

    return {
      verse_index: res.index,
      sadr_text: res.sadr.text,
      ajuz_text: res.ajuz.text,
      input_pattern: res.sadr.pattern + res.ajuz.pattern,
      best_ref_pattern:
        (sadrMatch.ref?.pattern ?? '') +
        (ajuzMatch?.ref?.pattern ?? ''),
      score: Math.round((scoreSum / scoreCount) * 100) / 100,
      sadr_analysis: sadrAnalysis,
      ajuz_analysis: ajuzAnalysis,
    };
  }

  _analyzeFeet(inputPattern, allowedFeetList, bestRef) {
    const analysis = [];
    let currentIdx = 0;
    const refFeetBackup = bestRef?.feet ?? [];
    const numFeet = allowedFeetList?.length || refFeetBackup.length;

    for (let i = 0; i < numFeet; i++) {
      let candidates = allowedFeetList?.[i]
        ?? (i < refFeetBackup.length ? [refFeetBackup[i]] : []);

      candidates = [...candidates].sort((a, b) => b.pattern.length - a.pattern.length);

      let bestLocalMatch = null, bestLocalScore = -1;

      for (const cand of candidates) {
        const segment = inputPattern.slice(currentIdx, currentIdx + cand.pattern.length);
        if (!segment) break;

        const score = this._getSimilarity(cand.pattern, segment);
        if (segment.length === cand.pattern.length && score === 1.0) {
          bestLocalMatch = cand;
          bestLocalScore = 1.0;
          break;
        }
        if (score > bestLocalScore) {
          bestLocalScore = score;
          bestLocalMatch = cand;
        }
      }

      if (!bestLocalMatch && candidates.length) bestLocalMatch = candidates[0];

      if (!bestLocalMatch) {
        analysis.push({
          foot_index: i,
          expected_pattern: candidates[0]?.pattern ?? '?',
          name: candidates[0]?.name ?? '؟',
          zihaf: null,
          actual_segment: 'MISSING',
          score: 0.0,
          status: 'missing',
        });
        continue;
      }

      const endIdx = Math.min(currentIdx + bestLocalMatch.pattern.length, inputPattern.length);
      const actualSegment = inputPattern.slice(currentIdx, endIdx);
      const finalScore = this._getSimilarity(bestLocalMatch.pattern, actualSegment);
      const status = !actualSegment ? 'missing' : finalScore === 1.0 ? 'ok' : 'broken';

      analysis.push({
        foot_index: i,
        expected_pattern: bestLocalMatch.pattern,
        name: bestLocalMatch.name,
        zihaf: bestLocalMatch.zihaf,
        actual_segment: actualSegment,
        score: Math.round(finalScore * 100) / 100,
        status,
      });

      currentIdx = endIdx;
    }

    if (currentIdx < inputPattern.length) {
      analysis.push({
        foot_index: numFeet,
        expected_pattern: '',
        name: 'زيادة',
        zihaf: null,
        actual_segment: inputPattern.slice(currentIdx),
        score: 0,
        status: 'extra_bits',
      });
    }

    return analysis;
  }
}

export { ArudhProcessor };