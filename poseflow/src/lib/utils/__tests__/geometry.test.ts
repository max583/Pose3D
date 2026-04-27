import { describe, it, expect } from 'vitest';
import { clipLineToRect } from '../geometry';

const RECT = { xmin: 0, ymin: 0, xmax: 100, ymax: 100 };

function clip(x0: number, y0: number, x1: number, y1: number) {
  return clipLineToRect(x0, y0, x1, y1, RECT.xmin, RECT.ymin, RECT.xmax, RECT.ymax);
}

describe('clipLineToRect (Liang–Barsky)', () => {
  it('отрезок полностью внутри прямоугольника возвращается без изменений', () => {
    const result = clip(10, 10, 90, 90);
    expect(result).not.toBeNull();
    const [x0, y0, x1, y1] = result!;
    expect(x0).toBeCloseTo(10, 6);
    expect(y0).toBeCloseTo(10, 6);
    expect(x1).toBeCloseTo(90, 6);
    expect(y1).toBeCloseTo(90, 6);
  });

  it('отрезок полностью снаружи (слева) возвращает null', () => {
    expect(clip(-50, 10, -10, 90)).toBeNull();
  });

  it('отрезок полностью снаружи (справа) возвращает null', () => {
    expect(clip(110, 10, 150, 90)).toBeNull();
  });

  it('отрезок полностью снаружи (сверху) возвращает null', () => {
    expect(clip(10, -50, 90, -10)).toBeNull();
  });

  it('отрезок пересекает левую границу', () => {
    // Из (-50, 50) в (50, 50) — горизонталь через центр
    const result = clip(-50, 50, 50, 50);
    expect(result).not.toBeNull();
    const [x0, y0, x1, y1] = result!;
    expect(x0).toBeCloseTo(0, 6);   // левая граница
    expect(y0).toBeCloseTo(50, 6);
    expect(x1).toBeCloseTo(50, 6);
    expect(y1).toBeCloseTo(50, 6);
  });

  it('отрезок пересекает обе вертикальные границы', () => {
    // Из (-20, 50) в (120, 50)
    const result = clip(-20, 50, 120, 50);
    expect(result).not.toBeNull();
    const [x0, y0, x1, y1] = result!;
    expect(x0).toBeCloseTo(0,   6);
    expect(y0).toBeCloseTo(50,  6);
    expect(x1).toBeCloseTo(100, 6);
    expect(y1).toBeCloseTo(50,  6);
  });

  it('диагональный отрезок из угла в угол не обрезается', () => {
    const result = clip(0, 0, 100, 100);
    expect(result).not.toBeNull();
    const [x0, y0, x1, y1] = result!;
    expect(x0).toBeCloseTo(0,   6);
    expect(y0).toBeCloseTo(0,   6);
    expect(x1).toBeCloseTo(100, 6);
    expect(y1).toBeCloseTo(100, 6);
  });

  it('диагональный отрезок выходящий за углы обрезается с двух сторон', () => {
    // Из (-10,-10) в (110,110) — линия y=x
    const result = clip(-10, -10, 110, 110);
    expect(result).not.toBeNull();
    const [x0, y0, x1, y1] = result!;
    expect(x0).toBeCloseTo(0,   4);
    expect(y0).toBeCloseTo(0,   4);
    expect(x1).toBeCloseTo(100, 4);
    expect(y1).toBeCloseTo(100, 4);
  });

  it('вертикальный отрезок пересекающий верхнюю границу', () => {
    // Из (50, -20) в (50, 50)
    const result = clip(50, -20, 50, 50);
    expect(result).not.toBeNull();
    const [x0, y0, x1, y1] = result!;
    expect(x0).toBeCloseTo(50, 6);
    expect(y0).toBeCloseTo(0,  6);
    expect(x1).toBeCloseTo(50, 6);
    expect(y1).toBeCloseTo(50, 6);
  });

  it('точка (нулевой отрезок) внутри прямоугольника не обрезается', () => {
    const result = clip(50, 50, 50, 50);
    expect(result).not.toBeNull();
    const [x0, y0, x1, y1] = result!;
    expect(x0).toBeCloseTo(50, 6);
    expect(y0).toBeCloseTo(50, 6);
    expect(x1).toBeCloseTo(50, 6);
    expect(y1).toBeCloseTo(50, 6);
  });

  it('точка снаружи прямоугольника возвращает null', () => {
    expect(clip(150, 150, 150, 150)).toBeNull();
  });
});
