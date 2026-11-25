import { normalizePhraseSpanish, stripAccents } from '../modules/utils.js';

// Curated 25-option Spanish slot banks and configuration for every open-ended A1 phrase.
// - slotType === 'personal': No Spanish example word is shown; displays [Your name] / [Your last name].
// - slotType === 'spanish_options': Displays a bracketed placeholder + dropdown of 25 common Spanish answers.

export const SLOT_OPTION_BANKS = {
  countries: [
    { es: 'Inglaterra', en: 'England' },
    { es: 'Estados Unidos', en: 'United States' },
    { es: 'Canadá', en: 'Canada' },
    { es: 'España', en: 'Spain' },
    { es: 'Panamá', en: 'Panama' },
    { es: 'México', en: 'Mexico' },
    { es: 'Colombia', en: 'Colombia' },
    { es: 'Argentina', en: 'Argentina' },
    { es: 'Francia', en: 'France' },
    { es: 'Alemania', en: 'Germany' },
    { es: 'Italia', en: 'Italy' },
    { es: 'Brasil', en: 'Brazil' },
    { es: 'Irlanda', en: 'Ireland' },
    { es: 'Australia', en: 'Australia' },
    { es: 'Escocia', en: 'Scotland' },
    { es: 'Costa Rica', en: 'Costa Rica' },
    { es: 'Perú', en: 'Peru' },
    { es: 'Chile', en: 'Chile' },
    { es: 'Ecuador', en: 'Ecuador' },
    { es: 'Venezuela', en: 'Venezuela' },
    { es: 'Portugal', en: 'Portugal' },
    { es: 'Suiza', en: 'Switzerland' },
    { es: 'Japón', en: 'Japan' },
    { es: 'Nueva Zelanda', en: 'New Zealand' },
    { es: 'Gales', en: 'Wales' }
  ],
  nationalities: [
    { es: 'inglés', en: 'English (m.)' },
    { es: 'inglesa', en: 'English (f.)' },
    { es: 'británico', en: 'British (m.)' },
    { es: 'británica', en: 'British (f.)' },
    { es: 'estadounidense', en: 'American' },
    { es: 'canadiense', en: 'Canadian' },
    { es: 'español', en: 'Spanish (m.)' },
    { es: 'española', en: 'Spanish (f.)' },
    { es: 'panameño', en: 'Panamanian (m.)' },
    { es: 'panameña', en: 'Panamanian (f.)' },
    { es: 'mexicano', en: 'Mexican (m.)' },
    { es: 'colombiano', en: 'Colombian (m.)' },
    { es: 'francés', en: 'French (m.)' },
    { es: 'alemán', en: 'German (m.)' },
    { es: 'irlandés', en: 'Irish (m.)' },
    { es: 'mexicana', en: 'Mexican (f.)' },
    { es: 'colombiana', en: 'Colombian (f.)' },
    { es: 'argentino', en: 'Argentinian (m.)' },
    { es: 'costarricense', en: 'Costa Rican' },
    { es: 'peruano', en: 'Peruvian (m.)' },
    { es: 'chileno', en: 'Chilean (m.)' },
    { es: 'brasileño', en: 'Brazilian (m.)' },
    { es: 'italiano', en: 'Italian (m.)' },
    { es: 'australiano', en: 'Australian (m.)' },
    { es: 'escocés', en: 'Scottish (m.)' }
  ],
  places_residence: [
    { es: 'Inglaterra', en: 'England' },
    { es: 'Londres', en: 'London' },
    { es: 'Manchester', en: 'Manchester' },
    { es: 'Liverpool', en: 'Liverpool' },
    { es: 'Edimburgo', en: 'Edinburgh' },
    { es: 'Panamá', en: 'Panama' },
    { es: 'la Ciudad de Panamá', en: 'Panama City' },
    { es: 'Estados Unidos', en: 'United States' },
    { es: 'Nueva York', en: 'New York' },
    { es: 'Canadá', en: 'Canada' },
    { es: 'España', en: 'Spain' },
    { es: 'Madrid', en: 'Madrid' },
    { es: 'Barcelona', en: 'Barcelona' },
    { es: 'México', en: 'Mexico' },
    { es: 'Colombia', en: 'Colombia' },
    { es: 'Boquete', en: 'Boquete (Panama)' },
    { es: 'Coronado', en: 'Coronado (Panama)' },
    { es: 'David', en: 'David (Panama)' },
    { es: 'Casco Viejo', en: 'Casco Viejo (Panama)' },
    { es: 'San Francisco', en: 'San Francisco' },
    { es: 'Costa del Este', en: 'Costa del Este (Panama)' },
    { es: 'Bocas del Toro', en: 'Bocas del Toro (Panama)' },
    { es: 'Miami', en: 'Miami' },
    { es: 'Toronto', en: 'Toronto' },
    { es: 'Bogotá', en: 'Bogotá' }
  ],
  professions: [
    { es: 'profesor', en: 'teacher / professor (m.)' },
    { es: 'profesora', en: 'teacher / professor (f.)' },
    { es: 'ingeniero', en: 'engineer (m.)' },
    { es: 'ingeniera', en: 'engineer (f.)' },
    { es: 'médico', en: 'doctor (m.)' },
    { es: 'médica', en: 'doctor (f.)' },
    { es: 'programador', en: 'software developer' },
    { es: 'diseñador', en: 'designer' },
    { es: 'abogado', en: 'lawyer' },
    { es: 'contador', en: 'accountant' },
    { es: 'enfermero', en: 'nurse' },
    { es: 'gerente', en: 'manager' },
    { es: 'vendedor', en: 'salesperson' },
    { es: 'cocinero', en: 'chef / cook' },
    { es: 'empresario', en: 'business owner / entrepreneur' },
    { es: 'estudiante', en: 'student' },
    { es: 'arquitecto', en: 'architect' },
    { es: 'arquitecta', en: 'architect (f.)' },
    { es: 'periodista', en: 'journalist' },
    { es: 'piloto', en: 'pilot' },
    { es: 'dentista', en: 'dentist' },
    { es: 'psicólogo', en: 'psychologist' },
    { es: 'fotógrafo', en: 'photographer' },
    { es: 'traductor', en: 'translator' },
    { es: 'jubilado', en: 'retired (m.)' }
  ],
  languages: [
    { es: 'inglés', en: 'English' },
    { es: 'español', en: 'Spanish' },
    { es: 'inglés y español', en: 'English and Spanish' },
    { es: 'francés', en: 'French' },
    { es: 'alemán', en: 'German' },
    { es: 'italiano', en: 'Italian' },
    { es: 'portugués', en: 'Portuguese' },
    { es: 'chino', en: 'Chinese' },
    { es: 'japonés', en: 'Japanese' },
    { es: 'coreano', en: 'Korean' },
    { es: 'árabe', en: 'Arabic' },
    { es: 'ruso', en: 'Russian' },
    { es: 'holandés', en: 'Dutch' },
    { es: 'polaco', en: 'Polish' },
    { es: 'sueco', en: 'Swedish' },
    { es: 'un poco de español', en: 'a little Spanish' },
    { es: 'inglés y francés', en: 'English and French' },
    { es: 'español y portugués', en: 'Spanish and Portuguese' },
    { es: 'griego', en: 'Greek' },
    { es: 'turco', en: 'Turkish' },
    { es: 'hindi', en: 'Hindi' },
    { es: 'hebreo', en: 'Hebrew' },
    { es: 'noruego', en: 'Norwegian' },
    { es: 'danés', en: 'Danish' },
    { es: 'galés', en: 'Welsh' }
  ],
  sibling_counts: [
    { es: 'un hermano', en: 'one brother' },
    { es: 'una hermana', en: 'one sister' },
    { es: 'dos hermanos', en: 'two brothers / siblings' },
    { es: 'dos hermanas', en: 'two sisters' },
    { es: 'tres hermanos', en: 'three brothers / siblings' },
    { es: 'tres hermanas', en: 'three sisters' },
    { es: 'cuatro hermanos', en: 'four brothers / siblings' },
    { es: 'cinco hermanos', en: 'five brothers / siblings' },
    { es: 'un hermano y una hermana', en: 'one brother and one sister' },
    { es: 'dos hermanos y una hermana', en: 'two brothers and one sister' },
    { es: 'un hermano y dos hermanas', en: 'one brother and two sisters' },
    { es: 'un hermano mayor', en: 'an older brother' },
    { es: 'una hermana mayor', en: 'an older sister' },
    { es: 'un hermano menor', en: 'a younger brother' },
    { es: 'una hermana menor', en: 'a younger sister' },
    { es: 'dos hermanos mayores', en: 'two older brothers' },
    { es: 'dos hermanas mayores', en: 'two older sisters' },
    { es: 'dos hermanos menores', en: 'two younger brothers' },
    { es: 'dos hermanas menores', en: 'two younger sisters' },
    { es: 'tres hermanos y una hermana', en: 'three brothers and one sister' },
    { es: 'dos hermanos y dos hermanas', en: 'two brothers and two sisters' },
    { es: 'cuatro hermanas', en: 'four sisters' },
    { es: 'un hermano gemelo', en: 'a twin brother' },
    { es: 'una hermana gemela', en: 'a twin sister' },
    { es: 'seis hermanos', en: 'six siblings' }
  ],
  pets: [
    { es: 'un perro', en: 'a dog' },
    { es: 'un gato', en: 'a cat' },
    { es: 'un perro y un gato', en: 'a dog and a cat' },
    { es: 'dos perros', en: 'two dogs' },
    { es: 'dos gatos', en: 'two cats' },
    { es: 'un pájaro', en: 'a bird' },
    { es: 'un pez', en: 'a fish' },
    { es: 'un conejo', en: 'a rabbit' },
    { es: 'un hámster', en: 'a hamster' },
    { es: 'una tortuga', en: 'a turtle' },
    { es: 'un loro', en: 'a parrot' },
    { es: 'un caballo', en: 'a horse' },
    { es: 'un cachorro', en: 'a puppy' },
    { es: 'un gatito', en: 'a kitten' },
    { es: 'una mascota', en: 'a pet' },
    { es: 'tres perros', en: 'three dogs' },
    { es: 'tres gatos', en: 'three cats' },
    { es: 'un perro pequeño', en: 'a small dog' },
    { es: 'un perro grande', en: 'a big dog' },
    { es: 'un gato negro', en: 'a black cat' },
    { es: 'un gato blanco', en: 'a white cat' },
    { es: 'dos pájaros', en: 'two birds' },
    { es: 'dos peces', en: 'two fish' },
    { es: 'un perico', en: 'a parakeet' },
    { es: 'una perrita', en: 'a female dog' }
  ],
  home_rooms: [
    { es: 'un baño', en: 'one bathroom' },
    { es: 'dos baños', en: 'two bathrooms' },
    { es: 'tres baños', en: 'three bathrooms' },
    { es: 'una habitación', en: 'one bedroom' },
    { es: 'dos habitaciones', en: 'two bedrooms' },
    { es: 'tres habitaciones', en: 'three bedrooms' },
    { es: 'cuatro habitaciones', en: 'four bedrooms' },
    { es: 'una cocina', en: 'a kitchen' },
    { es: 'una sala', en: 'a living room' },
    { es: 'un comedor', en: 'a dining room' },
    { es: 'un jardín', en: 'a garden / yard' },
    { es: 'un balcón', en: 'a balcony' },
    { es: 'un garaje', en: 'a garage' },
    { es: 'una oficina', en: 'an office' },
    { es: 'dos cuartos', en: 'two rooms' },
    { es: 'tres cuartos', en: 'three rooms' },
    { es: 'cuatro baños', en: 'four bathrooms' },
    { es: 'una terraza', en: 'a terrace' },
    { es: 'un patio', en: 'a backyard / patio' },
    { es: 'una piscina', en: 'a swimming pool' },
    { es: 'una lavandería', en: 'a laundry room' },
    { es: 'un estacionamiento', en: 'a parking space' },
    { es: 'una cocina grande', en: 'a big kitchen' },
    { es: 'una sala grande', en: 'a big living room' },
    { es: 'cinco habitaciones', en: 'five bedrooms' }
  ],
  morning_times: [
    { es: 'a las cinco', en: 'at 5:00' },
    { es: 'a las cinco y media', en: 'at 5:30' },
    { es: 'a las seis', en: 'at 6:00' },
    { es: 'a las seis y cuarto', en: 'at 6:15' },
    { es: 'a las seis y media', en: 'at 6:30' },
    { es: 'a las siete', en: 'at 7:00' },
    { es: 'a las siete y cuarto', en: 'at 7:15' },
    { es: 'a las siete y media', en: 'at 7:30' },
    { es: 'a las ocho', en: 'at 8:00' },
    { es: 'a las ocho y cuarto', en: 'at 8:15' },
    { es: 'a las ocho y media', en: 'at 8:30' },
    { es: 'a las nueve', en: 'at 9:00' },
    { es: 'a las nueve y media', en: 'at 9:30' },
    { es: 'a las diez', en: 'at 10:00' },
    { es: 'a la una', en: 'at 1:00' },
    { es: 'a las cuatro y media', en: 'at 4:30' },
    { es: 'a las cinco y cuarto', en: 'at 5:15' },
    { es: 'a las seis menos cuarto', en: 'at 5:45' },
    { es: 'a las siete menos cuarto', en: 'at 6:45' },
    { es: 'a las ocho menos cuarto', en: 'at 7:45' },
    { es: 'a las nueve y cuarto', en: 'at 9:15' },
    { es: 'a las diez y media', en: 'at 10:30' },
    { es: 'a las once', en: 'at 11:00' },
    { es: 'a las once y media', en: 'at 11:30' },
    { es: 'a las doce', en: 'at 12:00' }
  ],
  night_times: [
    { es: 'a las ocho', en: 'at 8:00' },
    { es: 'a las ocho y media', en: 'at 8:30' },
    { es: 'a las nueve', en: 'at 9:00' },
    { es: 'a las nueve y media', en: 'at 9:30' },
    { es: 'a las diez', en: 'at 10:00' },
    { es: 'a las diez y cuarto', en: 'at 10:15' },
    { es: 'a las diez y media', en: 'at 10:30' },
    { es: 'a las once', en: 'at 11:00' },
    { es: 'a las once y cuarto', en: 'at 11:15' },
    { es: 'a las once y media', en: 'at 11:30' },
    { es: 'a las doce', en: 'at 12:00' },
    { es: 'a la medianoche', en: 'at midnight' },
    { es: 'a la una', en: 'at 1:00' },
    { es: 'a la una y media', en: 'at 1:30' },
    { es: 'a las dos', en: 'at 2:00' },
    { es: 'a las ocho y cuarto', en: 'at 8:15' },
    { es: 'a las nueve y cuarto', en: 'at 9:15' },
    { es: 'a las diez menos cuarto', en: 'at 9:45' },
    { es: 'a las once menos cuarto', en: 'at 10:45' },
    { es: 'a las doce menos cuarto', en: 'at 11:45' },
    { es: 'a las doce y cuarto', en: 'at 12:15' },
    { es: 'a las doce y media', en: 'at 12:30' },
    { es: 'a la una y cuarto', en: 'at 1:15' },
    { es: 'a las dos y media', en: 'at 2:30' },
    { es: 'a las tres', en: 'at 3:00' }
  ],
  breakfast_foods: [
    { es: 'café', en: 'coffee' },
    { es: 'café y pan', en: 'coffee and bread' },
    { es: 'café y huevos', en: 'coffee and eggs' },
    { es: 'huevos', en: 'eggs' },
    { es: 'tostadas', en: 'toast' },
    { es: 'frutas', en: 'fruit' },
    { es: 'cereal', en: 'cereal' },
    { es: 'avena', en: 'oatmeal / porridge' },
    { es: 'yogur', en: 'yogurt' },
    { es: 'jugo de naranja', en: 'orange juice' },
    { es: 'té y tostadas', en: 'tea and toast' },
    { es: 'panqueques', en: 'pancakes' },
    { es: 'arepas', en: 'arepas' },
    { es: 'hojaldra', en: 'fried bread (Panama)' },
    { es: 'queso y pan', en: 'cheese and bread' },
    { es: 'carimañolas', en: 'yuca fritters (Panama)' },
    { es: 'tortilla de maíz', en: 'corn tortilla' },
    { es: 'empanadas de queso', en: 'cheese empanadas' },
    { es: 'café con leche', en: 'coffee with milk' },
    { es: 'huevos revueltos', en: 'scrambled eggs' },
    { es: 'papaya y piña', en: 'papaya and pineapple' },
    { es: 'pan con mantequilla', en: 'bread with butter' },
    { es: 'batido de frutas', en: 'fruit smoothie' },
    { es: 'té verde', en: 'green tea' },
    { es: 'salchichas guisadas', en: 'stewed sausages (Panama)' }
  ],
  singular_likes: [
    { es: 'el café', en: 'coffee' },
    { es: 'el té', en: 'tea' },
    { es: 'la música', en: 'music' },
    { es: 'el fútbol', en: 'football / soccer' },
    { es: 'el cine', en: 'cinema / movies' },
    { es: 'la comida', en: 'food' },
    { es: 'el chocolate', en: 'chocolate' },
    { es: 'la playa', en: 'the beach' },
    { es: 'el español', en: 'Spanish' },
    { es: 'cocinar', en: 'cooking' },
    { es: 'viajar', en: 'traveling' },
    { es: 'leer', en: 'reading' },
    { es: 'caminar', en: 'walking' },
    { es: 'bailar', en: 'dancing' },
    { es: 'nadar', en: 'swimming' },
    { es: 'el sancocho', en: 'sancocho soup' },
    { es: 'la naturaleza', en: 'nature' },
    { es: 'el clima tropical', en: 'tropical weather' },
    { es: 'correr', en: 'running' },
    { es: 'aprender', en: 'learning' },
    { es: 'dibujar', en: 'drawing' },
    { es: 'cantar', en: 'singing' },
    { es: 'dormir', en: 'sleeping' },
    { es: 'el arte', en: 'art' },
    { es: 'la historia', en: 'history' }
  ],
  plural_likes: [
    { es: 'las playas', en: 'beaches' },
    { es: 'las montañas', en: 'mountains' },
    { es: 'las películas', en: 'movies' },
    { es: 'los viajes', en: 'trips / travels' },
    { es: 'los animales', en: 'animals' },
    { es: 'los perros', en: 'dogs' },
    { es: 'los gatos', en: 'cats' },
    { es: 'los libros', en: 'books' },
    { es: 'las frutas', en: 'fruits' },
    { es: 'los deportes', en: 'sports' },
    { es: 'los idiomas', en: 'languages' },
    { es: 'las fiestas', en: 'parties' },
    { es: 'los cafés', en: 'cafés' },
    { es: 'las ciudades', en: 'cities' },
    { es: 'los parques', en: 'parks' },
    { es: 'los patacones', en: 'fried plantains' },
    { es: 'las empanadas', en: 'empanadas' },
    { es: 'los mariscos', en: 'seafood' },
    { es: 'las islas', en: 'islands' },
    { es: 'los museos', en: 'museums' },
    { es: 'los restaurantes', en: 'restaurants' },
    { es: 'los conciertos', en: 'concerts' },
    { es: 'las flores', en: 'flowers' },
    { es: 'los árboles', en: 'trees' },
    { es: 'los mercados', en: 'markets' }
  ],
  places_visit: [
    { es: 'Inglaterra', en: 'England' },
    { es: 'Londres', en: 'London' },
    { es: 'Panamá', en: 'Panama' },
    { es: 'España', en: 'Spain' },
    { es: 'Madrid', en: 'Madrid' },
    { es: 'Barcelona', en: 'Barcelona' },
    { es: 'México', en: 'Mexico' },
    { es: 'Colombia', en: 'Colombia' },
    { es: 'Francia', en: 'France' },
    { es: 'París', en: 'Paris' },
    { es: 'Italia', en: 'Italy' },
    { es: 'Roma', en: 'Rome' },
    { es: 'Estados Unidos', en: 'United States' },
    { es: 'Nueva York', en: 'New York' },
    { es: 'Canadá', en: 'Canada' },
    { es: 'el Canal de Panamá', en: 'the Panama Canal' },
    { es: 'Casco Viejo', en: 'Casco Viejo' },
    { es: 'Boquete', en: 'Boquete' },
    { es: 'Bocas del Toro', en: 'Bocas del Toro' },
    { es: 'San Blas', en: 'San Blas Islands' },
    { es: 'El Valle de Antón', en: 'El Valle de Antón' },
    { es: 'Costa Rica', en: 'Costa Rica' },
    { es: 'Perú', en: 'Peru' },
    { es: 'Argentina', en: 'Argentina' },
    { es: 'Japón', en: 'Japan' }
  ],
  table_sizes: [
    { es: 'una persona', en: 'one person' },
    { es: 'dos personas', en: 'two people' },
    { es: 'tres personas', en: 'three people' },
    { es: 'cuatro personas', en: 'four people' },
    { es: 'cinco personas', en: 'five people' },
    { es: 'seis personas', en: 'six people' },
    { es: 'siete personas', en: 'seven people' },
    { es: 'ocho personas', en: 'eight people' },
    { es: 'nueve personas', en: 'nine people' },
    { es: 'diez personas', en: 'ten people' },
    { es: 'dos', en: 'two' },
    { es: 'tres', en: 'three' },
    { es: 'cuatro', en: 'four' },
    { es: 'cinco', en: 'five' },
    { es: 'seis', en: 'six' },
    { es: 'siete', en: 'seven' },
    { es: 'ocho', en: 'eight' },
    { es: 'nueve', en: 'nine' },
    { es: 'diez', en: 'ten' },
    { es: 'once personas', en: 'eleven people' },
    { es: 'doce personas', en: 'twelve people' },
    { es: 'quince personas', en: 'fifteen people' },
    { es: 'veinte personas', en: 'twenty people' },
    { es: 'dos adultos y un niño', en: 'two adults and one child' },
    { es: 'dos adultos y dos niños', en: 'two adults and two children' }
  ],
  dishes_drinks: [
    { es: 'el pollo asado', en: 'roast chicken' },
    { es: 'el pescado', en: 'fish' },
    { es: 'la pasta', en: 'pasta' },
    { es: 'una ensalada', en: 'a salad' },
    { es: 'una hamburguesa', en: 'a burger' },
    { es: 'una sopa', en: 'a soup' },
    { es: 'el arroz con pollo', en: 'chicken and rice' },
    { es: 'una pizza', en: 'a pizza' },
    { es: 'un sándwich', en: 'a sandwich' },
    { es: 'un café', en: 'a coffee' },
    { es: 'un café con leche', en: 'a coffee with milk' },
    { es: 'un vaso de agua', en: 'a glass of water' },
    { es: 'una cerveza', en: 'a beer' },
    { es: 'un jugo de naranja', en: 'an orange juice' },
    { es: 'una empanada', en: 'an empanada' },
    { es: 'un sancocho', en: 'a sancocho soup' },
    { es: 'unos patacones', en: 'fried plantains' },
    { es: 'un ceviche de corvina', en: 'a sea bass ceviche' },
    { es: 'una chicha de piña', en: 'a pineapple juice drink' },
    { es: 'una chicha de maracuyá', en: 'a passion fruit drink' },
    { es: 'una hojaldra', en: 'a fried bread (Panama)' },
    { es: 'una carimañola', en: 'a yuca meat fritter' },
    { es: 'una limonada', en: 'a lemonade' },
    { es: 'un té frío', en: 'an iced tea' },
    { es: 'un arroz con guandú', en: 'rice with pigeon peas' }
  ],
  shopping_items: [
    { es: 'una camisa', en: 'a shirt' },
    { es: 'una camiseta', en: 'a T-shirt' },
    { es: 'un pantalón', en: 'pants / trousers' },
    { es: 'unos zapatos', en: 'shoes' },
    { es: 'una chaqueta', en: 'a jacket' },
    { es: 'un vestido', en: 'a dress' },
    { es: 'una falda', en: 'a skirt' },
    { es: 'un sombrero', en: 'a hat' },
    { es: 'unos lentes', en: 'glasses / sunglasses' },
    { es: 'una mochila', en: 'a backpack' },
    { es: 'un bolso', en: 'a bag' },
    { es: 'un regalo', en: 'a gift' },
    { es: 'un suéter', en: 'a sweater / jumper' },
    { es: 'unos calcetines', en: 'socks' },
    { es: 'un abrigo', en: 'a coat' },
    { es: 'unas sandalias', en: 'sandals' },
    { es: 'un paraguas', en: 'an umbrella' },
    { es: 'una gorra', en: 'a cap' },
    { es: 'un reloj', en: 'a watch' },
    { es: 'un cinturón', en: 'a belt' },
    { es: 'una billetera', en: 'a wallet' },
    { es: 'unos pantalones cortos', en: 'shorts' },
    { es: 'un traje de baño', en: 'a swimsuit' },
    { es: 'unas zapatillas', en: 'sneakers' },
    { es: 'una blusa', en: 'a blouse' }
  ],
  clothing_sizes: [
    { es: 'extra pequeña', en: 'extra small (XS)' },
    { es: 'pequeña', en: 'small (S)' },
    { es: 'mediana', en: 'medium (M)' },
    { es: 'grande', en: 'large (L)' },
    { es: 'extra grande', en: 'extra large (XL)' },
    { es: 'doble extra grande', en: 'double extra large (XXL)' },
    { es: 'chica', en: 'small (f.)' },
    { es: 'chico', en: 'small (m.)' },
    { es: 'mediano', en: 'medium (m.)' },
    { es: 'treinta y seis', en: 'size 36' },
    { es: 'treinta y ocho', en: 'size 38' },
    { es: 'cuarenta', en: 'size 40' },
    { es: 'cuarenta y dos', en: 'size 42' },
    { es: 'cuarenta y cuatro', en: 'size 44' },
    { es: 'única', en: 'one size' },
    { es: 'pequeño', en: 'small (m.)' },
    { es: 'treinta y cuatro', en: 'size 34' },
    { es: 'cuarenta y seis', en: 'size 46' },
    { es: 'ocho', en: 'size 8' },
    { es: 'nueve', en: 'size 9' },
    { es: 'diez', en: 'size 10' },
    { es: 'once', en: 'size 11' },
    { es: 'doce', en: 'size 12' },
    { es: 'catorce', en: 'size 14' },
    { es: 'dieciséis', en: 'size 16' }
  ],
  city_destinations: [
    { es: 'el centro', en: 'downtown / city center' },
    { es: 'el aeropuerto', en: 'the airport' },
    { es: 'el hotel', en: 'the hotel' },
    { es: 'la estación', en: 'the station' },
    { es: 'la playa', en: 'the beach' },
    { es: 'el parque', en: 'the park' },
    { es: 'el supermercado', en: 'the supermarket' },
    { es: 'la farmacia', en: 'the pharmacy' },
    { es: 'el hospital', en: 'the hospital' },
    { es: 'el banco', en: 'the bank' },
    { es: 'el museo', en: 'the museum' },
    { es: 'el restaurante', en: 'the restaurant' },
    { es: 'mi casa', en: 'my house / home' },
    { es: 'Londres', en: 'London' },
    { es: 'Inglaterra', en: 'England' },
    { es: 'Albrook', en: 'Albrook Terminal (Panama)' },
    { es: 'Casco Viejo', en: 'Casco Viejo (Panama)' },
    { es: 'la Cinta Costera', en: 'the Cinta Costera' },
    { es: 'Multiplaza', en: 'Multiplaza Mall' },
    { es: 'el Canal de Panamá', en: 'the Panama Canal' },
    { es: 'la estación del Metro', en: 'the Metro station' },
    { es: 'el mercado', en: 'the market' },
    { es: 'la clínica', en: 'the clinic' },
    { es: 'la oficina', en: 'the office' },
    { es: 'el centro comercial', en: 'the mall' }
  ],
  taxi_destinations: [
    { es: 'al aeropuerto', en: 'to the airport' },
    { es: 'al hotel', en: 'to the hotel' },
    { es: 'al centro', en: 'to downtown' },
    { es: 'a la estación', en: 'to the station' },
    { es: 'a la playa', en: 'to the beach' },
    { es: 'al parque', en: 'to the park' },
    { es: 'al hospital', en: 'to the hospital' },
    { es: 'al museo', en: 'to the museum' },
    { es: 'al supermercado', en: 'to the supermarket' },
    { es: 'a la farmacia', en: 'to the pharmacy' },
    { es: 'al banco', en: 'to the bank' },
    { es: 'al restaurante', en: 'to the restaurant' },
    { es: 'a la embajada', en: 'to the embassy' },
    { es: 'al puerto', en: 'to the port' },
    { es: 'a esta dirección', en: 'to this address' },
    { es: 'a Casco Viejo', en: 'to Casco Viejo' },
    { es: 'a Albrook', en: 'to Albrook Terminal' },
    { es: 'a la Cinta Costera', en: 'to the Cinta Costera' },
    { es: 'a Multiplaza', en: 'to Multiplaza' },
    { es: 'al Canal de Panamá', en: 'to the Panama Canal' },
    { es: 'al centro comercial', en: 'to the mall' },
    { es: 'a la clínica', en: 'to the clinic' },
    { es: 'al mercado', en: 'to the market' },
    { es: 'a la terminal', en: 'to the bus terminal' },
    { es: 'a mi casa', en: 'to my house' }
  ],
  wait_minutes: [
    { es: 'un minuto', en: '1 minute' },
    { es: 'dos minutos', en: '2 minutes' },
    { es: 'tres minutos', en: '3 minutes' },
    { es: 'cuatro minutos', en: '4 minutes' },
    { es: 'cinco minutos', en: '5 minutes' },
    { es: 'diez minutos', en: '10 minutes' },
    { es: 'quince minutos', en: '15 minutes' },
    { es: 'veinte minutos', en: '20 minutes' },
    { es: 'veinticinco minutos', en: '25 minutes' },
    { es: 'treinta minutos', en: '30 minutes' },
    { es: 'un momento', en: 'a moment' },
    { es: 'un segundo', en: 'a second' },
    { es: 'un ratito', en: 'a little while' },
    { es: 'media hora', en: 'half an hour' },
    { es: 'una hora', en: 'one hour' },
    { es: 'seis minutos', en: '6 minutes' },
    { es: 'siete minutos', en: '7 minutes' },
    { es: 'ocho minutos', en: '8 minutes' },
    { es: 'doce minutos', en: '12 minutes' },
    { es: 'cuarenta minutos', en: '40 minutes' },
    { es: 'cuarenta y cinco minutos', en: '45 minutes' },
    { es: 'dos horas', en: 'two hours' },
    { es: 'diez segundos', en: '10 seconds' },
    { es: 'treinta segundos', en: '30 seconds' },
    { es: 'un par de minutos', en: 'a couple of minutes' }
  ],
  hotel_nights: [
    { es: 'una noche', en: '1 night' },
    { es: 'dos noches', en: '2 nights' },
    { es: 'tres noches', en: '3 nights' },
    { es: 'cuatro noches', en: '4 nights' },
    { es: 'cinco noches', en: '5 nights' },
    { es: 'seis noches', en: '6 nights' },
    { es: 'siete noches', en: '7 nights' },
    { es: 'ocho noches', en: '8 nights' },
    { es: 'nueve noches', en: '9 nights' },
    { es: 'diez noches', en: '10 nights' },
    { es: 'once noches', en: '11 nights' },
    { es: 'doce noches', en: '12 nights' },
    { es: 'catorce noches', en: '14 nights' },
    { es: 'una semana', en: '1 week' },
    { es: 'dos semanas', en: '2 weeks' },
    { es: 'trece noches', en: '13 nights' },
    { es: 'quince noches', en: '15 nights' },
    { es: 'tres semanas', en: '3 weeks' },
    { es: 'un mes', en: '1 month' },
    { es: 'dos días', en: '2 days' },
    { es: 'tres días', en: '3 days' },
    { es: 'cuatro días', en: '4 days' },
    { es: 'cinco días', en: '5 days' },
    { es: 'un fin de semana', en: 'a weekend' },
    { es: 'esta noche', en: 'tonight' }
  ],
  allergens: [
    { es: 'la penicilina', en: 'penicillin' },
    { es: 'las nueces', en: 'nuts' },
    { es: 'el maní', en: 'peanuts' },
    { es: 'los mariscos', en: 'shellfish / seafood' },
    { es: 'el pescado', en: 'fish' },
    { es: 'la leche', en: 'milk' },
    { es: 'los lácteos', en: 'dairy' },
    { es: 'el gluten', en: 'gluten' },
    { es: 'el trigo', en: 'wheat' },
    { es: 'los huevos', en: 'eggs' },
    { es: 'la soya', en: 'soy' },
    { es: 'el polen', en: 'pollen' },
    { es: 'el polvo', en: 'dust' },
    { es: 'los gatos', en: 'cats' },
    { es: 'las abejas', en: 'bees' },
    { es: 'los camarones', en: 'shrimp' },
    { es: 'la aspirina', en: 'aspirin' },
    { es: 'el ibuprofeno', en: 'ibuprofen' },
    { es: 'las almendras', en: 'almonds' },
    { es: 'el ajonjolí', en: 'sesame' },
    { es: 'las fresas', en: 'strawberries' },
    { es: 'la piña', en: 'pineapple' },
    { es: 'el látex', en: 'latex' },
    { es: 'los perros', en: 'dogs' },
    { es: 'los mosquitos', en: 'mosquitoes' }
  ],
  arrived_place_time: [
    { es: 'Inglaterra hace dos días', en: 'England 2 days ago' },
    { es: 'Inglaterra hace una semana', en: 'England 1 week ago' },
    { es: 'Inglaterra hace dos semanas', en: 'England 2 weeks ago' },
    { es: 'Londres hace tres días', en: 'London 3 days ago' },
    { es: 'Londres hace un mes', en: 'London 1 month ago' },
    { es: 'Panamá hace dos días', en: 'Panama 2 days ago' },
    { es: 'Panamá hace una semana', en: 'Panama 1 week ago' },
    { es: 'Panamá hace un mes', en: 'Panama 1 month ago' },
    { es: 'España hace una semana', en: 'Spain 1 week ago' },
    { es: 'Madrid hace tres días', en: 'Madrid 3 days ago' },
    { es: 'la ciudad hace dos horas', en: 'the city 2 hours ago' },
    { es: 'la ciudad hace un día', en: 'the city 1 day ago' },
    { es: 'el hotel hace una hora', en: 'the hotel 1 hour ago' },
    { es: 'aquí hace dos días', en: 'here 2 days ago' },
    { es: 'aquí hace un año', en: 'here 1 year ago' },
    { es: 'Panamá hace tres días', en: 'Panama 3 days ago' },
    { es: 'Panamá hace dos semanas', en: 'Panama 2 weeks ago' },
    { es: 'Panamá hace un año', en: 'Panama 1 year ago' },
    { es: 'Boquete hace dos días', en: 'Boquete 2 days ago' },
    { es: 'Bocas del Toro hace tres días', en: 'Bocas del Toro 3 days ago' },
    { es: 'el aeropuerto hace media hora', en: 'the airport half an hour ago' },
    { es: 'el hotel hace diez minutos', en: 'the hotel 10 minutes ago' },
    { es: 'la playa hace una hora', en: 'the beach 1 hour ago' },
    { es: 'mi casa hace cinco minutos', en: 'my house 5 minutes ago' },
    { es: 'Casco Viejo hace dos horas', en: 'Casco Viejo 2 hours ago' }
  ],
  study_reasons: [
    { es: 'me gusta el idioma', en: 'I like the language' },
    { es: 'quiero viajar', en: 'I want to travel' },
    { es: 'vivo en Panamá', en: 'I live in Panama' },
    { es: 'vivo en España', en: 'I live in Spain' },
    { es: 'vivo en Inglaterra', en: 'I live in England' },
    { es: 'trabajo con latinos', en: 'I work with Latin Americans' },
    { es: 'tengo amigos hispanos', en: 'I have Spanish-speaking friends' },
    { es: 'me encanta la cultura', en: 'I love the culture' },
    { es: 'quiero vivir en Panamá', en: 'I want to live in Panama' },
    { es: 'quiero mejorar mi carrera', en: 'I want to boost my career' },
    { es: 'me gusta aprender idiomas', en: 'I like learning languages' },
    { es: 'es muy útil', en: 'it is very useful' },
    { es: 'tengo familia latina', en: 'I have Latin American family' },
    { es: 'quiero hablar con fluidez', en: 'I want to speak fluently' },
    { es: 'me encanta viajar', en: 'I love traveling' },
    { es: 'quiero conocer Panamá', en: 'I want to get to know Panama' },
    { es: 'me encanta la música latina', en: 'I love Latin music' },
    { es: 'quiero hacer nuevos amigos', en: 'I want to make new friends' },
    { es: 'es importante para mi trabajo', en: 'it is important for my job' },
    { es: 'quiero hablar con los locales', en: 'I want to speak with locals' },
    { es: 'me encanta la comida latina', en: 'I love Latin food' },
    { es: 'quiero leer libros en español', en: 'I want to read books in Spanish' },
    { es: 'voy a mudarme a Panamá', en: 'I am going to move to Panama' },
    { es: 'quiero entender películas', en: 'I want to understand movies' },
    { es: 'es un idioma muy bonito', en: 'it is a very beautiful language' }
  ]
};

