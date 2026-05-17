'use strict';

(function(root) {

  var Q6 = {
    diseases: {
      colorblindness: { name: 'Daltonisme rouge/vert', inheritance: 'x_linked_recessive', color: '#3366cc' },
      cataract:       { name: 'Cataracte', inheritance: 'autosomal_recessive', color: '#2e8b57' },
      cholesterol:    { name: 'Hypercholestérolémie', inheritance: 'autosomal_dominant', color: '#cc3333' },
    },
    people: {
      I1:  { id: 'I1',  name: 'I1',  sex: 'male',   generation: 1,
             phenotypes: { colorblindness: 'affected',   cataract: 'unaffected', cholesterol: 'unaffected' } },
      I2:  { id: 'I2',  name: 'I2',  sex: 'female', generation: 1,
             phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'affected'   } },

      II1: { id: 'II1', name: 'II1', sex: 'male',   generation: 2,
             phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },
      II2: { id: 'II2', name: 'II2', sex: 'female', generation: 2,
             phenotypes: { colorblindness: 'carrier',    cataract: 'unaffected', cholesterol: 'unaffected' } },
      II3: { id: 'II3', name: 'II3', sex: 'female', generation: 2,
             phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'affected'   } },
      II4: { id: 'II4', name: 'II4', sex: 'male',   generation: 2,
             phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },
      II5: { id: 'II5', name: 'II5', sex: 'male',   generation: 2,
             phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'affected'   } },
      II6: { id: 'II6', name: 'II6', sex: 'female', generation: 2,
             phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },

      III1: { id: 'III1', name: 'III1', sex: 'male',   generation: 3,
              phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },
      III2: { id: 'III2', name: 'III2', sex: 'female', generation: 3,
              phenotypes: { colorblindness: 'carrier',    cataract: 'carrier',    cholesterol: 'unaffected' },
              statusOverrides: {
                colorblindness: { carrierProbability: '1/2', source: 'pedigree' },
                cataract:       { carrierProbability: '1/2', source: 'pedigree' },
              } },
      III3: { id: 'III3', name: 'III3', sex: 'female', generation: 3,
              phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },
      III4: { id: 'III4', name: 'III4', sex: 'male',   generation: 3,
              phenotypes: { colorblindness: 'unaffected', cataract: 'carrier',    cholesterol: 'affected'   } },
      III5: { id: 'III5', name: 'III5', sex: 'female', generation: 3,
              phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },
      III6: { id: 'III6', name: 'III6', sex: 'female', generation: 3,
              phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' } },

      Aline: { id: 'Aline', name: 'Aline (IV1)', sex: 'female', generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' },
               statusOverrides: {
                 colorblindness: { carrierProbability: '1',   affectedProbability: '0', source: 'conductrice (pedigree)' },
                 cataract:       { carrierProbability: '1/4', affectedProbability: '0', source: 'dérivé pedigree' },
               } },
      Kevin: { id: 'Kevin', name: 'Kevin (IV2)', sex: 'male', generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' },
               statusOverrides: {
                 cataract: { carrierProbability: '1/2', affectedProbability: '0', source: 'dérivé pedigree' },
               } },
      IV3:   { id: 'IV3',   name: 'IV3', sex: 'male',   generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'affected'   } },
      Zoe:   { id: 'Zoe',   name: 'Zoé (IV4)', sex: 'female', generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'unaffected', cholesterol: 'unaffected' },
               statusOverrides: {
                 colorblindness: { carrierProbability: '1/2', affectedProbability: '0', source: 'dérivé pedigree' },
                 cataract:       { carrierProbability: '1/3', affectedProbability: '0', source: 'dérivé pedigree' },
               } },
      IV5:   { id: 'IV5',   name: 'IV5', sex: 'female', generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'affected',    cholesterol: 'unaffected' } },
      Bob:   { id: 'Bob',   name: 'Bob (IV6)', sex: 'male', generation: 4,
               phenotypes: { colorblindness: 'unaffected', cataract: 'affected',    cholesterol: 'unaffected' } },
      IV7:   { id: 'IV7',   name: 'IV7', sex: 'male',   generation: 4,
               phenotypes: { colorblindness: 'affected',   cataract: 'unaffected', cholesterol: 'unaffected' } },
    },
    couples: [
      { id: 'cI1',   parents: ['I1',   'I2'],   children: ['II2', 'II3', 'II4', 'II5'] },
      { id: 'cII1',  parents: ['II1',  'II2'],  children: ['III2', 'III3'] },
      { id: 'cII2',  parents: ['II5',  'II6'],  children: ['III4', 'III5', 'III6'] },
      { id: 'cIII1', parents: ['III1', 'III2'], children: ['Aline', 'Kevin'] },
      { id: 'cIII2', parents: ['III3', 'III4'], children: ['IV3', 'Zoe', 'IV5', 'Bob', 'IV7'] },
    ],
    riskOverrides: {
      'Aline_Bob_male': { cataract: '1/8', colorblindness: '1/2' },
      'Kevin_Zoe_male': { cataract: '1/24', colorblindness: '1/4' },
    },
  };

  var PedigreeExamples = { Q6: Q6 };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PedigreeExamples;
  } else {
    root.PedigreeExamples = PedigreeExamples;
  }

}(typeof self !== 'undefined' ? self : this));
