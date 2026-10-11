export const CATEGORIAS_ALBUM = [
  { id: 'U', nombre: 'Jugadores', paginas: 16, total: 80 },
  { id: 'V', nombre: 'Vips', paginas: 2, total: 10 },
  { id: 'JR', nombre: 'Jug. Reconocidos', paginas: 2, total: 10 },
  { id: 'BL', nombre: 'Blacklisteados', paginas: 4, total: 20 },
  { id: 'ES', nombre: 'ExStaff', paginas: 4, total: 20 },
  { id: 'S', nombre: 'Staff', paginas: 4, total: 20 },
  { id: 'M', nombre: 'Momentos', paginas: 6, total: 30 }
];

                                                                     
const generarDatosCromos = () => {
  const data = {};
  CATEGORIAS_ALBUM.forEach(cat => {
    for (let i = 1; i <= cat.total; i++) {
      const idStr = `${cat.id}_${String(i).padStart(3, '0')}`;
      data[idStr] = {
        id: idStr,
        name: `Desconocido`,                                              
        pos: "N/A",
        nacionalidad: "Desconocida",
        categoria: cat.nombre
      };
    }
  });
  return data;
};

export const CROMOS_DATA = generarDatosCromos();

                                                                
CROMOS_DATA["U_001"] = { id: "U_001", name: "! kalet", pos: "MC", nacionalidad: "Perú", categoria: "Jugadores" };
CROMOS_DATA["U_002"] = { id: "U_002", name: "Lukk", pos: "DC", nacionalidad: "Argentina", categoria: "Jugadores" };
CROMOS_DATA["BL_001"] = { id: "BL_001", name: "Troll 1", pos: "N/A", nacionalidad: "Banlandia", categoria: "Blacklisteados" };

export const TODOS_LOS_CROMOS = Object.keys(CROMOS_DATA);
export const OBTENER_TOTAL_CROMOS = () => TODOS_LOS_CROMOS.length;                 