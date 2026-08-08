// ============================================================
// Данные квартиры, оцифрованные с поэтажного плана (фото 1.jpeg)
// Координаты в метрах. x: запад(1.0) -> восток(23.8), z: север(отрицат.) -> юг(6.6)
// Уровень main: пол y=0, потолок 2.8. Уровень upper: пол y=3.1, мансарда.
// Масштаб откалиброван по мебели (кровать 1.8м, столешница 0.6м, ступень ~0.2м)
// ============================================================

const APT = {
  mainFloorY: 0,
  mainCeilH: 2.8,
  upperFloorY: 3.1,
  terraceY: 2.62,
  // мансардный потолок (локальные высоты от пола 2 этажа)
  attic: { ridgeZ: 0.8, ridgeH: 3.0, northZ: -2.0, northH: 1.8, southZ: 6.6, southH: 1.4 },

  walls: [
    // ================= ГЛАВНЫЙ УРОВЕНЬ =================
    // Южный фасад с окнами
    { lvl: 'main', x1: 1.0, z1: 6.6, x2: 23.8, z2: 6.6, h: 2.8, ext: true, openings: [
      { at: 1.4, w: 1.1, type: 'win' }, { at: 3.2, w: 1.1, type: 'win' },      // спальня 1
      { at: 7.9, w: 1.0, type: 'win' }, { at: 9.3, w: 1.0, type: 'win' },      // спальня 2
      { at: 11.1, w: 1.2, type: 'win' }, { at: 13.0, w: 1.2, type: 'win' },    // гостиная
      { at: 14.9, w: 1.2, type: 'win' }, { at: 16.8, w: 1.2, type: 'win' },    // столовая/кухня
      { at: 18.6, w: 1.0, type: 'win' },
      { at: 20.9, w: 1.0, type: 'win' }                                        // прихожая
    ]},
    // Восточная стена (вход)
    { lvl: 'main', x1: 23.8, z1: 6.6, x2: 23.8, z2: 0.9, h: 2.8, ext: true, openings: [
      { at: 1.2, w: 1.05, type: 'door', entrance: true }
    ]},
    // Северные наружные стены
    { lvl: 'main', x1: 20.6, z1: 0.9, x2: 23.8, z2: 0.9, h: 2.8, ext: true },
    { lvl: 'main', x1: 20.6, z1: 0.0, x2: 20.6, z2: 0.9, h: 2.8, ext: true },
    // Северная стена кухни: слева глухая (за ней лестница), проём слайдера, окно
    { lvl: 'main', x1: 11.4, z1: 0.0, x2: 15.9, z2: 0.0, h: 2.8, ext: false },
    { lvl: 'main', x1: 15.9, z1: 0.0, x2: 20.6, z2: 0.0, h: 2.8, ext: true, openings: [
      { at: 0.0, w: 1.0, type: 'pass', slider: true },   // раздвижная дверь на лестницу
      { at: 1.2, w: 0.9, type: 'win' }                   // окно над мойкой
    ]},
    { lvl: 'main', x1: 1.0, z1: 0.0, x2: 11.4, z2: 0.0, h: 2.8, ext: true },
    // Западная стена
    { lvl: 'main', x1: 1.0, z1: 0.0, x2: 1.0, z2: 6.6, h: 2.8, ext: true },

    // Лестничный блок (север за кухней)
    { lvl: 'main', x1: 12.2, z1: -2.0, x2: 16.9, z2: -2.0, h: 6.2, ext: true },
    { lvl: 'main', x1: 12.2, z1: -2.0, x2: 12.2, z2: -0.6, h: 3.1, ext: true },
    { lvl: 'main', x1: 16.9, z1: -2.0, x2: 16.9, z2: 0.0, h: 6.2, ext: true },
    { lvl: 'main', x1: 12.2, z1: -0.6, x2: 15.9, z2: -0.6, h: 2.8, ext: false }, // за кухней
    { lvl: 'main', x1: 15.9, z1: -0.6, x2: 15.9, z2: 0.0, h: 2.8, ext: false },

    // Санузел у входа
    { lvl: 'main', x1: 20.6, z1: 3.4, x2: 23.0, z2: 3.4, h: 2.8, openings: [
      { at: 0.6, w: 0.85, type: 'door' }
    ]},
    { lvl: 'main', x1: 23.0, z1: 0.9, x2: 23.0, z2: 3.4, h: 2.8 },
    { lvl: 'main', x1: 20.6, z1: 0.9, x2: 20.6, z2: 3.4, h: 2.8 },

    // Перегородка гостиная / западная часть (ТВ-стена со стороны гостиной)
    { lvl: 'main', x1: 11.4, z1: 0.0, x2: 11.4, z2: 6.6, h: 2.8, tv: true, openings: [
      { at: 2.7, w: 0.95, type: 'door' }    // в коридор
    ]},
    // Коридор: северная стена (дверь в ванную 2)
    { lvl: 'main', x1: 7.4, z1: 2.6, x2: 11.4, z2: 2.6, h: 2.8, openings: [
      { at: 3.0, w: 0.85, type: 'door' }
    ]},
    // Коридор: южная стена (дверь в спальню 2)
    { lvl: 'main', x1: 7.4, z1: 3.5, x2: 11.4, z2: 3.5, h: 2.8, openings: [
      { at: 1.3, w: 0.95, type: 'door' }
    ]},
    // Спальня 1: восточная стена (дверь из коридора)
    { lvl: 'main', x1: 7.4, z1: 2.6, x2: 7.4, z2: 6.6, h: 2.8, openings: [
      { at: 0.2, w: 0.95, type: 'door' }
    ]},
    // Спальня 1: северная стена (двери в ванную 1 и прачечную)
    { lvl: 'main', x1: 1.0, z1: 2.6, x2: 7.4, z2: 2.6, h: 2.8, openings: [
      { at: 2.6, w: 0.85, type: 'door' },   // прачечная
      { at: 5.3, w: 0.85, type: 'door' }    // ванная 1
    ]},
    // Ванная 1 / прачечная перегородки
    { lvl: 'main', x1: 4.7, z1: 0.0, x2: 4.7, z2: 2.6, h: 2.8 },
    { lvl: 'main', x1: 2.8, z1: 0.0, x2: 2.8, z2: 2.6, h: 2.8 },
    // Ванная 2: западная стена
    { lvl: 'main', x1: 8.6, z1: 0.0, x2: 8.6, z2: 2.6, h: 2.8 },

    // ================= ВЕРХНИЙ УРОВЕНЬ (мансарда) =================
    // Западный фронтон (выход на террасу)
    { lvl: 'upper', x1: 4.2, z1: -0.6, x2: 4.2, z2: 6.6, h: 3.0, ext: true, gable: 'w', openings: [
      { at: 3.4, w: 0.95, type: 'door', terrace: true },
      { at: 1.8, w: 0.9, type: 'win' },
      { at: 4.9, w: 0.9, type: 'win' }
    ]},
    // Восточный фронтон
    { lvl: 'upper', x1: 15.6, z1: -0.6, x2: 15.6, z2: 6.6, h: 3.0, ext: true, gable: 'e', openings: [
      { at: 4.4, w: 1.0, type: 'win' }
    ]},
    // Южная стена-колено
    { lvl: 'upper', x1: 4.2, z1: 6.6, x2: 15.6, z2: 6.6, h: 1.4, ext: true },
    // Северные стены
    { lvl: 'upper', x1: 4.2, z1: -2.0, x2: 12.2, z2: -2.0, h: 1.8, ext: true },
    { lvl: 'upper', x1: 6.8, z1: -0.6, x2: 12.2, z2: -0.6, h: 2.6, ext: false }, // глухая полоса
    { lvl: 'upper', x1: 4.2, z1: -2.0, x2: 4.2, z2: -0.6, h: 1.8, ext: true },
    // Ванная наверху
    { lvl: 'upper', x1: 6.8, z1: -2.0, x2: 6.8, z2: 0.5, h: 2.6 },
    { lvl: 'upper', x1: 4.2, z1: 0.5, x2: 6.8, z2: 0.5, h: 2.6, openings: [
      { at: 1.9, w: 0.85, type: 'door' }
    ]},
    // Перегородка спальни (раздвижная дверь из холла)
    { lvl: 'upper', x1: 10.4, z1: 2.1, x2: 15.6, z2: 2.1, h: 2.6, openings: [
      { at: 1.3, w: 1.1, type: 'pass', slider: true }
    ]},
    // Свободностоящая ТВ-перегородка (проход у окон)
    { lvl: 'upper', x1: 10.4, z1: 2.1, x2: 10.4, z2: 6.0, h: 2.4, tv: 'upper' },
    // Ограждение лестничного проёма (юг), широкий проход на лестницу у запада
    { lvl: 'upper', x1: 13.3, z1: -0.6, x2: 15.6, z2: -0.6, h: 1.0, rail: true },
    { lvl: 'upper', x1: 12.2, z1: -2.0, x2: 15.6, z2: -2.0, h: 1.0, rail: true },
    // Западная стена лестничной шахты на уровне мансарды — закрывает технический карман
    { lvl: 'upper', x1: 12.2, z1: -2.0, x2: 12.2, z2: -0.6, h: 2.4 }
  ],

  // Полы: прямоугольники {x1,z1,x2,z2, mat}
  floors: {
    main: [
      { x1: 1.0, z1: 0.0, x2: 23.8, z2: 6.6, mat: 'wood' },
      { x1: 12.2, z1: -2.0, x2: 16.9, z2: 0.0, mat: 'wood' },      // лестничный блок
      { x1: 20.6, z1: 0.9, x2: 23.0, z2: 3.4, mat: 'marbleW' },    // санузел у входа
      { x1: 8.6, z1: 0.0, x2: 11.4, z2: 2.6, mat: 'marbleW' },     // ванная 2
      { x1: 4.7, z1: 0.0, x2: 7.4, z2: 2.6, mat: 'marbleW' },      // ванная 1
      { x1: 2.8, z1: 0.0, x2: 4.7, z2: 2.6, mat: 'marbleW' }       // прачечная
    ],
    upper: [
      // холл и спальня (вырез лестничного проёма x 12.2-15.6, z -2..-0.6)
      { x1: 4.2, z1: -0.6, x2: 15.6, z2: 6.6, mat: 'wood' },
      { x1: 4.2, z1: -2.0, x2: 12.2, z2: -0.6, mat: 'wood' },
      { x1: 4.2, z1: -2.0, x2: 6.8, z2: 0.5, mat: 'marbleW', over: true }  // пол ванной
    ],
    terrace: [
      { x1: 0.2, z1: 0.5, x2: 4.2, z2: 6.6, mat: 'deck' }
    ]
  },

  // Потолки главного уровня (простые плоскости)
  mainCeil: [
    { x1: 1.0, z1: 0.0, x2: 23.8, z2: 6.6 },
    { x1: 20.6, z1: 0.9, x2: 23.0, z2: 3.4 }
  ],

  stairs: {
    // подъём с востока (x=15.6, y=0) на запад (x=12.2, y=3.1)
    x1: 12.2, x2: 15.6, z1: -2.0, z2: -0.6, rise: 3.1
  },

  terraceSteps: { doorX: 4.2, z1: 2.8, z2: 3.8 },

  // Мебель: type, x/z центра, w (по x), d (по z), rot (радианы), lvl
  furniture: [
    // -------- Прихожая --------
    { type: 'bench', x: 22.0, z: 6.15, w: 1.7, d: 0.45, lvl: 'main' },
    { type: 'painting', x: 22.0, z: 6.5, w: 0.7, h: 0.9, style: 'mono', rot: Math.PI, lvl: 'main' },
    { type: 'wardrobe', x: 23.4, z: 2.15, w: 0.75, d: 2.4, rot: -Math.PI / 2, lvl: 'main' },
    // Санузел у входа: мрамор
    { type: 'wallPanel', x: 21.8, z: 1.0, w: 2.3, mat: 'black', lvl: 'main' },
    { type: 'wallPanel', x: 20.68, z: 2.15, w: 2.4, mat: 'white', rot: Math.PI / 2, lvl: 'main' },
    { type: 'wallPanel', x: 21.8, z: 3.32, w: 2.3, mat: 'white', lvl: 'main' },
    { type: 'shower', x: 21.3, z: 1.55, w: 1.3, d: 1.2, corner: 'nw', lvl: 'main' },
    { type: 'vanity', x: 21.6, z: 3.12, w: 1.3, d: 0.5, rot: Math.PI, lvl: 'main', dark: false },
    { type: 'wc', x: 22.65, z: 1.35, w: 0.42, d: 0.65, rot: Math.PI / 2, lvl: 'main' },
    { type: 'towelRoll', x: 21.1, z: 3.1, h: 0.93, lvl: 'main' },
    { type: 'toiletries', x: 22.1, z: 3.15, h: 0.93, lvl: 'main' },

    // -------- Кухня --------
    { type: 'kitchenRun', x: 18.75, z: 0.33, w: 3.6, d: 0.65, lvl: 'main' },       // вдоль северной стены
    { type: 'tallUnits', x: 20.25, z: 1.05, w: 0.65, d: 2.1, rot: -Math.PI / 2, lvl: 'main' },
    { type: 'island', x: 17.9, z: 2.55, w: 2.4, d: 1.05, lvl: 'main' },
    { type: 'barStool', x: 17.1, z: 3.35, lvl: 'main' },
    { type: 'barStool', x: 17.9, z: 3.35, lvl: 'main' },
    { type: 'barStool', x: 18.7, z: 3.35, lvl: 'main' },
    { type: 'hood', x: 17.9, z: 2.55, w: 1.2, d: 0.5, lvl: 'main' },
    { type: 'coffeeMachine', x: 19.6, z: 0.35, h: 0.92, lvl: 'main' },
    { type: 'kettle', x: 18.95, z: 0.33, h: 0.92, lvl: 'main' },
    { type: 'knifeBlock', x: 17.55, z: 0.33, h: 0.92, lvl: 'main' },
    { type: 'plant', x: 17.15, z: 0.35, h: 0.92, lvl: 'main' },
    { type: 'fruitBowl', x: 18.5, z: 2.35, h: 0.95, lvl: 'main' },

    // -------- Столовая --------
    { type: 'diningTable', x: 13.6, z: 2.45, w: 2.4, d: 1.05, lvl: 'main', seats: 8 },
    { type: 'pendants', x: 13.6, z: 2.45, w: 1.8, lvl: 'main', n: 3 },
    { type: 'vaseFlowers', x: 13.6, z: 2.45, h: 0.755, kind: 'lily', lvl: 'main' },
    { type: 'painting', x: 14.4, z: 0.12, w: 0.8, h: 1.0, style: 'warm', lvl: 'main' },

    // -------- Гостиная --------
    { type: 'rug', x: 13.7, z: 5.15, w: 3.8, d: 2.6, lvl: 'main', pat: 'grayblue' },
    { type: 'sofaL', x: 13.65, z: 5.95, w: 3.5, d: 1.0, lvl: 'main', chaiseW: 1.0, chaiseD: 2.2 },
    { type: 'armchair', x: 13.1, z: 4.35, rot: Math.PI * 0.93, lvl: 'main', col: 'navy' },
    { type: 'armchair', x: 14.5, z: 4.35, rot: Math.PI * 1.07, lvl: 'main', col: 'navy' },
    { type: 'roundTable', x: 13.8, z: 5.1, r: 0.45, lvl: 'main', glass: true },
    { type: 'tvPanel', x: 11.52, z: 5.2, w: 2.6, lvl: 'main', face: 'e' },
    { type: 'sideboard', x: 12.3, z: 6.3, w: 1.6, d: 0.4, lvl: 'main' },
    { type: 'plant', x: 11.9, z: 3.9, lvl: 'main', big: true },
    { type: 'cushions', x: 13.9, z: 6.15, h: 0.42, set: ['yellow', 'navy', 'olive'], lvl: 'main' },
    { type: 'throwBlanket', x: 12.4, z: 5.2, h: 0.48, col: 'knit', lvl: 'main' },
    { type: 'fruitBowl', x: 13.68, z: 5.0, h: 0.46, lvl: 'main' },
    { type: 'vaseFlowers', x: 13.95, z: 5.25, h: 0.44, kind: 'gerbera', lvl: 'main' },
    { type: 'books', x: 12.0, z: 6.28, h: 0.47, n: 6, candle: true, lvl: 'main' },

    // -------- Спальня 2 (тёмно-синяя) --------
    { type: 'bed', x: 10.1, z: 4.65, w: 1.8, len: 2.05, rot: 0, lvl: 'main', head: 'navy' },
    { type: 'sideTable', x: 8.95, z: 3.75, lvl: 'main' },
    { type: 'sideTable', x: 11.25, z: 3.75, lvl: 'main', skip: true },
    { type: 'rug', x: 10.1, z: 5.2, w: 2.6, d: 2.2, lvl: 'main', pat: 'light' },
    { type: 'armchair', x: 8.15, z: 6.0, rot: Math.PI * 0.25, lvl: 'main', col: 'gray' },
    { type: 'painting', x: 8.3, z: 5.0, w: 0.7, h: 0.9, style: 'mono', rot: Math.PI / 2, lvl: 'main' },
    { type: 'books', x: 8.95, z: 3.75, h: 0.42, n: 4, candle: true, lvl: 'main' },
    { type: 'cushions', x: 10.1, z: 3.85, h: 0.5, set: ['blue', 'blue'], lvl: 'main' },

    // -------- Ванная 2 (у спальни 2): мрамор --------
    { type: 'wallPanel', x: 10.0, z: 0.1, w: 2.75, mat: 'black', lvl: 'main' },
    { type: 'wallPanel', x: 10.0, z: 2.5, w: 2.75, mat: 'black', lvl: 'main' },
    { type: 'wallPanel', x: 8.7, z: 1.3, w: 2.5, mat: 'white', rot: Math.PI / 2, lvl: 'main' },
    { type: 'wallPanel', x: 11.3, z: 1.3, w: 2.5, mat: 'white', rot: Math.PI / 2, lvl: 'main' },
    { type: 'tub', x: 9.45, z: 0.62, w: 1.7, d: 0.8, lvl: 'main' },
    { type: 'shower', x: 10.8, z: 0.65, w: 1.2, d: 1.3, corner: 'ne', lvl: 'main' },
    { type: 'vanity', x: 9.3, z: 2.28, w: 1.5, d: 0.52, rot: Math.PI, lvl: 'main', dark: true },
    { type: 'wc', x: 8.85, z: 1.3, w: 0.42, d: 0.65, rot: -Math.PI / 2, lvl: 'main' },
    { type: 'towelRoll', x: 8.85, z: 2.25, h: 0.93, lvl: 'main' },
    { type: 'toiletries', x: 9.75, z: 2.3, h: 0.93, lvl: 'main' },
    { type: 'bathMat', x: 9.8, z: 1.45, lvl: 'main' },
    { type: 'vaseFlowers', x: 9.85, z: 2.32, h: 0.93, kind: 'gerbera', lvl: 'main' },

    // -------- Коридор --------
    { type: 'runner', x: 9.4, z: 3.05, w: 3.4, d: 0.7, lvl: 'main' },

    // -------- Спальня 1 (бежевая, с нишей-кабинетом) --------
    { type: 'bed', x: 4.5, z: 4.4, w: 1.8, len: 2.05, rot: 0, lvl: 'main', head: 'beige' },
    { type: 'sideTable', x: 3.35, z: 3.5, lvl: 'main' },
    { type: 'sideTable', x: 5.65, z: 3.5, lvl: 'main' },
    { type: 'rug', x: 4.5, z: 5.0, w: 2.6, d: 2.2, lvl: 'main', pat: 'light' },
    { type: 'deskNook', x: 6.6, z: 5.6, w: 1.5, d: 0.6, lvl: 'main' },  // обои-джунгли + стол
    { type: 'vaseFlowers', x: 6.3, z: 5.55, h: 0.76, kind: 'roses', lvl: 'main' },
    { type: 'cushions', x: 4.5, z: 3.75, h: 0.5, set: ['olive', 'olive'], lvl: 'main' },
    { type: 'books', x: 5.65, z: 3.5, h: 0.44, n: 4, lvl: 'main' },
    { type: 'painting', x: 2.5, z: 2.72, w: 0.55, h: 0.7, style: 'leaf', light: true, lvl: 'main' },
    { type: 'wardrobe', x: 1.35, z: 4.6, w: 0.65, d: 2.6, rot: Math.PI / 2, lvl: 'main' },
    { type: 'tvOnWall', x: 7.32, z: 5.0, w: 1.1, rot: -Math.PI / 2, lvl: 'main' },

    // -------- Ванная 1: мрамор --------
    { type: 'wallPanel', x: 6.05, z: 0.1, w: 2.6, mat: 'black', lvl: 'main' },
    { type: 'wallPanel', x: 4.78, z: 1.3, w: 2.5, mat: 'white', rot: Math.PI / 2, lvl: 'main' },
    { type: 'wallPanel', x: 7.32, z: 1.3, w: 2.5, mat: 'white', rot: Math.PI / 2, lvl: 'main' },
    { type: 'shower', x: 5.35, z: 0.65, w: 1.3, d: 1.3, corner: 'nw', lvl: 'main' },
    { type: 'vanity', x: 6.55, z: 0.31, w: 1.3, d: 0.52, rot: 0, lvl: 'main', dark: true },
    { type: 'wc', x: 7.1, z: 2.1, w: 0.42, d: 0.65, rot: Math.PI, lvl: 'main' },

    { type: 'towels', x: 6.85, z: 0.35, h: 0.93, n: 3, lvl: 'main' },
    { type: 'toiletries', x: 6.25, z: 0.35, h: 0.93, lvl: 'main' },
    { type: 'bathMat', x: 5.9, z: 1.5, lvl: 'main' },

    // -------- Прачечная --------
    { type: 'washerDryer', x: 3.75, z: 0.4, lvl: 'main' },
    { type: 'towels', x: 3.3, z: 0.4, h: 0.87, n: 4, lvl: 'main' },

    // ================= ВЕРХНИЙ УРОВЕНЬ =================
    // Холл
    { type: 'wardrobe', x: 15.25, z: 1.0, w: 0.65, d: 2.0, lvl: 'upper' },
    { type: 'plant', x: 11.65, z: -0.3, lvl: 'upper' },

    // Гостиная наверху
    { type: 'rug', x: 7.3, z: 3.6, w: 3.4, d: 2.6, lvl: 'upper', pat: 'light' },
    { type: 'armchair', x: 6.6, z: 2.9, rot: Math.PI * 0.85, lvl: 'upper', col: 'sage' },
    { type: 'armchair', x: 8.3, z: 5.3, rot: Math.PI * 1.8, lvl: 'upper', col: 'graybrown' },
    { type: 'roundTable', x: 7.4, z: 4.1, r: 0.5, lvl: 'upper', glass: false },
    { type: 'sofa', x: 5.6, z: 5.9, w: 2.2, d: 0.95, rot: 0, lvl: 'upper', col: 'taupe' },
    { type: 'tvPanel', x: 10.28, z: 4.05, w: 2.4, lvl: 'upper', face: 'w' },
    { type: 'sideboard', x: 9.0, z: 0.0, w: 2.2, d: 0.42, lvl: 'upper' },
    { type: 'floorLamp', x: 8.9, z: 5.9, lvl: 'upper' },
    { type: 'plant', x: 4.75, z: 5.9, lvl: 'upper' },
    { type: 'vaseFlowers', x: 9.9, z: 5.6, h: 0, kind: 'pampas', lvl: 'upper' },
    { type: 'books', x: 8.5, z: 0.02, h: 0.47, n: 7, candle: true, lvl: 'upper' },
    { type: 'vaseFlowers', x: 7.15, z: 3.9, h: 0.45, kind: 'gerbera', lvl: 'upper' },
    { type: 'fruitBowl', x: 7.6, z: 4.3, h: 0.45, lvl: 'upper' },
    { type: 'throwBlanket', x: 5.2, z: 5.85, h: 0.48, col: 'knit', lvl: 'upper' },
    { type: 'cushions', x: 5.9, z: 6.1, h: 0.42, set: ['olive', 'yellow'], lvl: 'upper' },

    // Спальня наверху
    { type: 'bed', x: 14.2, z: 4.35, w: 1.8, len: 2.05, rot: -Math.PI / 2, lvl: 'upper', head: 'navy' },
    { type: 'rug', x: 13.2, z: 4.35, w: 2.8, d: 2.4, lvl: 'upper', pat: 'light' },
    { type: 'sideTable', x: 12.15, z: 3.2, lvl: 'upper' },
    { type: 'wardrobeTv', x: 13.5, z: 2.42, w: 2.6, d: 0.62, lvl: 'upper' },
    { type: 'armchair', x: 11.3, z: 5.7, rot: Math.PI * 0.3, lvl: 'upper', col: 'blue' },
    { type: 'books', x: 12.15, z: 3.2, h: 0.44, n: 4, candle: true, lvl: 'upper' },
    { type: 'cushions', x: 14.35, z: 4.35, h: 0.5, set: ['blue', 'olive'], rot: Math.PI / 2, lvl: 'upper' },
    { type: 'painting', x: 11.6, z: 2.2, w: 0.6, h: 0.75, style: 'mono', lvl: 'upper' },

    // Ванная наверху: мрамор
    { type: 'wallPanel', x: 5.5, z: -1.9, w: 2.5, mat: 'black', h: 1.7, lvl: 'upper' },
    { type: 'wallPanel', x: 4.28, z: -0.75, w: 2.2, mat: 'white', rot: Math.PI / 2, h: 2.2, lvl: 'upper' },
    { type: 'wallPanel', x: 6.72, z: -0.75, w: 2.2, mat: 'white', rot: Math.PI / 2, h: 2.2, lvl: 'upper' },
    { type: 'shower', x: 4.85, z: -1.35, w: 1.3, d: 1.3, corner: 'nw', lvl: 'upper' },
    { type: 'vanity', x: 6.2, z: -1.68, w: 1.2, d: 0.52, rot: 0, lvl: 'upper', dark: false },
    { type: 'wc', x: 6.45, z: 0.05, w: 0.42, d: 0.65, rot: Math.PI, lvl: 'upper' },
    { type: 'towels', x: 5.6, z: -1.65, h: 0.93, n: 3, lvl: 'upper' },
    { type: 'toiletries', x: 6.7, z: -1.6, h: 0.93, lvl: 'upper' },
    { type: 'bathMat', x: 5.5, z: -0.5, lvl: 'upper' },

    // Терраса
    { type: 'terraceChair', x: 1.2, z: 2.2, rot: Math.PI * 0.35, lvl: 'terrace' },
    { type: 'terraceChair', x: 2.2, z: 1.7, rot: Math.PI * 0.1, lvl: 'terrace' },
    { type: 'terraceChair', x: 3.3, z: 2.2, rot: -Math.PI * 0.25, lvl: 'terrace' },
    { type: 'terraceTable', x: 2.3, z: 3.3, w: 1.1, d: 0.7, lvl: 'terrace' },
    { type: 'planter', x: 0.7, z: 5.9, lvl: 'terrace' },
    { type: 'planter', x: 3.7, z: 5.9, lvl: 'terrace' },
    { type: 'lantern', x: 3.7, z: 0.9, lvl: 'terrace' },
    { type: 'wineSet', x: 2.3, z: 3.3, h: 0.45, lvl: 'terrace' },
    { type: 'fruitBowl', x: 2.05, z: 3.15, h: 0.45, lvl: 'terrace' },
    { type: 'stringLights', x: 2.2, z: 0.62, w: 3.6, h: 1.5, lvl: 'terrace' },
    { type: 'stringLights', x: 0.32, z: 3.5, w: 5.6, h: 1.5, rot: Math.PI / 2, lvl: 'terrace' },
    { type: 'planter', x: 0.7, z: 1.1, lvl: 'terrace' }
  ],

  // Точечные светильники: x, z, y(абс), цвет тёплый
  lights: [
    { x: 22.2, z: 5.0, lvl: 'main' },   // прихожая
    { x: 17.9, z: 2.5, lvl: 'main' },   // кухня/остров
    { x: 13.6, z: 2.4, lvl: 'main' },   // столовая (даёт основной свет пендантам)
    { x: 13.6, z: 5.2, lvl: 'main' },   // гостиная
    { x: 9.4, z: 3.0, lvl: 'main' },    // коридор
    { x: 10.0, z: 4.8, lvl: 'main' },   // спальня 2
    { x: 4.5, z: 4.6, lvl: 'main' },    // спальня 1
    { x: 9.8, z: 1.3, lvl: 'main' },    // ванная 2
    { x: 6.0, z: 1.3, lvl: 'main' },    // ванная 1
    { x: 21.8, z: 2.1, lvl: 'main' },   // санузел
    { x: 14.0, z: -1.3, lvl: 'stair' }, // лестница
    { x: 7.3, z: 3.8, lvl: 'upper' },   // гостиная 2 эт
    { x: 13.3, z: 4.2, lvl: 'upper' },  // спальня 2 эт
    { x: 13.5, z: 0.6, lvl: 'upper' },  // холл 2 эт
    { x: 5.5, z: -0.8, lvl: 'upper' }   // ванная 2 эт
  ],

  // Зоны пола для физики: {x1,z1,x2,z2, y | ramp}
  groundZones: [
    { x1: 1.0, z1: 0.0, x2: 23.8, z2: 6.6, y: 0 },
    { x1: 15.6, z1: -2.0, x2: 16.9, z2: 0.0, y: 0 },                       // площадка у лестницы
    { x1: 12.2, z1: -2.0, x2: 15.6, z2: -0.6, ramp: { axis: 'x', from: 15.6, to: 12.2, y0: 0, y1: 3.1 } },
    { x1: 4.2, z1: -0.6, x2: 15.6, z2: 6.6, y: 3.1 },                      // верхний уровень
    { x1: 4.2, z1: -2.0, x2: 6.8, z2: -0.6, y: 3.1 },                      // ванная наверху (северная часть)
    { x1: 3.4, z1: 2.8, x2: 4.2, z2: 3.8, ramp: { axis: 'x', from: 4.2, to: 3.4, y0: 3.1, y1: 2.62 } }, // ступени на террасу
    { x1: 0.2, z1: 0.5, x2: 4.2, z2: 6.6, y: 2.62 }                        // терраса
  ],

  // Названия комнат для подписи в углу
  roomLabels: [
    { x1: 20.6, z1: 3.4, x2: 23.8, z2: 6.6, y: 0, name: 'Прихожая' },
    { x1: 20.6, z1: 0.9, x2: 23.0, z2: 3.4, y: 0, name: 'Санузел' },
    { x1: 15.0, z1: 0.0, x2: 20.6, z2: 4.0, y: 0, name: 'Кухня' },
    { x1: 11.4, z1: 0.0, x2: 15.0, z2: 3.6, y: 0, name: 'Столовая' },
    { x1: 11.4, z1: 3.6, x2: 15.9, z2: 6.6, y: 0, name: 'Гостиная' },
    { x1: 7.4, z1: 2.6, x2: 11.4, z2: 3.5, y: 0, name: 'Коридор' },
    { x1: 8.2, z1: 3.5, x2: 11.4, z2: 6.6, y: 0, name: 'Спальня 2' },
    { x1: 8.6, z1: 0.0, x2: 11.4, z2: 2.6, y: 0, name: 'Ванная 2' },
    { x1: 1.0, z1: 2.6, x2: 7.4, z2: 6.6, y: 0, name: 'Спальня 1' },
    { x1: 4.7, z1: 0.0, x2: 7.4, z2: 2.6, y: 0, name: 'Ванная 1' },
    { x1: 2.8, z1: 0.0, x2: 4.7, z2: 2.6, y: 0, name: 'Прачечная' },
    { x1: 12.2, z1: -2.0, x2: 16.9, z2: 0.0, y: -1, name: 'Лестница' },
    { x1: 11.4, z1: -0.6, x2: 15.6, z2: 2.1, y: 3.1, name: 'Холл · 2 этаж' },
    { x1: 10.4, z1: 2.1, x2: 15.6, z2: 6.6, y: 3.1, name: 'Спальня · 2 этаж' },
    { x1: 4.2, z1: 0.5, x2: 10.4, z2: 6.6, y: 3.1, name: 'Гостиная · 2 этаж' },
    { x1: 4.2, z1: -2.0, x2: 6.8, z2: 0.5, y: 3.1, name: 'Ванная · 2 этаж' },
    { x1: 0.2, z1: 0.5, x2: 4.2, z2: 6.6, y: 2.62, name: 'Терраса' }
  ],

  start: { x: 22.6, z: 5.0, yaw: Math.PI / 2 },  // у входной двери, смотрим на запад

  // Точки телепортации для меню «Комнаты»
  spawns: [
    { name: 'Прихожая', x: 22.6, z: 5.0, yaw: Math.PI / 2, g: 0 },
    { name: 'Кухня', x: 19.3, z: 4.3, yaw: Math.PI * 0.85, g: 0 },
    { name: 'Столовая', x: 13.6, z: 4.7, yaw: Math.PI * 0.02, g: 0 },
    { name: 'Гостиная', x: 15.9, z: 5.4, yaw: Math.PI * 0.6, g: 0 },
    { name: 'Спальня 1', x: 6.9, z: 3.2, yaw: Math.PI * 0.75, g: 0 },
    { name: 'Спальня 2', x: 10.9, z: 6.2, yaw: Math.PI * 0.28, g: 0 },
    { name: 'Ванная 2', x: 11.1, z: 2.3, yaw: Math.PI * 0.55, g: 0 },
    { name: 'Лестница', x: 16.35, z: -1.2, yaw: Math.PI / 2, g: 0 },
    { name: 'Холл · 2 этаж', x: 13.6, z: 0.9, yaw: Math.PI * 0.5, g: 3.1 },
    { name: 'Гостиная · 2 этаж', x: 9.7, z: 4.4, yaw: Math.PI * 0.65, g: 3.1 },
    { name: 'Спальня · 2 этаж', x: 11.5, z: 4.9, yaw: -Math.PI * 0.45, g: 3.1 },
    { name: 'Терраса', x: 3.6, z: 3.3, yaw: Math.PI * 1.25, g: 2.62 }
  ]
};
