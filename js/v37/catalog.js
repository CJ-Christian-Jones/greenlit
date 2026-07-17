(function installV37Catalog(root, factory) {
  const catalog = factory();
  root.GreenlitV37 = root.GreenlitV37 || {};
  root.GreenlitV37.catalog = catalog;
  if (typeof module !== "undefined" && module.exports) module.exports = catalog;
})(typeof globalThis !== "undefined" ? globalThis : window, function createV37Catalog() {
  "use strict";

  const GENRE_IDS = {
    Action: 28,
    Adventure: 12,
    Animation: 16,
    Comedy: 35,
    Crime: 80,
    Documentary: 99,
    Drama: 18,
    Family: 10751,
    Fantasy: 14,
    History: 36,
    Horror: 27,
    Music: 10402,
    Mystery: 9648,
    Romance: 10749,
    "Sci-Fi": 878,
    Thriller: 53,
    War: 10752,
    Western: 37,
  };

  const MOVIE_SEEDS = [
    {
      title: "The Matrix",
      year: 1999,
      genres: ["Sci-Fi", "Action"],
      budgetM: 63,
      revenueM: 467,
      rating: 8.2,
      overview: "A hacker discovers that his world is a constructed reality and joins a rebellion against its machine rulers.",
      cast: [["Keanu Reeves", "Neo"], ["Laurence Fishburne", "Morpheus"], ["Carrie-Anne Moss", "Trinity"], ["Hugo Weaving", "Agent Smith"], ["Joe Pantoliano", "Cypher"]],
      directors: ["Lana Wachowski", "Lilly Wachowski"],
      writers: ["Lana Wachowski", "Lilly Wachowski"],
      composers: ["Don Davis"],
      cinematographers: ["Bill Pope"],
    },
    {
      title: "Inception",
      year: 2010,
      genres: ["Sci-Fi", "Thriller", "Action"],
      budgetM: 160,
      revenueM: 839,
      rating: 8.4,
      overview: "A specialist who steals secrets through shared dreams is offered a chance to erase his past by planting an idea.",
      cast: [["Leonardo DiCaprio", "Cobb"], ["Joseph Gordon-Levitt", "Arthur"], ["Elliot Page", "Ariadne"], ["Tom Hardy", "Eames"], ["Ken Watanabe", "Saito"]],
      directors: ["Christopher Nolan"],
      writers: ["Christopher Nolan"],
      composers: ["Hans Zimmer"],
      cinematographers: ["Wally Pfister"],
    },
    {
      title: "Mad Max: Fury Road",
      year: 2015,
      genres: ["Action", "Adventure", "Sci-Fi"],
      budgetM: 150,
      revenueM: 380,
      rating: 7.6,
      overview: "A road warrior and a rebel commander flee a tyrant across a ruined landscape in a roaring war rig.",
      cast: [["Tom Hardy", "Max Rockatansky"], ["Charlize Theron", "Imperator Furiosa"], ["Nicholas Hoult", "Nux"], ["Hugh Keays-Byrne", "Immortan Joe"], ["Rosie Huntington-Whiteley", "The Splendid Angharad"]],
      directors: ["George Miller"],
      writers: ["George Miller", "Brendan McCarthy", "Nico Lathouris"],
      composers: ["Tom Holkenborg"],
      cinematographers: ["John Seale"],
    },
    {
      title: "Get Out",
      year: 2017,
      genres: ["Horror", "Thriller", "Mystery"],
      budgetM: 4.5,
      revenueM: 256,
      rating: 7.6,
      overview: "A young photographer uncovers a terrifying secret while visiting his girlfriend's family estate.",
      cast: [["Daniel Kaluuya", "Chris Washington"], ["Allison Williams", "Rose Armitage"], ["Bradley Whitford", "Dean Armitage"], ["Catherine Keener", "Missy Armitage"], ["Lil Rel Howery", "Rod Williams"]],
      directors: ["Jordan Peele"],
      writers: ["Jordan Peele"],
      composers: ["Michael Abels"],
      cinematographers: ["Toby Oliver"],
    },
    {
      title: "Lady Bird",
      year: 2017,
      genres: ["Drama", "Comedy"],
      budgetM: 10,
      revenueM: 79,
      rating: 7.3,
      overview: "A strong-willed teenager navigates family, friendship, romance, and her final year of high school.",
      cast: [["Saoirse Ronan", "Lady Bird McPherson"], ["Laurie Metcalf", "Marion McPherson"], ["Tracy Letts", "Larry McPherson"], ["Lucas Hedges", "Danny O'Neill"], ["Timothée Chalamet", "Kyle Scheible"]],
      directors: ["Greta Gerwig"],
      writers: ["Greta Gerwig"],
      composers: ["Jon Brion"],
      cinematographers: ["Sam Levy"],
    },
    {
      title: "Spirited Away",
      year: 2001,
      genres: ["Animation", "Fantasy", "Family"],
      budgetM: 19,
      revenueM: 396,
      rating: 8.5,
      overview: "A girl enters a spirit world and must find courage and allies to rescue her transformed parents.",
      cast: [["Rumi Hiiragi", "Chihiro (voice)"], ["Miyu Irino", "Haku (voice)"], ["Mari Natsuki", "Yubaba (voice)"], ["Takashi Naito", "Akio (voice)"], ["Yasuko Sawaguchi", "Yūko (voice)"]],
      directors: ["Hayao Miyazaki"],
      writers: ["Hayao Miyazaki"],
      composers: ["Joe Hisaishi"],
      cinematographers: ["Atsushi Okui"],
    },
    {
      title: "Black Panther",
      year: 2018,
      genres: ["Action", "Adventure", "Sci-Fi"],
      budgetM: 200,
      revenueM: 1349,
      rating: 7.4,
      overview: "A newly crowned king must defend his nation and decide how its power should meet the wider world.",
      cast: [["Chadwick Boseman", "T'Challa"], ["Michael B. Jordan", "Erik Killmonger"], ["Lupita Nyong'o", "Nakia"], ["Danai Gurira", "Okoye"], ["Letitia Wright", "Shuri"]],
      directors: ["Ryan Coogler"],
      writers: ["Ryan Coogler", "Joe Robert Cole"],
      composers: ["Ludwig Göransson"],
      cinematographers: ["Rachel Morrison"],
    },
    {
      title: "The Grand Budapest Hotel",
      year: 2014,
      genres: ["Comedy", "Drama", "Crime"],
      budgetM: 25,
      revenueM: 174,
      rating: 8.0,
      overview: "A meticulous concierge and his lobby-boy protégé become entangled in a theft, a murder, and a vanishing world.",
      cast: [["Ralph Fiennes", "M. Gustave"], ["Tony Revolori", "Zero"], ["F. Murray Abraham", "Mr. Moustafa"], ["Willem Dafoe", "Jopling"], ["Saoirse Ronan", "Agatha"]],
      directors: ["Wes Anderson"],
      writers: ["Wes Anderson"],
      composers: ["Alexandre Desplat"],
      cinematographers: ["Robert Yeoman"],
    },
    {
      title: "Parasite",
      year: 2019,
      genres: ["Drama", "Thriller", "Crime"],
      budgetM: 11.4,
      revenueM: 263,
      rating: 8.5,
      overview: "A struggling family gradually enters the household of a wealthy family, with consequences none of them anticipate.",
      cast: [["Song Kang-ho", "Kim Ki-taek"], ["Lee Sun-kyun", "Park Dong-ik"], ["Cho Yeo-jeong", "Choi Yeon-gyo"], ["Choi Woo-shik", "Kim Ki-woo"], ["Park So-dam", "Kim Ki-jung"]],
      directors: ["Bong Joon Ho"],
      writers: ["Bong Joon Ho", "Han Jin-won"],
      composers: ["Jung Jae-il"],
      cinematographers: ["Hong Kyung-pyo"],
    },
    {
      title: "Moonlight",
      year: 2016,
      genres: ["Drama", "Romance"],
      budgetM: 1.5,
      revenueM: 65,
      rating: 7.4,
      overview: "Three chapters trace a young man's search for identity, connection, and self-acceptance in Miami.",
      cast: [["Trevante Rhodes", "Black"], ["André Holland", "Kevin"], ["Janelle Monáe", "Teresa"], ["Naomie Harris", "Paula"], ["Mahershala Ali", "Juan"]],
      directors: ["Barry Jenkins"],
      writers: ["Barry Jenkins"],
      composers: ["Nicholas Britell"],
      cinematographers: ["James Laxton"],
    },
    {
      title: "The Lord of the Rings: The Fellowship of the Ring",
      year: 2001,
      genres: ["Fantasy", "Adventure", "Action"],
      budgetM: 93,
      revenueM: 898,
      rating: 8.4,
      overview: "A small fellowship begins a perilous journey to destroy a ring that could return absolute power to darkness.",
      cast: [["Elijah Wood", "Frodo Baggins"], ["Ian McKellen", "Gandalf"], ["Viggo Mortensen", "Aragorn"], ["Sean Astin", "Samwise Gamgee"], ["Cate Blanchett", "Galadriel"]],
      directors: ["Peter Jackson"],
      writers: ["Fran Walsh", "Philippa Boyens", "Peter Jackson"],
      composers: ["Howard Shore"],
      cinematographers: ["Andrew Lesnie"],
    },
    {
      title: "Bridesmaids",
      year: 2011,
      genres: ["Comedy", "Romance"],
      budgetM: 32.5,
      revenueM: 307,
      rating: 6.8,
      overview: "A maid of honor's unraveling life collides with the escalating rituals and rivalries of her best friend's wedding.",
      cast: [["Kristen Wiig", "Annie Walker"], ["Maya Rudolph", "Lillian Donovan"], ["Rose Byrne", "Helen Harris"], ["Melissa McCarthy", "Megan Price"], ["Wendi McLendon-Covey", "Rita"]],
      directors: ["Paul Feig"],
      writers: ["Kristen Wiig", "Annie Mumolo"],
      composers: ["Michael Andrews"],
      cinematographers: ["Robert Yeoman"],
    },
    {
      title: "Dune",
      year: 2021,
      genres: ["Sci-Fi", "Adventure", "Drama"],
      budgetM: 165,
      revenueM: 402,
      rating: 7.8,
      overview: "A gifted heir travels to the universe's most dangerous planet as rival powers fight over its essential resource.",
      cast: [["Timothée Chalamet", "Paul Atreides"], ["Rebecca Ferguson", "Lady Jessica"], ["Oscar Isaac", "Duke Leto Atreides"], ["Josh Brolin", "Gurney Halleck"], ["Zendaya", "Chani"]],
      directors: ["Denis Villeneuve"],
      writers: ["Jon Spaihts", "Denis Villeneuve", "Eric Roth"],
      composers: ["Hans Zimmer"],
      cinematographers: ["Greig Fraser"],
    },
    {
      title: "The Social Network",
      year: 2010,
      genres: ["Drama", "History"],
      budgetM: 40,
      revenueM: 225,
      rating: 7.7,
      overview: "The creation of a social platform fractures friendships while transforming its founders into powerful rivals.",
      cast: [["Jesse Eisenberg", "Mark Zuckerberg"], ["Andrew Garfield", "Eduardo Saverin"], ["Justin Timberlake", "Sean Parker"], ["Armie Hammer", "Cameron and Tyler Winklevoss"], ["Rooney Mara", "Erica Albright"]],
      directors: ["David Fincher"],
      writers: ["Aaron Sorkin"],
      composers: ["Trent Reznor", "Atticus Ross"],
      cinematographers: ["Jeff Cronenweth"],
    },
    {
      title: "Everything Everywhere All at Once",
      year: 2022,
      genres: ["Action", "Comedy", "Sci-Fi", "Fantasy"],
      budgetM: 25,
      revenueM: 143,
      rating: 7.8,
      overview: "A laundromat owner is pulled into a multiverse crisis that makes her family relationships the center of existence.",
      cast: [["Michelle Yeoh", "Evelyn Wang"], ["Ke Huy Quan", "Waymond Wang"], ["Stephanie Hsu", "Joy Wang"], ["Jamie Lee Curtis", "Deirdre Beaubeirdre"], ["James Hong", "Gong Gong"]],
      directors: ["Daniel Kwan", "Daniel Scheinert"],
      writers: ["Daniel Kwan", "Daniel Scheinert"],
      composers: ["Son Lux"],
      cinematographers: ["Larkin Seiple"],
    },
    {
      title: "Alien",
      year: 1979,
      genres: ["Horror", "Sci-Fi", "Thriller"],
      budgetM: 11,
      revenueM: 185,
      rating: 8.2,
      overview: "The crew of a commercial spacecraft encounters a lethal organism after responding to a mysterious signal.",
      cast: [["Sigourney Weaver", "Ripley"], ["Tom Skerritt", "Dallas"], ["Veronica Cartwright", "Lambert"], ["Harry Dean Stanton", "Brett"], ["John Hurt", "Kane"]],
      directors: ["Ridley Scott"],
      writers: ["Dan O'Bannon"],
      composers: ["Jerry Goldsmith"],
      cinematographers: ["Derek Vanlint"],
    },
    {
      title: "The Good, the Bad and the Ugly",
      year: 1966,
      genres: ["Western", "Adventure"],
      budgetM: 1.2,
      revenueM: 39,
      rating: 8.5,
      overview: "Three gunslingers cross paths and betrayals while searching for buried gold during the American Civil War.",
      cast: [["Clint Eastwood", "Blondie"], ["Lee Van Cleef", "Angel Eyes"], ["Eli Wallach", "Tuco"], ["Aldo Giuffrè", "Union Captain"], ["Luigi Pistilli", "Father Pablo Ramirez"]],
      directors: ["Sergio Leone"],
      writers: ["Luciano Vincenzoni", "Sergio Leone", "Agenore Incrocci", "Furio Scarpelli"],
      composers: ["Ennio Morricone"],
      cinematographers: ["Tonino Delli Colli"],
    },
    {
      title: "Saving Private Ryan",
      year: 1998,
      genres: ["War", "History", "Drama"],
      budgetM: 70,
      revenueM: 482,
      rating: 8.2,
      overview: "A squad crosses occupied France to find a paratrooper whose brothers have been killed in combat.",
      cast: [["Tom Hanks", "Captain Miller"], ["Edward Burns", "Private Reiben"], ["Matt Damon", "Private Ryan"], ["Tom Sizemore", "Sergeant Horvath"], ["Barry Pepper", "Private Jackson"]],
      directors: ["Steven Spielberg"],
      writers: ["Robert Rodat"],
      composers: ["John Williams"],
      cinematographers: ["Janusz Kamiński"],
    },
    {
      title: "La La Land",
      year: 2016,
      genres: ["Music", "Romance", "Comedy", "Drama"],
      budgetM: 30,
      revenueM: 447,
      rating: 7.9,
      overview: "An actor and a jazz musician fall in love while pursuing demanding creative ambitions in Los Angeles.",
      cast: [["Ryan Gosling", "Sebastian Wilder"], ["Emma Stone", "Mia Dolan"], ["John Legend", "Keith"], ["Rosemarie DeWitt", "Laura Wilder"], ["J.K. Simmons", "Bill"]],
      directors: ["Damien Chazelle"],
      writers: ["Damien Chazelle"],
      composers: ["Justin Hurwitz"],
      cinematographers: ["Linus Sandgren"],
    },
    {
      title: "Goodfellas",
      year: 1990,
      genres: ["Crime", "Drama"],
      budgetM: 25,
      revenueM: 47,
      rating: 8.5,
      overview: "A young man rises through an organized-crime family and discovers the cost of the life he wanted.",
      cast: [["Ray Liotta", "Henry Hill"], ["Robert De Niro", "Jimmy Conway"], ["Joe Pesci", "Tommy DeVito"], ["Lorraine Bracco", "Karen Hill"], ["Paul Sorvino", "Paul Cicero"]],
      directors: ["Martin Scorsese"],
      writers: ["Nicholas Pileggi", "Martin Scorsese"],
      composers: ["Christopher Brooks"],
      cinematographers: ["Michael Ballhaus"],
    },
    {
      title: "13th",
      year: 2016,
      genres: ["Documentary", "History", "Crime"],
      budgetM: 3,
      revenueM: 18,
      rating: 7.9,
      overview: "Scholars, activists, and public figures examine the relationship between race, justice, and mass incarceration in America.",
      cast: [["Angela Davis", "Self"], ["Michelle Alexander", "Self"], ["Bryan Stevenson", "Self"], ["Jelani Cobb", "Self"], ["Henry Louis Gates Jr.", "Self"]],
      directors: ["Ava DuVernay"],
      writers: ["Spencer Averick", "Ava DuVernay"],
      composers: ["Jason Moran"],
      cinematographers: ["Hans Charles", "Kira Kelly"],
    },
  ];

  const clone = (value) =>
    typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));

  const hash = (value) => {
    let output = 2166136261;
    for (const character of String(value)) {
      output ^= character.charCodeAt(0);
      output = Math.imul(output, 16777619);
    }
    return output >>> 0;
  };

  const peopleByName = new Map();
  const peopleById = new Map();
  const movies = [];

  function personFor(name) {
    if (peopleByName.has(name)) return peopleByName.get(name);
    const person = {
      id: -38001 - peopleByName.size,
      name,
      profile_path: null,
      birthday: null,
      biography: "Included in GREENLIT's offline career catalog.",
      gender: 0,
      popularity: 42 + (hash(name) % 5200) / 100,
      castCredits: [],
      crewCredits: [],
      departments: [],
    };
    peopleByName.set(name, person);
    peopleById.set(person.id, person);
    return person;
  }

  function addDepartment(person, department) {
    if (!person.departments.includes(department)) person.departments.push(department);
  }

  function movieCredit(movie, extra) {
    return {
      id: movie.id,
      media_type: "movie",
      title: movie.title,
      release_date: movie.release_date,
      genre_ids: movie.genre_ids.slice(),
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      ...extra,
    };
  }

  MOVIE_SEEDS.forEach((seed, index) => {
    const movie = {
      id: -37001 - index,
      title: seed.title,
      release_date: `${seed.year}-07-01`,
      genre_ids: seed.genres.map((genre) => GENRE_IDS[genre]),
      genres: seed.genres.map((name) => ({ id: GENRE_IDS[name], name: name === "Sci-Fi" ? "Science Fiction" : name })),
      budget: Math.round(seed.budgetM * 1e6),
      revenue: Math.round(seed.revenueM * 1e6),
      vote_average: seed.rating,
      vote_count: 1200 + index * 317,
      popularity: 180 - index * 4.6,
      overview: seed.overview,
      poster_path: null,
      backdrop_path: null,
      adult: false,
      video: false,
      original_language: "en",
      media_type: "movie",
      credits: { cast: [], crew: [] },
    };

    for (const [name, character] of seed.cast) {
      const person = personFor(name);
      addDepartment(person, "Acting");
      const credit = {
        id: person.id,
        name: person.name,
        character,
        department: "Acting",
        known_for_department: "Acting",
        profile_path: null,
        gender: person.gender,
      };
      movie.credits.cast.push(credit);
      person.castCredits.push(movieCredit(movie, { character }));
    }

    const crewGroups = [
      [seed.directors, "Directing", "Director"],
      [seed.writers, "Writing", "Writer"],
      [seed.composers, "Sound", "Original Music Composer"],
      [seed.cinematographers, "Camera", "Director of Photography"],
    ];
    for (const [names, department, job] of crewGroups) {
      for (const name of names) {
        const person = personFor(name);
        addDepartment(person, department);
        movie.credits.crew.push({
          id: person.id,
          name: person.name,
          department,
          job,
          known_for_department: department,
          profile_path: null,
          gender: person.gender,
        });
        person.crewCredits.push(movieCredit(movie, { department, job }));
      }
    }
    movies.push(movie);
  });

  function movieResult(movie) {
    const { credits, genres, ...result } = movie;
    return clone(result);
  }

  function parseYear(value, fallback) {
    const year = Number.parseInt(String(value || "").slice(0, 4), 10);
    return Number.isFinite(year) ? year : fallback;
  }

  function sortedDiscover(params = {}) {
    const genreId = Number.parseInt(String(params.with_genres || "").split(/[|,]/)[0], 10);
    const exactYear = Number.parseInt(params.primary_release_year, 10);
    const fromYear = parseYear(params["primary_release_date.gte"], -Infinity);
    const toYear = parseYear(params["primary_release_date.lte"], Infinity);
    let preferred = movies.filter((movie) => {
      const year = parseYear(movie.release_date, 0);
      return (
        (!Number.isFinite(genreId) || movie.genre_ids.includes(genreId)) &&
        (!Number.isFinite(exactYear) || year === exactYear) &&
        year >= fromYear &&
        year <= toYear
      );
    });
    const preferredIds = new Set(preferred.map((movie) => movie.id));
    preferred = [...preferred, ...movies.filter((movie) => !preferredIds.has(movie.id))];
    const sortBy = params.sort_by || "popularity.desc";
    preferred.sort((first, second) => {
      if (sortBy.startsWith("primary_release_date")) {
        return parseYear(first.release_date, 0) - parseYear(second.release_date, 0);
      }
      if (sortBy.startsWith("vote_average")) return first.vote_average - second.vote_average;
      if (sortBy.startsWith("vote_count")) return first.vote_count - second.vote_count;
      if (sortBy.startsWith("revenue")) return first.revenue - second.revenue;
      return first.popularity - second.popularity;
    });
    if (sortBy.endsWith(".desc")) preferred.reverse();
    return preferred;
  }

  function searchMovies(query = "", params = {}) {
    const needle = String(query || "").trim().toLowerCase();
    const rows = needle
      ? movies.filter((movie) => movie.title.toLowerCase().includes(needle))
      : sortedDiscover(params);
    return rows.map(movieResult);
  }

  function searchPeople(query = "") {
    const needle = String(query || "").trim().toLowerCase();
    return [...peopleById.values()]
      .filter((person) => !needle || person.name.toLowerCase().includes(needle))
      .sort((first, second) => second.popularity - first.popularity)
      .map((person) => ({
        id: person.id,
        name: person.name,
        profile_path: null,
        popularity: person.popularity,
        known_for_department: person.departments[0] || "Acting",
        known_for: [...person.castCredits, ...person.crewCredits].slice(0, 3),
      }));
  }

  function movieDetails(id) {
    const movie = movies.find((candidate) => candidate.id === Number(id));
    return movie ? clone(movie) : null;
  }

  function personDetails(id) {
    const person = peopleById.get(Number(id));
    if (!person) return null;
    return clone({
      id: person.id,
      name: person.name,
      profile_path: null,
      birthday: person.birthday,
      biography: person.biography,
      gender: person.gender,
      popularity: person.popularity,
      known_for_department: person.departments[0] || "Acting",
      combined_credits: {
        cast: person.castCredits,
        crew: person.crewCredits,
      },
      movie_credits: {
        cast: person.castCredits,
        crew: person.crewCredits,
      },
    });
  }

  function route(path, params = {}) {
    if (path === "/discover/movie") {
      return { page: 1, results: sortedDiscover(params).map(movieResult), total_pages: 1, total_results: movies.length };
    }
    if (path === "/search/movie" || path === "/search/multi") {
      const results = searchMovies(params.query, params);
      return { page: 1, results, total_pages: 1, total_results: results.length };
    }
    if (path === "/search/person") {
      const results = searchPeople(params.query);
      return { page: 1, results, total_pages: 1, total_results: results.length };
    }
    const movieMatch = path.match(/^\/movie\/(-?\d+)$/);
    if (movieMatch) return movieDetails(movieMatch[1]);
    const personMatch = path.match(/^\/person\/(-?\d+)$/);
    if (personMatch) return personDetails(personMatch[1]);
    if (path === "/configuration") return { images: { secure_base_url: "", poster_sizes: [], backdrop_sizes: [], profile_sizes: [] } };
    return null;
  }

  function validate() {
    const errors = [];
    const movieIds = new Set();
    const personIds = new Set();
    for (const movie of movies) {
      if (movieIds.has(movie.id)) errors.push(`Duplicate movie id ${movie.id}`);
      movieIds.add(movie.id);
      if (movie.credits.cast.length < 5) errors.push(`${movie.title} has fewer than five cast records`);
      const jobs = new Set(movie.credits.crew.map((credit) => credit.job));
      for (const job of ["Director", "Writer", "Original Music Composer", "Director of Photography"]) {
        if (!jobs.has(job)) errors.push(`${movie.title} is missing ${job}`);
      }
    }
    for (const person of peopleById.values()) {
      if (personIds.has(person.id)) errors.push(`Duplicate person id ${person.id}`);
      personIds.add(person.id);
    }
    for (const genre of Object.keys(GENRE_IDS)) {
      if (!movies.some((movie) => movie.genre_ids.includes(GENRE_IDS[genre]))) errors.push(`No fallback movie covers ${genre}`);
    }
    if (movies.length < 12) errors.push("The fallback catalog needs at least twelve movies");
    const composers = [...peopleById.values()].filter((person) => person.departments.includes("Sound"));
    const cinematographers = [...peopleById.values()].filter((person) => person.departments.includes("Camera"));
    if (composers.length < 3 || cinematographers.length < 3) errors.push("The fallback catalog cannot build three creative duos");
    return { valid: errors.length === 0, errors, movieCount: movies.length, personCount: peopleById.size };
  }

  return Object.freeze({
    source: "bundled",
    genreIds: Object.freeze({ ...GENRE_IDS }),
    movies: Object.freeze(movies.map(movieResult)),
    searchMovies,
    searchPeople,
    movieDetails,
    personDetails,
    route,
    validate,
  });
});