export const SLOT_CONFIG_BY_ID = {
  // ===== PERSONAL / PROPER-NOUN UNIQUE ENDINGS (no Spanish example word; user says their own) =====
  id_me_llamo: {
    slotType: 'personal',
    placeholder: '[Your name]',
    displayPatternEs: 'me llamo [Your name]',
    ttsStemEs: 'me llamo',
    bankKey: null
  },
  id_apellido: {
    slotType: 'personal',
    placeholder: '[Your last name]',
    displayPatternEs: 'mi apellido es [Your last name]',
    ttsStemEs: 'mi apellido es',
    bankKey: null
  },
  t_reservacion: {
    slotType: 'personal',
    placeholder: '[Your name]',
    displayPatternEs: 'tengo una reservación a nombre de [Your name]',
    ttsStemEs: 'tengo una reservación a nombre de',
    bankKey: null
  },

  // ===== SPANISH-WORD-REQUIRED ENDINGS (15-option dropdown) =====
  id_soy_panama: {
    slotType: 'spanish_options',
    placeholder: '[Country]',
    dropdownLabel: '25 common countries in Spanish',
    displayPatternEs: 'soy de [Country]',
    examplePatternEn: 'I am from {en}',
    ttsStemEs: 'soy de',
    bankKey: 'countries'
  },
  id_panameno: {
    slotType: 'spanish_options',
    placeholder: '[Nationality]',
    dropdownLabel: '25 common nationalities in Spanish',
    displayPatternEs: 'soy [Nationality]',
    examplePatternEn: 'I am {en}',
    ttsStemEs: 'soy',
    bankKey: 'nationalities'
  },
  id_vivo_en: {
    slotType: 'spanish_options',
    placeholder: '[City / Country]',
    dropdownLabel: '25 common cities & countries in Spanish',
    displayPatternEs: 'vivo en [City / Country]',
    examplePatternEn: 'I live in {en}',
    ttsStemEs: 'vivo en',
    bankKey: 'places_residence'
  },
  id_profesor: {
    slotType: 'spanish_options',
    placeholder: '[Your profession]',
    dropdownLabel: '25 common professions in Spanish',
    displayPatternEs: 'soy [Your profession]',
    examplePatternEn: 'I am a {en}',
    ttsStemEs: 'soy',
    bankKey: 'professions'
  },
  id_idiomas: {
    slotType: 'spanish_options',
    placeholder: '[Language(s)]',
    dropdownLabel: '25 common languages in Spanish',
    displayPatternEs: 'hablo [Language(s)]',
    examplePatternEn: 'I speak {en}',
    ttsStemEs: 'hablo',
    bankKey: 'languages'
  },
  fam_tengo_hermanos: {
    slotType: 'spanish_options',
    placeholder: '[Siblings]',
    dropdownLabel: '25 common sibling answers in Spanish',
    displayPatternEs: 'tengo [Siblings]',
    examplePatternEn: 'I have {en}',
    ttsStemEs: 'tengo',
    bankKey: 'sibling_counts'
  },
  fam_mascota: {
    slotType: 'spanish_options',
    placeholder: '[Your pet]',
    dropdownLabel: '25 common pets in Spanish',
    displayPatternEs: 'tengo [Your pet]',
    examplePatternEn: 'I have {en}',
    ttsStemEs: 'tengo',
    bankKey: 'pets'
  },
  fam_hay: {
    slotType: 'spanish_options',
    placeholder: '[Rooms]',
    dropdownLabel: '25 common room counts in Spanish',
    displayPatternEs: 'hay [Rooms] en la casa',
    examplePatternEn: 'there are {en} in the house',
    ttsStemEs: 'hay',
    bankKey: 'home_rooms'
  },
  v_viven: {
    slotType: 'spanish_options',
    placeholder: '[City / Country]',
    dropdownLabel: '25 common cities & countries in Spanish',
    displayPatternEs: 'ellos viven en [City / Country]',
    examplePatternEn: 'they live in {en}',
    ttsStemEs: 'ellos viven en',
    bankKey: 'places_residence'
  },
  v_levanto: {
    slotType: 'spanish_options',
    placeholder: '[Time]',
    dropdownLabel: '25 common wake-up times in Spanish',
    displayPatternEs: 'me levanto [Time]',
    examplePatternEn: 'I get up {en}',
    ttsStemEs: 'me levanto',
    bankKey: 'morning_times'
  },
  v_desayuno: {
    slotType: 'spanish_options',
    placeholder: '[Breakfast food]',
    dropdownLabel: '25 common breakfast foods in Spanish',
    displayPatternEs: 'desayuno [Breakfast food]',
    examplePatternEn: 'I have {en} for breakfast',
    ttsStemEs: 'desayuno',
    bankKey: 'breakfast_foods'
  },
  v_salgo: {
    slotType: 'spanish_options',
    placeholder: '[Time]',
    dropdownLabel: '25 common departure times in Spanish',
    displayPatternEs: 'salgo de la casa [Time]',
    examplePatternEn: 'I leave the house {en}',
    ttsStemEs: 'salgo de la casa',
    bankKey: 'morning_times'
  },
  v_acuesto: {
    slotType: 'spanish_options',
    placeholder: '[Time]',
    dropdownLabel: '25 common bedtimes in Spanish',
    displayPatternEs: 'me acuesto [Time]',
    examplePatternEn: 'I go to bed {en}',
    ttsStemEs: 'me acuesto',
    bankKey: 'night_times'
  },
  v_me_gusta: {
    slotType: 'spanish_options',
    placeholder: '[Something / Activity]',
    dropdownLabel: '25 common things & activities in Spanish',
    displayPatternEs: 'me gusta [Something / Activity]',
    examplePatternEn: 'I like {en}',
    ttsStemEs: 'me gusta',
    bankKey: 'singular_likes'
  },
  v_me_gustan: {
    slotType: 'spanish_options',
    placeholder: '[Plural things]',
    dropdownLabel: '25 common plural things in Spanish',
    displayPatternEs: 'me gustan [Plural things]',
    examplePatternEn: 'I like {en}',
    ttsStemEs: 'me gustan',
    bankKey: 'plural_likes'
  },
  v_conozco: {
    slotType: 'spanish_options',
    placeholder: '[Place]',
    dropdownLabel: '25 common places in Spanish',
    displayPatternEs: 'conozco [Place]',
    examplePatternEn: 'I know {en}',
    ttsStemEs: 'conozco',
    bankKey: 'places_visit'
  },
  f_una_mesa: {
    slotType: 'spanish_options',
    placeholder: '[Number of people]',
    dropdownLabel: '25 common table sizes in Spanish',
    displayPatternEs: 'una mesa para [Number of people]',
    examplePatternEn: 'a table for {en}',
    ttsStemEs: 'una mesa para',
    bankKey: 'table_sizes'
  },
  f_para_mi: {
    slotType: 'spanish_options',
    placeholder: '[Dish / Drink]',
    dropdownLabel: '25 common restaurant orders in Spanish',
    displayPatternEs: 'para mí [Dish / Drink]',
    examplePatternEn: 'for me, {en}',
    ttsStemEs: 'para mí',
    bankKey: 'dishes_drinks'
  },
  f_camisa: {
    slotType: 'spanish_options',
    placeholder: '[Item / Clothing]',
    dropdownLabel: '25 common clothing & items in Spanish',
    displayPatternEs: 'estoy buscando [Item / Clothing]',
    examplePatternEn: 'I am looking for {en}',
    ttsStemEs: 'estoy buscando',
    bankKey: 'shopping_items'
  },
  f_talla: {
    slotType: 'spanish_options',
    placeholder: '[Size]',
    dropdownLabel: '25 common clothing sizes in Spanish',
    displayPatternEs: '¿la tiene en talla [Size]?',
    examplePatternEn: 'do you have it in size {en}?',
    ttsStemEs: '¿la tiene en talla',
    bankKey: 'clothing_sizes'
  },
  t_voy_para: {
    slotType: 'spanish_options',
    placeholder: '[Destination]',
    dropdownLabel: '25 common destinations in Spanish',
    displayPatternEs: 'voy para [Destination]',
    examplePatternEn: "I'm heading to {en}",
    ttsStemEs: 'voy para',
    bankKey: 'city_destinations'
  },
  t_aeropuerto: {
    slotType: 'spanish_options',
    placeholder: '[Destination]',
    dropdownLabel: '25 common taxi destinations in Spanish',
    displayPatternEs: 'lléveme [Destination]',
    examplePatternEn: 'take me {en}',
    ttsStemEs: 'lléveme',
    bankKey: 'taxi_destinations'
  },
  t_espere: {
    slotType: 'spanish_options',
    placeholder: '[Wait time]',
    dropdownLabel: '25 common wait times in Spanish',
    displayPatternEs: '¿me espera [Wait time]?',
    examplePatternEn: 'can you wait for me for {en}?',
    ttsStemEs: '¿me espera',
    bankKey: 'wait_minutes'
  },
  t_albrook: {
    slotType: 'spanish_options',
    placeholder: '[Destination]',
    dropdownLabel: '25 common bus destinations in Spanish',
    displayPatternEs: '¿este bus va para [Destination]?',
    examplePatternEn: 'does this bus go to {en}?',
    ttsStemEs: '¿este bus va para',
    bankKey: 'city_destinations'
  },
  t_habitacion_doble: {
    slotType: 'spanish_options',
    placeholder: '[Stay length]',
    dropdownLabel: '25 common hotel stay lengths in Spanish',
    displayPatternEs: 'una habitación para [Stay length]',
    examplePatternEn: 'a room for {en}',
    ttsStemEs: 'una habitación para',
    bankKey: 'hotel_nights'
  },
  a1_alergico: {
    slotType: 'spanish_options',
    placeholder: '[Allergen]',
    dropdownLabel: '25 common allergens in Spanish',
    displayPatternEs: 'soy alérgico a [Allergen]',
    examplePatternEn: 'I am allergic to {en}',
    ttsStemEs: 'soy alérgico a',
    bankKey: 'allergens'
  },
  a1_visitar_canal: {
    slotType: 'spanish_options',
    placeholder: '[Place]',
    dropdownLabel: '25 common travel places in Spanish',
    displayPatternEs: 'voy a visitar [Place]',
    examplePatternEn: 'I am going to visit {en}',
    ttsStemEs: 'voy a visitar',
    bankKey: 'places_visit'
  },
  a1_llegue: {
    slotType: 'spanish_options',
    placeholder: '[Place + time ago]',
    dropdownLabel: '25 common arrival phrases in Spanish',
    displayPatternEs: 'llegué a [Place + time ago]',
    examplePatternEn: 'I arrived in {en}',
    ttsStemEs: 'llegué a',
    bankKey: 'arrived_place_time'
  },
  a1_pase_bien: {
    slotType: 'spanish_options',
    placeholder: '[Place]',
    dropdownLabel: '25 common places in Spanish',
    displayPatternEs: 'la pasé muy bien en [Place]',
    examplePatternEn: 'I had a very good time in {en}',
    ttsStemEs: 'la pasé muy bien en',
    bankKey: 'places_visit'
  },
  a1_porque_pero: {
    slotType: 'spanish_options',
    placeholder: '[Your reason]',
    dropdownLabel: '25 common reasons in Spanish',
    displayPatternEs: 'estudio español porque [Your reason]',
    examplePatternEn: 'I study Spanish because {en}',
    ttsStemEs: 'estudio español porque',
    bankKey: 'study_reasons'
  }
};

