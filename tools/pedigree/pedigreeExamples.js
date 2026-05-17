'use strict';

(function(root) {

  var Q6 = {
    diseases: {
      colorblindness: { name: 'Daltonisme rouge/vert', inheritance: 'x_linked_recessive',   color: '#3366cc' },
      cataract:       { name: 'Cataracte',             inheritance: 'autosomal_recessive',   color: '#2e8b57' },
      cholesterol:    { name: 'Hypercholestérolémie',  inheritance: 'autosomal_dominant',    color: '#cc3333' },
    },
    people: {
      I1:  { id: 'I1',  name: 'I.1',           sex: 'male',   generation: 1,
             phenotypes: { colorblindness: 'affected',   cataract: 'unaffected', cholesterol: 'unaffected' } },
      I2:  { id: 'I2',  name: 'I.2',           sex: 'female', generation: 1,
             phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },
      II1: { id: 'II1', name: 'II.1',          sex: 'female', generation: 2,
             phenotypes: { colorblindness: 'carrier',    cataract: 'unaffected', cholesterol: 'unaffected' } },
      II2: { id: 'II2', name: 'II.2',          sex: 'male',   generation: 2,
             phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },
      II3: { id: 'II3', name: 'II.3',          sex: 'male',   generation: 2,
             phenotypes: { colorblindness: 'unaffected', cataract: 'carrier',    cholesterol: 'unaffected' } },
      II4: { id: 'II4', name: 'II.4',          sex: 'female', generation: 2,
             phenotypes: { colorblindness: 'unaffected', cataract: 'carrier',    cholesterol: 'affected'   } },

      III1: { id: 'III1', name: 'III.1',       sex: 'male',   generation: 3,
              phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'affected'  } },
      III2: { id: 'III2', name: 'III.2',       sex: 'female', generation: 3,
              phenotypes: { colorblindness: 'carrier',    cataract: 'carrier',    cholesterol: 'unaffected' },
              statusOverrides: {
                colorblindness: { carrierProbability: '1/2', source: 'pedigree' },
                cataract:       { carrierProbability: '1/2', source: 'pedigree' },
              } },
      III3: { id: 'III3', name: 'III.3',       sex: 'male',   generation: 3,
              phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },

      Aline: { id: 'Aline', name: 'Aline (IV.1)', sex: 'female', generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' },
               statusOverrides: {
                 colorblindness: { carrierProbability: '1',   affectedProbability: '0', source: 'conductrice (pedigree)' },
                 cataract:       { carrierProbability: '1/4', affectedProbability: '0', source: 'dérivé pedigree' },
               } },
      Kevin: { id: 'Kevin', name: 'Kevin (IV.2)', sex: 'male',   generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'affected'  },
               statusOverrides: {
                 cataract: { carrierProbability: '1/2', affectedProbability: '0', source: 'dérivé pedigree' },
               } },
      Zoe:   { id: 'Zoe',   name: 'Zoé (IV.4)',  sex: 'female', generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' },
               statusOverrides: {
                 colorblindness: { carrierProbability: '1/2', affectedProbability: '0', source: 'dérivé pedigree' },
                 cataract:       { carrierProbability: '1/3', affectedProbability: '0', source: 'dérivé pedigree' },
               } },
      Bob:   { id: 'Bob',   name: 'Bob (IV.6)',  sex: 'male',   generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'affected',    cholesterol: 'unaffected' } },
    },
    couples: [
      { id: 'cI1',   parents: ['I1',   'I2'],   children: ['II1', 'II2'] },
      { id: 'cII1',  parents: ['II2',  'II1'],  children: ['III2'] },
      { id: 'cII2',  parents: ['II3',  'II4'],  children: ['III1'] },
      { id: 'cIII1', parents: ['III1', 'III2'], children: ['Aline', 'Kevin'] },
    ],
    riskOverrides: {
      'Aline_Bob_male':  { cataract: '1/8',  colorblindness: '1/2' },
      'Kevin_Zoe_male':  { cataract: '1/24', colorblindness: '1/4' },
    },
  };

  var PedigreeExamples = { Q6: Q6 };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PedigreeExamples;
  } else {
    root.PedigreeExamples = PedigreeExamples;
  }

}(typeof self !== 'undefined' ? self : this));
