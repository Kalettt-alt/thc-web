export const EQUIPOS_ARG = [
  { 
    id: 'boca', name: 'Boca Juniors', img: '/Imag/BocaJuniors.png', dt: 'Fernando Gago',
    presupuesto: 45000000, estilo: 'Contragolpe', grl: 86, color: '#FBBF24',
    titulares: [
      { id: 'b1', name: 'A. Marchesín', pos: 'GK', grl: 84, energia: 100, edad: 36 },
      { id: 'b2', name: 'M. Weigandt', pos: 'DEF', grl: 82, energia: 100, edad: 24 },
      { id: 'b3', name: 'N. Figal', pos: 'DEF', grl: 85, energia: 100, edad: 29 },
      { id: 'b4', name: 'L. Blanco', pos: 'DEF', grl: 83, energia: 100, edad: 25 },
      { id: 'b5', name: 'L. Paredes', pos: 'MID', grl: 87, energia: 100, edad: 29 },
      { id: 'b6', name: 'S. Ascacibar', pos: 'MID', grl: 84, energia: 100, edad: 27 },
      { id: 'b7', name: 'K. Zenón', pos: 'MID', grl: 85, energia: 100, edad: 22 },
      { id: 'b8', name: 'C. Palacios', pos: 'MID', grl: 83, energia: 100, edad: 23 },
      { id: 'b9', name: 'E. Zeballos', pos: 'DEL', grl: 83, energia: 100, edad: 21 },
      { id: 'b10', name: 'A. Velasco', pos: 'DEL', grl: 84, energia: 100, edad: 21 },
      { id: 'b11', name: 'M. Merentiel', pos: 'DEL', grl: 88, energia: 100, edad: 28 }
    ],
    suplentes: [
      { id: 'bs1', name: 'L. Brey', pos: 'GK', grl: 78, energia: 100, edad: 21 },
      { id: 'bs2', name: 'M. Pellegrino', pos: 'DEF', grl: 80, energia: 100, edad: 24 },
      { id: 'bs3', name: 'M. Braida', pos: 'DEF', grl: 81, energia: 100, edad: 27 },
      { id: 'bs4', name: 'T. Belmonte', pos: 'MID', grl: 82, energia: 100, edad: 25 },
      { id: 'bs5', name: 'W. Alarcón', pos: 'MID', grl: 80, energia: 100, edad: 23 },
      { id: 'bs6', name: 'A. Bareiro', pos: 'DEL', grl: 84, energia: 100, edad: 27 },
      { id: 'bs7', name: 'Á. Romero', pos: 'DEL', grl: 82, energia: 100, edad: 31 }
    ]
  },
  { 
    id: 'river', name: 'River Plate', img: '/Imag/RiverPlate.png', dt: 'Marcelo Gallardo',
    presupuesto: 55000000, estilo: 'Posesión', grl: 88, color: '#DC2626',
    titulares: [
      { id: 'r1', name: 'F. Armani', pos: 'GK', grl: 86, energia: 100, edad: 37 },
      { id: 'r2', name: 'P. Díaz', pos: 'DEF', grl: 87, energia: 100, edad: 29 },
      { id: 'r3', name: 'G. Pezzella', pos: 'DEF', grl: 85, energia: 100, edad: 32 },
      { id: 'r4', name: 'F. Bustos', pos: 'DEF', grl: 84, energia: 100, edad: 28 },
      { id: 'r5', name: 'E. Díaz', pos: 'DEF', grl: 84, energia: 100, edad: 28 },
      { id: 'r6', name: 'M. Kranevitter', pos: 'MID', grl: 83, energia: 100, edad: 30 },
      { id: 'r7', name: 'R. Aliendro', pos: 'MID', grl: 85, energia: 100, edad: 33 },
      { id: 'r8', name: 'F. Mastantuono', pos: 'MID', grl: 82, energia: 100, edad: 17 },
      { id: 'r9', name: 'P. Solari', pos: 'DEL', grl: 84, energia: 100, edad: 23 },
      { id: 'r10', name: 'M. Meza', pos: 'DEL', grl: 85, energia: 100, edad: 31 },
      { id: 'r11', name: 'M. Borja', pos: 'DEL', grl: 89, energia: 100, edad: 31 }
    ],
    suplentes: [
      { id: 'rs1', name: 'J. Ledesma', pos: 'GK', grl: 83, energia: 100, edad: 31 },
      { id: 'rs2', name: 'A. Sant\'Anna', pos: 'DEF', grl: 81, energia: 100, edad: 26 },
      { id: 'rs3', name: 'R. Villagra', pos: 'MID', grl: 82, energia: 100, edad: 23 },
      { id: 'rs4', name: 'S. Simón', pos: 'MID', grl: 81, energia: 100, edad: 21 },
      { id: 'rs5', name: 'I. Subiabre', pos: 'DEL', grl: 79, energia: 100, edad: 17 },
      { id: 'rs6', name: 'F. Colidio', pos: 'DEL', grl: 83, energia: 100, edad: 24 },
      { id: 'rs7', name: 'A. Ruberto', pos: 'DEL', grl: 78, energia: 100, edad: 18 }
    ]
  },
  { 
    id: 'racing', name: 'Racing Club', img: '/Imag/Racing.png', dt: 'Juan Pablo Vojvoda',
    presupuesto: 35000000, estilo: 'Ofensivo', grl: 83, color: '#38BDF8',
    titulares: [
      { id: 'ra1', name: 'F. Cambeses', pos: 'GK', grl: 81, energia: 100, edad: 29 },
      { id: 'ra2', name: 'M. Di Césare', pos: 'DEF', grl: 82, energia: 100, edad: 24 },
      { id: 'ra3', name: 'A. García Basso', pos: 'DEF', grl: 80, energia: 100, edad: 34 },
      { id: 'ra4', name: 'G. Martirena', pos: 'DEF', grl: 81, energia: 100, edad: 26 },
      { id: 'ra5', name: 'A. Espino', pos: 'DEF', grl: 79, energia: 100, edad: 34 },
      { id: 'ra6', name: 'C. Kranevitter', pos: 'MID', grl: 83, energia: 100, edad: 33 },
      { id: 'ra7', name: 'M. Zaracho', pos: 'MID', grl: 85, energia: 100, edad: 28 },
      { id: 'ra8', name: 'S. Sosa', pos: 'MID', grl: 82, energia: 100, edad: 26 },
      { id: 'ra9', name: 'V. Carboni', pos: 'MID', grl: 81, energia: 100, edad: 21 },
      { id: 'ra10', name: 'T. Conechny', pos: 'DEL', grl: 82, energia: 100, edad: 28 },
      { id: 'ra11', name: 'A. Martínez', pos: 'DEL', grl: 85, energia: 100, edad: 33 }
    ],
    suplentes: [
      { id: 'ras1', name: 'F. Gómez', pos: 'GK', grl: 74, energia: 100, edad: 22 },
      { id: 'ras2', name: 'M. Tagliamonte', pos: 'GK', grl: 76, energia: 100, edad: 28 },
      { id: 'ras3', name: 'N. Colombo', pos: 'DEF', grl: 78, energia: 100, edad: 27 },
      { id: 'ras4', name: 'M. Rojo', pos: 'DEF', grl: 80, energia: 100, edad: 36 },
      { id: 'ras5', name: 'E. Cannavo', pos: 'DEF', grl: 75, energia: 100, edad: 24 },
      { id: 'ras6', name: 'T. Rubio', pos: 'DEF', grl: 76, energia: 100, edad: 21 },
      { id: 'ras7', name: 'A. Forneris', pos: 'MID', grl: 74, energia: 100, edad: 21 },
      { id: 'ras8', name: 'M. Miljevic', pos: 'MID', grl: 77, energia: 100, edad: 25 },
      { id: 'ras9', name: 'B. Rodríguez', pos: 'MID', grl: 80, energia: 100, edad: 23 },
      { id: 'ras10', name: 'D. Ortegoza', pos: 'MID', grl: 78, energia: 100, edad: 28 },
      { id: 'ras11', name: 'D. Vergara', pos: 'DEL', grl: 81, energia: 100, edad: 29 }
    ]
  },
  { 
    id: 'independiente', name: 'Independiente', img: '/Imag/Independiente.png', dt: 'Jadson Viera',
    presupuesto: 25000000, estilo: 'Equilibrado', grl: 80, color: '#DC2626',
    titulares: [
      { id: 'i1', name: 'R. Rey', pos: 'GK', grl: 83, energia: 100, edad: 35 },
      { id: 'i2', name: 'F. Calderón', pos: 'DEF', grl: 80, energia: 100, edad: 27 },
      { id: 'i3', name: 'S. Valdéz', pos: 'DEF', grl: 78, energia: 100, edad: 30 },
      { id: 'i4', name: 'S. Arias', pos: 'DEF', grl: 79, energia: 100, edad: 34 },
      { id: 'i5', name: 'L. Godoy', pos: 'DEF', grl: 81, energia: 100, edad: 31 },
      { id: 'i6', name: 'I. Marcone', pos: 'MID', grl: 82, energia: 100, edad: 36 },
      { id: 'i7', name: 'D. Martínez', pos: 'MID', grl: 79, energia: 100, edad: 27 },
      { id: 'i8', name: 'L. Cabral', pos: 'MID', grl: 81, energia: 100, edad: 31 },
      { id: 'i9', name: 'M. Meza', pos: 'MID', grl: 83, energia: 100, edad: 33 },
      { id: 'i10', name: 'G. Ávalos', pos: 'DEL', grl: 82, energia: 100, edad: 35 },
      { id: 'i11', name: 'E. Ávila', pos: 'DEL', grl: 83, energia: 100, edad: 36 }
    ],
    suplentes: [
      { id: 'is1', name: 'S. Mele', pos: 'GK', grl: 79, energia: 100, edad: 28 },
      { id: 'is2', name: 'J. Blázquez', pos: 'GK', grl: 75, energia: 100, edad: 25 },
      { id: 'is3', name: 'F. Zabala', pos: 'DEF', grl: 77, energia: 100, edad: 28 },
      { id: 'is4', name: 'F. Closter', pos: 'DEF', grl: 74, energia: 100, edad: 24 },
      { id: 'is5', name: 'J. De Irastorza', pos: 'DEF', grl: 73, energia: 100, edad: 21 },
      { id: 'is6', name: 'J. Fedorco', pos: 'DEF', grl: 76, energia: 100, edad: 25 },
      { id: 'is7', name: 'L. Millán', pos: 'MID', grl: 75, energia: 100, edad: 21 },
      { id: 'is8', name: 'M. Benítez Machuca', pos: 'MID', grl: 73, energia: 100, edad: 22 },
      { id: 'is9', name: 'S. Montiel', pos: 'DEL', grl: 78, energia: 100, edad: 25 },
      { id: 'is10', name: 'M. Abaldo', pos: 'DEL', grl: 76, energia: 100, edad: 21 },
      { id: 'is11', name: 'M. Gutiérrez', pos: 'DEL', grl: 74, energia: 100, edad: 21 }
    ]
  },
  { 
    id: 'sanlorenzo', name: 'San Lorenzo', img: '/Imag/SanLorenzo.png', dt: 'Rubén Darío Insúa',
    presupuesto: 20000000, estilo: 'Defensivo', grl: 78, color: '#1E3A8A',
    titulares: [
      { id: 'sl1', name: 'F. Altamirano', pos: 'GK', grl: 80, energia: 100, edad: 29 },
      { id: 'sl2', name: 'E. Amor', pos: 'DEF', grl: 79, energia: 100, edad: 30 },
      { id: 'sl3', name: 'G. Hernández', pos: 'DEF', grl: 81, energia: 100, edad: 28 },
      { id: 'sl4', name: 'D. Arboleda', pos: 'DEF', grl: 77, energia: 100, edad: 30 },
      { id: 'sl5', name: 'N. Arias', pos: 'DEF', grl: 75, energia: 100, edad: 21 },
      { id: 'sl6', name: 'N. Tripichio', pos: 'MID', grl: 78, energia: 100, edad: 30 },
      { id: 'sl7', name: 'M. Insaurralde', pos: 'MID', grl: 76, energia: 100, edad: 25 },
      { id: 'sl8', name: 'N. Barrios', pos: 'MID', grl: 81, energia: 100, edad: 28 },
      { id: 'sl9', name: 'E. Cerutti', pos: 'DEL', grl: 77, energia: 100, edad: 34 },
      { id: 'sl10', name: 'M. Reali', pos: 'DEL', grl: 78, energia: 100, edad: 29 },
      { id: 'sl11', name: 'A. Cuello', pos: 'DEL', grl: 76, energia: 100, edad: 25 }
    ],
    suplentes: [
      { id: 'sls1', name: 'J. Devecchi', pos: 'GK', grl: 76, energia: 100, edad: 30 },
      { id: 'sls2', name: 'M. Clemente', pos: 'GK', grl: 70, energia: 100, edad: 20 },
      { id: 'sls3', name: 'T. Rodríguez Pagano', pos: 'DEF', grl: 73, energia: 100, edad: 21 },
      { id: 'sls4', name: 'M. De Ritis', pos: 'DEF', grl: 74, energia: 100, edad: 23 },
      { id: 'sls5', name: 'G. Corujo', pos: 'DEF', grl: 75, energia: 100, edad: 29 },
      { id: 'sls6', name: 'E. Herrera', pos: 'DEF', grl: 74, energia: 100, edad: 22 },
      { id: 'sls7', name: 'I. Perruzzi', pos: 'MID', grl: 72, energia: 100, edad: 20 },
      { id: 'sls8', name: 'J. Rattalino', pos: 'MID', grl: 71, energia: 100, edad: 22 },
      { id: 'sls9', name: 'M. Río', pos: 'MID', grl: 73, energia: 100, edad: 25 },
      { id: 'sls10', name: 'M. Cardillo', pos: 'MID', grl: 72, energia: 100, edad: 24 },
      { id: 'sls11', name: 'D. Herazo', pos: 'DEL', grl: 75, energia: 100, edad: 30 }
    ]
  },
  { 
    id: 'estudiantes', name: 'Estudiantes (LP)', img: '/Imag/Estudiantes.png', dt: 'Alexander Medina',
    presupuesto: 28000000, estilo: 'Físico', grl: 82, color: '#DC2626',
    titulares: [
      { id: 'e1', name: 'F. Muslera', pos: 'GK', grl: 81, energia: 100, edad: 40 },
      { id: 'e2', name: 'L. González Pírez', pos: 'DEF', grl: 82, energia: 100, edad: 34 },
      { id: 'e3', name: 'R. Funes Mori', pos: 'DEF', grl: 80, energia: 100, edad: 35 },
      { id: 'e4', name: 'E. Mancuso', pos: 'DEF', grl: 81, energia: 100, edad: 27 },
      { id: 'e5', name: 'G. Benedetti', pos: 'DEF', grl: 79, energia: 100, edad: 25 },
      { id: 'e6', name: 'E. Piovi', pos: 'MID', grl: 80, energia: 100, edad: 34 },
      { id: 'e7', name: 'J. Sosa', pos: 'MID', grl: 81, energia: 100, edad: 40 },
      { id: 'e8', name: 'T. Palacios', pos: 'MID', grl: 82, energia: 100, edad: 25 },
      { id: 'e9', name: 'E. Cetré', pos: 'DEL', grl: 82, energia: 100, edad: 28 },
      { id: 'e10', name: 'G. Carrillo', pos: 'DEL', grl: 83, energia: 100, edad: 34 },
      { id: 'e11', name: 'L. Alario', pos: 'DEL', grl: 82, energia: 100, edad: 33 }
    ],
    suplentes: [
      { id: 'es1', name: 'F. Iacovich', pos: 'GK', grl: 75, energia: 100, edad: 24 },
      { id: 'es2', name: 'R. Borzone', pos: 'GK', grl: 70, energia: 100, edad: 21 },
      { id: 'es3', name: 'T. Palacios', pos: 'DEF', grl: 76, energia: 100, edad: 23 },
      { id: 'es4', name: 'S. Núñez', pos: 'DEF', grl: 77, energia: 100, edad: 26 },
      { id: 'es5', name: 'E. Meza', pos: 'DEF', grl: 78, energia: 100, edad: 27 },
      { id: 'es6', name: 'V. Pierani', pos: 'DEF', grl: 71, energia: 100, edad: 20 },
      { id: 'es7', name: 'G. Neves', pos: 'MID', grl: 79, energia: 100, edad: 29 },
      { id: 'es8', name: 'A. Castro', pos: 'MID', grl: 78, energia: 100, edad: 31 },
      { id: 'es9', name: 'F. Farías', pos: 'MID', grl: 81, energia: 100, edad: 23 },
      { id: 'es10', name: 'B. Rodríguez', pos: 'MID', grl: 80, energia: 100, edad: 23 },
      { id: 'es11', name: 'A. Gaich', pos: 'DEL', grl: 79, energia: 100, edad: 27 }
    ]
  },
  { 
    id: 'velez', name: 'Vélez Sarsfield', img: '/Imag/Velez.png', dt: 'Guillermo Barros Schelotto',
    presupuesto: 26000000, estilo: 'Transición Rápida', grl: 81, color: '#FFFFFF',
    titulares: [
      { id: 'v1', name: 'T. Marchiori', pos: 'GK', grl: 80, energia: 100, edad: 30 },
      { id: 'v2', name: 'L. Magallán', pos: 'DEF', grl: 81, energia: 100, edad: 32 },
      { id: 'v3', name: 'E. Mammana', pos: 'DEF', grl: 79, energia: 100, edad: 30 },
      { id: 'v4', name: 'J. García', pos: 'DEF', grl: 78, energia: 100, edad: 24 },
      { id: 'v5', name: 'E. Gómez', pos: 'DEF', grl: 78, energia: 100, edad: 31 },
      { id: 'v6', name: 'C. Baeza', pos: 'MID', grl: 80, energia: 100, edad: 32 },
      { id: 'v7', name: 'L. Robertone', pos: 'MID', grl: 82, energia: 100, edad: 28 },
      { id: 'v8', name: 'R. Aliendro', pos: 'MID', grl: 81, energia: 100, edad: 35 },
      { id: 'v9', name: 'M. Lanzini', pos: 'MID', grl: 82, energia: 100, edad: 33 },
      { id: 'v10', name: 'M. Pellegrini', pos: 'DEL', grl: 79, energia: 100, edad: 26 },
      { id: 'v11', name: 'D. Godoy', pos: 'DEL', grl: 76, energia: 100, edad: 21 }
    ],
    suplentes: [
      { id: 'vs1', name: 'Á. Busso', pos: 'GK', grl: 70, energia: 100, edad: 21 },
      { id: 'vs2', name: 'A. Cortéz', pos: 'GK', grl: 71, energia: 100, edad: 21 },
      { id: 'vs3', name: 'T. Silvero', pos: 'DEF', grl: 72, energia: 100, edad: 20 },
      { id: 'vs4', name: 'A. Pereyra', pos: 'DEF', grl: 73, energia: 100, edad: 22 },
      { id: 'vs5', name: 'D. Valdés', pos: 'MID', grl: 78, energia: 100, edad: 32 },
      { id: 'vs6', name: 'T. Aguirre', pos: 'MID', grl: 74, energia: 100, edad: 23 },
      { id: 'vs7', name: 'T. Villalba', pos: 'MID', grl: 75, energia: 100, edad: 25 },
      { id: 'vs8', name: 'A. Verón', pos: 'DEL', grl: 71, energia: 100, edad: 19 },
      { id: 'vs9', name: 'J. Policella', pos: 'DEL', grl: 72, energia: 100, edad: 20 },
      { id: 'vs10', name: 'L. Piola', pos: 'DEL', grl: 72, energia: 100, edad: 20 },
      { id: 'vs11', name: 'S. Escobar', pos: 'DEL', grl: 71, energia: 100, edad: 20 }
    ]
  },
  { 
    id: 'rosariocentral', name: 'Rosario Central', img: '/Imag/RosarioCentral.png', dt: 'Jorge Almirón',
    presupuesto: 22000000, estilo: 'Posesión', grl: 80, color: '#FACC15',
    titulares: [
      { id: 'rc1', name: 'J. Ledesma', pos: 'GK', grl: 82, energia: 100, edad: 32 },
      { id: 'rc2', name: 'F. Mallo', pos: 'DEF', grl: 80, energia: 100, edad: 31 },
      { id: 'rc3', name: 'G. Ávila', pos: 'DEF', grl: 79, energia: 100, edad: 24 },
      { id: 'rc4', name: 'E. Coronel', pos: 'DEF', grl: 78, energia: 100, edad: 29 },
      { id: 'rc5', name: 'A. Sández', pos: 'DEF', grl: 77, energia: 100, edad: 24 },
      { id: 'rc6', name: 'G. Fernández', pos: 'MID', grl: 80, energia: 100, edad: 34 },
      { id: 'rc7', name: 'K. Gutiérrez', pos: 'MID', grl: 79, energia: 100, edad: 28 },
      { id: 'rc8', name: 'F. Navarro', pos: 'MID', grl: 78, energia: 100, edad: 26 },
      { id: 'rc9', name: 'Á. Di María', pos: 'DEL', grl: 86, energia: 100, edad: 38 },
      { id: 'rc10', name: 'E. Copetti', pos: 'DEL', grl: 80, energia: 100, edad: 30 },
      { id: 'rc11', name: 'T. Badaloni', pos: 'DEL', grl: 78, energia: 100, edad: 26 }
    ],
    suplentes: [
      { id: 'rcs1', name: 'D. Fernández', pos: 'GK', grl: 74, energia: 100, edad: 27 },
      { id: 'rcs2', name: 'L. Sosa', pos: 'GK', grl: 70, energia: 100, edad: 21 },
      { id: 'rcs3', name: 'J. Komar', pos: 'DEF', grl: 76, energia: 100, edad: 30 },
      { id: 'rcs4', name: 'A. Soto', pos: 'DEF', grl: 75, energia: 100, edad: 32 },
      { id: 'rcs5', name: 'J. Giménez', pos: 'DEF', grl: 71, energia: 100, edad: 20 },
      { id: 'rcs6', name: 'E. Verón', pos: 'DEF', grl: 70, energia: 100, edad: 20 },
      { id: 'rcs7', name: 'F. Ibarra', pos: 'MID', grl: 76, energia: 100, edad: 25 },
      { id: 'rcs8', name: 'S. Segovia', pos: 'MID', grl: 72, energia: 100, edad: 21 },
      { id: 'rcs9', name: 'V. Pizarro', pos: 'MID', grl: 75, energia: 100, edad: 23 },
      { id: 'rcs10', name: 'G. Duarte', pos: 'DEL', grl: 73, energia: 100, edad: 21 },
      { id: 'rcs11', name: 'P. Giaccone', pos: 'DEL', grl: 74, energia: 100, edad: 24 }
    ]
  },
  { 
    id: 'newells', name: 'Newell\'s Old Boys', img: '/Imag/Newells.png', dt: 'Frank Darío Kudelka',
    presupuesto: 18000000, estilo: 'Equilibrado', grl: 78, color: '#000000',
    titulares: [
      { id: 'n1', name: 'G. Arias', pos: 'GK', grl: 81, energia: 100, edad: 39 },
      { id: 'n2', name: 'L. Giannetti', pos: 'DEF', grl: 79, energia: 100, edad: 32 },
      { id: 'n3', name: 'F. Escobar', pos: 'DEF', grl: 78, energia: 100, edad: 31 },
      { id: 'n4', name: 'M. Ortega', pos: 'DEF', grl: 76, energia: 100, edad: 24 },
      { id: 'n5', name: 'M. Luciano', pos: 'DEF', grl: 75, energia: 100, edad: 22 },
      { id: 'n6', name: 'A. Soñora', pos: 'MID', grl: 78, energia: 100, edad: 28 },
      { id: 'n7', name: 'M. García', pos: 'MID', grl: 79, energia: 100, edad: 29 },
      { id: 'n8', name: 'R. Herrera', pos: 'MID', grl: 76, energia: 100, edad: 26 },
      { id: 'n9', name: 'W. Mazzantti', pos: 'DEL', grl: 78, energia: 100, edad: 30 },
      { id: 'n10', name: 'S. Solari', pos: 'DEL', grl: 79, energia: 100, edad: 29 },
      { id: 'n11', name: 'M. Cóccaro', pos: 'DEL', grl: 80, energia: 100, edad: 29 }
    ],
    suplentes: [
      { id: 'ns1', name: 'J. Reinatti', pos: 'GK', grl: 72, energia: 100, edad: 23 },
      { id: 'ns2', name: 'F. Sciarini', pos: 'GK', grl: 69, energia: 100, edad: 19 },
      { id: 'ns3', name: 'I. Glavinovich', pos: 'DEF', grl: 75, energia: 100, edad: 24 },
      { id: 'ns4', name: 'N. Goitea', pos: 'DEF', grl: 74, energia: 100, edad: 29 },
      { id: 'ns5', name: 'O. Salomón', pos: 'DEF', grl: 73, energia: 100, edad: 23 },
      { id: 'ns6', name: 'L. Regiardo', pos: 'MID', grl: 71, energia: 100, edad: 20 },
      { id: 'ns7', name: 'F. Guch', pos: 'MID', grl: 70, energia: 100, edad: 20 },
      { id: 'ns8', name: 'V. Acuña', pos: 'MID', grl: 72, energia: 100, edad: 20 },
      { id: 'ns9', name: 'L. Gómez', pos: 'MID', grl: 74, energia: 100, edad: 24 },
      { id: 'ns10', name: 'J. Ramírez', pos: 'DEL', grl: 77, energia: 100, edad: 29 },
      { id: 'ns11', name: 'W. Núñez', pos: 'DEL', grl: 73, energia: 100, edad: 23 }
    ]
  },
  { 
    id: 'huracan', name: 'Huracán', img: '/Imag/Huracan.png', dt: 'Diego Martínez',
    presupuesto: 16000000, estilo: 'Transición Rápida', grl: 79, color: '#FFFFFF',
    titulares: [
      { id: 'h1', name: 'H. Galíndez', pos: 'GK', grl: 80, energia: 100, edad: 39 },
      { id: 'h2', name: 'H. Nervo', pos: 'DEF', grl: 79, energia: 100, edad: 35 },
      { id: 'h3', name: 'F. Pereyra', pos: 'DEF', grl: 78, energia: 100, edad: 36 },
      { id: 'h4', name: 'L. Blondel', pos: 'DEF', grl: 80, energia: 100, edad: 29 },
      { id: 'h5', name: 'C. Ibáñez', pos: 'DEF', grl: 76, energia: 100, edad: 27 },
      { id: 'h6', name: 'R. Fernández', pos: 'MID', grl: 79, energia: 100, edad: 30 },
      { id: 'h7', name: 'L. Gil', pos: 'MID', grl: 80, energia: 100, edad: 35 },
      { id: 'h8', name: 'Ó. Romero', pos: 'MID', grl: 81, energia: 100, edad: 34 },
      { id: 'h9', name: 'I. Pussetto', pos: 'DEL', grl: 81, energia: 100, edad: 30 },
      { id: 'h10', name: 'J. Caicedo', pos: 'DEL', grl: 79, energia: 100, edad: 28 },
      { id: 'h11', name: 'B. Barticciotto', pos: 'DEL', grl: 78, energia: 100, edad: 25 }
    ],
    suplentes: [
      { id: 'hs1', name: 'S. Meza', pos: 'GK', grl: 75, energia: 100, edad: 26 },
      { id: 'hs2', name: 'N. Durán', pos: 'GK', grl: 70, energia: 100, edad: 22 },
      { id: 'hs3', name: 'F. Vera', pos: 'DEF', grl: 76, energia: 100, edad: 28 },
      { id: 'hs4', name: 'D. Zabala', pos: 'DEF', grl: 74, energia: 100, edad: 23 },
      { id: 'hs5', name: 'I. Campo', pos: 'DEF', grl: 71, energia: 100, edad: 21 },
      { id: 'hs6', name: 'F. Waller', pos: 'MID', grl: 77, energia: 100, edad: 29 },
      { id: 'hs7', name: 'E. Ojeda', pos: 'MID', grl: 76, energia: 100, edad: 28 },
      { id: 'hs8', name: 'F. Kalinger', pos: 'MID', grl: 70, energia: 100, edad: 21 },
      { id: 'hs9', name: 'Ó. Cortés', pos: 'DEL', grl: 76, energia: 100, edad: 22 },
      { id: 'hs10', name: 'J. Bisanz', pos: 'DEL', grl: 75, energia: 100, edad: 25 },
      { id: 'hs11', name: 'T. Peralta', pos: 'DEL', grl: 68, energia: 100, edad: 17 }
    ]
  },
  { 
    id: 'argentinos', name: 'Argentinos Jrs', img: '/Imag/ArgentinosJrs.png', dt: 'Nicolás Diez',
    presupuesto: 14000000, estilo: 'Posesión', grl: 77, color: '#DC2626',
    titulares: [
      { id: 'ar1', name: 'B. Cortés', pos: 'GK', grl: 80, energia: 100, edad: 31 },
      { id: 'ar2', name: 'F. Álvarez', pos: 'DEF', grl: 78, energia: 100, edad: 26 },
      { id: 'ar3', name: 'E. Godoy', pos: 'DEF', grl: 77, energia: 100, edad: 33 },
      { id: 'ar4', name: 'K. Coronel', pos: 'DEF', grl: 75, energia: 100, edad: 22 },
      { id: 'ar5', name: 'S. Prieto', pos: 'DEF', grl: 76, energia: 100, edad: 33 },
      { id: 'ar6', name: 'F. Fattori', pos: 'MID', grl: 77, energia: 100, edad: 34 },
      { id: 'ar7', name: 'H. López Muñoz', pos: 'MID', grl: 80, energia: 100, edad: 26 },
      { id: 'ar8', name: 'N. Oroz', pos: 'MID', grl: 78, energia: 100, edad: 31 },
      { id: 'ar9', name: 'E. Viveros', pos: 'DEL', grl: 76, energia: 100, edad: 23 },
      { id: 'ar10', name: 'G. Verón', pos: 'DEL', grl: 78, energia: 100, edad: 24 },
      { id: 'ar11', name: 'T. Molina', pos: 'DEL', grl: 77, energia: 100, edad: 30 }
    ],
    suplentes: [
      { id: 'ars1', name: 'D. Rodríguez', pos: 'GK', grl: 75, energia: 100, edad: 36 },
      { id: 'ars2', name: 'G. Siri Payer', pos: 'GK', grl: 70, energia: 100, edad: 23 },
      { id: 'ars3', name: 'F. Vázquez', pos: 'DEF', grl: 72, energia: 100, edad: 21 },
      { id: 'ars4', name: 'C. Bravo', pos: 'DEF', grl: 74, energia: 100, edad: 29 },
      { id: 'ars5', name: 'L. Sánchez', pos: 'DEF', grl: 73, energia: 100, edad: 32 },
      { id: 'ars6', name: 'J. Gho', pos: 'MID', grl: 74, energia: 100, edad: 23 },
      { id: 'ars7', name: 'G. Florentín', pos: 'MID', grl: 77, energia: 100, edad: 26 },
      { id: 'ars8', name: 'F. Paredes', pos: 'MID', grl: 75, energia: 100, edad: 27 },
      { id: 'ars9', name: 'I. Morales', pos: 'DEL', grl: 76, energia: 100, edad: 26 },
      { id: 'ars10', name: 'M. Giménez Rojas', pos: 'DEL', grl: 75, energia: 100, edad: 26 },
      { id: 'ars11', name: 'R. Kida', pos: 'DEL', grl: 72, energia: 100, edad: 21 }
    ]
  },
  { 
    id: 'gimnasia', name: 'Gimnasia (LP)', img: '/Imag/Gimnasia.png', dt: 'Ariel Pereyra',
    presupuesto: 12000000, estilo: 'Defensivo', grl: 75, color: '#1E3A8A',
    titulares: [
      { id: 'g1', name: 'N. Insfrán', pos: 'GK', grl: 76, energia: 100, edad: 31 },
      { id: 'g2', name: 'G. Conti', pos: 'DEF', grl: 78, energia: 100, edad: 32 },
      { id: 'g3', name: 'R. Giampaoli', pos: 'DEF', grl: 75, energia: 100, edad: 26 },
      { id: 'g4', name: 'P. Silva Torrejón', pos: 'DEF', grl: 74, energia: 100, edad: 29 },
      { id: 'g5', name: 'M. Melluso', pos: 'DEF', grl: 76, energia: 100, edad: 29 },
      { id: 'g6', name: 'I. Miramón', pos: 'MID', grl: 78, energia: 100, edad: 23 },
      { id: 'g7', name: 'A. Max', pos: 'MID', grl: 74, energia: 100, edad: 34 },
      { id: 'g8', name: 'I. Fernández', pos: 'MID', grl: 80, energia: 100, edad: 36 },
      { id: 'g9', name: 'L. Janson', pos: 'DEL', grl: 78, energia: 100, edad: 31 },
      { id: 'g10', name: 'M. Zalazar', pos: 'DEL', grl: 76, energia: 100, edad: 24 },
      { id: 'g11', name: 'A. Auzmendi', pos: 'DEL', grl: 77, energia: 100, edad: 29 }
    ],
    suplentes: [
      { id: 'gs1', name: 'H. Castillo', pos: 'GK', grl: 74, energia: 100, edad: 33 },
      { id: 'gs2', name: 'J. Kadijevic', pos: 'GK', grl: 70, energia: 100, edad: 22 },
      { id: 'gs3', name: 'G. Errecalde', pos: 'DEF', grl: 73, energia: 100, edad: 26 },
      { id: 'gs4', name: 'B. Barros Schelotto', pos: 'DEF', grl: 74, energia: 100, edad: 25 },
      { id: 'gs5', name: 'J. Cortazzo', pos: 'DEF', grl: 69, energia: 100, edad: 20 },
      { id: 'gs6', name: 'M. Seoane', pos: 'MID', grl: 72, energia: 100, edad: 21 },
      { id: 'gs7', name: 'N. Barros Schelotto', pos: 'MID', grl: 73, energia: 100, edad: 24 },
      { id: 'gs8', name: 'F. Di Biasi', pos: 'MID', grl: 70, energia: 100, edad: 21 },
      { id: 'gs9', name: 'P. Aguiar', pos: 'MID', grl: 71, energia: 100, edad: 22 },
      { id: 'gs10', name: 'M. Panaro', pos: 'DEL', grl: 72, energia: 100, edad: 22 },
      { id: 'gs11', name: 'J. Merlo', pos: 'DEL', grl: 73, energia: 100, edad: 23 }
    ]
  },
  { 
    id: 'lanus', name: 'Lanús', img: '/Imag/Lanus.png', dt: 'Mauricio Pellegrino',
    presupuesto: 17000000, estilo: 'Ofensivo', grl: 78, color: '#7F1D1D',
    titulares: [
      { id: 'l1', name: 'N. Losada', pos: 'GK', grl: 78, energia: 100, edad: 33 },
      { id: 'l2', name: 'C. Izquierdoz', pos: 'DEF', grl: 80, energia: 100, edad: 37 },
      { id: 'l3', name: 'J. Canale', pos: 'DEF', grl: 77, energia: 100, edad: 30 },
      { id: 'l4', name: 'T. Guidara', pos: 'DEF', grl: 76, energia: 100, edad: 30 },
      { id: 'l5', name: 'S. Marcich', pos: 'DEF', grl: 75, energia: 100, edad: 28 },
      { id: 'l6', name: 'R. Carrera', pos: 'MID', grl: 79, energia: 100, edad: 33 },
      { id: 'l7', name: 'G. Pérez Corral', pos: 'MID', grl: 76, energia: 100, edad: 23 },
      { id: 'l8', name: 'M. Moreno', pos: 'MID', grl: 81, energia: 100, edad: 31 },
      { id: 'l9', name: 'E. Salvio', pos: 'DEL', grl: 80, energia: 100, edad: 36 },
      { id: 'l10', name: 'L. Acosta', pos: 'DEL', grl: 79, energia: 100, edad: 38 },
      { id: 'l11', name: 'W. Bou', pos: 'DEL', grl: 80, energia: 100, edad: 32 }
    ],
    suplentes: [
      { id: 'ls1', name: 'F. Petroli', pos: 'GK', grl: 75, energia: 100, edad: 28 },
      { id: 'ls2', name: 'E. Dieguez', pos: 'GK', grl: 68, energia: 100, edad: 22 },
      { id: 'ls3', name: 'F. Sánchez', pos: 'DEF', grl: 71, energia: 100, edad: 21 },
      { id: 'ls4', name: 'B. Cabrera', pos: 'DEF', grl: 74, energia: 100, edad: 29 },
      { id: 'ls5', name: 'J. Cáceres', pos: 'DEF', grl: 75, energia: 100, edad: 25 },
      { id: 'ls6', name: 'A. Medina', pos: 'MID', grl: 73, energia: 100, edad: 23 },
      { id: 'ls7', name: 'D. Aquino', pos: 'MID', grl: 72, energia: 100, edad: 21 },
      { id: 'ls8', name: 'M. Sanabria', pos: 'DEL', grl: 74, energia: 100, edad: 22 },
      { id: 'ls9', name: 'A. Wlk', pos: 'DEL', grl: 73, energia: 100, edad: 22 }
    ]
  },
  { 
    id: 'talleres', name: 'Talleres', img: '/Imag/Talleres.png', dt: 'Omar De Felippe',
    presupuesto: 24000000, estilo: 'Físico', grl: 80, color: '#1E3A8A',
    titulares: [
      { id: 'ta1', name: 'E. Unsain', pos: 'GK', grl: 81, energia: 100, edad: 31 },
      { id: 'ta2', name: 'M. Catalán', pos: 'DEF', grl: 82, energia: 100, edad: 34 },
      { id: 'ta3', name: 'J. Palomino', pos: 'DEF', grl: 81, energia: 100, edad: 36 },
      { id: 'ta4', name: 'A. Schott', pos: 'DEF', grl: 77, energia: 100, edad: 26 },
      { id: 'ta5', name: 'G. Báez', pos: 'DEF', grl: 78, energia: 100, edad: 31 },
      { id: 'ta6', name: 'F. Fattori', pos: 'MID', grl: 79, energia: 100, edad: 34 },
      { id: 'ta7', name: 'J. Sforza', pos: 'MID', grl: 80, energia: 100, edad: 24 },
      { id: 'ta8', name: 'F. Cristaldo', pos: 'MID', grl: 82, energia: 100, edad: 30 },
      { id: 'ta9', name: 'D. Valoyes', pos: 'DEL', grl: 83, energia: 100, edad: 29 },
      { id: 'ta10', name: 'R. Rick', pos: 'DEL', grl: 79, energia: 100, edad: 27 },
      { id: 'ta11', name: 'A. Álvarez', pos: 'DEL', grl: 80, energia: 100, edad: 25 }
    ],
    suplentes: [
      { id: 'tas1', name: 'S. Barbi', pos: 'GK', grl: 70, energia: 100, edad: 21 },
      { id: 'tas2', name: 'J. Florentín', pos: 'GK', grl: 68, energia: 100, edad: 20 },
      { id: 'tas3', name: 'V. Fascendini', pos: 'DEF', grl: 74, energia: 100, edad: 23 },
      { id: 'tas4', name: 'S. Fernández', pos: 'DEF', grl: 72, energia: 100, edad: 21 },
      { id: 'tas5', name: 'A. Maidana', pos: 'DEF', grl: 71, energia: 100, edad: 21 },
      { id: 'tas6', name: 'A. Galarza', pos: 'MID', grl: 75, energia: 100, edad: 24 },
      { id: 'tas7', name: 'M. Cáceres', pos: 'MID', grl: 74, energia: 100, edad: 23 },
      { id: 'tas8', name: 'G. Baroni', pos: 'MID', grl: 69, energia: 100, edad: 17 },
      { id: 'tas9', name: 'V. Depietri', pos: 'DEL', grl: 77, energia: 100, edad: 25 },
      { id: 'tas10', name: 'B. Barticciotto', pos: 'DEL', grl: 78, energia: 100, edad: 25 },
      { id: 'tas11', name: 'V. Dávila', pos: 'DEL', grl: 70, energia: 100, edad: 19 }
    ]
  },
  { 
    id: 'belgrano', name: 'Belgrano', img: '/Imag/Belgrano.png', dt: 'Ricardo Zielinski',
    presupuesto: 15000000, estilo: 'Contragolpe', grl: 77, color: '#38BDF8',
    titulares: [
      { id: 'be1', name: 'M. Vicentini', pos: 'GK', grl: 78, energia: 100, edad: 35 },
      { id: 'be2', name: 'L. López', pos: 'DEF', grl: 79, energia: 100, edad: 36 },
      { id: 'be3', name: 'L. Morales', pos: 'DEF', grl: 78, energia: 100, edad: 35 },
      { id: 'be4', name: 'F. Ricca', pos: 'DEF', grl: 77, energia: 100, edad: 31 },
      { id: 'be5', name: 'A. Spörle', pos: 'DEF', grl: 76, energia: 100, edad: 31 },
      { id: 'be6', name: 'S. Longo', pos: 'MID', grl: 79, energia: 100, edad: 28 },
      { id: 'be7', name: 'F. Vázquez', pos: 'MID', grl: 81, energia: 100, edad: 37 },
      { id: 'be8', name: 'L. Zelarayán', pos: 'MID', grl: 82, energia: 100, edad: 34 },
      { id: 'be9', name: 'E. Rigoni', pos: 'MID', grl: 79, energia: 100, edad: 33 },
      { id: 'be10', name: 'N. Fernández', pos: 'DEL', grl: 80, energia: 100, edad: 30 },
      { id: 'be11', name: 'L. Passerini', pos: 'DEL', grl: 81, energia: 100, edad: 32 }
    ],
    suplentes: [
      { id: 'bes1', name: 'T. Cardozo', pos: 'GK', grl: 75, energia: 100, edad: 29 },
      { id: 'bes2', name: 'M. Daniele', pos: 'GK', grl: 70, energia: 100, edad: 22 },
      { id: 'bes3', name: 'A. Benítez', pos: 'DEF', grl: 73, energia: 100, edad: 24 },
      { id: 'bes4', name: 'A. Maldonado', pos: 'DEF', grl: 74, energia: 100, edad: 28 },
      { id: 'bes5', name: 'Á. Ocampo', pos: 'DEF', grl: 72, energia: 100, edad: 22 },
      { id: 'bes6', name: 'A. Falcón', pos: 'DEF', grl: 71, energia: 100, edad: 21 },
      { id: 'bes7', name: 'A. Sánchez', pos: 'MID', grl: 76, energia: 100, edad: 27 },
      { id: 'bes8', name: 'F. González', pos: 'MID', grl: 78, energia: 100, edad: 29 },
      { id: 'bes9', name: 'R. Hernandes', pos: 'MID', grl: 72, energia: 100, edad: 21 },
      { id: 'bes10', name: 'G. Zelarayán', pos: 'MID', grl: 73, energia: 100, edad: 22 },
      { id: 'bes11', name: 'L. Gutiérrez', pos: 'DEL', grl: 71, energia: 100, edad: 20 }
    ]
  },
  { 
    id: 'colon', name: 'Colón', img: '/Imag/Colon.png', dt: 'Iván Delfino',
    presupuesto: 11000000, estilo: 'Defensivo', grl: 74, color: '#DC2626',
    titulares: [
      { id: 'c1', name: 'M. Budiño', pos: 'GK', grl: 75, energia: 100, edad: 30 },
      { id: 'c2', name: 'P. Barrios', pos: 'DEF', grl: 76, energia: 100, edad: 35 },
      { id: 'c3', name: 'F. Rasmussen', pos: 'DEF', grl: 77, energia: 100, edad: 33 },
      { id: 'c4', name: 'M. Peinipil', pos: 'DEF', grl: 74, energia: 100, edad: 24 },
      { id: 'c5', name: 'F. Castet', pos: 'DEF', grl: 75, energia: 100, edad: 30 },
      { id: 'c6', name: 'F. Lértora', pos: 'MID', grl: 78, energia: 100, edad: 36 },
      { id: 'c7', name: 'I. Antonio', pos: 'MID', grl: 75, energia: 100, edad: 29 },
      { id: 'c8', name: 'M. Muñoz', pos: 'MID', grl: 74, energia: 100, edad: 25 },
      { id: 'c9', name: 'I. Lago', pos: 'DEL', grl: 76, energia: 100, edad: 23 },
      { id: 'c10', name: 'J. Marcioni', pos: 'DEL', grl: 75, energia: 100, edad: 28 },
      { id: 'c11', name: 'L. Garate', pos: 'DEL', grl: 77, energia: 100, edad: 33 }
    ],
    suplentes: [
      { id: 'cs1', name: 'T. Giménez', pos: 'GK', grl: 73, energia: 100, edad: 27 },
      { id: 'cs2', name: 'T. Paredes', pos: 'GK', grl: 69, energia: 100, edad: 22 },
      { id: 'cs3', name: 'N. Thaller', pos: 'DEF', grl: 74, energia: 100, edad: 28 },
      { id: 'cs4', name: 'L. Picech', pos: 'DEF', grl: 71, energia: 100, edad: 23 },
      { id: 'cs5', name: 'S. Olmedo', pos: 'DEF', grl: 72, energia: 100, edad: 24 },
      { id: 'cs6', name: 'A. Toledo', pos: 'MID', grl: 73, energia: 100, edad: 24 },
      { id: 'cs7', name: 'B. Maillier', pos: 'MID', grl: 71, energia: 100, edad: 22 },
      { id: 'cs8', name: 'Z. Yunis', pos: 'MID', grl: 69, energia: 100, edad: 20 },
      { id: 'cs9', name: 'A. Bonansea', pos: 'DEL', grl: 75, energia: 100, edad: 31 },
      { id: 'cs10', name: 'F. García', pos: 'DEL', grl: 74, energia: 100, edad: 26 }
    ]
  },
  { 
    id: 'quilmes', name: 'Quilmes', img: '/Imag/Quilmes.png', dt: 'Leandro Gracián',
    presupuesto: 9000000, estilo: 'Equilibrado', grl: 73, color: '#FFFFFF',
    titulares: [
      { id: 'q1', name: 'G. Marinelli', pos: 'GK', grl: 76, energia: 100, edad: 37 },
      { id: 'q2', name: 'A. Kippes', pos: 'DEF', grl: 75, energia: 100, edad: 32 },
      { id: 'q3', name: 'L. Recalde', pos: 'DEF', grl: 74, energia: 100, edad: 26 },
      { id: 'q4', name: 'R. Lozano', pos: 'DEF', grl: 75, energia: 100, edad: 29 },
      { id: 'q5', name: 'A. Bindella', pos: 'MID', grl: 73, energia: 100, edad: 28 },
      { id: 'q6', name: 'A. Bolívar', pos: 'MID', grl: 75, energia: 100, edad: 30 },
      { id: 'q7', name: 'R. Luna', pos: 'MID', grl: 74, energia: 100, edad: 27 },
      { id: 'q8', name: 'F. Yozwiak', pos: 'MID', grl: 72, energia: 100, edad: 24 },
      { id: 'q9', name: 'U. Vera', pos: 'DEL', grl: 73, energia: 100, edad: 23 },
      { id: 'q10', name: 'F. Balmaceda', pos: 'DEL', grl: 72, energia: 100, edad: 24 },
      { id: 'q11', name: 'A. Spetale', pos: 'DEL', grl: 74, energia: 100, edad: 25 }
    ],
    suplentes: [
      { id: 'qs1', name: 'E. Glellel', pos: 'GK', grl: 73, energia: 100, edad: 27 },
      { id: 'qs2', name: 'L. Herrera', pos: 'GK', grl: 68, energia: 100, edad: 20 },
      { id: 'qs3', name: 'A. Ortega', pos: 'DEF', grl: 72, energia: 100, edad: 25 },
      { id: 'qs4', name: 'L. Closter', pos: 'DEF', grl: 71, energia: 100, edad: 25 },
      { id: 'qs5', name: 'L. Romeo', pos: 'DEF', grl: 70, energia: 100, edad: 24 },
      { id: 'qs6', name: 'I. Rasso', pos: 'DEF', grl: 71, energia: 100, edad: 25 },
      { id: 'qs7', name: 'M. Juárez', pos: 'DEF', grl: 68, energia: 100, edad: 20 },
      { id: 'qs8', name: 'S. Luna', pos: 'MID', grl: 70, energia: 100, edad: 22 },
      { id: 'qs9', name: 'J. Postigo', pos: 'MID', grl: 71, energia: 100, edad: 22 },
      { id: 'qs10', name: 'M. Paredes', pos: 'MID', grl: 69, energia: 100, edad: 21 },
      { id: 'qs11', name: 'J. Capano', pos: 'DEL', grl: 71, energia: 100, edad: 23 }
    ]
  },
  { 
    id: 'chacarita', name: 'Chacarita', img: '/Imag/Chacarita.png', dt: 'Sergio Gabriel Rondina',
    presupuesto: 8000000, estilo: 'Transición Rápida', grl: 72, color: '#DC2626',
    titulares: [
      { id: 'ch1', name: 'E. Bologna', pos: 'GK', grl: 76, energia: 100, edad: 44 },
      { id: 'ch2', name: 'S. Vittor', pos: 'DEF', grl: 77, energia: 100, edad: 37 },
      { id: 'ch3', name: 'N. Pantaleone', pos: 'DEF', grl: 75, energia: 100, edad: 33 },
      { id: 'ch4', name: 'F. Facello', pos: 'DEF', grl: 71, energia: 100, edad: 22 },
      { id: 'ch5', name: 'N. Chaves', pos: 'DEF', grl: 73, energia: 100, edad: 30 },
      { id: 'ch6', name: 'L. Perdomo', pos: 'MID', grl: 76, energia: 100, edad: 28 },
      { id: 'ch7', name: 'C. Guanca', pos: 'MID', grl: 77, energia: 100, edad: 33 },
      { id: 'ch8', name: 'A. Cuello', pos: 'MID', grl: 74, energia: 100, edad: 25 },
      { id: 'ch9', name: 'M. Cuero', pos: 'DEL', grl: 76, energia: 100, edad: 33 },
      { id: 'ch10', name: 'M. Sanabria', pos: 'DEL', grl: 73, energia: 100, edad: 24 },
      { id: 'ch11', name: 'A. Domínguez', pos: 'DEL', grl: 74, energia: 100, edad: 24 }
    ],
    suplentes: [
      { id: 'chs1', name: 'F. Losas', pos: 'GK', grl: 71, energia: 100, edad: 24 },
      { id: 'chs2', name: 'G. Fernández', pos: 'GK', grl: 70, energia: 100, edad: 26 },
      { id: 'chs3', name: 'B. Calderara', pos: 'DEF', grl: 72, energia: 100, edad: 28 },
      { id: 'chs4', name: 'M. Leyendeker', pos: 'DEF', grl: 73, energia: 100, edad: 26 },
      { id: 'chs5', name: 'S. Acosta', pos: 'DEF', grl: 69, energia: 100, edad: 20 },
      { id: 'chs6', name: 'G. Dell\'Aquila', pos: 'DEF', grl: 68, energia: 100, edad: 21 },
      { id: 'chs7', name: 'T. Pérez Serra', pos: 'MID', grl: 72, energia: 100, edad: 23 },
      { id: 'chs8', name: 'L. Bustos', pos: 'MID', grl: 71, energia: 100, edad: 22 },
      { id: 'chs9', name: 'L. Brun', pos: 'MID', grl: 70, energia: 100, edad: 21 },
      { id: 'chs10', name: 'M. Meléndez', pos: 'MID', grl: 69, energia: 100, edad: 21 },
      { id: 'chs11', name: 'M. Jaime', pos: 'DEL', grl: 72, energia: 100, edad: 24 }
    ]
  }
];