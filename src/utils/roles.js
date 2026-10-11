                     

export const RANGOS = {
  100: { nombre: 'Trueno', color: '#F1C40F', permisos: ['all'] },
  90:  { nombre: 'Owner', color: '#F1C40F', permisos: ['admin', 'mod'] },
  80:  { nombre: 'Senior Staff', color: '#9B59B6', permisos: ['admin', 'mod'] },
  70:  { nombre: 'Jefe Admin', color: '#E91E63', permisos: ['admin', 'mod'] },
  60:  { nombre: 'Administrador', color: '#1E3A8A', permisos: ['admin', 'mod'] },
  50:  { nombre: 'Community Manager', color: '#E67E22', permisos: ['mod', 'news'] },
  40:  { nombre: 'Moderador', color: '#A3E4D7', permisos: ['mod'] },
  30:  { nombre: 'Ayudante', color: '#2ECC71', permisos: ['support'] },
  20:  { nombre: 'Miembro De Honor', color: '#8E44AD', permisos: ['vip_perks'] },
  15:  { nombre: 'VIP Trueno', color: '#F39C12', permisos: ['vip_perks'] },
  10:  { nombre: 'VIP', color: '#1ABC9C', permisos: ['vip_perks'] },
  0:   { nombre: 'Usuario', color: '#9A9A9A', permisos: [] }
};

export const obtenerRango = (nivel) => {
                                                                        
  return RANGOS[nivel] || RANGOS[0];
};