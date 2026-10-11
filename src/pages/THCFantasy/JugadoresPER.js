export const EQUIPOS_PER = [
  {
    id: 'universitario', name: 'Universitario', img: '/Imag/Universitario.png', dt: 'Héctor Cúper',
    presupuesto: 18000000, estilo: 'Equilibrado', grl: 76, color: '#FACC15',
    titulares: [
      { id: 'u1', name: 'D. Romero', pos: 'GK', grl: 76, energia: 100, edad: 25 },
      { id: 'u2', name: 'A. Corzo', pos: 'DEF', grl: 75, energia: 100, edad: 37 },
      { id: 'u3', name: 'W. Riveros', pos: 'DEF', grl: 76, energia: 100, edad: 33 },
      { id: 'u4', name: 'A. Santamaría', pos: 'DEF', grl: 77, energia: 100, edad: 34 },
      { id: 'u5', name: 'A. Polo', pos: 'DEF', grl: 78, energia: 100, edad: 31 },
      { id: 'u6', name: 'J. Murrugarra', pos: 'MID', grl: 74, energia: 100, edad: 29 },
      { id: 'u7', name: 'J. Concha', pos: 'MID', grl: 76, energia: 100, edad: 27 },
      { id: 'u8', name: 'P. Quispe', pos: 'MID', grl: 79, energia: 100, edad: 25 },
      { id: 'u9', name: 'E. Flores', pos: 'DEL', grl: 77, energia: 100, edad: 32 },
      { id: 'u10', name: 'G. Lapadula', pos: 'DEL', grl: 79, energia: 100, edad: 36 },
      { id: 'u11', name: 'A. Valera', pos: 'DEL', grl: 75, energia: 100, edad: 30 }
    ],
    suplentes: [
      { id: 'us1', name: 'M. Vargas', pos: 'GK', grl: 72, energia: 100, edad: 30 },
      { id: 'us2', name: 'M. Di Benedetto', pos: 'DEF', grl: 74, energia: 100, edad: 33 },
      { id: 'us3', name: 'C. Inga', pos: 'DEF', grl: 72, energia: 100, edad: 24 },
      { id: 'us4', name: 'H. Calcaterra', pos: 'MID', grl: 73, energia: 100, edad: 37 },
      { id: 'us5', name: 'J. Guivin', pos: 'MID', grl: 73, energia: 100, edad: 28 },
      { id: 'us6', name: 'B. Reyna', pos: 'DEL', grl: 76, energia: 100, edad: 28 },
      { id: 'us7', name: 'J. Rivera', pos: 'DEL', grl: 74, energia: 100, edad: 29 }
    ]
  },
  {
    id: 'alianza', name: 'Alianza Lima', img: '/Imag/AlianzaLima.png', dt: 'Pablo Guede',
    presupuesto: 17000000, estilo: 'Ofensivo', grl: 75, color: '#1E3A8A',
    titulares: [
      { id: 'al1', name: 'A. Duarte', pos: 'GK', grl: 75, energia: 100, edad: 32 },
      { id: 'al2', name: 'C. Gómez', pos: 'DEF', grl: 72, energia: 100, edad: 21 },
      { id: 'al3', name: 'R. Garcés', pos: 'DEF', grl: 76, energia: 100, edad: 30 },
      { id: 'al4', name: 'M. Antoni', pos: 'DEF', grl: 74, energia: 100, edad: 23 },
      { id: 'al5', name: 'C. Carbajal', pos: 'DEF', grl: 73, energia: 100, edad: 26 },
      { id: 'al6', name: 'E. Pavez', pos: 'MID', grl: 76, energia: 100, edad: 36 },
      { id: 'al7', name: 'J. Castillo', pos: 'MID', grl: 74, energia: 100, edad: 30 },
      { id: 'al8', name: 'J. Vélez', pos: 'MID', grl: 77, energia: 100, edad: 31 },
      { id: 'al9', name: 'E. Castillo', pos: 'DEL', grl: 74, energia: 100, edad: 31 },
      { id: 'al10', name: 'P. Guerrero', pos: 'DEL', grl: 75, energia: 100, edad: 42 },
      { id: 'al11', name: 'F. Girotti', pos: 'DEL', grl: 76, energia: 100, edad: 27 }
    ],
    suplentes: [
      { id: 'als1', name: 'Á. de la Cruz', pos: 'GK', grl: 69, energia: 100, edad: 24 },
      { id: 'als2', name: 'D. Montenegro', pos: 'DEF', grl: 71, energia: 100, edad: 23 },
      { id: 'als3', name: 'J. Velásquez', pos: 'DEF', grl: 70, energia: 100, edad: 21 },
      { id: 'als4', name: 'J. Archimbaud', pos: 'MID', grl: 73, energia: 100, edad: 32 },
      { id: 'als5', name: 'F. Gaibor', pos: 'MID', grl: 74, energia: 100, edad: 34 },
      { id: 'als6', name: 'L. Ramos', pos: 'DEL', grl: 73, energia: 100, edad: 26 },
      { id: 'als7', name: 'M. Succar', pos: 'DEL', grl: 72, energia: 100, edad: 27 }
    ]
  },
  {
    id: 'cristal', name: 'Sporting Cristal', img: '/Imag/SportingCristal.png', dt: 'Roberto Mosquera',
    presupuesto: 16500000, estilo: 'Posesión', grl: 76, color: '#38BDF8',
    titulares: [
      { id: 'sc1', name: 'R. Solís', pos: 'GK', grl: 76, energia: 100, edad: 28 },
      { id: 'sc2', name: 'L. Sosa', pos: 'DEF', grl: 75, energia: 100, edad: 31 },
      { id: 'sc3', name: 'M. Araujo', pos: 'DEF', grl: 77, energia: 100, edad: 31 },
      { id: 'sc4', name: 'L. Abram', pos: 'DEF', grl: 76, energia: 100, edad: 30 },
      { id: 'sc5', name: 'R. Lutiger', pos: 'DEF', grl: 74, energia: 100, edad: 25 },
      { id: 'sc6', name: 'G. Cazonatti', pos: 'MID', grl: 76, energia: 100, edad: 30 },
      { id: 'sc7', name: 'Y. Yotún', pos: 'MID', grl: 77, energia: 100, edad: 36 },
      { id: 'sc8', name: 'C. Gonzales', pos: 'MID', grl: 75, energia: 100, edad: 33 },
      { id: 'sc9', name: 'S. González', pos: 'DEL', grl: 78, energia: 100, edad: 26 },
      { id: 'sc10', name: 'F. Vizeu', pos: 'DEL', grl: 75, energia: 100, edad: 29 },
      { id: 'sc11', name: 'L. Iberico', pos: 'DEL', grl: 76, energia: 100, edad: 28 }
    ],
    suplentes: [
      { id: 'scs1', name: 'D. Enríquez', pos: 'GK', grl: 72, energia: 100, edad: 24 },
      { id: 'scs2', name: 'J. González', pos: 'DEF', grl: 71, energia: 100, edad: 25 },
      { id: 'scs3', name: 'A. Pósito', pos: 'DEF', grl: 70, energia: 100, edad: 22 },
      { id: 'scs4', name: 'M. Távara', pos: 'MID', grl: 74, energia: 100, edad: 27 },
      { id: 'scs5', name: 'J. Alarcón', pos: 'MID', grl: 74, energia: 100, edad: 22 },
      { id: 'scs6', name: 'M. Castro', pos: 'MID', grl: 71, energia: 100, edad: 18 },
      { id: 'scs7', name: 'I. Ávila', pos: 'DEL', grl: 73, energia: 100, edad: 36 }
    ]
  }
];