export function getSlotConfigForItem(item) {
  if (!item || typeof item !== 'object' || !item.id) return null;
  const cfg = SLOT_CONFIG_BY_ID[item.id];
  if (!cfg) return null;
  const options =
    cfg.slotType === 'spanish_options' && cfg.bankKey
      ? SLOT_OPTION_BANKS[cfg.bankKey] || []
      : [];
  return {
    ...cfg,
    options
  };
}

export function getFilledSpanishForItem(item, chosenOptionEs = '') {
  if (!item || typeof item !== 'object') return '';
  const cfg = getSlotConfigForItem(item);
  if (!cfg) return item.es || '';
  const chosen = String(chosenOptionEs || '').trim();
  if (chosen && cfg.slotType === 'spanish_options') {
    return cfg.displayPatternEs.replace(cfg.placeholder, chosen);
  }
  return cfg.displayPatternEs;
}

export function getDisplaySpanishForItem(item, chosenOptionEs = '') {
  return getFilledSpanishForItem(item, chosenOptionEs);
}

export function getSpeakableSpanishForItem(item, chosenOptionEs = '') {
  if (!item || typeof item !== 'object') return '';
  const cfg = getSlotConfigForItem(item);
  if (!cfg) return item.es || '';
  const chosen = String(chosenOptionEs || '').trim();
  if (chosen && cfg.slotType === 'spanish_options') {
    return cfg.displayPatternEs.replace(cfg.placeholder, chosen);
  }
  return cfg.ttsStemEs;
}

