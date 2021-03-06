const COLUMNS = {
  hospitalizations: 8 + 1,
  beds: 11 + 1,
  deaths: 10 + 1,
  infected: 9 + 1,
  totalPopulation: 16 + 1,
  rt: 13 + 1,
  rtStdev: 14 + 1,
  date: 0 + 1,
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

//intersection between lines connect points [a, b] and [c, d]
function intersection(a: any, b: any, c: any, d: any) {
  const det = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x),
    l = a.x * b.y - a.y * b.x,
    m = c.x * d.y - c.y * d.x,
    ix = (l * (c.x - d.x) - m * (a.x - b.x)) / det,
    iy = (l * (c.y - d.y) - m * (a.y - b.y)) / det,
    i = { x: ix, y: iy };

  return i;
}

/** Parameters that can be provided when constructing a Projection. */
export interface ProjectionParameters {
  intervention: string;
  isInferred: boolean;
  durationDays?: number;
  delayDays?: number;
}

/**
 * Represents a single projection for a given state or county.  Contains a
 * time-series of things like hospitalizations, hospital capacity, infections, etc.
 * The projection is either static or "inferred".  Inferred projections are based
 * on the actual data observed in a given location
 */
export class Projection {
  intervention: string;
  isInferred: boolean;
  durationDays: number | null;
  delayDays: number;
  rt: number | null;
  rtStdev: number | undefined;
  dates: Date[];
  dayZero: Date;
  daysSinceDayZero: number;
  hospitalizations: number[];
  beds: number[];
  deaths: number[];
  cumulativeDeaths: number[];
  totalPopulation: number;
  infected: number[];
  cumulativeInfected: number[];
  cumulativeDead: number;
  dateOverwhelmed: Date | null;

  constructor(data: any[], parameters: ProjectionParameters) {
    this.intervention = parameters.intervention;
    this.isInferred = parameters.isInferred;
    this.durationDays = parameters.durationDays || null /* permanent */;
    this.delayDays = parameters.delayDays || 0;
    this.rt = null;
    if (this.isInferred) {
      this.rt = data[data.length - 1][COLUMNS.rt];
      this.rtStdev = data[data.length - 1][COLUMNS.rtStdev];
    }
    let _parseInt = (number: string) => {
      // remove , in strings
      if (typeof number == 'string') {
        number = number.replace(/,/g, '');
      }
      return number ? parseInt(number) : 0;
    };

    this.dates = data.map(row => new Date(row[COLUMNS.date]));
    this.dayZero = this.dates[0];
    this.daysSinceDayZero = Math.floor(
      (new Date().getTime() - this.dayZero.getTime()) / MS_PER_DAY,
    );

    this.hospitalizations = data.map(row =>
      _parseInt(row[COLUMNS.hospitalizations]),
    );
    this.beds = data.map(row => _parseInt(row[COLUMNS.beds]));
    this.deaths = data.map(row => _parseInt(row[COLUMNS.deaths]));
    this.cumulativeDeaths = this.deaths;
    this.totalPopulation = _parseInt(data[0][COLUMNS.totalPopulation]);
    this.infected = data.map(row => _parseInt(row[COLUMNS.infected]));

    this.cumulativeInfected = [];
    let infectedSoFar = 0;
    for (let i = 0; i < this.infected.length; i++) {
      infectedSoFar += this.infected[i];
      this.cumulativeInfected.push(infectedSoFar * (2 / 3));
    }

    this.cumulativeDead = this.cumulativeDeaths[
      this.cumulativeDeaths.length - 1
    ];

    // approximate the date when the hospitals will be overwhelmed
    // assume r0~=2 => 25% daily case growth
    let overwhelmedIdx = this.dates.findIndex(
      (num, idx) => this.hospitalizations[idx] > this.beds[idx],
    );

    if (overwhelmedIdx === -1) {
      this.dateOverwhelmed = null;
    } else {
      // since we only get reports every 4 daysfind x coordinate of the crossing point of
      // hospitalizations and beds.
      const startIdx = Math.max(0, overwhelmedIdx - 1); // can't get overwhelmed before day 0
      const endIdx = overwhelmedIdx;
      // create coords normalized with an x range of 1
      const bedsStart = { y: this.beds[startIdx], x: 0 };
      const bedsEnd = { y: this.beds[endIdx], x: 1 };
      const hospitalizationsStart = {
        y: this.hospitalizations[startIdx],
        x: 0,
      };
      const hospitalizationsEnd = {
        y: this.hospitalizations[endIdx],
        x: 1,
      };
      // find the point at which they intersect. this method uses linear interpolation for
      // simplicity so there may be some disconnect here.
      const crossingPoint = intersection(
        bedsStart,
        bedsEnd,
        hospitalizationsStart,
        hospitalizationsEnd,
      );
      // scale the normalized range of 4 back up to the actual range of 4 days.
      let dayDelta = Math.floor(4 * crossingPoint.x);
      // create the new date by adding the delta to the day prior to overwhelming.
      const startDate = this.dates[startIdx];
      const deltaSecs = dayDelta * MS_PER_DAY;
      const estimatedTimeStamp = startDate.getTime() + deltaSecs;
      this.dateOverwhelmed = new Date(estimatedTimeStamp);
    }
  }

  get durationLabelMonths() {
    if (this.durationDays) {
      let months = Math.round(this.durationDays / 30);
      return `${months} Month${months > 1 ? 's' : ''}`;
    } else {
      return ''; // permanent intervetion
    }
  }

  get delayLabelWeeks() {
    if (this.delayDays) {
      let weeks = Math.round(this.delayDays / 7);
      return `Starting In ${weeks} Month${weeks > 1 ? 's' : ''}`;
    } else {
      return 'Starting Today';
    }
  }

  get label() {
    let parts = [];
    if (this.durationDays) {
      parts.push(`${this.durationLabelMonths} of `);
    }
    parts.push(this.intervention);
    if (this.delayDays) {
      parts.push(`, ${this.delayLabelWeeks}`);
    }

    return parts.join('');
  }

  get labelWithR0() {
    return `${this.label}`;
  }

  get interventionEnd() {
    return new Date(
      this.dayZero.getTime() +
        (this.daysSinceDayZero + this.durationDays!) * MS_PER_DAY,
    );
  }

  cumulativeInfectedAfter(days: number) {
    return this.cumulativeInfected[this.cumulativeInfected.length - 1];
  }
  cumulativeDeadAfter(days: number) {
    return this.cumulativeDeaths[this.cumulativeDeaths.length - 1];
  }
  dateAfter(days: number) {
    return this.dates[this.dates.length - 1];
  }
  getColumn(columnName: string, days: number) {
    return this.dates
      .slice(0, Math.ceil(days / 4) + 1) //fixme!!!
      .map((date, idx) => ({ x: date, y: (this as any)[columnName][idx] }));
  }

  getColumnAt(columnName: string, days: number) {
    const idxForDay = (day: number) => Math.ceil(day / 4);
    return (this as any)[columnName][idxForDay(days)];
  }

  getDataset(columnName: string, duration: number, customLabel: string) {
    return {
      label: customLabel ? customLabel : this.labelWithR0,
      data: this.getColumn(columnName, duration + this.daysSinceDayZero),
    };
  }
}
