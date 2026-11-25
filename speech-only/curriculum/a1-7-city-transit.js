export const meta = {
  id: 'transit',
  a1Code: 'A1.7',
  label: 'A1.7 City & Transit',
  active: true,
  subtitle: 'Unit 7/8 · Places, directions, taxis, Metro, and hotels.',
  description: 'Street directions, public transit, taxis, and hotel check-in.',
  grammarTitle: 'Unit 7 Grammar Notes',
  grammarRules: [
    '"¿Dónde está el/la...?" (known place) vs. "¿Dónde hay un/una...?" (any nearby).',
    'Location words: cerca de, lejos de, al lado de, enfrente de, en la esquina.',
    'Polite usted directions: siga recto, doble a la derecha/izquierda, pare aquí.'
  ],
  stages: [
    {
      stageKey: 'transit_s1',
      shortTitle: 'Places & Directions',
      label: 'Stage 1/3: Places & Directions',
      desc: 'Places, turns, straight ahead, blocks, and prepositions.',
      hint: 'Pass Stage 1 to unlock Stage 2.',
      focusRule: 'Use ESTAR for locations ("¿Dónde está?"); "de + el" → "del".'
    },
    {
      stageKey: 'transit_s2',
      shortTitle: 'Taxis & Bus Rides',
      label: 'Stage 2/3: Taxis & Bus Rides',
      desc: 'Taxi fares, destinations, traffic, and stops.',
      hint: 'Pass Stage 2 to unlock Stage 3.',
      focusRule: 'Say "Voy para..." for destination and confirm fare before riding.'
    },
    {
      stageKey: 'transit_s3',
      shortTitle: 'Metro, Buses & Hotels',
      label: 'Stage 3/3: Metro, Buses & Hotels',
      desc: 'Metro, buses, schedules, and hotel check-in.',
      hint: 'Finish Stage 3 to unlock Unit 8.',
      focusRule: '"¿A qué hora sale...?" for departures; "Tengo una reservación" at hotels.'
    }
  ]
};

export const guide = {
  heading: 'A1.7 Directions, Transit & Hotels',
  vocab: [
    ['¿dónde está...?', 'where is...?'],
    ['a la derecha / izq.', 'to the right / left'],
    ['todo directo', 'straight ahead'],
    ['a dos cuadras', 'two blocks away'],
    ['¿cuánto me cobra?', 'what is the fare?'],
    ['voy para...', "I'm heading to..."],
    ['el tranque', 'traffic jam (PA)'],
    ['¡bajando, por favor!', 'getting off!']
  ],
  tips: [
    'Always use ESTAR for locations ("¿Dónde está el baño?").',
    'Contraction rule: "a + el" -> "al"; "de + el" -> "del".',
    'Agree on yellow taxi fares BEFORE getting in ("¿Cuánto me cobra?").',
    '"El tranque" is Panamanian Spanish for heavy traffic.',
    'Metro & MetroBus require a rechargeable card ("recargar").',
    'Say "Tengo una reservación" when checking into a hotel.'
  ]
};

