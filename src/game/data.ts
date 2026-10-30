// Static world data: countries, divisions, cups, name pools.
export interface LeagueDef { id: string; name: string; teams: number }
export interface CountryDef {
  id: string; name: string; flag: string; conf: "UEFA" | "CONMEBOL" | "AFC" | "CONCACAF";
  strength: number; leagues: LeagueDef[]; cup: { id: string; name: string }; swap: number;
  clubs: string[]; cities: string[]; pattern: (city: string, i: number) => string;
  first: string[]; last: string[];
}

const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];

export const COUNTRIES: CountryDef[] = [
  {
    id: "BRA", name: "Brasil", flag: "🇧🇷", conf: "CONMEBOL", strength: 0.86, swap: 4,
    leagues: [
      { id: "BRA1", name: "Série A", teams: 20 }, { id: "BRA2", name: "Série B", teams: 20 },
      { id: "BRA3", name: "Série C", teams: 20 }, { id: "BRA4", name: "Série D", teams: 16 },
    ],
    cup: { id: "CBR", name: "Copa do Brasil" },
    clubs: ["Flamengo", "Palmeiras", "Botafogo", "São Paulo", "Corinthians", "Atlético-MG", "Fluminense", "Internacional", "Grêmio", "Cruzeiro", "Bahia", "Fortaleza", "Vasco da Gama", "Bragantino", "Santos", "Athletico-PR", "Vitória", "Juventude", "Ceará", "Mirassol",
      "Sport", "Cuiabá", "Goiás", "América-MG", "Coritiba", "Criciúma", "Atlético-GO", "Chapecoense", "Avaí", "Ponte Preta", "Guarani", "Novorizontino", "Vila Nova", "CRB", "Operário-PR", "Paysandu", "Remo", "Amazonas", "Botafogo-SP", "Ferroviária",
      "Náutico", "Santa Cruz", "ABC", "CSA", "Figueirense", "Londrina", "Ituano", "Brusque", "Volta Redonda", "Tombense", "Ypiranga", "São Bernardo", "Confiança", "Caxias", "Athletic-MG", "Floresta", "Botafogo-PB", "Sampaio Corrêa", "Paraná", "Joinville"],
    cities: ["Uberlândia", "Campinas", "Ribeirão Preto", "Maringá", "Cascavel", "Petrolina", "Imperatriz", "Rondonópolis", "Anápolis", "Juiz de Fora", "Pelotas", "Bauru", "Franca", "Marília", "Caruaru", "Itabuna", "Macaé", "Patos", "Toledo", "Sobral"],
    pattern: (c, i) => `${pick(["EC", "AA", "Atlético", "União", "Esporte Clube", "Sport Club"], i)} ${c}`,
    first: ["Lucas", "Gabriel", "Matheus", "Pedro", "João", "Rafael", "Gustavo", "Felipe", "Bruno", "Thiago", "Vinícius", "Caio", "Igor", "Diego", "Rodrigo", "Wesley", "Kaio", "Davi", "Enzo", "Murilo"],
    last: ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Ribeiro", "Gomes", "Martins", "Araújo", "Barbosa", "Rocha", "Moura", "Teixeira", "Freitas"],
  },
  {
    id: "ENG", name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", conf: "UEFA", strength: 1, swap: 3,
    leagues: [
      { id: "ENG1", name: "Premier League", teams: 20 }, { id: "ENG2", name: "Championship", teams: 20 },
      { id: "ENG3", name: "League One", teams: 16 }, { id: "ENG4", name: "League Two", teams: 16 },
    ],
    cup: { id: "FAC", name: "FA Cup" },
    clubs: ["Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United", "Tottenham", "Newcastle", "Aston Villa", "Brighton", "West Ham", "Crystal Palace", "Brentford", "Fulham", "Wolves", "Bournemouth", "Nottingham Forest", "Everton", "Leicester", "Leeds", "Southampton",
      "Burnley", "Sheffield United", "Sunderland", "West Brom", "Middlesbrough", "Norwich", "Coventry", "Watford", "Hull City", "Stoke City", "Swansea", "Cardiff", "Bristol City", "Millwall", "QPR", "Blackburn", "Preston", "Derby County", "Plymouth", "Luton"],
    cities: ["Reading", "Bolton", "Wigan", "Barnsley", "Oxford", "Portsmouth", "Charlton", "Peterborough", "Lincoln", "Exeter", "Wycombe", "Cambridge", "Shrewsbury", "Burton", "Northampton", "Mansfield", "Bradford", "Doncaster", "Gillingham", "Crewe", "Walsall", "Notts", "Salford", "Tranmere"],
    pattern: (c, i) => `${c} ${pick(["Town", "United", "City", "Rovers", "Athletic", "Albion"], i)}`,
    first: ["Harry", "Jack", "James", "Oliver", "George", "Charlie", "Thomas", "Jacob", "Alfie", "Mason", "Declan", "Jordan", "Reece", "Kyle", "Callum", "Ben", "Luke", "Ollie", "Marcus", "Bukayo"],
    last: ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies", "Walker", "Wright", "Robinson", "Thompson", "White", "Hughes", "Green", "Hall", "Clarke", "Turner", "Hill", "Cooper"],
  },
  {
    id: "ESP", name: "Espanha", flag: "🇪🇸", conf: "UEFA", strength: 0.97, swap: 3,
    leagues: [
      { id: "ESP1", name: "LaLiga", teams: 20 }, { id: "ESP2", name: "LaLiga 2", teams: 18 }, { id: "ESP3", name: "Primera Federación", teams: 16 },
    ],
    cup: { id: "CDR", name: "Copa del Rey" },
    clubs: ["Real Madrid", "Barcelona", "Atlético de Madrid", "Athletic Bilbao", "Real Sociedad", "Villarreal", "Real Betis", "Sevilla", "Valencia", "Girona", "Celta de Vigo", "Osasuna", "Rayo Vallecano", "Mallorca", "Getafe", "Las Palmas", "Alavés", "Espanyol", "Leganés", "Valladolid",
      "Granada", "Cádiz", "Almería", "Levante", "Eibar", "Sporting Gijón", "Racing Santander", "Oviedo", "Zaragoza", "Elche", "Tenerife", "Huesca", "Burgos", "Mirandés", "Albacete", "Córdoba", "Málaga", "Deportivo La Coruña"],
    cities: ["Alcorcón", "Ponferrada", "Lugo", "Castellón", "Murcia", "Cartagena", "Salamanca", "Badajoz", "Ceuta", "Algeciras", "Gimnàstic", "Ibiza", "Linares", "Antequera", "Mérida", "Logroñés"],
    pattern: (c, i) => `${pick(["CD", "UD", "SD", "CF", "Real", "Club"], i)} ${c}`,
    first: ["Pablo", "Sergio", "Álvaro", "Javier", "Daniel", "Carlos", "Alejandro", "Iker", "Marcos", "Adrián", "Pedro", "Rodrigo", "Unai", "Mikel", "Raúl", "Fermín", "Nico", "Dani", "Hugo", "Gonzalo"],
    last: ["García", "Fernández", "González", "Rodríguez", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Martín", "Ruiz", "Díaz", "Moreno", "Muñoz", "Romero", "Navarro", "Torres", "Ramos", "Gil", "Herrera"],
  },
  {
    id: "ITA", name: "Itália", flag: "🇮🇹", conf: "UEFA", strength: 0.95, swap: 3,
    leagues: [
      { id: "ITA1", name: "Serie A", teams: 20 }, { id: "ITA2", name: "Serie B", teams: 18 }, { id: "ITA3", name: "Serie C", teams: 16 },
    ],
    cup: { id: "CIT", name: "Coppa Italia" },
    clubs: ["Inter", "Napoli", "Milan", "Juventus", "Atalanta", "Roma", "Lazio", "Fiorentina", "Bologna", "Torino", "Udinese", "Genoa", "Como", "Monza", "Lecce", "Cagliari", "Verona", "Empoli", "Parma", "Venezia",
      "Sassuolo", "Salernitana", "Frosinone", "Sampdoria", "Palermo", "Cremonese", "Spezia", "Bari", "Pisa", "Brescia", "Modena", "Catanzaro", "Reggiana", "Cittadella", "Südtirol", "Cosenza", "Mantova", "Juve Stabia"],
    cities: ["Ascoli", "Perugia", "Ternana", "Pescara", "Vicenza", "Padova", "Triestina", "Avellino", "Foggia", "Livorno", "Lucchese", "Novara", "Alessandria", "Pro Vercelli", "Catania", "Messina"],
    pattern: (c, i) => `${pick(["US", "AC", "SS", "Calcio", "FC", "AS"], i)} ${c}`,
    first: ["Lorenzo", "Federico", "Alessandro", "Matteo", "Marco", "Nicolò", "Davide", "Andrea", "Giacomo", "Riccardo", "Gianluca", "Simone", "Sandro", "Manuel", "Francesco", "Luca", "Pietro", "Tommaso", "Ciro", "Mattia"],
    last: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Barbieri"],
  },
  {
    id: "ALE", name: "Alemanha", flag: "🇩🇪", conf: "UEFA", strength: 0.94, swap: 3,
    leagues: [
      { id: "ALE1", name: "Bundesliga", teams: 18 }, { id: "ALE2", name: "2. Bundesliga", teams: 18 }, { id: "ALE3", name: "3. Liga", teams: 16 },
    ],
    cup: { id: "DFB", name: "DFB-Pokal" },
    clubs: ["Bayern München", "Bayer Leverkusen", "Borussia Dortmund", "RB Leipzig", "Stuttgart", "Eintracht Frankfurt", "Freiburg", "Wolfsburg", "Hoffenheim", "Mönchengladbach", "Werder Bremen", "Union Berlin", "Mainz", "Augsburg", "Heidenheim", "St. Pauli", "Holstein Kiel", "Bochum",
      "Hamburger SV", "Schalke 04", "Köln", "Hertha BSC", "Fortuna Düsseldorf", "Hannover 96", "Kaiserslautern", "Nürnberg", "Karlsruhe", "Paderborn", "Darmstadt", "Magdeburg", "Greuther Fürth", "Elversberg", "Braunschweig", "Regensburg", "Ulm", "Münster"],
    cities: ["Dresden", "Saarbrücken", "Rostock", "Osnabrück", "Wiesbaden", "Aachen", "Essen", "Mannheim", "Ingolstadt", "Bielefeld", "Duisburg", "Verl", "Sandhausen", "Aue", "Unterhaching", "Cottbus"],
    pattern: (c, i) => `${pick(["SV", "FC", "VfB", "SpVgg", "TSV", "SC"], i)} ${c}`,
    first: ["Lukas", "Leon", "Jonas", "Felix", "Maximilian", "Niklas", "Florian", "Kai", "Jamal", "Florian", "Julian", "Tim", "Joshua", "Leroy", "Thomas", "Marco", "Robin", "David", "Benjamin", "Jan"],
    last: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Koch", "Richter", "Klein", "Wolf", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger", "Hartmann"],
  },
  {
    id: "FRA", name: "França", flag: "🇫🇷", conf: "UEFA", strength: 0.89, swap: 3,
    leagues: [
      { id: "FRA1", name: "Ligue 1", teams: 18 }, { id: "FRA2", name: "Ligue 2", teams: 18 }, { id: "FRA3", name: "National", teams: 16 },
    ],
    cup: { id: "CDF", name: "Coupe de France" },
    clubs: ["Paris Saint-Germain", "Monaco", "Marseille", "Lille", "Lyon", "Nice", "Lens", "Rennes", "Strasbourg", "Brest", "Toulouse", "Nantes", "Reims", "Montpellier", "Auxerre", "Angers", "Le Havre", "Saint-Étienne",
      "Lorient", "Metz", "Paris FC", "Caen", "Bordeaux", "Guingamp", "Bastia", "Amiens", "Grenoble", "Laval", "Pau", "Rodez", "Annecy", "Dunkerque", "Troyes", "Clermont", "Ajaccio", "Quevilly"],
    cities: ["Nîmes", "Sochaux", "Valenciennes", "Dijon", "Orléans", "Châteauroux", "Le Mans", "Nancy", "Rouen", "Versailles", "Bourg", "Martigues", "Niort", "Cholet", "Avranches", "Créteil"],
    pattern: (c, i) => `${pick(["FC", "AS", "US", "Stade", "SC", "Olympique"], i)} ${c}`,
    first: ["Lucas", "Hugo", "Théo", "Antoine", "Kylian", "Ousmane", "Jules", "Raphaël", "Adrien", "Mathis", "Bradley", "Warren", "Randal", "Youssouf", "Aurélien", "Benjamin", "Moussa", "Ibrahima", "Rayan", "Enzo"],
    last: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Diallo", "Traoré", "Camara", "Mendy", "Kanté", "Fofana"],
  },
  {
    id: "POR", name: "Portugal", flag: "🇵🇹", conf: "UEFA", strength: 0.84, swap: 3,
    leagues: [
      { id: "POR1", name: "Primeira Liga", teams: 18 }, { id: "POR2", name: "Liga Portugal 2", teams: 16 }, { id: "POR3", name: "Liga 3", teams: 16 },
    ],
    cup: { id: "TDP", name: "Taça de Portugal" },
    clubs: ["Benfica", "Sporting", "Porto", "Braga", "Vitória de Guimarães", "Santa Clara", "Famalicão", "Casa Pia", "Estoril", "Rio Ave", "Moreirense", "Gil Vicente", "Arouca", "Estrela da Amadora", "Nacional", "AVS", "Boavista", "Farense",
      "Tondela", "Alverca", "Vizela", "Chaves", "Leixões", "Penafiel", "Feirense", "Académico de Viseu", "Portimonense", "Marítimo", "Oliveirense", "Torreense", "Benfica B", "Porto B", "Académica", "Belenenses"],
    cities: ["Covilhã", "Trofense", "Varzim", "Felgueiras", "Amarante", "Lusitânia", "Sanjoanense", "Caldas", "Fafe", "Anadia", "Mafra", "Paredes"],
    pattern: (c, i) => `${pick(["SC", "GD", "CD", "FC", "UD", "AD"], i)} ${c}`,
    first: ["João", "Diogo", "Rúben", "Bernardo", "Gonçalo", "Rafael", "Pedro", "Francisco", "Tiago", "Nuno", "André", "Vitinha", "Bruno", "Rui", "Ricardo", "Fábio", "Hugo", "Miguel", "Tomás", "Afonso"],
    last: ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Sousa", "Fernandes", "Gonçalves", "Gomes", "Lopes", "Marques", "Alves", "Almeida", "Ribeiro", "Pinto", "Carvalho", "Teixeira"],
  },
  {
    id: "ARG", name: "Argentina", flag: "🇦🇷", conf: "CONMEBOL", strength: 0.82, swap: 3,
    leagues: [
      { id: "ARG1", name: "Liga Profesional", teams: 20 }, { id: "ARG2", name: "Primera Nacional", teams: 18 }, { id: "ARG3", name: "Primera B", teams: 16 },
    ],
    cup: { id: "CAR", name: "Copa Argentina" },
    clubs: ["River Plate", "Boca Juniors", "Racing Club", "Independiente", "San Lorenzo", "Estudiantes", "Vélez Sarsfield", "Talleres", "Lanús", "Argentinos Juniors", "Huracán", "Rosario Central", "Newell's Old Boys", "Defensa y Justicia", "Godoy Cruz", "Belgrano", "Unión", "Banfield", "Tigre", "Platense",
      "Gimnasia LP", "Atlético Tucumán", "Instituto", "Sarmiento", "Barracas Central", "Central Córdoba", "Independiente Rivadavia", "Riestra", "San Martín SJ", "Colón", "Quilmes", "Chacarita", "Ferro Carril Oeste", "All Boys", "Atlanta", "Almagro", "Nueva Chicago", "Arsenal de Sarandí"],
    cities: ["Mendoza", "Salta", "Jujuy", "Mar del Plata", "Bahía Blanca", "Paraná", "Santa Fe", "Rafaela", "Morón", "Temperley", "Brown", "Merlo", "Tristán Suárez", "Comunicaciones"],
    pattern: (c, i) => `${pick(["Club Atlético", "CA", "Club", "Deportivo", "Sportivo"], i)} ${c}`,
    first: ["Juan", "Matías", "Lautaro", "Julián", "Enzo", "Rodrigo", "Nicolás", "Facundo", "Gonzalo", "Franco", "Agustín", "Thiago", "Alexis", "Cristian", "Exequiel", "Valentín", "Leandro", "Tomás", "Santiago", "Máximo"],
    last: ["González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "Romero", "Sánchez", "Álvarez", "Acosta", "Benítez", "Medina", "Suárez", "Herrera", "Aguirre", "Giménez", "Molina", "Rojas"],
  },
  {
    id: "HOL", name: "Holanda", flag: "🇳🇱", conf: "UEFA", strength: 0.83, swap: 2,
    leagues: [{ id: "HOL1", name: "Eredivisie", teams: 18 }, { id: "HOL2", name: "Eerste Divisie", teams: 16 }],
    cup: { id: "KNV", name: "KNVB Beker" },
    clubs: ["PSV", "Feyenoord", "Ajax", "AZ Alkmaar", "Twente", "Utrecht", "Go Ahead Eagles", "NEC", "Heerenveen", "Sparta Rotterdam", "Fortuna Sittard", "PEC Zwolle", "Heracles", "Groningen", "NAC Breda", "Willem II", "RKC Waalwijk", "Almere City",
      "Vitesse", "Excelsior", "Volendam", "Cambuur", "Roda JC", "De Graafschap", "ADO Den Haag", "Emmen", "Dordrecht", "MVV", "Telstar", "VVV-Venlo", "Helmond Sport", "Den Bosch"],
    cities: ["Oss", "Eindhoven", "Velsen", "Leeuwarden"],
    pattern: (c, i) => `${pick(["FC", "SC", "VV", "RKC"], i)} ${c}`,
    first: ["Daan", "Sem", "Lars", "Thijs", "Jesse", "Bram", "Ruben", "Luuk", "Frenkie", "Virgil", "Matthijs", "Cody", "Xavi", "Jurriën", "Denzel", "Teun", "Joey", "Steven", "Quinten", "Justin"],
    last: ["de Jong", "Jansen", "de Vries", "van Dijk", "Bakker", "Visser", "Smit", "Meijer", "de Boer", "Mulder", "Bos", "Vos", "Peters", "Hendriks", "van Leeuwen", "Dekker", "Brouwer", "de Wit", "Dijkstra", "Koopmeiners"],
  },
  {
    id: "EUA", name: "Estados Unidos", flag: "🇺🇸", conf: "CONCACAF", strength: 0.72, swap: 2,
    leagues: [{ id: "EUA1", name: "MLS", teams: 20 }, { id: "EUA2", name: "USL Championship", teams: 16 }],
    cup: { id: "USO", name: "US Open Cup" },
    clubs: ["Inter Miami", "LA Galaxy", "LAFC", "Columbus Crew", "Seattle Sounders", "Atlanta United", "New York City FC", "Philadelphia Union", "FC Cincinnati", "Orlando City", "New York Red Bulls", "Portland Timbers", "Real Salt Lake", "Nashville SC", "Austin FC", "Minnesota United", "Houston Dynamo", "Charlotte FC", "Vancouver Whitecaps", "Toronto FC",
      "Louisville City", "Sacramento Republic", "Phoenix Rising", "Tampa Bay Rowdies", "Colorado Springs", "San Antonio FC", "Indy Eleven", "Pittsburgh Riverhounds", "Orange County SC", "Charleston Battery", "Detroit City", "Memphis 901", "Las Vegas Lights", "El Paso Locomotive", "Birmingham Legion", "Oakland Roots"],
    cities: ["Albuquerque", "Hartford", "Miami", "Rhode Island", "Tulsa", "Monterey Bay"],
    pattern: (c, i) => `${c} ${pick(["FC", "SC", "United"], i)}`,
    first: ["Christian", "Tyler", "Weston", "Brenden", "Gio", "Josh", "Matt", "Ryan", "Jordan", "Paxten", "Ricardo", "Malik", "Chris", "Zack", "Brandon", "Kevin", "Diego", "Caleb", "Aidan", "Cole"],
    last: ["Johnson", "Miller", "Davis", "Wilson", "Anderson", "Moore", "Jackson", "Martin", "Lee", "Harris", "Clark", "Lewis", "Walker", "Young", "Allen", "Pulisic", "Reyna", "Adams", "McKennie", "Turner"],
  },
  {
    id: "JAP", name: "Japão", flag: "🇯🇵", conf: "AFC", strength: 0.72, swap: 3,
    leagues: [{ id: "JAP1", name: "J1 League", teams: 18 }, { id: "JAP2", name: "J2 League", teams: 18 }, { id: "JAP3", name: "J3 League", teams: 16 }],
    cup: { id: "CIM", name: "Copa do Imperador" },
    clubs: ["Vissel Kobe", "Sanfrecce Hiroshima", "Kawasaki Frontale", "Yokohama F. Marinos", "Urawa Reds", "Kashima Antlers", "FC Tokyo", "Gamba Osaka", "Cerezo Osaka", "Nagoya Grampus", "Machida Zelvia", "Tokyo Verdy", "Avispa Fukuoka", "Kashiwa Reysol", "Albirex Niigata", "Shonan Bellmare", "Consadole Sapporo", "Júbilo Iwata",
      "Shimizu S-Pulse", "Yokohama FC", "Sagan Tosu", "Kyoto Sanga", "V-Varen Nagasaki", "Vegalta Sendai", "JEF United", "Montedio Yamagata", "Fagiano Okayama", "Ventforet Kofu", "Tokushima Vortis", "Oita Trinita", "Mito HollyHock", "Roasso Kumamoto", "Ehime FC", "Thespa Gunma", "Iwaki FC", "Kagoshima United"],
    cities: ["Gifu", "Toyama", "Akita", "Nara", "Imabari", "Matsumoto", "Kanazawa", "Sagamihara", "Fukushima", "Hachinohe", "Miyazaki", "Tottori", "Numazu", "Nagano"],
    pattern: (c, i) => `${c} ${pick(["FC", "United", "SC"], i)}`,
    first: ["Takumi", "Kaoru", "Wataru", "Daichi", "Ritsu", "Takefusa", "Junya", "Kyogo", "Ayase", "Hidemasa", "Ko", "Yuki", "Shoya", "Kento", "Hiroki", "Sota", "Ren", "Haruto", "Daiki", "Yuto"],
    last: ["Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida", "Yamada", "Sasaki", "Matsumoto", "Inoue", "Kimura", "Hayashi", "Shimizu", "Mitoma", "Endo"],
  },
  {
    id: "ARA", name: "Arábia Saudita", flag: "🇸🇦", conf: "AFC", strength: 0.76, swap: 3,
    leagues: [{ id: "ARA1", name: "Saudi Pro League", teams: 18 }, { id: "ARA2", name: "First Division League", teams: 16 }],
    cup: { id: "KCU", name: "King's Cup" },
    clubs: ["Al-Hilal", "Al-Nassr", "Al-Ittihad", "Al-Ahli", "Al-Qadsiah", "Al-Shabab", "Al-Taawoun", "Al-Ettifaq", "Al-Fateh", "Al-Fayha", "Al-Khaleej", "Al-Riyadh", "Al-Wehda", "Al-Raed", "Al-Kholood", "Damac", "Al-Orobah", "Al-Okhdood",
      "Al-Hazem", "Al-Najma", "Al-Faisaly", "Al-Tai", "Abha", "Al-Jabalain", "Al-Arabi", "Al-Batin", "Ohod", "Al-Adalah", "Al-Jandal", "Al-Ula", "Al-Zulfi", "Al-Bukayriyah", "Al-Diriyah", "Jeddah"],
    cities: ["Al-Safa", "Al-Kawkab"],
    pattern: (c) => c,
    first: ["Salem", "Mohammed", "Abdullah", "Firas", "Saud", "Yasser", "Hassan", "Ali", "Nawaf", "Saleh", "Fahad", "Sultan", "Abdulrahman", "Ayman", "Ziyad", "Faisal", "Turki", "Majed", "Khalid", "Omar"],
    last: ["Al-Dawsari", "Al-Shehri", "Al-Buraikan", "Al-Faraj", "Al-Malki", "Al-Ghannam", "Al-Amri", "Al-Bulayhi", "Kanno", "Al-Owais", "Al-Aqidi", "Tambakti", "Al-Hamdan", "Al-Najei", "Al-Juwayr", "Al-Abed", "Madu", "Al-Khaibari", "Al-Yami", "Hawsawi"],
  },
];

export const COUNTRY = Object.fromEntries(COUNTRIES.map((c) => [c.id, c])) as Record<string, CountryDef>;
export const FOREIGN_NATS = ["BRA", "ARG", "POR", "ESP", "FRA", "URU", "COL", "NGA", "SEN", "CIV", "PAR", "ITA", "ALE", "HOL", "JAP", "EUA"];
export const NAT_FLAG: Record<string, string> = {
  ...Object.fromEntries(COUNTRIES.map((c) => [c.id, c.flag])),
  URU: "🇺🇾", COL: "🇨🇴", NGA: "🇳🇬", SEN: "🇸🇳", CIV: "🇨🇮", PAR: "🇵🇾", EQU: "🇪🇨", ANG: "🇦🇴",
};
export const NAT_NAME: Record<string, string> = {
  ...Object.fromEntries(COUNTRIES.map((c) => [c.id, c.name])),
  URU: "Uruguai", COL: "Colômbia", NGA: "Nigéria", SEN: "Senegal", CIV: "Costa do Marfim", PAR: "Paraguai", EQU: "Equador", ANG: "Angola",
};

export interface ContDef { id: string; name: string; conf: string; quotas: Record<string, number>; offset: number; color: string }
// offset = how many top league places skipped (for 2nd/3rd tier comps)
export const CONTINENTAL: ContDef[] = [
  { id: "UCL", name: "Champions League", conf: "UEFA", quotas: { ENG: 4, ESP: 4, ITA: 3, ALE: 3, FRA: 1, POR: 1 }, offset: 0, color: "#1d3a8a" },
  { id: "UEL", name: "Europa League", conf: "UEFA", quotas: { ENG: 3, ESP: 3, ITA: 3, ALE: 3, FRA: 2, POR: 1, HOL: 1 }, offset: -1, color: "#d9731a" },
  { id: "UECL", name: "Conference League", conf: "UEFA", quotas: { ENG: 2, ESP: 2, ITA: 2, ALE: 2, FRA: 3, POR: 2, HOL: 3 }, offset: -2, color: "#1f9d55" },
  { id: "LIB", name: "Libertadores", conf: "CONMEBOL", quotas: { BRA: 8, ARG: 8 }, offset: 0, color: "#b8860b" },
  { id: "SUL", name: "Sul-Americana", conf: "CONMEBOL", quotas: { BRA: 8, ARG: 8 }, offset: -1, color: "#2563eb" },
  { id: "ACL", name: "Champions League da Ásia", conf: "AFC", quotas: { JAP: 8, ARA: 8 }, offset: 0, color: "#0e7490" },
  { id: "CCC", name: "Copa dos Campeões CONCACAF", conf: "CONCACAF", quotas: { EUA: 16 }, offset: 0, color: "#7f1d1d" },
];
export const WORLD_CUP = { id: "MUN", name: "Mundial de Clubes" };

export const KIT_COLORS = ["#c8102e", "#ffffff", "#0b0b0b", "#1d4ed8", "#16a34a", "#facc15", "#7c2d12", "#0ea5e9", "#9333ea", "#f97316", "#64748b", "#065f46"];
export const CLUB_COLORS: Record<string, [string, string]> = {
  "São Paulo": ["#ffffff", "#c8102e"], Flamengo: ["#c8102e", "#0b0b0b"], Palmeiras: ["#065f46", "#ffffff"], Corinthians: ["#ffffff", "#0b0b0b"],
  Santos: ["#ffffff", "#0b0b0b"], Botafogo: ["#0b0b0b", "#ffffff"], Grêmio: ["#0ea5e9", "#0b0b0b"], Internacional: ["#c8102e", "#ffffff"],
  Cruzeiro: ["#1d4ed8", "#ffffff"], Fluminense: ["#7c2d12", "#16a34a"], "Atlético-MG": ["#0b0b0b", "#ffffff"], "Vasco da Gama": ["#0b0b0b", "#ffffff"],
  "Real Madrid": ["#ffffff", "#facc15"], Barcelona: ["#1d4ed8", "#c8102e"], "Manchester City": ["#7dd3fc", "#ffffff"], Liverpool: ["#c8102e", "#ffffff"],
  Arsenal: ["#c8102e", "#ffffff"], Chelsea: ["#1d4ed8", "#ffffff"], "Manchester United": ["#c8102e", "#0b0b0b"], Juventus: ["#ffffff", "#0b0b0b"],
  Inter: ["#1d4ed8", "#0b0b0b"], Milan: ["#c8102e", "#0b0b0b"], "Bayern München": ["#c8102e", "#ffffff"], "Borussia Dortmund": ["#facc15", "#0b0b0b"],
  "Paris Saint-Germain": ["#1e3a8a", "#c8102e"], Benfica: ["#c8102e", "#ffffff"], Porto: ["#1d4ed8", "#ffffff"], Sporting: ["#16a34a", "#ffffff"],
  "River Plate": ["#ffffff", "#c8102e"], "Boca Juniors": ["#1d4ed8", "#facc15"], Ajax: ["#ffffff", "#c8102e"], "Al-Hilal": ["#1d4ed8", "#ffffff"], "Al-Nassr": ["#facc15", "#1d4ed8"],
  "Inter Miami": ["#f9a8d4", "#0b0b0b"],
};

// São Paulo FC reference squad
export interface RefPlayer { name: string; pos: string; age: number; ovr: number; pot: number; nat: string; foot: "D" | "E" }
export const SPFC_SQUAD: RefPlayer[] = [
  { name: "Rafael", pos: "GOL", age: 35, ovr: 76, pot: 76, nat: "BRA", foot: "D" },
  { name: "Felipe Moraes", pos: "GOL", age: 24, ovr: 64, pot: 71, nat: "BRA", foot: "D" },
  { name: "Caio Rezende", pos: "GOL", age: 19, ovr: 56, pot: 72, nat: "BRA", foot: "D" },
  { name: "Lucas Ramon", pos: "LAT", age: 31, ovr: 69, pot: 69, nat: "BRA", foot: "D" },
  { name: "Arboleda", pos: "ZAG", age: 33, ovr: 75, pot: 75, nat: "EQU", foot: "D" },
  { name: "Rafael Tolói", pos: "ZAG", age: 34, ovr: 74, pot: 74, nat: "BRA", foot: "D" },
  { name: "Wendell", pos: "LAT", age: 31, ovr: 74, pot: 74, nat: "BRA", foot: "E" },
  { name: "Domingos Duarte", pos: "ZAG", age: 30, ovr: 72, pot: 72, nat: "POR", foot: "D" },
  { name: "Sabino", pos: "ZAG", age: 28, ovr: 71, pot: 72, nat: "BRA", foot: "D" },
  { name: "Iago", pos: "ZAG", age: 22, ovr: 66, pot: 74, nat: "BRA", foot: "E" },
  { name: "Aurélio Buta", pos: "LAT", age: 28, ovr: 70, pot: 71, nat: "ANG", foot: "D" },
  { name: "Nicolas", pos: "LAT", age: 20, ovr: 64, pot: 75, nat: "BRA", foot: "E" },
  { name: "Pedro Lima", pos: "LAT", age: 19, ovr: 63, pot: 77, nat: "BRA", foot: "D" },
  { name: "Marcos Antônio", pos: "VOL", age: 25, ovr: 76, pot: 79, nat: "BRA", foot: "D" },
  { name: "Pablo Maia", pos: "VOL", age: 23, ovr: 75, pot: 80, nat: "BRA", foot: "D" },
  { name: "Lucas Moura", pos: "MEI", age: 33, ovr: 79, pot: 79, nat: "BRA", foot: "D" },
  { name: "Bobadilla", pos: "VOL", age: 25, ovr: 73, pot: 76, nat: "PAR", foot: "D" },
  { name: "Newton", pos: "VOL", age: 23, ovr: 69, pot: 74, nat: "BRA", foot: "D" },
  { name: "Cauly", pos: "MEI", age: 30, ovr: 72, pot: 72, nat: "BRA", foot: "E" },
  { name: "Danielzinho", pos: "MEI", age: 21, ovr: 65, pot: 75, nat: "BRA", foot: "D" },
  { name: "Pedro Ferreira", pos: "MEI", age: 19, ovr: 62, pot: 77, nat: "BRA", foot: "D" },
  { name: "Calleri", pos: "ATA", age: 32, ovr: 77, pot: 77, nat: "ARG", foot: "D" },
  { name: "Luciano", pos: "ATA", age: 32, ovr: 74, pot: 74, nat: "BRA", foot: "D" },
  { name: "Ferreirinha", pos: "PON", age: 27, ovr: 73, pot: 74, nat: "BRA", foot: "E" },
  { name: "André Silva", pos: "ATA", age: 27, ovr: 70, pot: 72, nat: "BRA", foot: "D" },
  { name: "Artur", pos: "PON", age: 27, ovr: 72, pot: 73, nat: "BRA", foot: "E" },
  { name: "Tetê", pos: "PON", age: 25, ovr: 73, pot: 76, nat: "BRA", foot: "E" },
  { name: "Victor Sá", pos: "PON", age: 31, ovr: 72, pot: 72, nat: "BRA", foot: "D" },
  { name: "Ryan Francisco", pos: "ATA", age: 18, ovr: 62, pot: 80, nat: "BRA", foot: "D" },
  { name: "Lucca", pos: "ATA", age: 19, ovr: 61, pot: 76, nat: "BRA", foot: "D" },
];
export const GARRO: RefPlayer = { name: "Rodrigo Garro", pos: "MEI", age: 27, ovr: 80, pot: 81, nat: "ARG", foot: "E" };

export const SPONSOR_COMPANIES = [
  "Banco Aurora", "TeleVox", "Nexa Energia", "Ponto Bet", "Viva Seguros", "Rota Logística", "Kairos Tech", "Mar Azul Cruzeiros",
  "Supermercados Avante", "Brava Motors", "Lume Saúde", "Pulsar Telecom", "Granja Real", "Ventura Air", "Orbit Cloud", "Fibra Max",
  "Atlas Construtora", "Cervejaria Serra", "Zênite Pay", "Nimbus Games",
];
export const KIT_SUPPLIERS = ["Strider", "Volt Sport", "Kampeão", "Arena Wear", "Furia Athletics", "Pelé Lab"];
export const SPONSOR_SLOTS: { id: string; name: string; mult: number }[] = [
  { id: "master", name: "Patrocinador master", mult: 1 },
  { id: "material", name: "Material esportivo", mult: 0.6 },
  { id: "secundario", name: "Patrocinador secundário", mult: 0.3 },
  { id: "placas", name: "Placas do estádio", mult: 0.15 },
  { id: "digital", name: "Publicidade digital", mult: 0.12 },
  { id: "parceiro", name: "Parceiro comercial", mult: 0.1 },
];
