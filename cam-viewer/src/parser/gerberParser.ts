import type {
  FormatSpec,
  Unit,
  Aperture,
  ApertureShape,
  GerberCommand,
  GerberLayer,
  Interpolation,
  Polarity,
} from '../types/gerber';

/**
 * Gerber RS-274X Parser
 * Parses standard Gerber format files used in PCB manufacturing
 */
export class GerberParser {
  private format: FormatSpec = { xInteger: 2, xDecimal: 6, yInteger: 2, yDecimal: 6 };
  private unit: Unit = 'IN';
  private apertures: Map<number, Aperture> = new Map();
  private commands: GerberCommand[] = [];
  private currentAperture: number = 10;
  private currentX: number = 0;
  private currentY: number = 0;
  private interpolation: Interpolation = 'linear';
  private regionMode: boolean = false;
  private polarity: Polarity = 'dark';
  private layerName: string = '';

  private minX = Infinity;
  private minY = Infinity;
  private maxX = -Infinity;
  private maxY = -Infinity;

  parse(content: string, fileName: string): GerberLayer {
    this.reset();
    const lines = content.split(/\r?\n/);
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line || line === '*') {
        i++;
        continue;
      }

      // Extended command (% ... *%)
      if (line.startsWith('%')) {
        let extCmd = line;
        // Multi-line extended command
        while (!extCmd.endsWith('%') && i + 1 < lines.length) {
          i++;
          extCmd += lines[i].trim();
        }
        this.parseExtendedCommand(extCmd);
      } else {
        // Standard command - may contain multiple commands separated by *
        const cmds = line.split('*').filter(c => c.length > 0);
        for (const cmd of cmds) {
          this.parseCommand(cmd);
        }
      }
      i++;
    }

    return {
      name: this.layerName || fileName,
      fileName,
      unit: this.unit,
      format: { ...this.format },
      apertures: new Map(this.apertures),
      commands: [...this.commands],
      bounds: {
        minX: this.minX === Infinity ? 0 : this.minX,
        minY: this.minY === Infinity ? 0 : this.minY,
        maxX: this.maxX === -Infinity ? 0 : this.maxX,
        maxY: this.maxY === -Infinity ? 0 : this.maxY,
      },
      polarity: this.polarity,
    };
  }

  private reset() {
    this.format = { xInteger: 2, xDecimal: 6, yInteger: 2, yDecimal: 6 };
    this.unit = 'IN';
    this.apertures = new Map();
    this.commands = [];
    this.currentAperture = 10;
    this.currentX = 0;
    this.currentY = 0;
    this.interpolation = 'linear';
    this.regionMode = false;
    this.polarity = 'dark';
    this.layerName = '';
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
  }

  private parseExtendedCommand(line: string) {
    // Remove % delimiters
    const content = line.replace(/^%/, '').replace(/%$/, '').replace(/\*$/, '');

    // Format specification: FSLAX26Y26
    const fsMatch = content.match(/^FS([LT]?)([AI]?)X(\d)(\d)Y(\d)(\d)/);
    if (fsMatch) {
      this.format = {
        xInteger: parseInt(fsMatch[3]),
        xDecimal: parseInt(fsMatch[4]),
        yInteger: parseInt(fsMatch[5]),
        yDecimal: parseInt(fsMatch[6]),
      };
      return;
    }

    // Mode: MOIN or MOMM
    if (content === 'MOIN') {
      this.unit = 'IN';
      return;
    }
    if (content === 'MOMM') {
      this.unit = 'MM';
      return;
    }

    // Aperture definition: ADD<code><shape>,<params>
    const adMatch = content.match(/^ADD(\d+)([CROP]),?([\d.X]*)/);
    if (adMatch) {
      const code = parseInt(adMatch[1]);
      const shape = adMatch[2] as ApertureShape;
      const paramStr = adMatch[3] || '';
      const params = paramStr.split('X').filter(s => s).map(Number);
      this.apertures.set(code, { code, shape, params });
      return;
    }

    // Image polarity
    if (content.startsWith('IP')) {
      this.polarity = content.includes('POS') ? 'dark' : 'clear';
      return;
    }

    // Layer name
    const lnMatch = content.match(/^LN(.+)/);
    if (lnMatch) {
      this.layerName = lnMatch[1];
      return;
    }

    // Layer polarity
    const lpMatch = content.match(/^LP([DC])/);
    if (lpMatch) {
      const pol: Polarity = lpMatch[1] === 'D' ? 'dark' : 'clear';
      this.commands.push({ type: 'polarity', polarity: pol });
      return;
    }
  }

  private parseCoordinate(value: string, intDigits: number, decDigits: number): number {
    const totalDigits = intDigits + decDigits;
    // Pad with leading zeros if needed
    const isNeg = value.startsWith('-');
    let numStr = isNeg ? value.slice(1) : value;
    numStr = numStr.padStart(totalDigits, '0');
    const intPart = numStr.slice(0, numStr.length - decDigits);
    const decPart = numStr.slice(numStr.length - decDigits);
    const result = parseFloat(intPart + '.' + decPart);
    return isNeg ? -result : result;
  }

  private parseCommand(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // G codes
    if (trimmed.startsWith('G01') || trimmed === 'G1') {
      this.interpolation = 'linear';
      // May have coordinates after G01
      if (trimmed.length > 3) {
        this.parseCommand(trimmed.slice(3));
      }
      return;
    }
    if (trimmed.startsWith('G02') || trimmed === 'G2') {
      this.interpolation = 'cw';
      if (trimmed.length > 3) {
        this.parseCommand(trimmed.slice(3));
      }
      return;
    }
    if (trimmed.startsWith('G03') || trimmed === 'G3') {
      this.interpolation = 'ccw';
      if (trimmed.length > 3) {
        this.parseCommand(trimmed.slice(3));
      }
      return;
    }

    // G36/G37 Region mode
    if (trimmed === 'G36') {
      this.regionMode = true;
      this.commands.push({ type: 'regionStart' });
      return;
    }
    if (trimmed === 'G37') {
      this.regionMode = false;
      this.commands.push({ type: 'regionEnd' });
      return;
    }

    // G54 - Select aperture (obsolete but still used)
    if (trimmed.startsWith('G54')) {
      this.parseCommand(trimmed.slice(3));
      return;
    }

    // G75 - Multi-quadrant mode (just acknowledge)
    if (trimmed === 'G75' || trimmed === 'G74') return;

    // Aperture selection Dnn
    const dMatch = trimmed.match(/^D(\d+)$/);
    if (dMatch) {
      const code = parseInt(dMatch[1]);
      if (code >= 10) {
        this.currentAperture = code;
      }
      return;
    }

    // Coordinate commands with D code
    const coordMatch = trimmed.match(
      /^(?:G0?([123]))?(?:X(-?\d+))?(?:Y(-?\d+))?(?:I(-?\d+))?(?:J(-?\d+))?D(0[123])/
    );
    if (coordMatch) {
      // Update interpolation from inline G code
      if (coordMatch[1]) {
        const g = parseInt(coordMatch[1]);
        if (g === 1) this.interpolation = 'linear';
        else if (g === 2) this.interpolation = 'cw';
        else if (g === 3) this.interpolation = 'ccw';
      }

      const x = coordMatch[2]
        ? this.parseCoordinate(coordMatch[2], this.format.xInteger, this.format.xDecimal)
        : this.currentX;
      const y = coordMatch[3]
        ? this.parseCoordinate(coordMatch[3], this.format.yInteger, this.format.yDecimal)
        : this.currentY;
      const i = coordMatch[4]
        ? this.parseCoordinate(coordMatch[4], this.format.xInteger, this.format.xDecimal)
        : 0;
      const j = coordMatch[5]
        ? this.parseCoordinate(coordMatch[5], this.format.yInteger, this.format.yDecimal)
        : 0;
      const dCode = parseInt(coordMatch[6]);

      this.updateBounds(x, y);

      if (dCode === 1) {
        // Draw (interpolate)
        if (this.regionMode) {
          if (this.interpolation === 'linear') {
            this.commands.push({ type: 'regionLine', x, y, interpolation: this.interpolation });
          } else {
            this.commands.push({
              type: 'regionArc',
              x, y, i, j,
              interpolation: this.interpolation as 'cw' | 'ccw',
            });
          }
        } else {
          if (this.interpolation === 'linear') {
            this.commands.push({
              type: 'line', x, y,
              aperture: this.currentAperture,
              interpolation: this.interpolation,
            });
          } else {
            this.commands.push({
              type: 'arc', x, y, i, j,
              aperture: this.currentAperture,
              interpolation: this.interpolation as 'cw' | 'ccw',
            });
          }
        }
      } else if (dCode === 2) {
        // Move
        if (this.regionMode) {
          this.commands.push({ type: 'regionMove', x, y });
        } else {
          this.commands.push({ type: 'move', x, y });
        }
      } else if (dCode === 3) {
        // Flash
        this.commands.push({ type: 'flash', x, y, aperture: this.currentAperture });
      }

      this.currentX = x;
      this.currentY = y;
      return;
    }

    // M02 = end of file
    if (trimmed === 'M02' || trimmed === 'M00') return;
  }

  private updateBounds(x: number, y: number) {
    if (x < this.minX) this.minX = x;
    if (x > this.maxX) this.maxX = x;
    if (y < this.minY) this.minY = y;
    if (y > this.maxY) this.maxY = y;
  }
}
