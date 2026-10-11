export const KITS_DATA = {
  "THC": [
    { name: "Titular", code: "/colors red 90 FFFFFF FF8214 772907" },
    { name: "Suplente", code: "/colors red 90 FFFFFF 111111 FF8214" } 
  ],
  "BOCA JUNIORS": [
    { name: "Titular", code: "/colors blue 90 212121 003BC5 DFB900 003BC5" },
    { name: "Suplente", code: "/colors blue 90 0841C7 D8BC06" }
  ],
  "RIVER PLATE": [
    { name: "Titular", code: "/colors red 60 1F1F1F D6D6D6 C71616 D6D6D6" },
    { name: "Suplente", code: "/colors red 60 D6D6D6 212121 C71616 212121" }
  ],
  "RACING": [
    { name: "Titular", code: "/colors red 180 2E2E2E 2E91CD E8E8E8 2E91CD" },
    { name: "Suplente", code: "/colors red 180 0E98C2 2E2E2E" }
  ],
  "ALIANZA LIMA": [
    { name: "Titular", code: "/colors blue 0 A18D45 092D4F E7E8E1 092D4F" },
    { name: "Suplente", code: "/colors blue 60 FFFFFF 1A2D57 101C35 0A1221" },
    { name: "Alterna", code: "/colors blue 0 A19020 FFFFFF 0E2043 FFFFFF" }
  ]
};

                                        
export const getTeamKits = (teamName) => {
  const name = teamName.toUpperCase();
  if (name.includes("BOCA")) return KITS_DATA["BOCA JUNIORS"];
  if (name.includes("RIVER")) return KITS_DATA["RIVER PLATE"];
  if (name.includes("RACING")) return KITS_DATA["RACING"];
  if (name.includes("ALIANZA")) return KITS_DATA["ALIANZA LIMA"];
  return KITS_DATA["THC"]; 
};

                                                                        
export const parseKit = (kitCode) => {
  if (!kitCode) return { angle: 90, textColor: '#FFF', colors: ['#333', '#111'] };
  const parts = kitCode.trim().replace(/\s+/g, ' ').split(' ');
  const angle = parseInt(parts[2]) || 0;
  const textColor = parts[3] && parts[3] !== 'null' ? `#${parts[3]}` : '#FFFFFF';
  const colors = parts.slice(4).filter(c => c && c !== 'null').map(c => `#${c}`);
  return { angle, textColor, colors: colors.length ? colors : ['#333', '#111'] };
};

