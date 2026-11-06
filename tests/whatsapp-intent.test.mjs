import test from 'node:test';
import assert from 'node:assert/strict';
import { isExplicitQuoteAcceptance, isExplicitQuoteIntent } from '../src/utils/whatsapp-intent.ts';

test('requires explicit purchase or quote intent before preparing a quote', () => {
  assert.equal(isExplicitQuoteIntent('Quiero comprar este tratamiento'), true);
  assert.equal(isExplicitQuoteIntent('¿Me envías una cotización?'), true);
  assert.equal(isExplicitQuoteIntent('¿Cuánto cuesta?'), false);
  assert.equal(isExplicitQuoteIntent('Solo estoy mirando opciones'), false);
});

test('detects explicit acceptance for a quote or booking', () => {
  assert.equal(isExplicitQuoteAcceptance('Acepto la cotización'), true);
  assert.equal(isExplicitQuoteAcceptance('Sí, quiero reservar la cita'), true);
});

test('accepts a short yes only after the agent invited confirmation', () => {
  assert.equal(isExplicitQuoteAcceptance('Sí', false), false);
  assert.equal(isExplicitQuoteAcceptance('Sí', true), true);
});

test('does not treat questions, negations, or conditional responses as acceptance', () => {
  assert.equal(isExplicitQuoteAcceptance('¿Cuánto cuesta?', true), false);
  assert.equal(isExplicitQuoteAcceptance('No acepto', true), false);
  assert.equal(isExplicitQuoteAcceptance('Sí, pero quiero pensarlo', true), false);
});
