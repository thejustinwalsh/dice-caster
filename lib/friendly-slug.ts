import {sample, sampleSize} from 'es-toolkit';
import {objects, predicates} from 'friendly-words';

const SAMPLE_SIZE = 10;

const samples = (words: string[]) => sampleSize(words, SAMPLE_SIZE);
const triples = (firstWords: string[], secondWords: string[], thirdWords: string[]) =>
  firstWords.map((firstWord, index) => `${firstWord}-${secondWords[index]}-${thirdWords[index]}`);

export function slug() {
  return sample(triples(samples(predicates), samples(predicates), samples(objects)));
}
