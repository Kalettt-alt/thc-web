export const getLimites = (nivel) => {
  const lvl = parseInt(nivel) || 0;
  if (lvl >= 15) return { bio: 250, widgets: 2, apodoDias: 4, bannerGif: true };
  if (lvl >= 10) return { bio: 200, widgets: 2, apodoDias: 4, bannerGif: false };
  return { bio: 150, widgets: 1, apodoDias: 7, bannerGif: false };
};