export const items = [
  // Stage 1: Town Places, Prepositions of Location & Street Directions
  {
    id: 't_donde_bano',
    stage: 'transit_s1',
    es: '¿dónde está el baño por favor?',
    altEs: ['¿dónde está el baño?', 'dónde está el baño'],
    en: 'where is the bathroom please?',
    altEn: ['where is the bathroom', 'where is the restroom'],
    note: 'Always use ESTAR ("¿Dónde está...?") to ask where any person or place is located.',
    structure: {
      bank: 'places_town',
      patternEs: '¿dónde está [place] por favor?',
      patternEn: 'where is [place] please?',
      build: (p) => ({
        es: `¿dónde está ${p.es} por favor?`,
        altEs: [`¿dónde está ${p.es}?`, `dónde está ${p.es} por favor`, `dónde está ${p.es}`],
        en: `where is ${p.en} please?`
      })
    }
  },
  {
    id: 't_cajero',
    stage: 'transit_s1',
    es: '¿dónde hay un cajero automático?',
    altEs: ['dónde hay un cajero automático', 'un cajero automático', 'el banco'],
    en: 'where is there an ATM?',
    altEn: ['where is an atm', 'atm'],
    note: 'Use "¿Dónde está el/la...?" for a specific place, and "¿Dónde hay un/una...?" for "Where is there a...?"',
    structure: {
      bank: 'places_town',
      patternEs: '¿dónde hay [place] cerca?',
      patternEn: 'where is there [place] nearby?',
      build: (p) => ({
        es: `¿dónde hay ${p.indefEs} cerca?`,
        altEs: [`dónde hay ${p.indefEs} cerca`, `¿dónde hay ${p.indefEs}?`],
        en: `where is there ${p.indefEn} nearby?`
      })
    }
  },
  { id: 't_supermercado', stage: 'transit_s1', es: 'el supermercado y la farmacia', altEs: ['el supermercado', 'la farmacia'], en: 'the supermarket and the pharmacy', altEn: ['supermarket and pharmacy'], note: 'Key A1 town places: el supermercado, la farmacia, el banco, el hospital, el hotel.' },
  {
    id: 't_derecha',
    stage: 'transit_s1',
    es: 'doble a la derecha',
    altEs: ['a la derecha', 'gire a la derecha'],
    en: 'turn to the right',
    altEn: ['turn right', 'to the right'],
    note: 'In Panama, "doble" (from doblar) is the standard verb for turning a corner (watch "de + el → del"!).',
    structure: {
      bank: 'direction_landmarks',
      patternEs: 'doble a la derecha después de [landmark]',
      patternEn: 'turn right after [landmark]',
      build: (lm) => ({
        es: `doble a la derecha después de ${lm.es}`,
        altEs: [`gire a la derecha después de ${lm.es}`],
        en: `turn right after ${lm.en}`
      })
    }
  },
  {
    id: 't_izquierda',
    stage: 'transit_s1',
    es: 'doble a la izquierda',
    altEs: ['a la izquierda', 'gire a la izquierda'],
    en: 'turn to the left',
    altEn: ['turn left', 'to the left'],
    note: '"Doble a la izquierda" = turn left; remember "de + el → del"!',
    structure: {
      bank: 'direction_landmarks',
      patternEs: 'doble a la izquierda en [landmark]',
      patternEn: 'turn left at [landmark]',
      build: (lm) => ({
        es: `doble a la izquierda en ${lm.es}`,
        altEs: [`gire a la izquierda en ${lm.es}`],
        en: `turn left at ${lm.en}`
      })
    }
  },
  { id: 't_directo', stage: 'transit_s1', es: 'siga todo directo', altEs: ['todo directo', 'todo recto'], en: 'continue straight ahead', altEn: ['go straight ahead', 'straight ahead'], note: 'Panamanians say "siga todo directo" for "keep going straight".' },
  { id: 't_esquina', stage: 'transit_s1', es: 'está en la esquina', altEs: ['en la esquina'], en: 'it is on the corner', altEn: ['on the corner'], note: 'Panama City directions rely on landmarks and street corners ("la esquina").' },
  { id: 't_cuadras', stage: 'transit_s1', es: 'está a dos cuadras de aquí', altEs: ['a dos cuadras', 'dos cuadras más'], en: 'it is two blocks from here', altEn: ['two blocks from here', 'two blocks away'], note: '"Una cuadra" = one city block.' },
  {
    id: 't_cerca_lejos',
    stage: 'transit_s1',
    es: '¿está cerca o está lejos?',
    altEs: ['está cerca', 'está lejos', 'cerca de aquí'],
    en: 'is it near or is it far?',
    altEn: ['near or far', 'is it close or far'],
    note: '"Cerca de" = near to; "Lejos de" = far from.',
    structure: {
      bank: 'places_town',
      patternEs: '¿[place] está cerca o lejos?',
      patternEn: 'is [place] near or far?',
      build: (p) => ({
        es: `¿${p.es} está cerca o lejos?`,
        altEs: [`${p.es} está cerca o lejos`, `¿está cerca ${p.es}?`],
        en: `is ${p.en} near or far?`
      })
    }
  },
  {
    id: 't_al_lado',
    stage: 'transit_s1',
    es: 'al lado del hotel',
    altEs: ['al lado de'],
    en: 'next to the hotel',
    altEn: ['next to', 'beside the hotel'],
    note: 'Remember the contraction: "de + el" ALWAYS becomes "del" ("al lado del hotel", "cerca del parque")!',
    structure: {
      banks: ['location_prepositions', 'places_town'],
      patternEs: 'está [preposition] [place]',
      patternEn: 'it is [preposition] [place]',
      build: (prep, place) => ({
        es: `está ${prep.es} ${place.es}`,
        altEs: [`${prep.es} ${place.es}`],
        en: `it is ${prep.en} ${place.en}`
      })
    }
  },
  {
    id: 't_enfrente',
    stage: 'transit_s1',
    es: 'enfrente del parque',
    altEs: ['enfrente de', 'frente al parque'],
    en: 'across from / in front of the park',
    altEn: ['across from the park', 'in front of the park'],
    note: 'A1 prepositions of place: enfrente de + el → enfrente del!',
    structure: {
      bank: 'places_town',
      patternEs: 'está enfrente de [place]',
      patternEn: 'it is across from [place]',
      build: (p) => ({
        es: `está enfrente de ${p.es}`,
        altEs: [`enfrente de ${p.es}`],
        en: `it is across from ${p.en}`
      })
    }
  },
  { id: 't_perdido', stage: 'transit_s1', es: 'estoy perdido, ¿me puede ayudar?', altEs: ['estoy perdido', 'estoy perdida'], en: "I'm lost, can you help me?", altEn: ['i am lost', 'im lost can you help me'], note: 'Masculine speakers say "estoy perdido"; feminine speakers say "estoy perdida".' },

  // Stage 2: Taxis, Buses & Getting Around Panama
  {
    id: 't_cuanto_cobra',
    stage: 'transit_s2',
    es: '¿cuánto me cobra hasta el centro?',
    altEs: ['¿cuánto me cobra?', 'cuánto me cobra hasta aquí'],
    en: 'how much do you charge to go downtown?',
    altEn: ['how much do you charge', 'what is the fare'],
    note: 'Yellow street taxis in Panama do not use meters — always confirm the fare before boarding!',
    structure: {
      bank: 'panama_destinations',
      patternEs: '¿cuánto me cobra hasta [destination]?',
      patternEn: 'how much do you charge to [destination]?',
      build: (dest) => ({
        es: `¿cuánto me cobra hasta ${dest.es}?`,
        altEs: [`cuánto me cobra hasta ${dest.es}`, `¿cuánto cuesta hasta ${dest.es}?`],
        en: `how much do you charge to ${dest.en}?`
      })
    }
  },
  { id: 't_voy_para', stage: 'transit_s2', es: 'voy para [Destination]', altEs: [], en: "I'm heading to [any place]", altEn: ['im heading to', 'im going to'], note: 'In Panama, "voy para..." + any destination is the everyday way to say where you are headed.', slotTemplate: { prefixEs: ['voy para', 'yo voy para'], suffixEs: [], slotHintEs: 'Destination', patternEs: 'voy para [Destination]' } },
  { id: 't_aeropuerto', stage: 'transit_s2', es: 'lléveme [Destination]', altEs: [], en: 'take me to [any destination]', altEn: ['take me to'], note: 'Say "lléveme a / al [any destination]" to tell a driver where to go.', slotTemplate: { prefixEs: ['lléveme al', 'lléveme a', 'lleveme al', 'lleveme a', 'llévame al', 'llévame a'], suffixEs: [], slotHintEs: 'Destination', patternEs: 'lléveme [Destination]' } },
  {
    id: 't_pare_aqui',
    stage: 'transit_s2',
    es: 'puede parar aquí mismo',
    altEs: ['puede parar aquí', 'pare aquí por favor'],
    en: 'you can stop right here',
    altEn: ['stop right here', 'can you stop here'],
    note: 'Tell any driver where to stop using "pare + [preposition] + [place]"!',
    structure: {
      banks: ['location_prepositions', 'places_town'],
      patternEs: 'pare [preposition] [place]',
      patternEn: 'stop [preposition] [place]',
      build: (prep, place) => ({
        es: `pare ${prep.es} ${place.es}`,
        altEs: [`puede parar ${prep.es} ${place.es}`],
        en: `stop ${prep.en} ${place.en}`
      })
    }
  },
  { id: 't_aqui_bajo', stage: 'transit_s2', es: 'aquí me bajo por favor', altEs: ['aquí me bajo'], en: "I'm getting off here please", altEn: ['i get off here', 'getting off here'], note: 'Reflexive verb "bajarse" = to get off a bus, train, or taxi.' },
  { id: 't_bajando', stage: 'transit_s2', es: 'bajando por favor', altEs: ['¡bajando!', 'bajando'], en: 'getting off! (calling to bus driver)', altEn: ['getting off'], note: 'Call "¡Bajando por favor!" clearly before your bus stop in Panama.' },
  { id: 't_tranque', stage: 'transit_s2', es: 'hoy hay mucho tranque', altEs: ['hay mucho tranque', 'el tranque'], en: 'there is heavy traffic today (Panama)', altEn: ['there is heavy traffic', 'traffic jam'], note: '"El tranque" is Panama\'s signature word for a traffic jam.' },
  { id: 't_cinta', stage: 'transit_s2', es: 'vamos por la Cinta Costera', altEs: ['por la Cinta Costera'], en: "let's go along the Cinta Costera", altEn: ['along the cinta costera'], note: '"Por" expresses going "along / through / via" a street or route.' },
  { id: 't_espere', stage: 'transit_s2', es: '¿me espera [Wait time]?', altEs: [], en: 'can you wait for me [wait time]?', altEn: ['can you wait for me'], note: 'Handy when asking a driver to wait any amount of time.', slotTemplate: { prefixEs: ['me espera', 'espéreme', 'espereme', 'puede esperarme'], suffixEs: ['minuto', 'minutos', 'segundo', 'segundos', 'momento', 'ratito', 'hora', 'horas', 'media'], slotHintEs: 'Wait time', patternEs: '¿me espera [Wait time]?' } },
  { id: 't_sin_sencillo', stage: 'transit_s2', es: 'solo tengo un billete de veinte', altEs: ['no tengo sencillo'], en: 'I only have a twenty-dollar bill', altEn: ['i only have a twenty', 'no small change'], note: 'Always warn taxi drivers if you only have a $20 bill ("un billete de veinte").' },
  { id: 't_baul', stage: 'transit_s2', es: '¿puede abrir el baúl para la maleta?', altEs: ['puede abrir el baúl para la maleta', 'puede abrir el baúl'], en: 'can you open the trunk for the suitcase?', altEn: ['can you open the trunk', 'open the trunk'], note: '"El baúl" = car trunk in Panama; "la maleta" = suitcase.' },
  {
    id: 't_semaforo',
    stage: 'transit_s2',
    es: 'después del semáforo',
    altEs: ['en el semáforo'],
    en: 'after the traffic light',
    altEn: ['at the traffic light', 'after the traffic light'],
    note: '"Antes de" = before; "Después de" = after (watch "de + el → del"!).',
    structure: {
      bank: 'direction_landmarks',
      patternEs: 'después de [landmark]',
      patternEn: 'after [landmark]',
      build: (lm) => ({
        es: `después de ${lm.es}`,
        en: `after ${lm.en}`
      })
    }
  },

  // Stage 3: Metro de Panamá, Terminals & Hotel Check-In
  { id: 't_estacion_metro', stage: 'transit_s3', es: '¿dónde está la estación del Metro?', altEs: ['dónde está la estación del Metro', 'la estación del Metro'], en: 'where is the Metro station?', altEn: ['where is the metro station'], note: 'Panama City\'s modern Metro has Line 1 & Line 2 connecting the city and airport.' },
  { id: 't_recargar', stage: 'transit_s3', es: 'necesito recargar mi tarjeta', altEs: ['necesito recargar la tarjeta'], en: 'I need to top up my transit card', altEn: ['top up my card', 'reload transit card'], note: 'Both Metro and MetroBus require a rechargeable card (no cash on board).' },
  { id: 't_albrook', stage: 'transit_s3', es: '¿este bus va para [Destination]?', altEs: [], en: 'does this bus go to [any place]?', altEn: ['does this bus go to'], note: 'Ask "¿este bus va para [any place]?" before boarding any bus.', slotTemplate: { prefixEs: ['este bus va para', 'este autobús va para', 'va para'], suffixEs: [], slotHintEs: 'Destination', patternEs: '¿este bus va para [Destination]?' } },
  { id: 't_linea_uno', stage: 'transit_s3', es: 'tomo la Línea Uno del Metro', altEs: ['tomo la Línea Uno'], en: 'I take Metro Line 1', altEn: ['i take line 1', 'im taking line 1'], note: 'Remember: "tomar" means both to drink AND to take a bus/train/taxi.' },
  { id: 't_transbordo', stage: 'transit_s3', es: '¿dónde hago el transbordo?', altEs: ['dónde hago el transbordo', 'el transbordo'], en: 'where do I transfer lines?', altEn: ['where do i transfer'], note: '"Hacer transbordo" = to transfer between train or bus lines.' },
  { id: 't_proxima_parada', stage: 'transit_s3', es: '¿cuál es la próxima parada?', altEs: ['cuál es la próxima parada'], en: 'what is the next stop?', altEn: ['what is the next stop'], note: '"La parada" = the bus/train stop; "próximo/a" = next.' },
  {
    id: 't_hora_sale',
    stage: 'transit_s3',
    es: '¿a qué hora sale el próximo bus?',
    altEs: ['¿a qué hora sale el último tren?', 'a qué hora sale el último tren'],
    en: 'what time does the next bus leave?',
    altEn: ['what time does the last train leave', 'when does the next bus leave'],
    note: '"¿A qué hora...?" = At what time...? (distinct from "¿Qué hora es?" = What time is it?).',
    structure: {
      bank: 'transit_modes',
      patternEs: '¿a qué hora sale [transit]?',
      patternEn: 'what time does [transit] leave?',
      build: (tm) => ({
        es: `¿a qué hora sale ${tm.es}?`,
        altEs: [`a qué hora sale ${tm.es}`],
        en: `what time does ${tm.en} leave?`
      })
    }
  },
  { id: 't_entrada_salida', stage: 'transit_s3', es: 'la entrada y la salida', altEs: ['por dónde se sale', 'dónde está la entrada'], en: 'the entrance and the exit', altEn: ['where is the exit', 'entrance and exit'], note: '"Entrada" = entrance (from entrar); "Salida" = exit (from salir).' },
  { id: 't_reservacion', stage: 'transit_s3', es: 'tengo una reservación a nombre de [Your name]', altEs: [], en: 'I have a reservation under the name of [your name]', altEn: ['i have a reservation under the name of'], note: 'Essential A1 hotel check-in phrase — say your own name after "a nombre de".', slotTemplate: { prefixEs: ['tengo una reservación a nombre de', 'tengo una reservacion a nombre de', 'tengo una reserva a nombre de'], suffixEs: [], slotHintEs: 'Your name', patternEs: 'tengo una reservación a nombre de [Your name]' } },
  { id: 't_habitacion_doble', stage: 'transit_s3', es: 'una habitación para [Stay length]', altEs: [], en: 'a room for [number] night(s)', altEn: ['a room for'], note: 'Use "una habitación para [stay length]" when booking a hotel room.', slotTemplate: { prefixEs: ['una habitación para', 'una habitacion para', 'un cuarto para'], suffixEs: ['noche', 'noches', 'semana', 'semanas', 'día', 'días', 'dia', 'dias', 'mes', 'meses'], slotHintEs: 'Stay length', patternEs: 'una habitación para [Stay length]' } },
  {
    id: 't_desayuno_inc',
    stage: 'transit_s3',
    es: '¿el desayuno está incluido?',
    altEs: ['el desayuno está incluido'],
    en: 'is breakfast included?',
    altEn: ['breakfast is included', 'is breakfast included'],
    note: '"¿[Amenity] está incluido/a?" — match incluido/a/os/as to the amenity!',
    structure: {
      bank: 'hotel_amenities',
      patternEs: '¿[amenity] está incluido / incluida?',
      patternEn: 'is [amenity] included?',
      build: (am) => {
        const esVerb = am.num === 'p' ? 'están' : 'está';
        const esInc = am.num === 'p' ? (am.g === 'f' ? 'incluidas' : 'incluidos') : (am.g === 'f' ? 'incluida' : 'incluido');
        const enVerb = am.num === 'p' ? 'are' : 'is';
        return {
          es: `¿${am.es} ${esVerb} ${esInc}?`,
          altEs: [`${am.es} ${esVerb} ${esInc}`],
          en: `${enVerb} ${am.en} included?`
        };
      }
    }
  },
  { id: 't_llave', stage: 'transit_s3', es: 'aquí tiene la llave de su habitación', altEs: ['la llave de la habitación'], en: 'here is the key to your room', altEn: ['the room key', 'here is your room key'], note: '"La llave" = the key.' }
];

export default {
  id: 'transit',
  meta,
  guide,
  items
};
