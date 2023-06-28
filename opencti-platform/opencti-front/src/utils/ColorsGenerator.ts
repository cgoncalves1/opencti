const toHex = (c: number) => {
  const hex = c.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};
const rgbToHex = (r: number, g: number, b: number) => {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const generateGreenToRedColor = (n: number) => {
  const red = (n > 50 ? (1 - 2 * ((n - 50) / 100.0)) : 1.0) * 255;
  const green = (n > 50 ? 1.0 : ((2 * n) / 100.0)) * 255;
  const blue = 50;
  return rgbToHex(Math.round(red), Math.round(green), Math.round(blue));
};

const generateGreenToRedColors = (size: number) => {
  const fact = 100 / size;
  const ns = Array.from(Array(size).keys()).map((idx) => idx * fact);
  return ns.map((n) => generateGreenToRedColor(n));
};

export default generateGreenToRedColors;
