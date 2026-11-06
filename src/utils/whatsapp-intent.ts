function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function isExplicitQuoteIntent(text: string) {
  const value = normalize(text);
  if (!value || value.length > 1000) return false;
  if (/\b(solo estoy mirando|solo queria saber|solo quiero saber|estoy comparando|no voy a comprar|no quiero comprar|no me interesa comprar)\b/.test(value)) return false;
  return /\b(cotizame|cotizacion para|quiero una cotizacion|necesito una cotizacion|enviame una cotizacion|me envias una cotizacion|quiero comprar|deseo comprar|me interesa comprar|quiero adquirir|me lo llevo|quiero reservar|reservame|quiero agendar|agendame|separame)\b/.test(value);
}

export function isExplicitQuoteAcceptance(text: string, lastAssistantInvitedConfirmation = false) {
  const value = normalize(text);
  if (!value || value.length > 500) return false;
  if (/[?¿]/.test(value) || /\b(no|todavia no|aun no|pero|si fuera|quizas|tal vez|depende|mas adelante)\b/.test(value)) return false;

  if (/\b(acepto|confirmo|la quiero|lo quiero|quiero reservar|quiero agendar|reservala|reservalo|agendala|agendalo|separala|separalo)\b/.test(value)) return true;
  if (!lastAssistantInvitedConfirmation) return false;

  return /^(si|ok|okay|listo|dale|de acuerdo|me parece bien|esta bien|sigamos|continuemos|hagamoslo)[.! ]*$/.test(value);
}