export function getAllFilledSpanishOptionsForItem(item) {
  if (!item || typeof item !== 'object') return [];
  const cfg = getSlotConfigForItem(item);
  if (!cfg || cfg.slotType !== 'spanish_options' || !Array.isArray(cfg.options)) {
    return [];
  }
  return cfg.options
    .map((opt) => cfg.displayPatternEs.replace(cfg.placeholder, opt.es))
    .filter(Boolean);
}

export function buildFilledEnglishExampleForItem(item, chosenOptionEs = '') {
  if (!item || typeof item !== 'object') return '';
  const cfg = getSlotConfigForItem(item);
  if (!cfg || cfg.slotType !== 'spanish_options' || !Array.isArray(cfg.options) || cfg.options.length === 0) {
    return '';
  }
  const chosen = String(chosenOptionEs || '').trim();
  const opt = cfg.options.find((o) => o.es === chosen) || cfg.options[0];
  if (!opt) return '';

  const cleanOptEn = String(opt.en || '')
    .split('/')[0]
    .replace(/\s*\((?:m\.|f\.|Panama)\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleanOptEn) return '';

  const base = cfg.examplePatternEn
    ? cfg.examplePatternEn.replace('{en}', cleanOptEn)
    : String(item.en || '').replace(/\[[^\]]+\]/, cleanOptEn);

  return base
    .replace(/\bthere are (one|a|an)\b/gi, 'there is $1')
    .replace(/\ba ([aeiou])/gi, 'an $1')
    .replace(/\bsize size\b/gi, 'size')
    .replace(/\bto downtown\b/gi, 'downtown')
    .replace(/\bin here\b/gi, 'here')
    .replace(/\b(at|to|for|in)\s+\1\b/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectMatchedSlotOptionsInSpanish(item, rawSpanish) {
  if (!item || typeof item !== 'object') return [];
  const cfg = getSlotConfigForItem(item);
  if (!cfg || cfg.slotType !== 'spanish_options' || !Array.isArray(cfg.options) || cfg.options.length === 0) {
    return [];
  }
  const clean = stripAccents(normalizePhraseSpanish(rawSpanish || ''));
  if (!clean) return [];

  let searchText = clean;
  const placeholderIdx = cfg.displayPatternEs.indexOf(cfg.placeholder);
  if (placeholderIdx >= 0) {
    const preNorm = stripAccents(normalizePhraseSpanish(cfg.displayPatternEs.slice(0, placeholderIdx)));
    const postNorm = stripAccents(
      normalizePhraseSpanish(cfg.displayPatternEs.slice(placeholderIdx + cfg.placeholder.length))
    );
    if (preNorm) {
      if (searchText.startsWith(`yo ${preNorm} `)) {
        searchText = searchText.slice(preNorm.length + 4).trim();
      } else if (searchText.startsWith(`${preNorm} `)) {
        searchText = searchText.slice(preNorm.length + 1).trim();
      }
    }
    if (postNorm && searchText.endsWith(` ${postNorm}`)) {
      searchText = searchText.slice(0, -(postNorm.length + 1)).trim();
    }
  }
  if (!searchText) searchText = clean;

  const sortedOpts = cfg.options
    .map((opt) => ({
      es: opt.es,
      norm: stripAccents(normalizePhraseSpanish(opt.es))
    }))
    .filter((entry) => entry.norm)
    .sort((a, b) => b.norm.length - a.norm.length);

  let remaining = ` ${searchText} `;
  const matched = [];
  for (const cand of sortedOpts) {
    const needle = ` ${cand.norm} `;
    if (remaining.includes(needle)) {
      if (!matched.includes(cand.es)) {
        matched.push(cand.es);
      }
      remaining = remaining.split(needle).join(' | ');
    }
  }
  return matched;
}

export function tokenizeDisplaySpanishWithSlots(text) {
  const src = String(text || '').trim();
  if (!src) return [];
  const tokens = [];
  const re = /(\[[^\]]+\])([^\s]*)|([^\s]+)/g;
  let match;
  while ((match = re.exec(src)) !== null) {
    if (match[1]) {
      tokens.push({ type: 'slot', text: match[1] });
      if (match[2]) {
        tokens.push({ type: 'punct', text: match[2] });
      }
    } else if (match[3]) {
      const rawWord = match[3];
      const spoken = rawWord.replace(/^[¿¡]+|[?!.,;:]+$/g, '') || rawWord;
      tokens.push({ type: 'word', text: rawWord, spoken });
    }
  }
  return tokens;
}
