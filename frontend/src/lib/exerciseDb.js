// Ćwiczenia dodatkowe — uzupełniają po sześć ćwiczeń na mięsień z muscles.js.
//
// Wybór pochodzi z free-exercise-db (https://github.com/yuhonas/free-exercise-db),
// zbioru w domenie publicznej (Unlicense). `en` to nazwa ćwiczenia w tym
// zbiorze, żeby dało się do niego wrócić. Polskie nazwy, serie i wskazówki są
// nasze, a mięśnie przypisane ręcznie do identyfikatorów z MUSCLES: zbiór ma
// 17 ogólnych grup („shoulders", „middle back"), a sylwetka 24 mięśnie, więc
// automatyczne mapowanie myliłoby np. tylny akton z przednim.
//
// Pominięte ćwiczenia, które w muscles.js już są pod polską nazwą (Cable
// Crossover = „Zbliżanie ramion na wyciągu", Face Pull, Lying Leg Curls…),
// oraz warianty różniące się tylko sprzętem albo nazwą.
//
// p — mięśnie główne (ćwiczenie pojawia się w panelu każdego z nich),
// s — wspomagające (używa ich podpowiedź mięśni w edytorze planów).
// Ikony jak w muscles.js: ⚙️ maszyna lub wyciąg, 🏋️ wolny ciężar, 🤸 ciężar ciała.
export const EXTRA_EXERCISES = [
  // ── Klatka ──
  { en: "Barbell Incline Bench Press - Medium Grip", name: "Wyciskanie sztangi na ławce skośnej", sets: "4 × 6–10", icon: "🏋️",
    tip: "Ławka na 30–45°. Opuszczaj gryf do górnej części klatki, łopatki ściągnięte.", p: ["pectoralis"], s: ["deltoid_front", "triceps"] },
  { en: "Dumbbell Bench Press", name: "Wyciskanie hantli na ławce płaskiej", sets: "4 × 8–12", icon: "🏋️",
    tip: "Hantle schodzą niżej niż gryf — korzystaj z zakresu, ale bez bólu w barku.", p: ["pectoralis"], s: ["deltoid_front", "triceps"] },
  { en: "Incline Dumbbell Press", name: "Wyciskanie hantli na ławce skośnej", sets: "3 × 8–12", icon: "🏋️",
    tip: "Łokcie ok. 45° od tułowia, na górze nie stukaj hantlami o siebie.", p: ["pectoralis"], s: ["deltoid_front", "triceps"] },
  { en: "Decline Barbell Bench Press", name: "Wyciskanie sztangi głową w dół", sets: "3 × 8–10", icon: "🏋️",
    tip: "Zablokuj nogi pod wałkami, gryf prowadź do dolnej części klatki.", p: ["pectoralis"], s: ["triceps", "deltoid_front"] },
  { en: "Low Cable Crossover", name: "Rozpiętki z dolnych wyciągów", sets: "3 × 12–15", icon: "⚙️",
    tip: "Prowadź dłonie od bioder w górę do wysokości brody — akcent na górną część klatki.", p: ["pectoralis"], s: ["deltoid_front"] },
  { en: "Incline Dumbbell Flyes", name: "Rozpiętki z hantlami na ławce skośnej", sets: "3 × 10–12", icon: "🏋️",
    tip: "Łokcie lekko ugięte i w tym samym kącie przez cały ruch.", p: ["pectoralis"], s: ["deltoid_front"] },
  { en: "Leverage Incline Chest Press", name: "Wyciskanie skośne na maszynie", sets: "3 × 10–12", icon: "⚙️",
    tip: "Ustaw siedzisko tak, żeby uchwyty wypadały na wysokości górnej klatki.", p: ["pectoralis"], s: ["deltoid_front", "triceps"] },
  { en: "Push-Ups With Feet Elevated", name: "Pompki z nogami na podwyższeniu", sets: "3 × max", icon: "🤸",
    tip: "Im wyżej stopy, tym więcej pracy górnej klatki i barków. Tułów w jednej linii.", p: ["pectoralis"], s: ["deltoid_front", "triceps", "serratus"] },

  // ── Barki ──
  { en: "Seated Dumbbell Press", name: "Wyciskanie hantli siedząc", sets: "4 × 8–12", icon: "🏋️",
    tip: "Oparcie pionowe albo lekko odchylone, hantle schodzą do wysokości uszu.", p: ["deltoid_front"], s: ["triceps", "trapezius"] },
  { en: "Front Dumbbell Raise", name: "Unoszenie hantli w przód", sets: "3 × 12", icon: "🏋️",
    tip: "Naprzemiennie do wysokości oczu, bez odchylania tułowia.", p: ["deltoid_front"], s: ["pectoralis"] },
  { en: "Upright Barbell Row", name: "Podciąganie sztangi wzdłuż tułowia", sets: "3 × 10–12", icon: "🏋️",
    tip: "Chwyt na szerokość barków, łokcie nie wyżej niż linia barków.", p: ["deltoid_front", "trapezius"], s: ["biceps"] },
  { en: "Standing Low-Pulley Deltoid Raise", name: "Odwodzenie ramienia z dolnego wyciągu", sets: "3 × 12–15", icon: "⚙️",
    tip: "Linka biegnie przed ciałem — napięcie zostaje także na dole ruchu.", p: ["deltoid_front"], s: ["trapezius"] },
  { en: "Dumbbell Scaption", name: "Unoszenie hantli w płaszczyźnie łopatki", sets: "3 × 12", icon: "🏋️",
    tip: "Ramiona ok. 30° przed linią boczną, kciuki w górę — ruch przyjazny dla barku.", p: ["deltoid_front"], s: ["trapezius", "serratus"] },
  { en: "Barbell Rear Delt Row", name: "Wiosłowanie sztangą na tylne aktony", sets: "3 × 10–12", icon: "🏋️",
    tip: "Łokcie szeroko, gryf do dolnej części klatki — ciągną barki, nie biceps.", p: ["deltoid_back"], s: ["trapezius", "latissimus", "biceps"] },
  { en: "Band Pull Apart", name: "Rozciąganie taśmy przed sobą", sets: "3 × 15–20", icon: "🤸",
    tip: "Ramiona proste na wysokości barków, na końcu ruchu ściągnij łopatki.", p: ["deltoid_back"], s: ["trapezius", "infraspinatus"] },
  { en: "Reverse Flyes With External Rotation", name: "Odwrotne rozpiętki z rotacją zewnętrzną", sets: "3 × 12", icon: "🏋️",
    tip: "Na górze obróć dłonie kciukami do tyłu — dochodzi praca stożka rotatorów.", p: ["deltoid_back"], s: ["infraspinatus", "trapezius"] },
  { en: "Cuban Press", name: "Wyciskanie kubańskie", sets: "3 × 10", icon: "🏋️",
    tip: "Unieś łokcie do linii barków, obróć przedramiona w górę i wyciśnij. Tylko lekki ciężar.", p: ["infraspinatus", "deltoid_front"], s: ["trapezius"] },

  // ── Ramiona ──
  { en: "Incline Dumbbell Curl", name: "Uginanie hantli na ławce skośnej", sets: "3 × 10–12", icon: "🏋️",
    tip: "Ramiona zwisają za tułowiem, więc biceps pracuje w rozciągnięciu. Łokcie zostają z tyłu.", p: ["biceps"], s: ["forearm_front"] },
  { en: "Concentration Curls", name: "Uginanie w koncentracji", sets: "3 × 10–12", icon: "🏋️",
    tip: "Łokieć oparty o wewnętrzną stronę uda; unoś powoli i zatrzymaj na górze.", p: ["biceps"], s: ["forearm_front"] },
  { en: "EZ-Bar Curl", name: "Uginanie sztangą łamaną", sets: "3 × 8–12", icon: "🏋️",
    tip: "Łamany gryf odciąża nadgarstki. Łokcie przy tułowiu, bez bujania.", p: ["biceps"], s: ["forearm_front"] },
  { en: "Spider Curl", name: "Uginanie leżąc przodem na ławce skośnej", sets: "3 × 10–12", icon: "🏋️",
    tip: "Klatka na oparciu, ramiona pionowo w dół — bujanie tułowiem nic tu nie da.", p: ["biceps"], s: ["forearm_front"] },
  { en: "Zottman Curl", name: "Uginanie Zottmana", sets: "3 × 10", icon: "🏋️",
    tip: "W górę podchwytem, na górze obróć dłonie i opuszczaj nachwytem, powoli.", p: ["biceps"], s: ["forearm_front", "forearm_back"] },
  { en: "EZ-Bar Skullcrusher", name: "Wyciskanie francuskie leżąc", sets: "3 × 8–12", icon: "🏋️",
    tip: "Łokcie wskazują sufit i się nie rozjeżdżają; gryf schodzi za czubek głowy.", p: ["triceps"], s: ["forearm_back"] },
  { en: "Standing Dumbbell Triceps Extension", name: "Wyprost hantla zza głowy stojąc", sets: "3 × 10–12", icon: "🏋️",
    tip: "Hantel oburącz, łokcie blisko głowy; napięty brzuch nie pozwala wyginać lędźwi.", p: ["triceps"], s: [] },
  { en: "Bench Dips", name: "Pompki w podporze tyłem na ławce", sets: "3 × 12–15", icon: "🤸",
    tip: "Barki nisko, z dala od uszu; schodź do kąta 90° w łokciach.", p: ["triceps"], s: ["pectoralis", "deltoid_front"] },
  { en: "Reverse Grip Triceps Pushdown", name: "Prostowanie ramion na wyciągu podchwytem", sets: "3 × 12", icon: "⚙️",
    tip: "Podchwyt akcentuje przyśrodkową głowę tricepsa; łokcie przyklejone do boków.", p: ["triceps"], s: ["forearm_front"] },
  { en: "Finger Curls", name: "Zwijanie sztangi palcami", sets: "3 × 15", icon: "🏋️",
    tip: "Pozwól gryfowi stoczyć się do czubków palców i zwiń go z powrotem do dłoni.", p: ["forearm_front"], s: [] },
  { en: "Dumbbell Lying Pronation", name: "Pronacja z hantlem", sets: "3 × 12", icon: "🏋️",
    tip: "Przedramię na ławce, hantel trzymany za jeden koniec; obracaj dłonią w dół powoli.", p: ["forearm_front"], s: [] },
  { en: "Dumbbell Lying Supination", name: "Supinacja z hantlem", sets: "3 × 12", icon: "🏋️",
    tip: "Jak pronacja, tylko obrót dłonią do góry — pracują mięśnie z tyłu przedramienia.", p: ["forearm_back"], s: ["biceps"] },

  // ── Plecy ──
  { en: "Chin-Up", name: "Podciąganie podchwytem", sets: "4 × max", icon: "🤸",
    tip: "Chwyt na szerokość barków; więcej pracy bicepsa niż przy nachwycie.", p: ["latissimus"], s: ["biceps", "trapezius", "forearm_front"] },
  { en: "Seated Cable Rows", name: "Wiosłowanie siedząc na wyciągu", sets: "4 × 10–12", icon: "⚙️",
    tip: "Klatka do przodu, uchwyt do pępka i ściągnięte łopatki; tułów bez bujania.", p: ["latissimus", "trapezius"], s: ["biceps", "deltoid_back"] },
  { en: "V-Bar Pulldown", name: "Ściąganie uchwytu V do klatki", sets: "3 × 10–12", icon: "⚙️",
    tip: "Odchyl się lekko i prowadź uchwyt do mostka; łokcie w dół i do tyłu.", p: ["latissimus"], s: ["biceps", "trapezius"] },
  { en: "Inverted Row", name: "Wiosłowanie australijskie", sets: "3 × max", icon: "🤸",
    tip: "Ciało sztywne jak deska, klatka do drążka. Im bardziej poziomo, tym trudniej.", p: ["trapezius", "latissimus"], s: ["biceps", "deltoid_back"] },
  { en: "T-Bar Row with Handle", name: "Wiosłowanie T-bar", sets: "3 × 8–10", icon: "🏋️",
    tip: "Plecy proste, klatka nad stopami; ciągnij uchwyt do brzucha.", p: ["latissimus", "trapezius"], s: ["biceps", "erector_spinae", "deltoid_back"] },
  { en: "Cable Shrugs", name: "Wznosy barków na wyciągu", sets: "3 × 12–15", icon: "⚙️",
    tip: "Barki prosto do uszu, bez krążenia; zatrzymaj sekundę na górze.", p: ["trapezius"], s: ["forearm_front"] },
  { en: "Scapular Pull-Up", name: "Podciąganie łopatkowe", sets: "3 × 10–12", icon: "🤸",
    tip: "Ramiona proste — ruch to samo ściągnięcie łopatek w dół, ciało unosi się o kilka cm.", p: ["trapezius"], s: ["latissimus"] },
  { en: "Barbell Shrug Behind The Back", name: "Wznosy barków ze sztangą za plecami", sets: "3 × 10–12", icon: "🏋️",
    tip: "Gryf za pośladkami przesuwa pracę na środkową część czworobocznego.", p: ["trapezius"], s: ["forearm_front"] },
  { en: "Rack Pulls", name: "Martwy ciąg z podestów", sets: "3 × 5", icon: "🏋️",
    tip: "Gryf startuje na wysokości kolan — krótszy zakres, ciężar większy niż w martwym ciągu.", p: ["erector_spinae", "trapezius"], s: ["gluteus", "hamstrings", "latissimus", "forearm_front"] },
  { en: "Weighted Ball Hyperextension", name: "Wyprosty tułowia na piłce", sets: "3 × 12–15", icon: "🤸",
    tip: "Biodra na piłce, stopy zaparte o ścianę; unoś tułów do linii prostej, nie wyżej.", p: ["erector_spinae"], s: ["gluteus", "hamstrings"] },

  // ── Brzuch ──
  { en: "Barbell Ab Rollout", name: "Rollout ze sztangą", sets: "3 × 8–10", icon: "🏋️",
    tip: "Tocz gryf tylko tak daleko, jak utrzymasz lędźwie bez wygięcia.", p: ["rectus_abdominis"], s: ["obliques", "latissimus"] },
  { en: "Dead Bug", name: "Martwy robak", sets: "3 × 10 na stronę", icon: "🤸",
    tip: "Lędźwie przyklejone do podłogi; przeciwną rękę i nogę opuszczaj powoli.", p: ["rectus_abdominis"], s: ["obliques"] },
  { en: "Reverse Crunch", name: "Spięcia odwrotne", sets: "3 × 12–15", icon: "🤸",
    tip: "Podwijaj miednicę w stronę klatki, zamiast tylko machać nogami.", p: ["rectus_abdominis"], s: ["obliques"] },
  { en: "Jackknife Sit-Up", name: "Scyzoryki", sets: "3 × 10–12", icon: "🤸",
    tip: "Dłonie i stopy spotykają się nad biodrami; opuszczaj bez opadania.", p: ["rectus_abdominis"], s: ["obliques"] },
  { en: "Exercise Ball Crunch", name: "Spięcia na piłce", sets: "3 × 15", icon: "🤸",
    tip: "Piłka pod lędźwiami pozwala zacząć z rozciągnięcia brzucha.", p: ["rectus_abdominis"], s: [] },
  { en: "Pallof Press", name: "Wypychanie Pallofa na wyciągu", sets: "3 × 10 na stronę", icon: "⚙️",
    tip: "Stań bokiem do wyciągu i wypychaj uchwyt przed klatkę, nie dając się obrócić.", p: ["obliques"], s: ["rectus_abdominis"] },
  { en: "Oblique Crunches - On The Floor", name: "Spięcia skośne leżąc", sets: "3 × 15 na stronę", icon: "🤸",
    tip: "Łokieć prowadź do przeciwnego kolana, odrywając łopatkę od podłogi.", p: ["obliques"], s: ["rectus_abdominis"] },
  { en: "Kettlebell Windmill", name: "Wiatrak z kettlem", sets: "3 × 6 na stronę", icon: "🏋️",
    tip: "Kettel nad głową, wzrok na nim; schodź biodrem w bok, kolana miękkie.", p: ["obliques"], s: ["gluteus", "hamstrings", "deltoid_front"] },
  { en: "Landmine 180's", name: "Obroty sztangą w landmine", sets: "3 × 8 na stronę", icon: "🏋️",
    tip: "Ramiona proste, obracaj tułów i stopy razem z gryfem od biodra do biodra.", p: ["obliques"], s: ["rectus_abdominis", "deltoid_front", "gluteus"] },

  // ── Nogi ──
  { en: "Front Squat (Clean Grip)", name: "Przysiad przedni ze sztangą", sets: "4 × 5–8", icon: "🏋️",
    tip: "Łokcie wysoko, tułów pionowo — więcej pracy czworogłowych niż w przysiadzie tylnym.", p: ["quadriceps"], s: ["gluteus", "rectus_abdominis", "erector_spinae"] },
  { en: "Goblet Squat", name: "Przysiad z kettlem przy klatce", sets: "3 × 10–12", icon: "🏋️",
    tip: "Kettel przy mostku pomaga utrzymać tułów prosto; łokcie schodzą między kolana.", p: ["quadriceps", "gluteus"], s: ["adductors", "rectus_abdominis"] },
  { en: "Smith Machine Squat", name: "Przysiad w maszynie Smitha", sets: "3 × 8–12", icon: "⚙️",
    tip: "Stopy nieco przed gryfem; prowadnica stabilizuje, więc pilnuj tempa zejścia.", p: ["quadriceps", "gluteus"], s: ["hamstrings"] },
  { en: "Dumbbell Rear Lunge", name: "Wykroki w tył z hantlami", sets: "3 × 10 na nogę", icon: "🏋️",
    tip: "Krok w tył odciąża kolano przedniej nogi; tułów lekko pochylony.", p: ["quadriceps", "gluteus"], s: ["hamstrings", "adductors"] },
  { en: "Freehand Jump Squat", name: "Przysiad z wyskokiem", sets: "3 × 10", icon: "🤸",
    tip: "Ląduj miękko na całych stopach i od razu przechodź w kolejny przysiad.", p: ["quadriceps", "gluteus"], s: ["gastrocnemius", "hamstrings"] },
  { en: "Stiff-Legged Dumbbell Deadlift", name: "Martwy ciąg na prostych nogach z hantlami", sets: "3 × 10", icon: "🏋️",
    tip: "Hantle blisko nóg, biodra do tyłu; zatrzymaj się, zanim plecy zaczną się zaokrąglać.", p: ["hamstrings"], s: ["gluteus", "erector_spinae"] },
  { en: "Standing Leg Curl", name: "Uginanie nogi stojąc na maszynie", sets: "3 × 12 na nogę", icon: "⚙️",
    tip: "Biodro przyklejone do podparcia, uginaj bez unoszenia miednicy.", p: ["hamstrings"], s: ["gastrocnemius"] },
  { en: "Ball Leg Curl", name: "Uginanie nóg na piłce", sets: "3 × 12", icon: "🤸",
    tip: "Biodra w górze przez cały ruch; przyciągaj piłkę piętami do pośladków.", p: ["hamstrings"], s: ["gluteus", "gastrocnemius"] },
  { en: "Kettlebell One-Legged Deadlift", name: "Martwy ciąg na jednej nodze z kettlem", sets: "3 × 8 na nogę", icon: "🏋️",
    tip: "Tylna noga w jednej linii z tułowiem, biodra równolegle do podłogi.", p: ["hamstrings", "gluteus"], s: ["erector_spinae"] },
  { en: "One-Arm Kettlebell Swings", name: "Swing z kettlem jednorącz", sets: "3 × 15", icon: "🏋️",
    tip: "Ruch z bioder, nie z ramion: wyprost bioder wyrzuca kettel do wysokości klatki.", p: ["hamstrings", "gluteus"], s: ["erector_spinae", "deltoid_front", "forearm_front"] },
  { en: "Sumo Deadlift", name: "Martwy ciąg sumo", sets: "4 × 5", icon: "🏋️",
    tip: "Szeroki rozstaw, kolana nad stopami; tułów bardziej pionowo niż w klasycznym.", p: ["gluteus", "adductors", "quadriceps"], s: ["hamstrings", "erector_spinae", "trapezius", "forearm_front"] },
  { en: "Barbell Glute Bridge", name: "Most biodrowy ze sztangą", sets: "3 × 10–12", icon: "🏋️",
    tip: "Barki na podłodze, nie na ławce — krótszy zakres niż hip thrust, łatwiej zacząć.", p: ["gluteus"], s: ["hamstrings"] },
  { en: "Single Leg Glute Bridge", name: "Most biodrowy na jednej nodze", sets: "3 × 12 na nogę", icon: "🤸",
    tip: "Miednica nie może opadać na stronę uniesionej nogi.", p: ["gluteus"], s: ["hamstrings", "obliques"] },
  { en: "Pull Through", name: "Przeciąganie linki między nogami", sets: "3 × 12–15", icon: "⚙️",
    tip: "Tyłem do dolnego wyciągu: cofnij biodra i wyprostuj je mocnym spięciem pośladków.", p: ["gluteus", "hamstrings"], s: ["erector_spinae"] },
  { en: "Reverse Hyperextension", name: "Odwrotne wyprosty bioder", sets: "3 × 12–15", icon: "⚙️",
    tip: "Tułów leży na ławce, unosisz proste nogi do linii ciała — bez wymachu.", p: ["gluteus", "hamstrings"], s: ["erector_spinae"] },
  { en: "Thigh Abductor", name: "Odwodzenie ud na maszynie", sets: "3 × 15", icon: "⚙️",
    tip: "Siedź prosto albo lekko pochylony w przód; zatrzymaj sekundę w rozwarciu.", p: ["gluteus"], s: ["sartorius"] },
  { en: "Monster Walk", name: "Chód bokiem z taśmą", sets: "3 × 12 kroków", icon: "🤸",
    tip: "Taśma nad kolanami lub kostkami, lekki przysiad; kroki w bok bez zbliżania stóp.", p: ["gluteus"], s: ["quadriceps"] },
  { en: "Seated Calf Raise", name: "Wspięcia na palce siedząc", sets: "4 × 12–15", icon: "⚙️",
    tip: "Ugięte kolano wyłącza część brzuchatego łydki — pracuje głównie płaszczkowaty pod nim.", p: ["gastrocnemius"], s: [] },
];

// Ćwiczenia do panelu mięśnia: sześć z muscles.js, potem dodatkowe, w których
// ten mięsień jest główny.
export function exercisesFor(muscle, id) {
  return [...muscle.exercises, ...EXTRA_EXERCISES.filter(e => e.p.includes(id))];
}

// Dokładna nazwa (polska albo angielska) → mięśnie. Podpowiedź w edytorze
// planów sprawdza ją przed regułami ze słów kluczowych.
const BY_NAME = new Map(EXTRA_EXERCISES.flatMap(e => {
  const m = { p: e.p, s: e.s };
  return [[e.name.toLowerCase(), m], [e.en.toLowerCase(), m]];
}));
export const exerciseMuscles = name => BY_NAME.get(String(name || "").trim().toLowerCase()) || null;
